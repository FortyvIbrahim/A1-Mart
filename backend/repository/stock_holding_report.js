const logger = require("../utils/logger");
const { parseDaysValue } = require("../utils/parseDaysValue");
const {
  insertRowsInBatches,
  updateProductHoldingDaysInBatches,
  queryAsync,
  getConnectionAsync,
  beginTransactionAsync,
  commitAsync,
  rollbackAsync,
} = require("../utils/batchInsert");

const ITEMS_SELECT_SQL = `SELECT shi.stock_holding_item_id,
                shi.stock_holding_report_id,
                shi.product_id,
                shi.branch_id,
                shi.purchase_type,
                shi.current_stock,
                shi.current_stock_value,
                shi.stock_on_order,
                shi.stock_duration,
                p.holding_days,
                shi.status,
                shi.chain_bill_count_level,
                shi.supplier_name,
                shi.distributor_name,
                shi.buyer_id,
                buyer_emp.employee_name AS buyer_name,
                shi.created_at,
                shi.updated_at,
                p.de_name AS product_name,
                p.image_url,
                p.de_name,
                p.de_buyer_name,
                p.department_id,
                p.category_id,
                p.subcategory_id,
                pd.department_name,
                pc.category_name,
                psc.subcategory_name,
                b.branch_name,
                ml_supplier.master_id AS supplier_id,
                ml_supplier.name AS supplier_master_name,
                COALESCE(ml_dist_product.master_id, ml_dist_item.master_id) AS distributor_id,
                COALESCE(ml_dist_product.name, ml_dist_item.name) AS distributor_master_name
         FROM stock_holding_items shi
         LEFT JOIN products p ON shi.product_id = p.product_id
         LEFT JOIN products_categories pc ON p.category_id = pc.category_id
         LEFT JOIN products_subcategories psc ON p.subcategory_id = psc.subcategory_id
         LEFT JOIN products_department pd ON p.department_id = pd.department_id
         LEFT JOIN branches b ON shi.branch_id = b.branch_id
         LEFT JOIN master_list ml_supplier
           ON ml_supplier.person_type = 1
          AND LOWER(TRIM(ml_supplier.name)) = LOWER(TRIM(shi.supplier_name))
          AND TRIM(COALESCE(shi.supplier_name, '')) <> ''
         LEFT JOIN master_list ml_dist_product
           ON ml_dist_product.master_id = p.distributor_id
          AND ml_dist_product.person_type = 3
         LEFT JOIN master_list ml_dist_item
           ON ml_dist_item.person_type = 3
          AND LOWER(TRIM(ml_dist_item.name)) = LOWER(TRIM(shi.distributor_name))
          AND TRIM(COALESCE(shi.distributor_name, '')) <> ''
          AND ml_dist_product.master_id IS NULL
         LEFT JOIN employees buyer_emp
           ON shi.buyer_id COLLATE utf8mb4_unicode_ci = buyer_emp.employee_code COLLATE utf8mb4_unicode_ci`;

function mapItemRowSlim(item) {
  return {
    stock_holding_item_id: item.stock_holding_item_id,
    stock_holding_report_id: item.stock_holding_report_id,
    product_id: item.product_id,
    branch_id: item.branch_id,
    purchase_type: item.purchase_type,
    current_stock: item.current_stock,
    current_stock_value: item.current_stock_value,
    stock_on_order: item.stock_on_order,
    stock_duration: item.stock_duration,
    holding_days: item.holding_days ?? null,
    status: item.status,
    chain_bill_count_level: item.chain_bill_count_level,
    supplier_name: item.supplier_name,
    distributor_name: item.distributor_name,
    created_at: item.created_at,
    updated_at: item.updated_at,
    product_name: item.product_name ?? null,
    product_image: item.image_url ?? null,
    branch_name: item.branch_name ?? null,
    supplier_id: item.supplier_id ?? null,
    supplier_master_name: item.supplier_master_name ?? null,
    distributor_id: item.distributor_id ?? null,
    distributor_master_name: item.distributor_master_name ?? null,
    buyer_id: item.buyer_id ?? null,
    buyer_name: item.buyer_name ?? null,
    department_id: item.department_id ?? null,
    category_id: item.category_id ?? null,
    subcategory_id: item.subcategory_id ?? null,
    department_name: item.department_name ?? null,
    category_name: item.category_name ?? null,
    subcategory_name: item.subcategory_name ?? null,
  };
}

