const logger = require("../utils/logger");

class PurchaseEntryRepository {
  constructor(db) {
    this.db = db;
  }

  create(purchaseEntryData, items) {
    return new Promise(async (resolve, reject) => {
      try {
        const {
          purchase_order_id,
          invoice_no,
          invoice_date,
          invoice_file,
          accounts_file,
          discount,
          adjustment,
          tax,
        } =
          purchaseEntryData;

        const sql = `INSERT INTO purchase_entry 
          (purchase_order_id, invoice_no, invoice_date, invoice_file, accounts_file, discount, adjustment, tax) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        this.db.query(
          sql,
          [
            purchase_order_id || null,
            invoice_no || null,
            invoice_date || null,
            invoice_file || null,
            accounts_file || null,
            discount !== undefined ? discount : 0.0,
            adjustment !== undefined ? adjustment : 0.0,
            tax !== undefined ? tax : 0.0,
          ],
          async (err, result) => {
            if (err) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.PURCHASE_ENTRY",
                code: "REPOSITORY.PURCHASE_ENTRY.CREATE",
                description: err.toString(),
                category: "",
                ref: { purchaseEntryData },
              });
              reject(err);
              return;
            }

            const purchase_entry_id = result.insertId;

            if (items && items.length > 0) {
              const filteredItems = items.map((item) => {
                return [
                  purchase_entry_id,
                  item.material_id,
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
                  `INSERT INTO purchase_entry_items 
                  (purchase_entry_id, material_id, quantity, rate) 
                  VALUES ?`,
                  [validItems],
                  (err2) => {
                    if (err2) {
                      logger.Log({
                        level: logger.LEVEL.ERROR,
                        component: "REPOSITORY.PURCHASE_ENTRY",
                        code: "REPOSITORY.PURCHASE_ENTRY.ITEMS.CREATE",
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
        `SELECT pe.*, po.vendor_id, ml.name as vendor_name, ml.phone as vendor_phone
         FROM purchase_entry pe
         LEFT JOIN purchase_order po ON pe.purchase_order_id = po.purchase_order_id
         LEFT JOIN master_list ml ON po.vendor_id = ml.master_id
         WHERE pe.purchase_entry_id = ?`,
        [id],
        (err, entries) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_ENTRY",
              code: "REPOSITORY.PURCHASE_ENTRY.GET-BY-ID",
              description: err.toString(),
              category: "",
              ref: { id },
            });
            reject(err);
            return;
          }

          if (!entries.length) return resolve(undefined);

          const entry = entries[0];
          this.db.query(
            `SELECT pei.*, m.*
             FROM purchase_entry_items pei
             LEFT JOIN materials m ON pei.material_id = m.material_id
             WHERE pei.purchase_entry_id = ?`,
            [id],
            (err2, items) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PURCHASE_ENTRY",
                  code: "REPOSITORY.PURCHASE_ENTRY.ITEMS.GET-BY-ID",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }

              resolve({
                purchase_entry_id: entry.purchase_entry_id,
                purchase_order_id: entry.purchase_order_id,
                invoice_no: entry.invoice_no,
                invoice_date: entry.invoice_date,
                invoice_file: entry.invoice_file,
                accounts_file: entry.accounts_file,
                discount: entry.discount,
                adjustment: entry.adjustment,
                tax: entry.tax,
                created_at: entry.created_at,
                updated_at: entry.updated_at,
                vendor: entry.vendor_id
                  ? {
                      master_id: entry.vendor_id,
                      name: entry.vendor_name,
                      phone: entry.vendor_phone,
                    }
                  : null,
                items: items.map((item) => ({
                  purchase_entry_item_id: item.purchase_entry_item_id,
                  material_id: item.material_id,
                  quantity: item.quantity,
                  rate: item.rate,
                  material: item.material_id
                    ? {
                        material_id: item.material_id,
                        name: item.name,
                        description: item.description,
                        unit_id: item.unit_id,
                        material_category_id: item.material_category_id,
                        supplier_id: item.supplier_id,
                        live_stock: item.live_stock,
                        image_url: item.image_url,
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

  getAll() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT pe.*, po.vendor_id, po.purchase_order_ref, ml.name as vendor_name, ml.phone as vendor_phone
         FROM purchase_entry pe
         LEFT JOIN purchase_order po ON pe.purchase_order_id = po.purchase_order_id
         LEFT JOIN master_list ml ON po.vendor_id = ml.master_id
         ORDER BY pe.created_at DESC`,
        [],
        (err, entries) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_ENTRY",
              code: "REPOSITORY.PURCHASE_ENTRY.GET-ALL",
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
              `SELECT pei.*, m.*
               FROM purchase_entry_items pei
               LEFT JOIN materials m ON pei.material_id = m.material_id
               WHERE pei.purchase_entry_id = ?`,
              [entry.purchase_entry_id],
              (err2, items) => {
                if (err2) {
                  logger.Log({
                    level: logger.LEVEL.ERROR,
                    component: "REPOSITORY.PURCHASE_ENTRY",
                    code: "REPOSITORY.PURCHASE_ENTRY.ITEMS.GET-ALL",
                    description: err2.toString(),
                    category: "",
                    ref: {},
                  });
                  reject(err2);
                  return;
                }

                results.push({
                  purchase_entry_id: entry.purchase_entry_id,
                  purchase_order_id: entry.purchase_order_id,
                  purchase_order_ref: entry.purchase_order_ref,
                  invoice_no: entry.invoice_no,
                  invoice_date: entry.invoice_date,
                  invoice_file: entry.invoice_file,
                  accounts_file: entry.accounts_file,
                  discount: entry.discount,
                  adjustment: entry.adjustment,
                  tax: entry.tax,
                  created_at: entry.created_at,
                  updated_at: entry.updated_at,
                  vendor: entry.vendor_id
                    ? {
                        master_id: entry.vendor_id,
                        name: entry.vendor_name,
                        phone: entry.vendor_phone,
                      }
                    : null,
                  items: items.map((item) => ({
                    purchase_entry_item_id: item.purchase_entry_item_id,
                    material_id: item.material_id,
                    quantity: item.quantity,
                    rate: item.rate,
                    material: item.material_id
                      ? {
                          material_id: item.material_id,
                          name: item.name,
                          description: item.description,
                          unit_id: item.unit_id,
                          material_category_id: item.material_category_id,
                          supplier_id: item.supplier_id,
                          live_stock: item.live_stock,
                          image_url: item.image_url,
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
    });
  }

  update(id, purchaseEntryData, items) {
    return new Promise((resolve, reject) => {
      const {
        purchase_order_id,
        invoice_no,
        invoice_date,
        invoice_file,
        accounts_file,
        discount,
        adjustment,
        tax,
      } =
        purchaseEntryData;

      const updateFields = [];
      const updateValues = [];

      if (purchase_order_id !== undefined) {
        updateFields.push("purchase_order_id = ?");
        updateValues.push(purchase_order_id);
      }
      if (invoice_no !== undefined) {
        updateFields.push("invoice_no = ?");
        updateValues.push(invoice_no);
      }
      if (invoice_date !== undefined) {
        updateFields.push("invoice_date = ?");
        updateValues.push(invoice_date);
      }
      if (invoice_file !== undefined) {
        updateFields.push("invoice_file = ?");
        updateValues.push(invoice_file);
      }
      if (accounts_file !== undefined) {
        updateFields.push("accounts_file = ?");
        updateValues.push(accounts_file);
      }
      if (discount !== undefined) {
        updateFields.push("discount = ?");
        updateValues.push(discount);
      }
      if (adjustment !== undefined) {
        updateFields.push("adjustment = ?");
        updateValues.push(adjustment);
      }
      if (tax !== undefined) {
        updateFields.push("tax = ?");
        updateValues.push(tax);
      }

      if (updateFields.length === 0 && items === undefined) {
        resolve({ affectedRows: 0 });
        return;
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(id);

      const sql = `UPDATE purchase_entry SET ${updateFields.join(
        ", "
      )} WHERE purchase_entry_id = ?`;

      this.db.query(sql, updateValues, (err) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PURCHASE_ENTRY",
            code: "REPOSITORY.PURCHASE_ENTRY.UPDATE",
            description: err.toString(),
            category: "",
            ref: { id, purchaseEntryData },
          });
          reject(err);
          return;
        }

        if (items !== undefined) {
          this.db.query(
            "DELETE FROM purchase_entry_items WHERE purchase_entry_id = ?",
            [id],
            (err2) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PURCHASE_ENTRY",
                  code: "REPOSITORY.PURCHASE_ENTRY.ITEMS.DELETE",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }

              if (items && items.length > 0) {
                const filteredItems = items.map((item) => {
                  return [id, item.material_id, item.quantity, item.rate];
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
                    `INSERT INTO purchase_entry_items 
                    (purchase_entry_id, material_id, quantity, rate) 
                    VALUES ?`,
                    [validItems],
                    (err3) => {
                      if (err3) {
                        logger.Log({
                          level: logger.LEVEL.ERROR,
                          component: "REPOSITORY.PURCHASE_ENTRY",
                          code: "REPOSITORY.PURCHASE_ENTRY.ITEMS.INSERT",
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

  delete(id) {
    return new Promise((resolve, reject) => {
      // Delete items first (cascade should handle this, but being explicit)
      this.db.query(
        "DELETE FROM purchase_entry_items WHERE purchase_entry_id = ?",
        [id],
        (err) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_ENTRY",
              code: "REPOSITORY.PURCHASE_ENTRY.ITEMS.DELETE",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }

          this.db.query(
            "DELETE FROM purchase_entry WHERE purchase_entry_id = ?",
            [id],
            (err2, result) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PURCHASE_ENTRY",
                  code: "REPOSITORY.PURCHASE_ENTRY.DELETE",
                  description: err2.toString(),
                  category: "",
                  ref: { id },
                });
                reject(err2);
                return;
              }
              resolve({ affectedRows: result.affectedRows, id });
            }
          );
        }
      );
    });
  }

  getByPurchaseOrderId(purchaseOrderId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT pe.*, po.vendor_id, ml.name as vendor_name, ml.phone as vendor_phone
         FROM purchase_entry pe
         LEFT JOIN purchase_order po ON pe.purchase_order_id = po.purchase_order_id
         LEFT JOIN master_list ml ON po.vendor_id = ml.master_id
         WHERE pe.purchase_order_id = ?
         LIMIT 1`,
        [purchaseOrderId],
        (err, entries) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_ENTRY",
              code: "REPOSITORY.PURCHASE_ENTRY.GET-BY-PURCHASE-ORDER-ID",
              description: err.toString(),
              category: "",
              ref: { purchaseOrderId },
            });
            reject(err);
            return;
          }

          if (!entries.length) return resolve(undefined);

          const entry = entries[0];
          this.db.query(
            `SELECT pei.*, m.*
             FROM purchase_entry_items pei
             LEFT JOIN materials m ON pei.material_id = m.material_id
             WHERE pei.purchase_entry_id = ?`,
            [entry.purchase_entry_id],
            (err2, items) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PURCHASE_ENTRY",
                  code: "REPOSITORY.PURCHASE_ENTRY.ITEMS.GET-BY-PURCHASE-ORDER-ID",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }

              resolve({
                purchase_entry_id: entry.purchase_entry_id,
                purchase_order_id: entry.purchase_order_id,
                invoice_no: entry.invoice_no,
                invoice_date: entry.invoice_date,
                invoice_file: entry.invoice_file,
                accounts_file: entry.accounts_file,
                discount: entry.discount,
                adjustment: entry.adjustment,
                tax: entry.tax,
                created_at: entry.created_at,
                updated_at: entry.updated_at,
                vendor: entry.vendor_id
                  ? {
                      master_id: entry.vendor_id,
                      name: entry.vendor_name,
                      phone: entry.vendor_phone,
                    }
                  : null,
                items: items.map((item) => ({
                  purchase_entry_item_id: item.purchase_entry_item_id,
                  material_id: item.material_id,
                  quantity: item.quantity,
                  rate: item.rate,
                  material: item.material_id
                    ? {
                        material_id: item.material_id,
                        name: item.name,
                        description: item.description,
                        unit_id: item.unit_id,
                        material_category_id: item.material_category_id,
                        supplier_id: item.supplier_id,
                        live_stock: item.live_stock,
                        image_url: item.image_url,
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
}

module.exports = (db) => {
  return new PurchaseEntryRepository(db);
};
