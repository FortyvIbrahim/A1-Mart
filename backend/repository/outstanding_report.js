const logger = require("../utils/logger");
const {
  insertRowsInBatches,
  getConnectionAsync,
  beginTransactionAsync,
  commitAsync,
  rollbackAsync,
} = require("../utils/batchInsert");

const INSERT_INVOICES_SQL = `INSERT INTO outstanding_invoices
(outstanding_report_id, supplier_id, buyer_id, branch_id, invoice_no, ref_no, invoice_date, net_balance)
VALUES ?`;

function mapInvoiceRowSlim(item) {
  const buyerId = item.buyer_id ?? null;
  const branchId = item.branch_id ?? null;
  return {
    outstanding_invoice_id: item.outstanding_invoice_id,
    outstanding_report_id: item.outstanding_report_id,
    supplier_id: item.supplier_id,
    supplier_name: item.supplier_name ?? null,
    buyer_id: buyerId,
    buyer_name: item.buyer_name ?? null,
    branch_id: branchId,
    branch_name: item.branch_name ?? null,
    invoice_no: item.invoice_no,
    ref_no: item.ref_no,
    invoice_date: item.invoice_date,
    net_balance: item.net_balance,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

function mapInvoiceRow(item) {
  const slim = mapInvoiceRowSlim(item);
  const buyerId = slim.buyer_id;
  const branchId = slim.branch_id;
  return {
    ...slim,
    buyer: buyerId
      ? {
          id: buyerId,
          employee_id: buyerId,
          employee_name: item.buyer_name ?? null,
          name: item.buyer_name ?? null,
          profile_img_url: item.buyer_profile_img_url ?? null,
          image: item.buyer_profile_img_url ?? null,
        }
      : null,
    branch: branchId
      ? {
          branch_id: branchId,
          branch_name: item.branch_name ?? null,
        }
      : null,
  };
}

function buildInvoiceInsertRows(outstandingReportId, invoices) {
  return (invoices || []).map((inv) => [
    outstandingReportId,
    inv.supplier_id,
    inv.buyer_id ?? null,
    inv.branch_id ?? null,
    inv.invoice_no ?? null,
    inv.ref_no,
    inv.invoice_date,
    inv.net_balance,
  ]);
}

const INVOICES_SELECT_SQL = `SELECT oi.outstanding_invoice_id,
                oi.outstanding_report_id,
                oi.supplier_id,
                oi.buyer_id,
                oi.branch_id,
                oi.invoice_no,
                oi.ref_no,
                oi.invoice_date,
                oi.net_balance,
                oi.created_at,
                oi.updated_at,
                ml.name AS supplier_name,
                buyer_e.employee_name AS buyer_name,
                buyer_e.profile_img_url AS buyer_profile_img_url,
                b.branch_name AS branch_name
         FROM outstanding_invoices oi
         LEFT JOIN master_list ml ON oi.supplier_id = ml.master_id
         LEFT JOIN employees buyer_e
           ON oi.buyer_id COLLATE utf8mb4_unicode_ci = buyer_e.employee_code COLLATE utf8mb4_unicode_ci
         LEFT JOIN branches b ON oi.branch_id = b.branch_id`;

class OutstandingReportRepository {
  constructor(db) {
    this.db = db;
  }

  reportExists(outstandingReportId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT outstanding_report_id
         FROM outstanding_report
         WHERE outstanding_report_id = ?
         LIMIT 1`,
        [outstandingReportId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(Array.isArray(rows) && rows.length > 0);
        }
      );
    });
  }

  getInvoiceCountByReportId(outstandingReportId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT COUNT(*) AS invoice_count
         FROM outstanding_invoices
         WHERE outstanding_report_id = ?`,
        [outstandingReportId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(Number(rows?.[0]?.invoice_count ?? 0));
        }
      );
    });
  }

  create(payload) {
    const { report_name, date, created_by, invoices = [] } = payload;

    return getConnectionAsync(this.db).then(async (connection) => {
      try {
        await beginTransactionAsync(connection);
        const reportResult = await new Promise((resolve, reject) => {
          connection.query(
            `INSERT INTO outstanding_report (report_name, date, created_by)
             VALUES (?, ?, ?)`,
            [report_name, date, created_by],
            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            }
          );
        });
        const outstandingReportId = reportResult.insertId;

        if (invoices.length > 0) {
          const rows = buildInvoiceInsertRows(outstandingReportId, invoices);
          await insertRowsInBatches(connection, INSERT_INVOICES_SQL, rows);
        }

        await commitAsync(connection);
        connection.release();
        return {
          outstanding_report_id: outstandingReportId,
          report_name,
          date,
          created_by,
          invoice_count: invoices.length,
        };
      } catch (err) {
        await rollbackAsync(connection);
        connection.release();
        throw err;
      }
    });
  }

  appendInvoices(outstandingReportId, invoices = []) {
    if (!invoices.length) {
      return this.getInvoiceCountByReportId(outstandingReportId).then(
        (invoice_count) => ({ inserted: 0, invoice_count })
      );
    }

    return getConnectionAsync(this.db).then(async (connection) => {
      try {
        await beginTransactionAsync(connection);
        const rows = buildInvoiceInsertRows(outstandingReportId, invoices);
        await insertRowsInBatches(connection, INSERT_INVOICES_SQL, rows);
        await commitAsync(connection);
        connection.release();
        const invoice_count = await this.getInvoiceCountByReportId(
          outstandingReportId
        );
        return { inserted: invoices.length, invoice_count };
      } catch (err) {
        await rollbackAsync(connection);
        connection.release();
        throw err;
      }
    });
  }

  createReportHeader({ report_name, date, created_by }) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `INSERT INTO outstanding_report (report_name, date, created_by)
         VALUES (?, ?, ?)`,
        [report_name, date, created_by],
        (err, result) => {
          if (err) reject(err);
          else resolve(result.insertId);
        }
      );
    });
  }

  getInvoicesByReportId(outstandingReportId, options = {}) {
    const { limit, offset = 0, slim = false } = options;
    const hasPagination =
      limit != null && Number.isFinite(Number(limit)) && Number(limit) > 0;
    const safeLimit = hasPagination ? Math.min(Number(limit), 15000) : null;
    const safeOffset = hasPagination ? Math.max(Number(offset) || 0, 0) : 0;

    return new Promise((resolve, reject) => {
      const params = [outstandingReportId];
      let sql = `${INVOICES_SELECT_SQL}
         WHERE oi.outstanding_report_id = ?
         ORDER BY oi.outstanding_invoice_id ASC`;

      if (hasPagination) {
        sql += " LIMIT ? OFFSET ?";
        params.push(safeLimit, safeOffset);
      }

      this.db.query(sql, params, (err, invoices) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.OUTSTANDING_REPORT",
            code: "REPOSITORY.OUTSTANDING_REPORT.GET_INVOICES_BY_REPORT_ID",
            description: err.toString(),
            category: "",
            ref: { outstandingReportId, limit: safeLimit, offset: safeOffset },
          });
          reject(err);
          return;
        }
        const mapper = slim ? mapInvoiceRowSlim : mapInvoiceRow;
        resolve((invoices || []).map(mapper));
      });
    });
  }

  getInvoicesPageByReportId(outstandingReportId, limit, offset = 0) {
    return Promise.all([
      this.getInvoiceCountByReportId(outstandingReportId),
      this.getInvoicesByReportId(outstandingReportId, {
        limit,
        offset,
        slim: true,
      }),
    ]).then(([total, invoices]) => {
      const nextOffset = offset + invoices.length;
      return {
        invoices,
        total,
        limit: Number(limit),
        offset: Number(offset),
        has_more: nextOffset < total,
      };
    });
  }

  getReportHeaderById(outstandingReportId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT orpt.*,
                e.employee_name as created_by_name
         FROM outstanding_report orpt
         LEFT JOIN employees e
           ON orpt.created_by COLLATE utf8mb4_unicode_ci = e.employee_code COLLATE utf8mb4_unicode_ci
         WHERE orpt.outstanding_report_id = ?`,
        [outstandingReportId],
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
            const invoice_count = await this.getInvoiceCountByReportId(
              outstandingReportId
            );
            resolve({
              ...reports[0],
              invoice_count,
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
        `SELECT orpt.*,
                e.employee_name as created_by_name
         FROM outstanding_report orpt
         LEFT JOIN employees e
           ON orpt.created_by COLLATE utf8mb4_unicode_ci = e.employee_code COLLATE utf8mb4_unicode_ci
         ORDER BY orpt.date DESC, orpt.outstanding_report_id DESC`,
        [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.OUTSTANDING_REPORT",
              code: "REPOSITORY.OUTSTANDING_REPORT.GET_ALL_REPORTS",
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

  getById(outstandingReportId, options = {}) {
    const { includeInvoices = false, limit, offset } = options;
    return this.getReportHeaderById(outstandingReportId).then((report) => {
      if (!report) return null;
      if (!includeInvoices) return report;
      if (limit != null) {
        return this.getInvoicesPageByReportId(
          outstandingReportId,
          limit,
          offset
        ).then((page) => ({
          ...report,
          ...page,
        }));
      }
      return this.getInvoicesByReportId(outstandingReportId, { slim: false }).then(
        (invoices) => ({
          ...report,
          invoices,
        })
      );
    });
  }

  getLatestReportIdByDate(date) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT outstanding_report_id
         FROM outstanding_report
         WHERE date <= DATE(?)
         ORDER BY date DESC, outstanding_report_id DESC
         LIMIT 1`,
        [date],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows?.[0]?.outstanding_report_id ?? null);
        }
      );
    });
  }

  getLatestReportByDate(date, options = {}) {
    const { includeInvoices = false, limit, offset } = options;
    return this.getLatestReportIdByDate(date).then((reportId) => {
      if (!reportId) return null;
      return this.getById(reportId, { includeInvoices, limit, offset });
    });
  }

  getLatestInvoicesPageByDate(date, limit, offset = 0) {
    return this.getLatestReportIdByDate(date).then((reportId) => {
      if (!reportId) return null;
      return this.getReportHeaderById(reportId).then((report) => {
        if (!report) return null;
        return this.getInvoicesPageByReportId(reportId, limit, offset).then(
          (page) => ({
            ...report,
            ...page,
          })
        );
      });
    });
  }

  delete(outstandingReportId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `DELETE FROM outstanding_report WHERE outstanding_report_id = ?`,
        [outstandingReportId],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.OUTSTANDING_REPORT",
              code: "REPOSITORY.OUTSTANDING_REPORT.DELETE",
              description: err.toString(),
              category: "",
              ref: { outstandingReportId },
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
  return new OutstandingReportRepository(db);
};
