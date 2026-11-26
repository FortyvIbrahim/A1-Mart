const logger = require("../utils/logger");

class PurchaseOrderRepository {
  constructor(db) {
    this.db = db;
  }

  create(purchaseOrderData, items) {
    return new Promise(async (resolve, reject) => {
      try {
        const {
          purchase_order_ref,
          vendor_id,
          date,
          delivery_date,
          discount = 0.0,
          adjustment = 0.0,
          tax = 0.0,
          status = "active",
        } = purchaseOrderData;

        const sql = `INSERT INTO purchase_order 
          (purchase_order_ref, vendor_id, date, delivery_date, discount, adjustment, tax, status) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        this.db.query(
          sql,
          [
            purchase_order_ref || null,
            vendor_id,
            date || null,
            delivery_date || null,
            discount,
            adjustment,
            tax,
            status,
          ],
          async (err, result) => {
            if (err) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.PURCHASE_ORDER",
                code: "REPOSITORY.PURCHASE_ORDER.CREATE",
                description: err.toString(),
                category: "",
                ref: { purchaseOrderData },
              });
              reject(err);
              return;
            }

            const purchase_order_id = result.insertId;

            if (items && items.length > 0) {
              const filteredItems = items.map((item) => {
                return [
                  purchase_order_id,
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
                  `INSERT INTO purchase_order_items 
                  (purchase_order_id, material_id, quantity, rate) 
                  VALUES ?`,
                  [validItems],
                  (err2) => {
                    if (err2) {
                      logger.Log({
                        level: logger.LEVEL.ERROR,
                        component: "REPOSITORY.PURCHASE_ORDER",
                        code: "REPOSITORY.PURCHASE_ORDER.ITEMS.CREATE",
                        description: err2.toString(),
                        category: "",
                        ref: {},
                      });
                      reject(err2);
                      return;
                    }
                    resolve(purchase_order_id);
                  }
                );
              } else {
                resolve(purchase_order_id);
              }
            } else {
              resolve(purchase_order_id);
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
        `SELECT po.*, ml.name as vendor_name, ml.phone as vendor_phone,
                IFNULL((
                  SELECT 1
                  FROM grn g
                  WHERE g.purchase_order_id = po.purchase_order_id
                  LIMIT 1
                ), 0) as has_grn_entry
         FROM purchase_order po
         LEFT JOIN master_list ml ON po.vendor_id = ml.master_id
         WHERE po.purchase_order_id = ?`,
        [id],
        (err, orders) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_ORDER",
              code: "REPOSITORY.PURCHASE_ORDER.GET-BY-ID",
              description: err.toString(),
              category: "",
              ref: { id },
            });
            reject(err);
            return;
          }

          if (!orders.length) return resolve(undefined);

          const order = orders[0];
          this.db.query(
            `SELECT poi.*, m.*
             FROM purchase_order_items poi
             LEFT JOIN materials m ON poi.material_id = m.material_id
             WHERE poi.purchase_order_id = ?`,
            [id],
            (err2, items) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PURCHASE_ORDER",
                  code: "REPOSITORY.PURCHASE_ORDER.ITEMS.GET-BY-ID",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }

              // Get last generated PDF
              this.getLastPdf(order.purchase_order_id)
                .then((pdfRecord) => {
                  resolve({
                    purchase_order_id: order.purchase_order_id,
                    purchase_order_ref: order.purchase_order_ref,
                    vendor_id: order.vendor_id,
                    date: order.date,
                    delivery_date: order.delivery_date,
                    discount: order.discount,
                    adjustment: order.adjustment,
                    tax: order.tax,
                    status: order.status,
                    has_grn_entry:
                      order.has_grn_entry === 1 ||
                      order.has_grn_entry === "1",
                    created_at: order.created_at,
                    updated_at: order.updated_at,
                    vendor: order.vendor_id
                      ? {
                          master_id: order.vendor_id,
                          name: order.vendor_name,
                          phone: order.vendor_phone,
                        }
                      : null,
                    items: items.map((item) => ({
                      purchase_order_item_id: item.purchase_order_item_id,
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
                            tax_percentage: item.tax_percentage,
                            hsn_number: item.hsn_number,
                          }
                        : null,
                    })),
                    pdf: pdfRecord || null,
                  });
                })
                .catch(() => {
                  resolve({
                    purchase_order_id: order.purchase_order_id,
                    purchase_order_ref: order.purchase_order_ref,
                    vendor_id: order.vendor_id,
                    date: order.date,
                    delivery_date: order.delivery_date,
                    discount: order.discount,
                    adjustment: order.adjustment,
                    tax: order.tax,
                    status: order.status,
                    has_grn_entry:
                      order.has_grn_entry === 1 ||
                      order.has_grn_entry === "1",
                    created_at: order.created_at,
                    updated_at: order.updated_at,
                    vendor: order.vendor_id
                      ? {
                          master_id: order.vendor_id,
                          name: order.vendor_name,
                          phone: order.vendor_phone,
                        }
                      : null,
                    items: items.map((item) => ({
                      purchase_order_item_id: item.purchase_order_item_id,
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
                            tax_percentage: item.tax_percentage,
                            hsn_number: item.hsn_number,
                          }
                        : null,
                    })),
                    pdf: null,
                  });
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
        `SELECT po.*, ml.name as vendor_name, ml.phone as vendor_phone,
         IFNULL((
           SELECT 1 
           FROM purchase_entry pe 
           WHERE pe.purchase_order_id = po.purchase_order_id 
           LIMIT 1
         ), 0) as pe_created,
         IFNULL((
           SELECT 1
           FROM grn g
           WHERE g.purchase_order_id = po.purchase_order_id
           LIMIT 1
         ), 0) as has_grn_entry
         FROM purchase_order po
         LEFT JOIN master_list ml ON po.vendor_id = ml.master_id
         ORDER BY po.created_at DESC`,
        [],
        (err, orders) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_ORDER",
              code: "REPOSITORY.PURCHASE_ORDER.GET-ALL",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }

          const results = [];
          let count = 0;

          if (!orders.length) return resolve([]);

          orders.forEach((order) => {
            this.db.query(
              `SELECT poi.*, m.*
               FROM purchase_order_items poi
               LEFT JOIN materials m ON poi.material_id = m.material_id
               WHERE poi.purchase_order_id = ?`,
              [order.purchase_order_id],
              (err2, items) => {
                if (err2) {
                  logger.Log({
                    level: logger.LEVEL.ERROR,
                    component: "REPOSITORY.PURCHASE_ORDER",
                    code: "REPOSITORY.PURCHASE_ORDER.ITEMS.GET-ALL",
                    description: err2.toString(),
                    category: "",
                    ref: {},
                  });
                  reject(err2);
                  return;
                }

                // Get last generated PDF for this order
                this.getLastPdf(order.purchase_order_id)
                  .then((pdfRecord) => {
                    results.push({
                      purchase_order_id: order.purchase_order_id,
                      purchase_order_ref: order.purchase_order_ref,
                      vendor_id: order.vendor_id,
                      date: order.date,
                      delivery_date: order.delivery_date,
                      discount: order.discount,
                      adjustment: order.adjustment,
                      tax: order.tax,
                      status: order.status,
                      created_at: order.created_at,
                      updated_at: order.updated_at,
                      pe_created:
                        order.pe_created === 1 || order.pe_created === "1",
                      has_grn_entry:
                        order.has_grn_entry === 1 ||
                        order.has_grn_entry === "1",
                      vendor: order.vendor_id
                        ? {
                            master_id: order.vendor_id,
                            name: order.vendor_name,
                            phone: order.vendor_phone,
                          }
                        : null,
                    items: items.map((item) => ({
                      purchase_order_item_id: item.purchase_order_item_id,
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
                            tax_percentage: item.tax_percentage,
                            hsn_number: item.hsn_number,
                          }
                        : null,
                    })),
                    pdf: pdfRecord || null,
                  });

                    count++;
                    if (count === orders.length) {
                      resolve(results);
                    }
                  })
                  .catch(() => {
                    results.push({
                      purchase_order_id: order.purchase_order_id,
                      purchase_order_ref: order.purchase_order_ref,
                      vendor_id: order.vendor_id,
                      date: order.date,
                      delivery_date: order.delivery_date,
                      discount: order.discount,
                      adjustment: order.adjustment,
                      tax: order.tax,
                      status: order.status,
                      created_at: order.created_at,
                      updated_at: order.updated_at,
                      pe_created:
                        order.pe_created === 1 || order.pe_created === "1",
                      has_grn_entry:
                        order.has_grn_entry === 1 ||
                        order.has_grn_entry === "1",
                      vendor: order.vendor_id
                        ? {
                            master_id: order.vendor_id,
                            name: order.vendor_name,
                            phone: order.vendor_phone,
                          }
                        : null,
                      items: items.map((item) => ({
                        purchase_order_item_id: item.purchase_order_item_id,
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
                              tax_percentage: item.tax_percentage,
                              hsn_number: item.hsn_number,
                            }
                          : null,
                      })),
                      pdf: null,
                    });

                    count++;
                    if (count === orders.length) {
                      resolve(results);
                    }
                  });
              }
            );
          });
        }
      );
    });
  }

  update(id, purchaseOrderData, items) {
    return new Promise((resolve, reject) => {
      const {
        purchase_order_ref,
        vendor_id,
        date,
        delivery_date,
        discount,
        adjustment,
        tax,
        status,
      } = purchaseOrderData;

      const updateFields = [];
      const updateValues = [];

      if (purchase_order_ref !== undefined) {
        updateFields.push("purchase_order_ref = ?");
        updateValues.push(purchase_order_ref);
      }
      if (vendor_id !== undefined) {
        updateFields.push("vendor_id = ?");
        updateValues.push(vendor_id);
      }
      if (date !== undefined) {
        updateFields.push("date = ?");
        updateValues.push(date);
      }
      if (delivery_date !== undefined) {
        updateFields.push("delivery_date = ?");
        updateValues.push(delivery_date);
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
      if (status !== undefined) {
        updateFields.push("status = ?");
        updateValues.push(status);
      }

      if (updateFields.length === 0 && items === undefined) {
        resolve({ affectedRows: 0 });
        return;
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(id);

      const sql = `UPDATE purchase_order SET ${updateFields.join(
        ", "
      )} WHERE purchase_order_id = ?`;

      this.db.query(sql, updateValues, (err) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PURCHASE_ORDER",
            code: "REPOSITORY.PURCHASE_ORDER.UPDATE",
            description: err.toString(),
            category: "",
            ref: { id, purchaseOrderData },
          });
          reject(err);
          return;
        }

        if (items !== undefined) {
          this.db.query(
            "DELETE FROM purchase_order_items WHERE purchase_order_id = ?",
            [id],
            (err2) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PURCHASE_ORDER",
                  code: "REPOSITORY.PURCHASE_ORDER.ITEMS.DELETE",
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
                    `INSERT INTO purchase_order_items 
                    (purchase_order_id, material_id, quantity, rate) 
                    VALUES ?`,
                    [validItems],
                    (err3) => {
                      if (err3) {
                        logger.Log({
                          level: logger.LEVEL.ERROR,
                          component: "REPOSITORY.PURCHASE_ORDER",
                          code: "REPOSITORY.PURCHASE_ORDER.ITEMS.INSERT",
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
        "DELETE FROM purchase_order_items WHERE purchase_order_id = ?",
        [id],
        (err) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_ORDER",
              code: "REPOSITORY.PURCHASE_ORDER.ITEMS.DELETE",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }

          this.db.query(
            "DELETE FROM purchase_order WHERE purchase_order_id = ?",
            [id],
            (err2, result) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PURCHASE_ORDER",
                  code: "REPOSITORY.PURCHASE_ORDER.DELETE",
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

  savePdf(purchaseOrderId, pdfPath, pdfFilename) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `INSERT INTO purchase_order_pdf (purchase_order_id, pdf_path, pdf_filename) 
         VALUES (?, ?, ?)`,
        [purchaseOrderId, pdfPath, pdfFilename],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_ORDER",
              code: "REPOSITORY.PURCHASE_ORDER.PDF.SAVE",
              description: err.toString(),
              category: "",
              ref: { purchaseOrderId, pdfPath, pdfFilename },
            });
            reject(err);
            return;
          }
          resolve({
            purchase_order_pdf_id: result.insertId,
            purchase_order_id: purchaseOrderId,
            pdf_path: pdfPath,
            pdf_filename: pdfFilename,
          });
        }
      );
    });
  }

  getLastPdf(purchaseOrderId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT * FROM purchase_order_pdf 
         WHERE purchase_order_id = ? 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [purchaseOrderId],
        (err, results) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_ORDER",
              code: "REPOSITORY.PURCHASE_ORDER.PDF.GET",
              description: err.toString(),
              category: "",
              ref: { purchaseOrderId },
            });
            reject(err);
            return;
          }
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  }
}

module.exports = (db) => {
  return new PurchaseOrderRepository(db);
};
