const logger = require("../utils/logger");
const {
  insertRowsInBatches,
  getConnectionAsync,
  beginTransactionAsync,
  commitAsync,
  rollbackAsync,
} = require("../utils/batchInsert");

const INSERT_ITEMS_SQL = `INSERT INTO sales_report_items
(sales_report_id, branch_id, product_id, sold_qty, sold_value)
VALUES ?`;

const SQL_COLLATION = "utf8mb4_unicode_ci";
const SALES_DASHBOARD_LOOKBACK_DAYS = 89;

function sqlLowerTrim(expr) {
  return `LOWER(TRIM(${expr})) COLLATE ${SQL_COLLATION}`;
}

function sqlCompare(leftExpr, rightExpr) {
  return `${sqlLowerTrim(leftExpr)} = ${sqlLowerTrim(rightExpr)}`;
}

function sqlCollate(expr) {
  return `${expr} COLLATE ${SQL_COLLATION}`;
}

const SALES_DAILY_TOTALS_JOINS = `
FROM sales_report sr
JOIN sales_report_items sri ON sri.sales_report_id = sr.sales_report_id
JOIN products p ON p.product_id = sri.product_id
LEFT JOIN master_list ml_dist
  ON ml_dist.person_type = 3
 AND ml_dist.master_id = p.distributor_id`;

const SALES_LIGHT_JOINS = `
FROM sales_report sr
JOIN sales_report_items sri ON sri.sales_report_id = sr.sales_report_id
JOIN products p ON p.product_id = sri.product_id
JOIN branches b ON b.branch_id = sri.branch_id
LEFT JOIN products_categories pc ON p.category_id = pc.category_id
LEFT JOIN products_subcategories psc ON p.subcategory_id = psc.subcategory_id
LEFT JOIN products_department pd ON p.department_id = pd.department_id
LEFT JOIN master_list ml_dist
  ON ml_dist.person_type = 3
 AND ml_dist.master_id = p.distributor_id
LEFT JOIN employees buyer_emp
  ON ${sqlCollate("buyer_emp.employee_code")} = ${sqlCollate(
  "CONVERT(p.de_buyer_name USING utf8mb4)"
)}
  OR ${sqlCompare(
    "buyer_emp.employee_name",
    "CONVERT(p.de_buyer_name USING utf8mb4)"
  )}`;

const SALES_ITEMS_JOINS = `
FROM sales_report sr
JOIN sales_report_items sri ON sri.sales_report_id = sr.sales_report_id
JOIN products p ON p.product_id = sri.product_id
JOIN branches b ON b.branch_id = sri.branch_id
LEFT JOIN products_categories pc ON p.category_id = pc.category_id
LEFT JOIN products_subcategories psc ON p.subcategory_id = psc.subcategory_id
LEFT JOIN products_department pd ON p.department_id = pd.department_id
LEFT JOIN (
  SELECT shi.product_id,
         shi.branch_id,
         shi.purchase_type,
         shi.chain_bill_count_level,
         shi.supplier_name,
         shi.distributor_name,
         shi.buyer_id
  FROM stock_holding_items shi
  INNER JOIN stock_holding_report shr
    ON shr.stock_holding_report_id = shi.stock_holding_report_id
  INNER JOIN (
    SELECT shi2.product_id,
           shi2.branch_id,
           MAX(shr2.date) AS max_date
    FROM stock_holding_items shi2
    INNER JOIN stock_holding_report shr2
      ON shr2.stock_holding_report_id = shi2.stock_holding_report_id
    WHERE shr2.date <= DATE(?)
    GROUP BY shi2.product_id, shi2.branch_id
  ) latest
    ON latest.product_id = shi.product_id
   AND latest.branch_id = shi.branch_id
   AND shr.date = latest.max_date
) shi_latest
  ON shi_latest.product_id = sri.product_id
 AND shi_latest.branch_id = sri.branch_id
LEFT JOIN master_list ml_supplier
  ON ml_supplier.person_type = 1
 AND ${sqlCompare("ml_supplier.name", "shi_latest.supplier_name")}
 AND TRIM(COALESCE(shi_latest.supplier_name, '')) <> ''
LEFT JOIN master_list ml_dist
  ON ml_dist.person_type = 3
 AND (
   ml_dist.master_id = p.distributor_id
   OR (
     ${sqlCompare("ml_dist.name", "shi_latest.distributor_name")}
     AND TRIM(COALESCE(shi_latest.distributor_name, '')) <> ''
   )
 )
LEFT JOIN employees buyer_emp
  ON (
    shi_latest.buyer_id IS NOT NULL
    AND shi_latest.buyer_id <> ''
    AND ${sqlCollate("buyer_emp.employee_code")} = ${sqlCollate(
  "shi_latest.buyer_id"
)}
  )
  OR ${sqlCollate("buyer_emp.employee_code")} = ${sqlCollate(
  "CONVERT(p.de_buyer_name USING utf8mb4)"
)}
  OR ${sqlCompare(
    "buyer_emp.employee_name",
    "CONVERT(p.de_buyer_name USING utf8mb4)"
  )}`;

