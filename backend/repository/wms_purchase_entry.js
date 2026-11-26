const logger = require("../utils/logger");

class WmsPurchaseEntryRepository {
  constructor(db) {
    this.db = db;
  }

  create(payload, items) {
    return new Promise((resolve, reject) => {
      try {
        // Remove purchase_entry_id from payload if present (it will be auto-generated)
        const { purchase_entry_id, ...dataToInsert } = payload;
        const columns = Object.keys(dataToInsert);
        const values = columns.map((c) => dataToInsert[c]);
        const tickedColumns = columns.map((c) => `\`${c}\``).join(",");
        const placeholders = columns.map(() => "?").join(",");

        const sql = `INSERT INTO wms_purchase_entry (${tickedColumns}) VALUES (${placeholders})`;

        this.db.query(sql, values, async (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.WMS_PURCHASE_ENTRY",
              code: "REPOSITORY.WMS_PURCHASE_ENTRY.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }

          const purchase_entry_id = result.insertId;

          if (items && items.length > 0) {
            const filteredItems = items.map((item) => {
              return [
                purchase_entry_id,
                item.product_id,
                item.quantity,
                item.rate,
              ];
            });

            const validItems = filteredItems.filter(
              (arr) =>
                arr[1] !== undefined &&
                arr[1] !== null &&
                arr[2] !== undefined &&
                arr[2] !== null &&
                arr[2] >= 1 &&
                arr[3] !== undefined &&
                arr[3] !== null &&
                arr[3] >= 0
            );

            if (validItems.length > 0) {
              this.db.query(
                `INSERT INTO wms_purchase_entry_items 
                (purchase_entry_id, product_id, quantity, rate) 
                VALUES ?`,
                [validItems],
                (err2) => {
                  if (err2) {
                    logger.Log({
                      level: logger.LEVEL.ERROR,
                      component: "REPOSITORY.WMS_PURCHASE_ENTRY",
                      code: "REPOSITORY.WMS_PURCHASE_ENTRY.ITEMS.CREATE.ERROR",
                      description: err2.toString(),
                      category: "",
                      ref: {},
                    });
                    reject(err2);
                    return;
                  }
                  resolve(purchase_entry_id);
                }
              );
            } else {
              resolve(purchase_entry_id);
            }
          } else {
            resolve(purchase_entry_id);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  update(purchase_entry_id, payload, items) {
    return new Promise((resolve, reject) => {
      // Remove purchase_entry_id from payload if present (cannot be updated)
      const { purchase_entry_id: _, ...dataToUpdate } = payload;

      const updateFields = [];
      const updateValues = [];

      if (Object.keys(dataToUpdate).length > 0) {
        Object.keys(dataToUpdate).forEach((key) => {
          updateFields.push(`\`${key}\` = ?`);
          updateValues.push(dataToUpdate[key]);
        });
      }

      if (updateFields.length === 0 && items === undefined) {
        resolve({ affectedRows: 0 });
        return;
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(purchase_entry_id);

      const sql = `UPDATE wms_purchase_entry SET ${updateFields.join(
        ", "
      )} WHERE purchase_entry_id = ?`;

      this.db.query(sql, updateValues, (err) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.WMS_PURCHASE_ENTRY",
            code: "REPOSITORY.WMS_PURCHASE_ENTRY.UPDATE.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }

        if (items !== undefined) {
          this.db.query(
            "DELETE FROM wms_purchase_entry_items WHERE purchase_entry_id = ?",
            [purchase_entry_id],
            (err2) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.WMS_PURCHASE_ENTRY",
                  code: "REPOSITORY.WMS_PURCHASE_ENTRY.ITEMS.DELETE.ERROR",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }

              if (items && items.length > 0) {
                const filteredItems = items.map((item) => {
                  return [
                    purchase_entry_id,
                    item.product_id,
                    item.quantity,
                    item.rate,
                  ];
                });

                const validItems = filteredItems.filter(
                  (arr) =>
                    arr[1] !== undefined &&
                    arr[1] !== null &&
                    arr[2] !== undefined &&
                    arr[2] !== null &&
                    arr[2] >= 1 &&
                    arr[3] !== undefined &&
                    arr[3] !== null &&
                    arr[3] >= 0
                );

                if (validItems.length > 0) {
                  this.db.query(
                    `INSERT INTO wms_purchase_entry_items 
                    (purchase_entry_id, product_id, quantity, rate) 
                    VALUES ?`,
                    [validItems],
                    (err3) => {
                      if (err3) {
                        logger.Log({
                          level: logger.LEVEL.ERROR,
                          component: "REPOSITORY.WMS_PURCHASE_ENTRY",
                          code: "REPOSITORY.WMS_PURCHASE_ENTRY.ITEMS.INSERT.ERROR",
                          description: err3.toString(),
                          category: "",
                          ref: {},
                        });
                        reject(err3);
                        return;
                      }
                      resolve({ affectedRows: 1 });
                    }
                  );
                } else {
                  resolve({ affectedRows: 1 });
                }
              } else {
                resolve({ affectedRows: 1 });
              }
            }
          );
        } else {
          resolve({ affectedRows: 1 });
        }
      });
    });
  }

  getAll() {
    return new Promise((resolve, reject) => {
      try {
        this.db.query(
          `SELECT 
            pe.*,
            pa.invoice_date,
            pa.invoice_no,
            pa.supplier_id,
            pa.amount as actual_invoice_amount,
            pa.branch_id as purchase_acknowledgment_branch_id,
            bpa.branch_name as purchase_acknowledgment_branch_name,
            ml.name as supplier_name,
            ml.phone as supplier_phone,
            e.employee_name,
            e.designation_id,
            d.designation_name,
            b.branch_name,
            b.branch_id
          FROM wms_purchase_entry pe 
          LEFT JOIN purchase_acknowledgment pa ON pe.purchase_acknowledgment_id = pa.purchase_acknowledgment_id
          LEFT JOIN master_list ml ON pa.supplier_id = ml.master_id
          LEFT JOIN branches bpa ON pa.branch_id = bpa.branch_id
          LEFT JOIN employees e ON pe.handled_by = e.employee_code
          LEFT JOIN branches b ON e.branch_id = b.branch_id 
          LEFT JOIN designations d ON e.designation_id = d.designation_id
          ORDER BY pe.created_at DESC`,
          [],
          (err, entries) => {
            if (err) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.WMS_PURCHASE_ENTRY",
                code: "REPOSITORY.WMS_PURCHASE_ENTRY.GETALL.ERROR",
                description: err.toString(),
                category: "",
                ref: {},
              });
              reject(err);
              return;
            }

            const results = [];
            let count = 0;

            if (!entries.length) return resolve([]);

            entries.forEach((entry) => {
              this.db.query(
                `SELECT pei.*, p.de_name as product_name, p.product_id
                 FROM wms_purchase_entry_items pei
                 LEFT JOIN products p ON pei.product_id = p.product_id
                 WHERE pei.purchase_entry_id = ?`,
                [entry.purchase_entry_id],
                (err2, items) => {
                  if (err2) {
                    logger.Log({
                      level: logger.LEVEL.ERROR,
                      component: "REPOSITORY.WMS_PURCHASE_ENTRY",
                      code: "REPOSITORY.WMS_PURCHASE_ENTRY.ITEMS.GETALL.ERROR",
                      description: err2.toString(),
                      category: "",
                      ref: {},
                    });
                    reject(err2);
                    return;
                  }

                  results.push({
                    ...entry,
                    items: items.map((item) => ({
                      wms_purchase_entry_item_id: item.wms_purchase_entry_item_id,
                      product_id: item.product_id,
                      quantity: item.quantity,
                      rate: item.rate,
                      product: item.product_id
                        ? {
                            product_id: item.product_id,
                            product_name: item.product_name,
                          }
                        : null,
                    })),
                  });

                  count++;
                  if (count === entries.length) {
                    resolve(results);
                  }
                }
              );
            });
          }
        );
      } catch (error) {
        logger.Log({
          level: logger.LEVEL.ERROR,
          component: "REPOSITORY.WMS_PURCHASE_ENTRY",
          code: "REPOSITORY.WMS_PURCHASE_ENTRY.GETALL.ERROR",
          description: error.toString(),
          category: "",
          ref: {},
        });
        reject(error);
      }
    });
  }

  getById(purchase_entry_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
          pe.*,
          pa.invoice_date,
          pa.invoice_no,
          pa.supplier_id,
          pa.amount as actual_invoice_amount,
          pa.branch_id as purchase_acknowledgment_branch_id,
          bpa.branch_name as purchase_acknowledgment_branch_name,
          ml.name as supplier_name,
          ml.phone as supplier_phone,
          e.employee_name,
          e.designation_id,
          d.designation_name,
          b.branch_name,
          b.branch_id
        FROM wms_purchase_entry pe 
        LEFT JOIN purchase_acknowledgment pa ON pe.purchase_acknowledgment_id = pa.purchase_acknowledgment_id
        LEFT JOIN master_list ml ON pa.supplier_id = ml.master_id
        LEFT JOIN branches bpa ON pa.branch_id = bpa.branch_id
        LEFT JOIN employees e ON pe.handled_by = e.employee_code
        LEFT JOIN branches b ON e.branch_id = b.branch_id 
        LEFT JOIN designations d ON e.designation_id = d.designation_id
        WHERE pe.purchase_entry_id = ?`,
        [purchase_entry_id],
        (err, entries) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.WMS_PURCHASE_ENTRY",
              code: "REPOSITORY.WMS_PURCHASE_ENTRY.GETBYID.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }

          if (!entries.length) return resolve(null);

          const entry = entries[0];
          this.db.query(
            `SELECT pei.*, p.de_name as product_name, p.product_id
             FROM wms_purchase_entry_items pei
             LEFT JOIN products p ON pei.product_id = p.product_id
             WHERE pei.purchase_entry_id = ?`,
            [purchase_entry_id],
            (err2, items) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.WMS_PURCHASE_ENTRY",
                  code: "REPOSITORY.WMS_PURCHASE_ENTRY.ITEMS.GETBYID.ERROR",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }

              resolve({
                ...entry,
                items: items.map((item) => ({
                  wms_purchase_entry_item_id: item.wms_purchase_entry_item_id,
                  product_id: item.product_id,
                  quantity: item.quantity,
                  rate: item.rate,
                  product: item.product_id
                    ? {
                        product_id: item.product_id,
                        product_name: item.product_name,
                      }
                    : null,
                })),
              });
            }
          );
        }
      );
    });
  }

  delete(purchase_entry_id) {
    return new Promise((resolve, reject) => {
      // Delete items first (cascade should handle this, but being explicit)
      this.db.query(
        "DELETE FROM wms_purchase_entry_items WHERE purchase_entry_id = ?",
        [purchase_entry_id],
        (err) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.WMS_PURCHASE_ENTRY",
              code: "REPOSITORY.WMS_PURCHASE_ENTRY.ITEMS.DELETE.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }

          this.db.query(
            "DELETE FROM wms_purchase_entry WHERE purchase_entry_id = ?",
            [purchase_entry_id],
            (err2, result) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.WMS_PURCHASE_ENTRY",
                  code: "REPOSITORY.WMS_PURCHASE_ENTRY.DELETE.ERROR",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }
              resolve({ affectedRows: result.affectedRows });
            }
          );
        }
      );
    });
  }
}

module.exports = (db) => {
  return new WmsPurchaseEntryRepository(db);
};