function mapItemRow(item, buyersBySupplierId = {}) {
  const slim = mapItemRowSlim(item);
  const supplierId = slim.supplier_id;
  const supplierBuyers =
    supplierId != null ? buyersBySupplierId[supplierId] || [] : [];

  return {
    ...slim,
    supplier_buyers: supplierBuyers,
    product: item.product_id
      ? {
          product_id: item.product_id,
          de_name: item.de_name ?? null,
          image_url: item.image_url ?? null,
          de_buyer_name: item.de_buyer_name ?? null,
        }
      : null,
    branch: item.branch_id
      ? {
          branch_id: item.branch_id,
          branch_name: item.branch_name ?? null,
        }
      : null,
    supplier:
      supplierId != null
        ? {
            master_id: supplierId,
            name: item.supplier_master_name ?? null,
            buyers: supplierBuyers,
          }
        : null,
    distributor:
      item.distributor_id != null
        ? {
            master_id: item.distributor_id,
            name: item.distributor_master_name ?? null,
          }
        : null,
    buyer: slim.buyer_id
      ? {
          employee_id: slim.buyer_id,
          employee_name: slim.buyer_name ?? null,
        }
      : null,
  };
}

function mapBuyerRow(row) {
  return {
    employee_id: row.employee_id,
    employee_name: row.employee_name,
    buyer_alias: row.buyer_alias ?? null,
    profile_img_url: row.profile_img_url ?? null,
  };
}

function normalizeStockOnOrder(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed === 0) return null;
  return parsed;
}

function buildItemInsertRows(stockHoldingReportId, items) {
  return (items || []).map((item) => [
    stockHoldingReportId,
    item.product_id,
    item.branch_id,
    item.purchase_type ?? null,
    item.current_stock,
    item.current_stock_value,
    normalizeStockOnOrder(item.stock_on_order),
    parseDaysValue(item.stock_duration),
    item.status ?? null,
    item.chain_bill_count_level ?? null,
    item.supplier_name ?? null,
    item.distributor_name ?? null,
    item.buyer_id ?? null,
  ]);
}

function collectProductHoldingDaysUpdates(items) {
  const productHoldingDaysUpdates = new Map();
  (items || []).forEach((item) => {
    const holdingDays = parseDaysValue(item.holding_days);
    if (holdingDays == null) return;
    productHoldingDaysUpdates.set(Number(item.product_id), holdingDays);
  });
  return productHoldingDaysUpdates;
}

const INSERT_ITEMS_SQL = `INSERT INTO stock_holding_items
(stock_holding_report_id, product_id, branch_id, purchase_type, current_stock, current_stock_value, stock_on_order, stock_duration, status, chain_bill_count_level, supplier_name, distributor_name, buyer_id)
VALUES ?`;

const CREATED_BY_NAME_SQL = `CASE
  WHEN shr.is_system_sync = 1 THEN 'System'
  ELSE e.employee_name
END AS created_by_name`;

class StockHoldingReportRepository {
  constructor(db) {
    this.db = db;
  }