const SALES_ITEMS_LIGHT_SELECT = `
SELECT sr.date AS report_date,
       sri.sales_report_item_id,
       sri.sales_report_id,
       sri.branch_id,
       sri.product_id,
       sri.sold_qty,
       sri.sold_value,
       b.branch_name,
       p.de_name AS product_name,
       p.image_url AS product_image,
       p.de_buyer_name AS buyer_name,
       buyer_emp.employee_code AS buyer_id,
       NULL AS supplier_id,
       NULL AS supplier_name,
       ml_dist.master_id AS distributor_id,
       ml_dist.name AS distributor_name,
       p.department_id,
       pd.department_name,
       p.category_id,
       pc.category_name,
       p.subcategory_id,
       psc.subcategory_name,
       NULL AS purchase_type,
       NULL AS chain_bill_count_level
${SALES_LIGHT_JOINS}`;

const SALES_ITEMS_SELECT = `
SELECT sr.date AS report_date,
       sri.sales_report_item_id,
       sri.sales_report_id,
       sri.branch_id,
       sri.product_id,
       sri.sold_qty,
       sri.sold_value,
       b.branch_name,
       p.de_name AS product_name,
       p.image_url AS product_image,
       p.de_buyer_name AS buyer_name,
       buyer_emp.employee_code AS buyer_id,
       ml_supplier.master_id AS supplier_id,
       ml_supplier.name AS supplier_name,
       ml_dist.master_id AS distributor_id,
       ml_dist.name AS distributor_name,
       p.department_id,
       pd.department_name,
       p.category_id,
       pc.category_name,
       p.subcategory_id,
       psc.subcategory_name,
       shi_latest.purchase_type,
       shi_latest.chain_bill_count_level
${SALES_ITEMS_JOINS}`;

