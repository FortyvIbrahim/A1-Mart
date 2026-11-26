const logger = require("../utils/logger");

class DeadStockReportRepository {
  constructor(db) {
    this.db = db;
  }

  create(payload) {
    return new Promise((resolve, reject) => {
      const { report_name, date, created_by, products } = payload;
      this.db.getConnection((connErr, connection) => {
        if (connErr) {
          reject(connErr);
          return;
        }

        connection.beginTransaction((txErr) => {
          if (txErr) {
            connection.release();
            reject(txErr);
            return;
          }

          connection.query(
            `INSERT INTO dead_stock_report (report_name, date, created_by)
             VALUES (?, ?, ?)`,
            [report_name, date, created_by],
            (err, result) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  logger.Log({
                    level: logger.LEVEL.ERROR,
                    component: "REPOSITORY.DEAD_STOCK_REPORT",
                    code: "REPOSITORY.DEAD_STOCK_REPORT.CREATE_REPORT",
                    description: err.toString(),
                    category: "",
                    ref: { report_name, date, created_by },
                  });
                  reject(err);
                });
              }

              const deadStockReportId = result.insertId;
              const rows = (products || []).map((p) => [
                deadStockReportId,
                p.product_id,
                p.branch_id,
                p["30_days_stock"],
                p["30_days_stock_value"],
                p["90_days_stock"],
                p["90_days_stock_value"],
                p["120_days_stock"],
                p["120_days_stock_value"],
                p["than_120_days_stock"],
                p["than_120_days_stock_value"],
              ]);

              if (rows.length === 0) {
                return connection.commit((commitErr) => {
                  if (commitErr) {
                    return connection.rollback(() => {
                      connection.release();
                      reject(commitErr);
                    });
                  }
                  connection.release();
                  resolve({
                    dead_stock_report_id: deadStockReportId,
                    report_name,
                    date,
                    created_by,
                    products: [],
                  });
                });
              }

              connection.query(
                `INSERT INTO dead_stock_products
                (dead_stock_report_id, product_id, branch_id, \`30_days_stock\`, \`30_days_stock_value\`, \`90_days_stock\`, \`90_days_stock_value\`, \`120_days_stock\`, \`120_days_stock_value\`, \`than_120_days_stock\`, \`than_120_days_stock_value\`)
                VALUES ?`,
                [rows],
                (productsErr) => {
                  if (productsErr) {
                    return connection.rollback(() => {
                      connection.release();
                      logger.Log({
                        level: logger.LEVEL.ERROR,
                        component: "REPOSITORY.DEAD_STOCK_REPORT",
                        code: "REPOSITORY.DEAD_STOCK_REPORT.CREATE_PRODUCTS",
                        description: productsErr.toString(),
                        category: "",
                        ref: { dead_stock_report_id: deadStockReportId },
                      });
                      reject(productsErr);
                    });
                  }

                  connection.commit((commitErr) => {
                    if (commitErr) {
                      return connection.rollback(() => {
                        connection.release();
                        reject(commitErr);
                      });
                    }
                    connection.release();
                    resolve({
                      dead_stock_report_id: deadStockReportId,
                      report_name,
                      date,
                      created_by,
                      products,
                    });
                  });
                }
              );
            }
          );
        });
      });
    });
  }

  getAllReports() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT dsr.*,
                e.employee_name as created_by_name
         FROM dead_stock_report dsr
         LEFT JOIN employees e
           ON dsr.created_by COLLATE utf8mb4_unicode_ci = e.employee_code COLLATE utf8mb4_unicode_ci
         ORDER BY dsr.date DESC, dsr.dead_stock_report_id DESC`,
        [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.DEAD_STOCK_REPORT",
              code: "REPOSITORY.DEAD_STOCK_REPORT.GET_ALL_REPORTS",
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

  getById(deadStockReportId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT dsr.*,
                e.employee_name as created_by_name
         FROM dead_stock_report dsr
         LEFT JOIN employees e
           ON dsr.created_by COLLATE utf8mb4_unicode_ci = e.employee_code COLLATE utf8mb4_unicode_ci
         WHERE dsr.dead_stock_report_id = ?`,
        [deadStockReportId],
        (err, reports) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.DEAD_STOCK_REPORT",
              code: "REPOSITORY.DEAD_STOCK_REPORT.GET_BY_ID",
              description: err.toString(),
              category: "",
              ref: { deadStockReportId },
            });
            reject(err);
            return;
          }
          if (!reports || reports.length === 0) {
            resolve(null);
            return;
          }

          const report = reports[0];
          this.db.query(
            `SELECT dsp.dead_stock_product_id,
                    dsp.dead_stock_report_id,
                    dsp.product_id,
                    dsp.branch_id,
                    dsp.\`30_days_stock\`,
                    dsp.\`30_days_stock_value\`,
                    dsp.\`90_days_stock\`,
                    dsp.\`90_days_stock_value\`,
                    dsp.\`120_days_stock\`,
                    dsp.\`120_days_stock_value\`,
                    dsp.\`than_120_days_stock\`,
                    dsp.\`than_120_days_stock_value\`,
                    dsp.created_at as ds_created_at,
                    dsp.updated_at as ds_updated_at,
                    p.de_name as product_name,
                    p.*,
                    p.created_at as product_created_at,
                    p.updated_at as product_updated_at,
                    pc.category_name,
                    psc.subcategory_name,
                    pd.department_name,
                    pb.brand_name,
                    b.branch_name,
                    ml_supplier.master_id AS supplier_id,
                    ml_supplier.name AS supplier_name
             FROM dead_stock_products dsp
             LEFT JOIN products p ON dsp.product_id = p.product_id
             LEFT JOIN master_list ml_supplier
               ON ml_supplier.master_id = p.distributor_id
             LEFT JOIN branches b ON dsp.branch_id = b.branch_id
             LEFT JOIN products_categories pc ON p.category_id = pc.category_id
             LEFT JOIN products_subcategories psc ON psc.subcategory_id = p.subcategory_id
             LEFT JOIN products_department pd ON pd.department_id = p.department_id
             LEFT JOIN products_brands pb ON pb.brand_id = p.brand_id
             WHERE dsp.dead_stock_report_id = ?
             ORDER BY dsp.dead_stock_product_id DESC`,
            [deadStockReportId],
            (productsErr, products) => {
              if (productsErr) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.DEAD_STOCK_REPORT",
                  code: "REPOSITORY.DEAD_STOCK_REPORT.GET_PRODUCTS_BY_REPORT_ID",
                  description: productsErr.toString(),
                  category: "",
                  ref: { deadStockReportId },
                });
                reject(productsErr);
                return;
              }
              resolve({
                ...report,
                products: (products || []).map((item) => ({
                  dead_stock_product_id: item.dead_stock_product_id,
                  dead_stock_report_id: item.dead_stock_report_id,
                  product_id: item.product_id,
                  "30_days_stock": item["30_days_stock"],
                  "30_days_stock_value": item["30_days_stock_value"],
                  "90_days_stock": item["90_days_stock"],
                  "90_days_stock_value": item["90_days_stock_value"],
                  "120_days_stock": item["120_days_stock"],
                  "120_days_stock_value": item["120_days_stock_value"],
                  "than_120_days_stock": item["than_120_days_stock"],
                  "than_120_days_stock_value": item["than_120_days_stock_value"],
                  created_at: item.ds_created_at,
                  updated_at: item.ds_updated_at,
                  product: item.product_id
                    ? {
                        product_id: item.product_id,
                        variant: item.variant,
                        variant_of: item.variant_of,
                        gf_item_name: item.gf_item_name,
                        gf_description: item.gf_description,
                        gf_detailed_description: item.gf_detailed_description,
                        gf_weight_grams: item.gf_weight_grams,
                        gf_applies_online: item.gf_applies_online,
                        gf_item_product_type: item.gf_item_product_type,
                        gf_manufacturer: item.gf_manufacturer,
                        gf_food_type: item.gf_food_type,
                        gf_tax_id: item.gf_tax_id,
                        gf_status: item.gf_status,
                        de_distributor: item.de_distributor,
                        distributor_id: item.distributor_id ?? null,
                        brand_id: item.brand_id,
                        category_id: item.category_id,
                        subcategory_id: item.subcategory_id,
                        measure: item.measure,
                        measure_in: item.measure_in,
                        packaging_type: item.packaging_type,
                        cleaning: item.cleaning,
                        sticker: item.sticker,
                        grinding: item.grinding,
                        cover_type: item.cover_type,
                        cover_sizes: item.cover_sizes,
                        return_prod: item.return_prod,
                        de_display_name: item.de_display_name,
                        department_id: item.department_id,
                        de_name: item.de_name,
                        de_packaging_type: item.de_packaging_type,
                        de_preparation_type: item.de_preparation_type,
                        de_combo_name: item.de_combo_name,
                        de_buyer_name: item.de_buyer_name,
                        image_url: item.image_url,
                        repln_mode: item.repln_mode,
                        store_uom: item.store_uom,
                        ean_number: item.ean_number,
                        created_at: item.product_created_at || item.created_at,
                        updated_at: item.product_updated_at || item.updated_at,
                        category_name: item.category_name,
                        subcategory_name: item.subcategory_name,
                        department_name: item.department_name,
                        brand_name: item.brand_name,
                        supplier_id: item.supplier_id ?? null,
                        supplier_name: item.supplier_name ?? null,
                      }
                    : null,
                  branch_id: item.branch_id,
                  branch_name: item.branch_name ?? null,
                })),
              });
            }
          );
        }
      );
    });
  }

  getLatestReportByDate(date) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT dead_stock_report_id
         FROM dead_stock_report
         WHERE date <= DATE(?)
         ORDER BY date DESC, dead_stock_report_id DESC
         LIMIT 1`,
        [date],
        async (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.DEAD_STOCK_REPORT",
              code: "REPOSITORY.DEAD_STOCK_REPORT.GET_LATEST_BY_DATE",
              description: err.toString(),
              category: "",
              ref: { date },
            });
            reject(err);
            return;
          }
          if (!rows || rows.length === 0) {
            resolve(null);
            return;
          }
          try {
            const report = await this.getById(rows[0].dead_stock_report_id);
            resolve(report);
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  }

  delete(deadStockReportId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `DELETE FROM dead_stock_report WHERE dead_stock_report_id = ?`,
        [deadStockReportId],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.DEAD_STOCK_REPORT",
              code: "REPOSITORY.DEAD_STOCK_REPORT.DELETE",
              description: err.toString(),
              category: "",
              ref: { deadStockReportId },
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
  return new DeadStockReportRepository(db);
};