  createReportHeader({ report_name, date, created_by, is_system_sync = 0 }) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `INSERT INTO stock_holding_report (report_name, date, created_by, is_system_sync)
         VALUES (?, ?, ?, ?)`,
        [report_name, date, created_by, is_system_sync ? 1 : 0],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_HOLDING_REPORT",
              code: "REPOSITORY.STOCK_HOLDING_REPORT.CREATE_REPORT",
              description: err.toString(),
              category: "",
              ref: { report_name, date, created_by },
            });
            reject(err);
            return;
          }
          resolve(result.insertId);
        }
      );
    });
  }

  reportExists(stockHoldingReportId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT stock_holding_report_id
         FROM stock_holding_report
         WHERE stock_holding_report_id = ?
         LIMIT 1`,
        [stockHoldingReportId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(Array.isArray(rows) && rows.length > 0);
        }
      );
    });
  }

  getItemCountByReportId(stockHoldingReportId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT COUNT(*) AS item_count
         FROM stock_holding_items
         WHERE stock_holding_report_id = ?`,
        [stockHoldingReportId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(Number(rows?.[0]?.item_count ?? 0));
        }
      );
    });
  }

  create(payload) {
    const {
      report_name,
      date,
      created_by,
      items = [],
      is_system_sync = 0,
    } = payload;

    return getConnectionAsync(this.db).then(async (connection) => {
      try {
        await beginTransactionAsync(connection);
        const reportResult = await queryAsync(
          connection,
          `INSERT INTO stock_holding_report (report_name, date, created_by, is_system_sync)
           VALUES (?, ?, ?, ?)`,
          [report_name, date, created_by, is_system_sync ? 1 : 0]
        );
        const reportId = reportResult.insertId;

        if (items.length > 0) {
          const rows = buildItemInsertRows(reportId, items);
          await insertRowsInBatches(connection, INSERT_ITEMS_SQL, rows);
          await updateProductHoldingDaysInBatches(
            connection,
            collectProductHoldingDaysUpdates(items)
          );
        }

        await commitAsync(connection);
        connection.release();
        return {
          stock_holding_report_id: reportId,
          report_name,
          date,
          created_by,
          item_count: items.length,
        };
      } catch (err) {
        await rollbackAsync(connection);
        connection.release();
        throw err;
      }
    });
  }

  appendItems(stockHoldingReportId, items = []) {
    if (!items.length) {
      return this.getItemCountByReportId(stockHoldingReportId).then(
        (item_count) => ({ inserted: 0, item_count })
      );
    }

    return getConnectionAsync(this.db).then(async (connection) => {
      try {
        await beginTransactionAsync(connection);
        const rows = buildItemInsertRows(stockHoldingReportId, items);
        await insertRowsInBatches(connection, INSERT_ITEMS_SQL, rows);
        await updateProductHoldingDaysInBatches(
          connection,
          collectProductHoldingDaysUpdates(items)
        );
        await commitAsync(connection);
        connection.release();
        const item_count = await this.getItemCountByReportId(
          stockHoldingReportId
        );
        return { inserted: items.length, item_count };
      } catch (err) {
        await rollbackAsync(connection);
        connection.release();
        throw err;
      }
    });
  }

  createSync(payload) {
    const {
      report_name,
      date,
      created_by,
      items = [],
      is_system_sync = 0,
    } = payload;

    return getConnectionAsync(this.db).then(async (connection) => {
      try {
        await beginTransactionAsync(connection);
        const reportResult = await queryAsync(
          connection,
          `INSERT INTO stock_holding_report (report_name, date, created_by, is_system_sync)
           VALUES (?, ?, ?, ?)`,
          [report_name, date, created_by, is_system_sync ? 1 : 0]
        );
        const reportId = reportResult.insertId;

        if (items.length > 0) {
          const rows = buildItemInsertRows(reportId, items);
          await insertRowsInBatches(connection, INSERT_ITEMS_SQL, rows);
          await updateProductHoldingDaysInBatches(
            connection,
            collectProductHoldingDaysUpdates(items)
          );
        }

        await commitAsync(connection);
        connection.release();
        return {
          stock_holding_report_id: reportId,
          report_name,
          date,
          created_by,
          item_count: items.length,
        };
      } catch (err) {
        await rollbackAsync(connection);
        connection.release();
        throw err;
      }
    });
  }

  appendSyncItems(stockHoldingReportId, items = []) {
    return this.appendItems(stockHoldingReportId, items);
  }

  getBuyersBySupplierIds(supplierIds) {
    return new Promise((resolve, reject) => {
      const ids = (supplierIds || []).filter(
        (id) => id != null && Number.isFinite(Number(id))
      );
      if (ids.length === 0) {
        resolve({});
        return;
      }

      this.db.query(
        `SELECT mlb.master_id,
                mlb.employee_id,
                e.employee_name,
                e.buyer_alias,
                e.profile_img_url
         FROM master_list_buyers mlb
         INNER JOIN employees e ON mlb.employee_id = e.employee_code
         WHERE mlb.master_id IN (?)
         ORDER BY e.employee_name ASC`,
        [ids],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          const grouped = {};
          (rows || []).forEach((row) => {
            const key = row.master_id;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(mapBuyerRow(row));
          });
          resolve(grouped);
        }
      );
    });
  }

  async mapItemsWithBuyers(items, { slim = true } = {}) {
    if (slim) {
      return (items || []).map((item) => mapItemRowSlim(item));
    }

    const supplierIds = Array.from(
      new Set(
        (items || []).map((item) => item.supplier_id).filter((id) => id != null)
      )
    );
    const buyersBySupplierId = await this.getBuyersBySupplierIds(supplierIds);
    return (items || []).map((item) => mapItemRow(item, buyersBySupplierId));
  }

  getItemsByReportId(stockHoldingReportId, options = {}) {
    const { limit, offset = 0, slim = false } = options;
    const hasPagination =
      limit != null && Number.isFinite(Number(limit)) && Number(limit) > 0;
    const safeLimit = hasPagination ? Math.min(Number(limit), 15000) : null;
    const safeOffset = hasPagination ? Math.max(Number(offset) || 0, 0) : 0;

    return new Promise((resolve, reject) => {
      const params = [stockHoldingReportId];
      let sql = `${ITEMS_SELECT_SQL}
         WHERE shi.stock_holding_report_id = ?
         ORDER BY shi.stock_holding_item_id ASC`;

      if (hasPagination) {
        sql += " LIMIT ? OFFSET ?";
        params.push(safeLimit, safeOffset);
      }

      this.db.query(sql, params, async (err, items) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.STOCK_HOLDING_REPORT",
            code: "REPOSITORY.STOCK_HOLDING_REPORT.GET_ITEMS_BY_REPORT_ID",
            description: err.toString(),
            category: "",
            ref: { stockHoldingReportId, limit: safeLimit, offset: safeOffset },
          });
          reject(err);
          return;
        }

        try {
          const mapped = await this.mapItemsWithBuyers(items, { slim });
          resolve(mapped);
        } catch (fetchErr) {
          reject(fetchErr);
        }
      });
    });
  }

  getItemsPageByReportId(stockHoldingReportId, limit, offset = 0) {
    return Promise.all([
      this.getItemCountByReportId(stockHoldingReportId),
      this.getItemsByReportId(stockHoldingReportId, {
        limit,
        offset,
        slim: true,
      }),
    ]).then(([total, items]) => {
      const nextOffset = offset + items.length;
      return {
        items,
        total,
        limit: Number(limit),
        offset: Number(offset),
        has_more: nextOffset < total,
      };
    });
  }

  getReportHeaderById(stockHoldingReportId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT shr.*,
                ${CREATED_BY_NAME_SQL}
         FROM stock_holding_report shr
         LEFT JOIN employees e
           ON shr.created_by COLLATE utf8mb4_unicode_ci = e.employee_code COLLATE utf8mb4_unicode_ci
         WHERE shr.stock_holding_report_id = ?`,
        [stockHoldingReportId],
        async (err, reports) => {
          if (err) {
            reject(err);
            return;
          }
          if (!reports || reports.length === 0) {
            resolve(null);
            return;
          }

          try {
            const item_count = await this.getItemCountByReportId(
              stockHoldingReportId
            );
            resolve({
              ...reports[0],
              item_count,
            });
          } catch (countErr) {
            reject(countErr);
          }
        }
      );
    });
  }

  getAllReports() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT shr.*,
                ${CREATED_BY_NAME_SQL}
         FROM stock_holding_report shr
         LEFT JOIN employees e
           ON shr.created_by COLLATE utf8mb4_unicode_ci = e.employee_code COLLATE utf8mb4_unicode_ci
         ORDER BY shr.date DESC, shr.stock_holding_report_id DESC`,
        [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_HOLDING_REPORT",
              code: "REPOSITORY.STOCK_HOLDING_REPORT.GET_ALL_REPORTS",
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

  getById(stockHoldingReportId, options = {}) {
    const { includeItems = false, limit, offset } = options;
    return this.getReportHeaderById(stockHoldingReportId).then((report) => {
      if (!report) return null;
      if (!includeItems) return report;
      if (limit != null) {
        return this.getItemsPageByReportId(
          stockHoldingReportId,
          limit,
          offset
        ).then((page) => ({
          ...report,
          ...page,
        }));
      }
      return this.getItemsByReportId(stockHoldingReportId, {
        slim: false,
      }).then((items) => ({
        ...report,
        items,
      }));
    });
  }

  getLatestReportIdByDate(date, options = {}) {
    const { exact = false } = options;
    const sql = exact
      ? `SELECT stock_holding_report_id
         FROM stock_holding_report
         WHERE date = DATE(?)
         ORDER BY stock_holding_report_id DESC
         LIMIT 1`
      : `SELECT stock_holding_report_id
         FROM stock_holding_report
         WHERE date <= DATE(?)
         ORDER BY date DESC, stock_holding_report_id DESC
         LIMIT 1`;

    return new Promise((resolve, reject) => {
      this.db.query(sql, [date], (err, rows) => {
        if (err) reject(err);
        else resolve(rows?.[0]?.stock_holding_report_id ?? null);
      });
    });
  }

  getLatestReportByDate(date, options = {}) {
    const { includeItems = false, limit, offset, exact = false } = options;
    return this.getLatestReportIdByDate(date, { exact }).then((reportId) => {
      if (!reportId) return null;
      return this.getById(reportId, { includeItems, limit, offset });
    });
  }

  getLatestItemsPageByDate(
    date,
    limit,
    offset = 0,
    reportId = null,
    options = {}
  ) {
    const { exact = false } = options;
    const safeOffset = Math.max(Number(offset) || 0, 0);
    const reportIdPromise = reportId
      ? Promise.resolve(Number(reportId))
      : this.getLatestReportIdByDate(date, { exact });

    return reportIdPromise.then((resolvedReportId) => {
      if (!resolvedReportId) return null;

      const pagePromise = this.getItemsPageByReportId(
        resolvedReportId,
        limit,
        safeOffset
      );

      if (safeOffset > 0) {
        return pagePromise.then((page) => ({
          stock_holding_report_id: resolvedReportId,
          ...page,
        }));
      }

      return Promise.all([
        this.getReportHeaderById(resolvedReportId),
        pagePromise,
      ]).then(([report, page]) => {
        if (!report) return null;
        return {
          ...report,
          ...page,
        };
      });
    });
  }

  resolveValidProductAndBranchIds(productIds, branchIds) {
    return new Promise((resolve, reject) => {
      const validProductIds = new Set();
      const validBranchIds = new Set();

      const loadBranches = () => {
        if (!branchIds.length) {
          resolve({ validProductIds, validBranchIds });
          return;
        }
        const phB = branchIds.map(() => "?").join(", ");
        this.db.query(
          `SELECT branch_id FROM branches WHERE branch_id IN (${phB})`,
          branchIds,
          (errB, branchRows) => {
            if (errB) {
              reject(errB);
              return;
            }
            for (const x of branchRows || []) {
              validBranchIds.add(x.branch_id);
            }
            resolve({ validProductIds, validBranchIds });
          }
        );
      };

      if (!productIds.length) {
        loadBranches();
        return;
      }

      const phP = productIds.map(() => "?").join(", ");
      this.db.query(
        `SELECT product_id FROM products WHERE product_id IN (${phP})`,
        productIds,
        (errP, prodRows) => {
          if (errP) {
            reject(errP);
            return;
          }
          for (const x of prodRows || []) {
            validProductIds.add(x.product_id);
          }
          loadBranches();
        }
      );
    });
  }

  employeeCodeExists(employeeCode) {
    return new Promise((resolve, reject) => {
      if (!employeeCode) {
        resolve(false);
        return;
      }
      this.db.query(
        `SELECT employee_code
         FROM employees
         WHERE employee_code = ?
         LIMIT 1`,
        [employeeCode],
        (err, rows) => {
          if (err) reject(err);
          else resolve(Array.isArray(rows) && rows.length > 0);
        }
      );
    });
  }

  getFirstEmployeeCode() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT employee_code
         FROM employees
         ORDER BY employee_code ASC
         LIMIT 1`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows?.[0]?.employee_code ?? null);
        }
      );
    });
  }

  async resolveCreatedBy(employeeCode) {
    if (employeeCode && (await this.employeeCodeExists(employeeCode))) {
      return employeeCode;
    }

    const envCode = process.env.STOCK_HOLDING_SYNC_CREATED_BY;
    if (envCode && (await this.employeeCodeExists(envCode))) {
      return envCode;
    }

    const fallback = await this.getFirstEmployeeCode();
    if (!fallback) {
      throw new Error(
        "No valid employee found for stock holding report created_by"
      );
    }
    return fallback;
  }

  deleteAllExceptReportId(stockHoldingReportId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `DELETE FROM stock_holding_report
         WHERE stock_holding_report_id != ?`,
        [stockHoldingReportId],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_HOLDING_REPORT",
              code: "REPOSITORY.STOCK_HOLDING_REPORT.DELETE_ALL_EXCEPT",
              description: err.toString(),
              category: "",
              ref: { stockHoldingReportId },
            });
            reject(err);
            return;
          }
          resolve({ deletedReports: result.affectedRows });
        }
      );
    });
  }

  delete(stockHoldingReportId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `DELETE FROM stock_holding_report WHERE stock_holding_report_id = ?`,
        [stockHoldingReportId],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_HOLDING_REPORT",
              code: "REPOSITORY.STOCK_HOLDING_REPORT.DELETE",
              description: err.toString(),
              category: "",
              ref: { stockHoldingReportId },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }
}

module.exports = (db) => {
  return new StockHoldingReportRepository(db);
};