function normalizeRawList(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseIdList(values) {
  return normalizeRawList(values)
    .map((v) => parseInt(String(v), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function parseBuyerIdList(values) {
  return normalizeRawList(values).filter(
    (v) => String(v ?? "").trim() !== "" && String(v) !== "unknown"
  );
}

function parseStringList(values) {
  return normalizeRawList(values)
    .map((v) =>
      String(v ?? "")
        .trim()
        .toLowerCase()
    )
    .filter(Boolean);
}

function buildInPlaceholders(count) {
  return Array.from({ length: count }, () => "?").join(", ");
}

function filtersNeedStockJoin(filters = {}) {
  return (
    parseBuyerIdList(filters.buyer_ids).length > 0 ||
    parseIdList(filters.supplier_ids).length > 0 ||
    parseStringList(filters.purchase_types).length > 0 ||
    parseStringList(filters.chain_levels).length > 0
  );
}

function buildLightFilterClauses(filters = {}) {
  const params = [];
  const clauses = [];

  const branchIds = parseIdList(filters.branch_ids);
  if (branchIds.length) {
    clauses.push(`sri.branch_id IN (${buildInPlaceholders(branchIds.length)})`);
    params.push(...branchIds);
  }

  const distributorIds = parseIdList(filters.distributor_ids);
  if (distributorIds.length) {
    const distributorPh = buildInPlaceholders(distributorIds.length);
    clauses.push(`(
      ml_dist.master_id IN (${distributorPh})
      OR p.distributor_id IN (${distributorPh})
    )`);
    params.push(...distributorIds, ...distributorIds);
  }

  const departmentIds = parseIdList(filters.department_ids);
  if (departmentIds.length) {
    clauses.push(
      `p.department_id IN (${buildInPlaceholders(departmentIds.length)})`
    );
    params.push(...departmentIds);
  }

  const categoryIds = parseIdList(filters.category_ids);
  if (categoryIds.length) {
    clauses.push(
      `p.category_id IN (${buildInPlaceholders(categoryIds.length)})`
    );
    params.push(...categoryIds);
  }

  const subcategoryIds = parseIdList(filters.subcategory_ids);
  if (subcategoryIds.length) {
    clauses.push(
      `p.subcategory_id IN (${buildInPlaceholders(subcategoryIds.length)})`
    );
    params.push(...subcategoryIds);
  }

  const whereExtra = clauses.length ? ` AND ${clauses.join(" AND ")}` : "";
  return { params, whereExtra };
}

function buildSalesFilterClauses(filters = {}, asOfDate) {
  const params = [asOfDate];
  const clauses = [];

  const branchIds = parseIdList(filters.branch_ids);
  if (branchIds.length) {
    clauses.push(`sri.branch_id IN (${buildInPlaceholders(branchIds.length)})`);
    params.push(...branchIds);
  }

  const buyerIds = parseBuyerIdList(filters.buyer_ids);
  if (buyerIds.length) {
    const buyerPh = buildInPlaceholders(buyerIds.length);
    clauses.push(`(
      EXISTS (
        SELECT 1
        FROM employees e
        WHERE ${sqlCollate("e.employee_code")} IN (${buyerPh})
          AND (
            (
              shi_latest.buyer_id IS NOT NULL
              AND TRIM(shi_latest.buyer_id) <> ''
              AND ${sqlCollate("e.employee_code")} = ${sqlCollate(
      "shi_latest.buyer_id"
    )}
            )
            OR ${sqlCollate("e.employee_code")} = ${sqlCollate(
      "CONVERT(p.de_buyer_name USING utf8mb4)"
    )}
            OR ${sqlCompare(
              "e.employee_name",
              "CONVERT(p.de_buyer_name USING utf8mb4)"
            )}
          )
      )
    )`);
    params.push(...buyerIds);
  }

  const supplierIds = parseIdList(filters.supplier_ids);
  if (supplierIds.length) {
    const supplierPh = buildInPlaceholders(supplierIds.length);
    clauses.push(`(
      ml_supplier.master_id IN (${supplierPh})
      OR EXISTS (
        SELECT 1
        FROM master_list ml
        WHERE ml.person_type = 1
          AND ml.master_id IN (${supplierPh})
          AND TRIM(COALESCE(shi_latest.supplier_name, '')) <> ''
          AND ${sqlCompare("ml.name", "shi_latest.supplier_name")}
      )
    )`);
    params.push(...supplierIds, ...supplierIds);
  }

  const distributorIds = parseIdList(filters.distributor_ids);
  if (distributorIds.length) {
    const distributorPh = buildInPlaceholders(distributorIds.length);
    clauses.push(`(
      ml_dist.master_id IN (${distributorPh})
      OR p.distributor_id IN (${distributorPh})
    )`);
    params.push(...distributorIds, ...distributorIds);
  }

  const departmentIds = parseIdList(filters.department_ids);
  if (departmentIds.length) {
    clauses.push(
      `p.department_id IN (${buildInPlaceholders(departmentIds.length)})`
    );
    params.push(...departmentIds);
  }

  const categoryIds = parseIdList(filters.category_ids);
  if (categoryIds.length) {
    clauses.push(
      `p.category_id IN (${buildInPlaceholders(categoryIds.length)})`
    );
    params.push(...categoryIds);
  }

  const subcategoryIds = parseIdList(filters.subcategory_ids);
  if (subcategoryIds.length) {
    clauses.push(
      `p.subcategory_id IN (${buildInPlaceholders(subcategoryIds.length)})`
    );
    params.push(...subcategoryIds);
  }

  const purchaseTypes = parseStringList(filters.purchase_types);
  if (purchaseTypes.length) {
    clauses.push(
      `${sqlLowerTrim(
        "COALESCE(shi_latest.purchase_type, '')"
      )} IN (${buildInPlaceholders(purchaseTypes.length)})`
    );
    params.push(...purchaseTypes);
  }

  const chainLevels = parseStringList(filters.chain_levels);
  if (chainLevels.length) {
    clauses.push(
      `${sqlLowerTrim(
        "COALESCE(shi_latest.chain_bill_count_level, '')"
      )} IN (${buildInPlaceholders(chainLevels.length)})`
    );
    params.push(...chainLevels);
  }

  const whereExtra = clauses.length ? ` AND ${clauses.join(" AND ")}` : "";
  return { params, whereExtra };
}

function formatDateKey(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const trimmed = String(value).trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : trimmed.slice(0, 10);
}

function addDaysLocal(dateStr, days) {
  const dt = new Date(`${formatDateKey(dateStr)}T12:00:00`);
  dt.setDate(dt.getDate() + days);
  return formatDateKey(dt);
}

function mapDailyTotalRows(rows) {
  return (rows || []).map((row) => ({
    date: formatDateKey(row.date),
    sold_qty: Number(row.sold_qty ?? 0),
    sold_value: Number(row.sold_value ?? 0),
    row_count: Number(row.row_count ?? 0),
  }));
}

function mapItemRows(rows) {
  return (rows || []).map((row) => ({
    ...row,
    report_date: formatDateKey(row.report_date),
    sold_qty: Number(row.sold_qty ?? 0),
    sold_value: Number(row.sold_value ?? 0),
  }));
}

function buildFilterOptionsFromRows(rows) {
  const branchOptions = new Map();
  const buyerOptions = new Map();
  const supplierOptions = new Map();
  const distributorOptions = new Map();
  const departmentOptions = new Map();
  const categoryOptions = new Map();
  const subcategoryOptions = new Map();
  const purchaseTypeOptions = new Map();
  const chainLevelOptions = new Map();

  (rows || []).forEach((row) => {
    if (row.branch_id != null) {
      branchOptions.set(String(row.branch_id), {
        value: String(row.branch_id),
        label: row.branch_name || String(row.branch_id),
      });
    }
    const buyerKey = row.buyer_id || row.stock_buyer_id;
    if (buyerKey) {
      buyerOptions.set(String(buyerKey), {
        value: String(buyerKey),
        label: row.buyer_name || buyerKey,
      });
    }
    if (row.supplier_id != null) {
      supplierOptions.set(String(row.supplier_id), {
        value: String(row.supplier_id),
        label: row.supplier_name || String(row.supplier_id),
      });
    }
    const distributorKey =
      row.distributor_id != null
        ? row.distributor_id
        : row.product_distributor_id;
    if (distributorKey != null) {
      distributorOptions.set(String(distributorKey), {
        value: String(distributorKey),
        label: row.distributor_name || String(distributorKey),
      });
    }
    if (row.department_id != null) {
      departmentOptions.set(String(row.department_id), {
        value: String(row.department_id),
        label: row.department_name || String(row.department_id),
      });
    }
    if (row.category_id != null) {
      categoryOptions.set(String(row.category_id), {
        value: String(row.category_id),
        label: row.category_name || String(row.category_id),
      });
    }
    if (row.subcategory_id != null) {
      subcategoryOptions.set(String(row.subcategory_id), {
        value: String(row.subcategory_id),
        label: row.subcategory_name || String(row.subcategory_id),
      });
    }
    const purchaseType = String(row.purchase_type ?? "").trim();
    if (purchaseType) {
      const key = purchaseType.toLowerCase();
      purchaseTypeOptions.set(key, { value: key, label: purchaseType });
    }
    const chainLevel = String(row.chain_bill_count_level ?? "").trim();
    if (chainLevel) {
      const key = chainLevel.toLowerCase();
      chainLevelOptions.set(key, { value: key, label: chainLevel });
    }
  });

  const sortOptions = (map) =>
    Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));

  return {
    branchOptions: sortOptions(branchOptions),
    buyerOptions: sortOptions(buyerOptions),
    supplierOptions: sortOptions(supplierOptions),
    distributorOptions: sortOptions(distributorOptions),
    departmentOptions: sortOptions(departmentOptions),
    categoryOptions: sortOptions(categoryOptions),
    subcategoryOptions: sortOptions(subcategoryOptions),
    purchaseTypeOptions: sortOptions(purchaseTypeOptions),
    chainLevelOptions: sortOptions(chainLevelOptions),
  };
}

function emptyFilterOptions() {
  return buildFilterOptionsFromRows([]);
}

function salesReportDateRangeWhere() {
  return `sr.date BETWEEN DATE_SUB(DATE(?), INTERVAL ${SALES_DASHBOARD_LOOKBACK_DAYS} DAY) AND DATE(?)`;
}

function salesReportDateRangeBetween() {
  return "sr.date BETWEEN DATE(?) AND DATE(?)";
}

function resolveFilterOptionsDateRange(asOfDate, { fromDate, toDate } = {}) {
  const rangeTo = formatDateKey(toDate) || formatDateKey(asOfDate);
  const rangeFrom =
    formatDateKey(fromDate) ||
    formatDateKey(addDaysLocal(asOfDate, -SALES_DASHBOARD_LOOKBACK_DAYS));
  return { fromDate: rangeFrom, toDate: rangeTo };
}

class SalesReportRepository {
  constructor(db) {
    this.db = db;
  }

  queryRows(sql, params, logCode, ref = {}) {
    return new Promise((resolve, reject) => {
      this.db.query(sql, params, (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.SALES_REPORT",
            code: logCode,
            description: err.toString(),
            category: "",
            ref,
          });
          reject(err);
          return;
        }
        resolve(rows || []);
      });
    });
  }

  getByDate(date) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT sales_report_id, report_name, date, created_by, created_at, updated_at
         FROM sales_report
         WHERE date = DATE(?)
         LIMIT 1`,
        [date],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.SALES_REPORT",
              code: "REPOSITORY.SALES_REPORT.GET_BY_DATE",
              description: err.toString(),
              category: "",
              ref: { date },
            });
            reject(err);
            return;
          }
          resolve(rows?.[0] ?? null);
        }
      );
    });
  }

  create(payload) {
    const { report_name, date, created_by, items = [] } = payload;

    return getConnectionAsync(this.db).then(async (connection) => {
      try {
        await beginTransactionAsync(connection);

        await new Promise((resolve, reject) => {
          connection.query(
            `DELETE FROM sales_report WHERE date = DATE(?)`,
            [date],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        const reportResult = await new Promise((resolve, reject) => {
          connection.query(
            `INSERT INTO sales_report (report_name, date, created_by)
             VALUES (?, ?, ?)`,
            [report_name, date, created_by],
            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            }
          );
        });

        const salesReportId = reportResult.insertId;

        if (items.length > 0) {
          const rows = items.map((item) => [
            salesReportId,
            item.branch_id,
            item.product_id,
            item.sold_qty,
            item.sold_value,
          ]);
          await insertRowsInBatches(connection, INSERT_ITEMS_SQL, rows);
        }

        await commitAsync(connection);
        connection.release();

        return {
          sales_report_id: salesReportId,
          report_name,
          date,
          created_by,
          item_count: items.length,
        };
      } catch (err) {
        await rollbackAsync(connection);
        connection.release();
        logger.Log({
          level: logger.LEVEL.ERROR,
          component: "REPOSITORY.SALES_REPORT",
          code: "REPOSITORY.SALES_REPORT.CREATE",
          description: err.toString(),
          category: "",
          ref: { report_name, date, created_by },
        });
        throw err;
      }
    });
  }

  getAllReports() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT sr.*,
                e.employee_name as created_by_name,
                (SELECT COUNT(*) FROM sales_report_items sri
                 WHERE sri.sales_report_id = sr.sales_report_id) AS item_count
         FROM sales_report sr
         LEFT JOIN employees e
           ON sr.created_by COLLATE utf8mb4_unicode_ci = e.employee_code COLLATE utf8mb4_unicode_ci
         ORDER BY sr.date DESC, sr.sales_report_id DESC`,
        [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.SALES_REPORT",
              code: "REPOSITORY.SALES_REPORT.GET_ALL_REPORTS",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(rows || []);
        }
      );
    });
  }

  delete(salesReportId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `DELETE FROM sales_report WHERE sales_report_id = ?`,
        [salesReportId],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.SALES_REPORT",
              code: "REPOSITORY.SALES_REPORT.DELETE",
              description: err.toString(),
              category: "",
              ref: { salesReportId },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }

  getDailyTotals(asOfDate, filters = {}, { fromDate, toDate } = {}) {
    const rangeTo = formatDateKey(toDate || asOfDate);
    const rangeFrom =
      formatDateKey(fromDate) ||
      formatDateKey(addDaysLocal(asOfDate, -SALES_DASHBOARD_LOOKBACK_DAYS));
    const range = { fromDate: rangeFrom, toDate: rangeTo };

    if (filtersNeedStockJoin(filters)) {
      return this.getDailyTotalsWithStockJoin(asOfDate, filters, range);
    }
    return this.getDailyTotalsLight(asOfDate, filters, range);
  }

  getDailyTotalsLight(asOfDate, filters = {}, { fromDate, toDate } = {}) {
    const { params, whereExtra } = buildLightFilterClauses(filters);
    const sql = `
      SELECT sr.date AS date,
             COALESCE(SUM(sri.sold_qty), 0) AS sold_qty,
             COALESCE(SUM(sri.sold_value), 0) AS sold_value,
             COUNT(*) AS row_count
      ${SALES_DAILY_TOTALS_JOINS}
      WHERE sr.date BETWEEN DATE(?) AND DATE(?)
      ${whereExtra}
      GROUP BY sr.date
      ORDER BY sr.date ASC`;

    return new Promise((resolve, reject) => {
      this.db.query(sql, [fromDate, toDate, ...params], (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.SALES_REPORT",
            code: "REPOSITORY.SALES_REPORT.GET_DAILY_TOTALS_LIGHT",
            description: err.toString(),
            category: "",
            ref: { asOfDate, filters },
          });
          reject(err);
          return;
        }
        resolve(mapDailyTotalRows(rows));
      });
    });
  }

  getDailyTotalsWithStockJoin(
    asOfDate,
    filters = {},
    { fromDate, toDate } = {}
  ) {
    const { params, whereExtra } = buildSalesFilterClauses(filters, asOfDate);
    const [joinDateParam, ...filterParams] = params;
    const sql = `
      SELECT item_rows.date AS date,
             COALESCE(SUM(item_rows.sold_qty), 0) AS sold_qty,
             COALESCE(SUM(item_rows.sold_value), 0) AS sold_value,
             COUNT(*) AS row_count
      FROM (
        SELECT sri.sales_report_item_id,
               sr.date AS date,
               MAX(sri.sold_qty) AS sold_qty,
               MAX(sri.sold_value) AS sold_value
        ${SALES_ITEMS_JOINS}
        WHERE sr.date BETWEEN DATE(?) AND DATE(?)
        ${whereExtra}
        GROUP BY sri.sales_report_item_id, sr.date
      ) item_rows
      GROUP BY item_rows.date
      ORDER BY item_rows.date ASC`;

    return new Promise((resolve, reject) => {
      this.db.query(
        sql,
        [joinDateParam, fromDate, toDate, ...filterParams],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.SALES_REPORT",
              code: "REPOSITORY.SALES_REPORT.GET_DAILY_TOTALS",
              description: err.toString(),
              category: "",
              ref: { asOfDate, filters },
            });
            reject(err);
            return;
          }
          resolve(mapDailyTotalRows(rows));
        }
      );
    });
  }

  getItemsByDate(date, filters = {}, { limit = 5000, offset = 0 } = {}) {
    if (filtersNeedStockJoin(filters)) {
      return this.getItemsByDateWithStockJoin(date, filters, { limit, offset });
    }
    return this.getItemsByDateLight(date, filters, { limit, offset });
  }

  getItemsByDateLight(date, filters = {}, { limit = 5000, offset = 0 } = {}) {
    const { params, whereExtra } = buildLightFilterClauses(filters);
    const safeLimit = Math.min(Math.max(Number(limit) || 5000, 1), 15000);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const sql = `
      ${SALES_ITEMS_LIGHT_SELECT}
      WHERE sr.date = DATE(?)
      ${whereExtra}
      ORDER BY sri.sales_report_item_id ASC
      LIMIT ? OFFSET ?`;

    return new Promise((resolve, reject) => {
      this.db.query(
        sql,
        [date, ...params, safeLimit, safeOffset],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.SALES_REPORT",
              code: "REPOSITORY.SALES_REPORT.GET_ITEMS_BY_DATE_LIGHT",
              description: err.toString(),
              category: "",
              ref: { date, filters, limit: safeLimit, offset: safeOffset },
            });
            reject(err);
            return;
          }
          resolve(mapItemRows(rows));
        }
      );
    });
  }

  getItemsByDateWithStockJoin(
    date,
    filters = {},
    { limit = 5000, offset = 0 } = {}
  ) {
    const { params, whereExtra } = buildSalesFilterClauses(filters, date);
    const [joinDateParam, ...filterParams] = params;
    const safeLimit = Math.min(Math.max(Number(limit) || 5000, 1), 15000);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const sql = `
      ${SALES_ITEMS_SELECT}
      WHERE sr.date = DATE(?)
      ${whereExtra}
      ORDER BY sri.sales_report_item_id ASC
      LIMIT ? OFFSET ?`;

    return new Promise((resolve, reject) => {
      this.db.query(
        sql,
        [joinDateParam, date, ...filterParams, safeLimit, safeOffset],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.SALES_REPORT",
              code: "REPOSITORY.SALES_REPORT.GET_ITEMS_BY_DATE",
              description: err.toString(),
              category: "",
              ref: { date, filters, limit: safeLimit, offset: safeOffset },
            });
            reject(err);
            return;
          }
          resolve(mapItemRows(rows));
        }
      );
    });
  }

  getItemCountByDate(date, filters = {}) {
    if (filtersNeedStockJoin(filters)) {
      return this.getItemCountByDateWithStockJoin(date, filters);
    }
    return this.getItemCountByDateLight(date, filters);
  }

  getItemCountByDateLight(date, filters = {}) {
    const { params, whereExtra } = buildLightFilterClauses(filters);
    const sql = `
      SELECT COUNT(*) AS total
      ${SALES_LIGHT_JOINS}
      WHERE sr.date = DATE(?)
      ${whereExtra}`;

    return new Promise((resolve, reject) => {
      this.db.query(sql, [date, ...params], (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.SALES_REPORT",
            code: "REPOSITORY.SALES_REPORT.GET_ITEM_COUNT_BY_DATE_LIGHT",
            description: err.toString(),
            category: "",
            ref: { date, filters },
          });
          reject(err);
          return;
        }
        resolve(Number(rows?.[0]?.total ?? 0));
      });
    });
  }

  getItemCountByDateWithStockJoin(date, filters = {}) {
    const { params, whereExtra } = buildSalesFilterClauses(filters, date);
    const [joinDateParam, ...filterParams] = params;
    const sql = `
      SELECT COUNT(DISTINCT sri.sales_report_item_id) AS total
      ${SALES_ITEMS_JOINS}
      WHERE sr.date = DATE(?)
      ${whereExtra}`;

    return new Promise((resolve, reject) => {
      this.db.query(sql, [joinDateParam, date, ...filterParams], (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.SALES_REPORT",
            code: "REPOSITORY.SALES_REPORT.GET_ITEM_COUNT_BY_DATE",
            description: err.toString(),
            category: "",
            ref: { date, filters },
          });
          reject(err);
          return;
        }
        resolve(Number(rows?.[0]?.total ?? 0));
      });
    });
  }

  getStockDerivedFilterOptions(asOfDate, { fromDate, toDate } = {}) {
    const range = resolveFilterOptionsDateRange(asOfDate, { fromDate, toDate });
    const sql = `
      SELECT DISTINCT
        ml_supplier.master_id AS supplier_id,
        ml_supplier.name AS supplier_name,
        shi.purchase_type,
        shi.chain_bill_count_level
      FROM sales_report sr
      INNER JOIN sales_report_items sri
        ON sri.sales_report_id = sr.sales_report_id
      INNER JOIN stock_holding_items shi
        ON shi.product_id = sri.product_id
       AND shi.branch_id = sri.branch_id
      LEFT JOIN master_list ml_supplier
        ON ml_supplier.person_type = 1
       AND ${sqlCompare("ml_supplier.name", "shi.supplier_name")}
       AND TRIM(COALESCE(shi.supplier_name, '')) <> ''
      WHERE ${salesReportDateRangeBetween()}`;

    return this.queryRows(
      sql,
      [range.fromDate, range.toDate],
      "REPOSITORY.SALES_REPORT.GET_STOCK_DERIVED_FILTER_OPTIONS",
      { asOfDate, ...range }
    );
  }

  getFilterOptionsLight(asOfDate, { fromDate, toDate } = {}) {
    const range = resolveFilterOptionsDateRange(asOfDate, { fromDate, toDate });
    const rangeParams = [range.fromDate, range.toDate];
    const rangeWhere = salesReportDateRangeBetween();
    const salesItemsFrom = `
      FROM sales_report sr
      INNER JOIN sales_report_items sri
        ON sri.sales_report_id = sr.sales_report_id`;

    return Promise.all([
      this.queryRows(
        `SELECT DISTINCT sri.branch_id, b.branch_name
         ${salesItemsFrom}
         INNER JOIN branches b ON b.branch_id = sri.branch_id
         WHERE ${rangeWhere} AND sri.branch_id IS NOT NULL`,
        rangeParams,
        "REPOSITORY.SALES_REPORT.GET_FILTER_OPTIONS_BRANCHES",
        { asOfDate }
      ),
      this.queryRows(
        `SELECT DISTINCT buyer_emp.employee_code AS buyer_id,
                buyer_emp.employee_name AS buyer_name
         ${salesItemsFrom}
         INNER JOIN products p ON p.product_id = sri.product_id
         LEFT JOIN employees buyer_emp
           ON ${sqlCollate("buyer_emp.employee_code")} = ${sqlCollate(
          "CONVERT(p.de_buyer_name USING utf8mb4)"
        )}
           OR ${sqlCompare(
             "buyer_emp.employee_name",
             "CONVERT(p.de_buyer_name USING utf8mb4)"
           )}
         WHERE ${rangeWhere}
           AND buyer_emp.employee_code IS NOT NULL`,
        rangeParams,
        "REPOSITORY.SALES_REPORT.GET_FILTER_OPTIONS_BUYERS",
        { asOfDate }
      ),
      this.queryRows(
        `SELECT DISTINCT ml_dist.master_id AS distributor_id,
                ml_dist.name AS distributor_name,
                p.distributor_id AS product_distributor_id
         ${salesItemsFrom}
         INNER JOIN products p ON p.product_id = sri.product_id
         LEFT JOIN master_list ml_dist
           ON ml_dist.person_type = 3
          AND ml_dist.master_id = p.distributor_id
         WHERE ${rangeWhere}
           AND (ml_dist.master_id IS NOT NULL OR p.distributor_id IS NOT NULL)`,
        rangeParams,
        "REPOSITORY.SALES_REPORT.GET_FILTER_OPTIONS_DISTRIBUTORS",
        { asOfDate }
      ),
      this.queryRows(
        `SELECT DISTINCT p.department_id, pd.department_name
         ${salesItemsFrom}
         INNER JOIN products p ON p.product_id = sri.product_id
         LEFT JOIN products_department pd ON pd.department_id = p.department_id
         WHERE ${rangeWhere} AND p.department_id IS NOT NULL`,
        rangeParams,
        "REPOSITORY.SALES_REPORT.GET_FILTER_OPTIONS_DEPARTMENTS",
        { asOfDate }
      ),
      this.queryRows(
        `SELECT DISTINCT p.category_id, pc.category_name
         ${salesItemsFrom}
         INNER JOIN products p ON p.product_id = sri.product_id
         LEFT JOIN products_categories pc ON pc.category_id = p.category_id
         WHERE ${rangeWhere} AND p.category_id IS NOT NULL`,
        rangeParams,
        "REPOSITORY.SALES_REPORT.GET_FILTER_OPTIONS_CATEGORIES",
        { asOfDate }
      ),
      this.queryRows(
        `SELECT DISTINCT p.subcategory_id, psc.subcategory_name
         ${salesItemsFrom}
         INNER JOIN products p ON p.product_id = sri.product_id
         LEFT JOIN products_subcategories psc
           ON psc.subcategory_id = p.subcategory_id
         WHERE ${rangeWhere} AND p.subcategory_id IS NOT NULL`,
        rangeParams,
        "REPOSITORY.SALES_REPORT.GET_FILTER_OPTIONS_SUBCATEGORIES",
        { asOfDate }
      ),
    ]).then((resultSets) => resultSets.flat());
  }

  getFilterOptions(asOfDate, { fromDate, toDate } = {}) {
    return Promise.all([
      this.getFilterOptionsLight(asOfDate, { fromDate, toDate }).catch(() => []),
      this.getStockDerivedFilterOptions(asOfDate, { fromDate, toDate }).catch(
        () => []
      ),
    ])
      .then(([rows, stockRows]) =>
        buildFilterOptionsFromRows([...(rows || []), ...(stockRows || [])])
      )
      .catch(() => emptyFilterOptions());
  }
}

module.exports = (db) => {
  return new SalesReportRepository(db);
};
