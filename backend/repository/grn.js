const logger = require("../utils/logger");

class GrnRepository {
  constructor(db) {
    this.db = db;
  }

  create(grnData) {
    return new Promise((resolve, reject) => {
      try {
        const {
          purchase_acknowledgment_id,
          employee_id,
          missing_qty,
          missing_value,
          credit_note_link,
          purchase_order_id,
          grn_method,
        } = grnData;

        const sql = `INSERT INTO grn 
          (purchase_acknowledgment_id, employee_id, missing_qty, missing_value, credit_note_link, purchase_order_id, grn_method) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`;

        this.db.query(
          sql,
          [
            purchase_acknowledgment_id,
            employee_id || null,
            missing_qty || null,
            missing_value || null,
            credit_note_link || null,
            purchase_order_id || null,
            grn_method || null,
          ],
          (err, result) => {
            if (err) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.GRN",
                code: "REPOSITORY.GRN.CREATE",
                description: err.toString(),
                category: "",
                ref: { grnData },
              });
              reject(err);
              return;
            }

            resolve(result.insertId);
          }
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT g.*, 
                e.employee_name,
                pa.invoice_no, pa.invoice_date, pa.amount, pa.supplier_id, pa.branch_id,
                ml.name as supplier_name, ml.phone as supplier_phone,
                b.branch_name as purchase_acknowledgment_branch_name
         FROM grn g
         LEFT JOIN employees e ON g.employee_id = e.employee_code
         LEFT JOIN purchase_acknowledgment pa ON g.purchase_acknowledgment_id = pa.purchase_acknowledgment_id
         LEFT JOIN master_list ml ON pa.supplier_id = ml.master_id
         LEFT JOIN branches b ON pa.branch_id = b.branch_id
         WHERE g.grn_id = ?`,
        [id],
        (err, results) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.GRN",
              code: "REPOSITORY.GRN.GET-BY-ID",
              description: err.toString(),
              category: "",
              ref: { id },
            });
            reject(err);
            return;
          }

          if (!results.length) return resolve(undefined);

          const result = results[0];
          resolve({
            grn_id: result.grn_id,
            purchase_acknowledgment_id: result.purchase_acknowledgment_id,
            employee_id: result.employee_id,
            missing_qty: result.missing_qty,
            missing_value: result.missing_value,
            credit_note_link: result.credit_note_link,
            purchase_order_id: result.purchase_order_id,
            grn_method: result.grn_method,
            created_at: result.created_at,
            updated_at: result.updated_at,
            is_grn_entry: !!result.employee_id,
            is_product_stock_missing: !!result.missing_qty,
            employee: result.employee_id
              ? {
                  employee_code: result.employee_id,
                  employee_name: result.employee_name,
                }
              : null,
            purchase_acknowledgment: result.purchase_acknowledgment_id
              ? {
                  purchase_acknowledgment_id: result.purchase_acknowledgment_id,
                  invoice_no: result.invoice_no,
                  invoice_date: result.invoice_date,
                  amount: result.amount,
                  supplier_id: result.supplier_id,
                  branch_id: result.branch_id || null,
                  branch_name: result.purchase_acknowledgment_branch_name || null,
                  supplier: result.supplier_id
                    ? {
                        master_id: result.supplier_id,
                        name: result.supplier_name,
                        phone: result.supplier_phone,
                      }
                    : null,
                }
              : null,
          });
        }
      );
    });
  }

  getByPurchaseAcknowledgmentId(purchaseAcknowledgmentId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT g.*, 
                e.employee_name,
                pa.invoice_no, pa.invoice_date, pa.amount, pa.supplier_id, pa.branch_id,
                ml.name as supplier_name, ml.phone as supplier_phone,
                b.branch_name as purchase_acknowledgment_branch_name
         FROM grn g
         LEFT JOIN employees e ON g.employee_id = e.employee_code
         LEFT JOIN purchase_acknowledgment pa ON g.purchase_acknowledgment_id = pa.purchase_acknowledgment_id
         LEFT JOIN master_list ml ON pa.supplier_id = ml.master_id
         LEFT JOIN branches b ON pa.branch_id = b.branch_id
         WHERE g.purchase_acknowledgment_id = ?`,
        [purchaseAcknowledgmentId],
        (err, results) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.GRN",
              code: "REPOSITORY.GRN.GET-BY-PURCHASE-ACK-ID",
              description: err.toString(),
              category: "",
              ref: { purchaseAcknowledgmentId },
            });
            reject(err);
            return;
          }

          if (!results.length) return resolve(null);

          const result = results[0];
          resolve({
            grn_id: result.grn_id,
            purchase_acknowledgment_id: result.purchase_acknowledgment_id,
            employee_id: result.employee_id,
            missing_qty: result.missing_qty,
            missing_value: result.missing_value,
            credit_note_link: result.credit_note_link,
            purchase_order_id: result.purchase_order_id,
            grn_method: result.grn_method,
            created_at: result.created_at,
            updated_at: result.updated_at,
            is_grn_entry: !!result.employee_id,
            is_product_stock_missing: !!result.missing_qty,
            employee: result.employee_id
              ? {
                  employee_code: result.employee_id,
                  employee_name: result.employee_name,
                }
              : null,
            purchase_acknowledgment: result.purchase_acknowledgment_id
              ? {
                  purchase_acknowledgment_id: result.purchase_acknowledgment_id,
                  invoice_no: result.invoice_no,
                  invoice_date: result.invoice_date,
                  amount: result.amount,
                  supplier_id: result.supplier_id,
                  branch_id: result.branch_id || null,
                  branch_name: result.purchase_acknowledgment_branch_name || null,
                  supplier: result.supplier_id
                    ? {
                        master_id: result.supplier_id,
                        name: result.supplier_name,
                        phone: result.supplier_phone,
                      }
                    : null,
                }
              : null,
          });
        }
      );
    });
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT g.*, 
                e.employee_name,
                pa.invoice_no, pa.invoice_date, pa.amount, pa.supplier_id, pa.branch_id,
                ml.name as supplier_name, ml.phone as supplier_phone,
                b.branch_name as purchase_acknowledgment_branch_name
         FROM grn g
         LEFT JOIN employees e ON g.employee_id = e.employee_code
         LEFT JOIN purchase_acknowledgment pa ON g.purchase_acknowledgment_id = pa.purchase_acknowledgment_id
         LEFT JOIN master_list ml ON pa.supplier_id = ml.master_id
         LEFT JOIN branches b ON pa.branch_id = b.branch_id
         ORDER BY g.created_at DESC`,
        [],
        (err, results) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.GRN",
              code: "REPOSITORY.GRN.GET-ALL",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }

          const data = results.map((result) => ({
            grn_id: result.grn_id,
            purchase_acknowledgment_id: result.purchase_acknowledgment_id,
            employee_id: result.employee_id,
            missing_qty: result.missing_qty,
            missing_value: result.missing_value,
            credit_note_link: result.credit_note_link,
            purchase_order_id: result.purchase_order_id,
            grn_method: result.grn_method,
            created_at: result.created_at,
            updated_at: result.updated_at,
            is_grn_entry: !!result.employee_id,
            is_product_stock_missing: !!result.missing_qty,
            employee: result.employee_id
              ? {
                  employee_code: result.employee_id,
                  employee_name: result.employee_name,
                }
              : null,
            purchase_acknowledgment: result.purchase_acknowledgment_id
              ? {
                  purchase_acknowledgment_id: result.purchase_acknowledgment_id,
                  invoice_no: result.invoice_no,
                  invoice_date: result.invoice_date,
                  amount: result.amount,
                  supplier_id: result.supplier_id,
                  branch_id: result.branch_id || null,
                  branch_name: result.purchase_acknowledgment_branch_name || null,
                  supplier: result.supplier_id
                    ? {
                        master_id: result.supplier_id,
                        name: result.supplier_name,
                        phone: result.supplier_phone,
                      }
                    : null,
                }
              : null,
          }));

          resolve(data);
        }
      );
    });
  }

  update(id, grnData) {
    return new Promise((resolve, reject) => {
      const updateFields = [];
      const updateValues = [];

      // Check if property exists in the object (including null values)
      // This allows explicitly setting fields to null
      if ("employee_id" in grnData) {
        updateFields.push("employee_id = ?");
        updateValues.push(grnData.employee_id);
      }
      if ("missing_qty" in grnData) {
        updateFields.push("missing_qty = ?");
        updateValues.push(grnData.missing_qty);
      }
      if ("missing_value" in grnData) {
        updateFields.push("missing_value = ?");
        updateValues.push(grnData.missing_value);
      }
      if ("credit_note_link" in grnData) {
        updateFields.push("credit_note_link = ?");
        updateValues.push(grnData.credit_note_link);
      }
      if ("purchase_order_id" in grnData) {
        updateFields.push("purchase_order_id = ?");
        updateValues.push(grnData.purchase_order_id);
      }
      if ("grn_method" in grnData) {
        updateFields.push("grn_method = ?");
        updateValues.push(grnData.grn_method);
      }

      if (updateFields.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(id);

      const sql = `UPDATE grn SET ${updateFields.join(", ")} WHERE grn_id = ?`;

      this.db.query(sql, updateValues, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.GRN",
            code: "REPOSITORY.GRN.UPDATE",
            description: err.toString(),
            category: "",
            ref: { id, grnData },
          });
          reject(err);
          return;
        }
        resolve({ affectedRows: result.affectedRows });
      });
    });
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      this.db.query("DELETE FROM grn WHERE grn_id = ?", [id], (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.GRN",
            code: "REPOSITORY.GRN.DELETE",
            description: err.toString(),
            category: "",
            ref: { id },
          });
          reject(err);
          return;
        }
        resolve({ affectedRows: result.affectedRows, id });
      });
    });
  }

  hasGrnForPurchaseAcknowledgment(purchaseAcknowledgmentId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT COUNT(*) as count
         FROM grn
         WHERE purchase_acknowledgment_id = ? AND employee_id IS NOT NULL`,
        [purchaseAcknowledgmentId],
        (err, results) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.GRN",
              code: "REPOSITORY.GRN.HAS-GRN",
              description: err.toString(),
              category: "",
              ref: { purchaseAcknowledgmentId },
            });
            reject(err);
            return;
          }

          resolve(results[0].count > 0);
        }
      );
    });
  }

  getHasGrnForMultiple(purchaseAcknowledgmentIds) {
    return new Promise((resolve, reject) => {
      if (
        !purchaseAcknowledgmentIds ||
        purchaseAcknowledgmentIds.length === 0
      ) {
        resolve({});
        return;
      }

      const placeholders = purchaseAcknowledgmentIds.map(() => "?").join(",");
      this.db.query(
        `SELECT purchase_acknowledgment_id, 
                COUNT(*) as count
         FROM grn
         WHERE purchase_acknowledgment_id IN (${placeholders})
           AND employee_id IS NOT NULL
         GROUP BY purchase_acknowledgment_id`,
        purchaseAcknowledgmentIds,
        (err, results) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.GRN",
              code: "REPOSITORY.GRN.GET-HAS-GRN-MULTIPLE",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }

          const hasGrnMap = {};
          purchaseAcknowledgmentIds.forEach((id) => {
            hasGrnMap[id] = false;
          });

          results.forEach((result) => {
            hasGrnMap[result.purchase_acknowledgment_id] = result.count > 0;
          });

          resolve(hasGrnMap);
        }
      );
    });
  }
}

module.exports = (db) => {
  return new GrnRepository(db);
};
