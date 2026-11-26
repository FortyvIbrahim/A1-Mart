const logger = require("../utils/logger");

class PurchaseReordersRepository {
  constructor(db) {
    this.db = db;
  }

  create(payload) {
    return new Promise((resolve, reject) => {
      const {
        product_id,
        qty,
        mrp,
        cost_price,
        discount,
        order_worth,
        tax_amount,
        buyer_id,
        supplier_id,
        is_purchased = false,
      } = payload;

      this.db.query(
        `INSERT INTO purchase_reorders (product_id, qty, mrp, cost_price, discount, order_worth, tax_amount, buyer_id, supplier_id, is_purchased)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product_id,
          qty,
          mrp ?? null,
          cost_price ?? null,
          discount ?? null,
          order_worth ?? null,
          tax_amount ?? null,
          buyer_id,
          supplier_id,
          is_purchased ? 1 : 0,
        ],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_REORDERS",
              code: "REPOSITORY.PURCHASE_REORDERS.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { payload },
            });
            reject(err);
            return;
          }
          resolve({ id: result.insertId });
        }
      );
    });
  }

  bulkUpsert(rows) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(rows) || rows.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      const columns = [
        "product_id",
        "qty",
        "mrp",
        "cost_price",
        "discount",
        "order_worth",
        "tax_amount",
        "buyer_id",
        "supplier_id",
      ];
      const placeholders = rows
        .map(
          () =>
            `(${columns.map(() => "?").join(", ")})`
        )
        .join(", ");
      const values = rows.map((r) =>
        columns.map((c) => (r[c] === undefined ? null : r[c]))
      );
      const flat = [].concat(...values);

      const sql = `INSERT INTO purchase_reorders (${columns.join(", ")})
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE
          qty = VALUES(qty),
          mrp = VALUES(mrp),
          cost_price = VALUES(cost_price),
          discount = VALUES(discount),
          order_worth = VALUES(order_worth),
          tax_amount = VALUES(tax_amount),
          is_purchased = 0,
          updated_at = CURRENT_TIMESTAMP`;

      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PURCHASE_REORDERS",
            code: "REPOSITORY.PURCHASE_REORDERS.BULKUPSERT.ERROR",
            description: err.toString(),
            category: "",
            ref: { rows },
          });
          reject(err);
          return;
        }
        resolve({
          affectedRows: result.affectedRows,
          insertedId: result.insertId,
        });
      });
    });
  }

  update(id, payload) {
    return new Promise((resolve, reject) => {
      const allowed = [
        "qty",
        "mrp",
        "cost_price",
        "discount",
        "order_worth",
        "tax_amount",
        "is_purchased",
      ];
      const updateFields = [];
      const updateValues = [];
      allowed.forEach((key) => {
        if (payload[key] !== undefined) {
          updateFields.push(`${key} = ?`);
          updateValues.push(
            key === "is_purchased" ? (payload[key] ? 1 : 0) : payload[key]
          );
        }
      });
      if (updateFields.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }
      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(id);

      this.db.query(
        `UPDATE purchase_reorders SET ${updateFields.join(", ")} WHERE id = ?`,
        updateValues,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_REORDERS",
              code: "REPOSITORY.PURCHASE_REORDERS.UPDATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { id, payload },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT pr.*,
          p.gf_item_name AS product_name, p.de_display_name AS product_display_name, p.measure AS product_measure, p.image_url AS product_image_url,
          e.employee_name AS buyer_name, e.employee_code AS buyer_code,
          ml.name AS supplier_name, ml.phone AS supplier_phone
         FROM purchase_reorders pr
         LEFT JOIN products p ON pr.product_id = p.product_id
         LEFT JOIN employees e ON pr.buyer_id = e.employee_code
         LEFT JOIN master_list ml ON pr.supplier_id = ml.master_id
         ORDER BY pr.updated_at DESC`,
        [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_REORDERS",
              code: "REPOSITORY.PURCHASE_REORDERS.GETALL.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(
            (rows || []).map((r) => ({
              id: r.id,
              product_id: r.product_id,
              qty: r.qty,
              mrp: r.mrp,
              cost_price: r.cost_price,
              discount: r.discount,
              order_worth: r.order_worth,
              tax_amount: r.tax_amount,
              buyer_id: r.buyer_id,
              supplier_id: r.supplier_id,
              is_purchased: !!r.is_purchased,
              created_at: r.created_at,
              updated_at: r.updated_at,
              product: r.product_id
                ? {
                    product_id: r.product_id,
                    product_name: r.product_name,
                    product_display_name: r.product_display_name,
                    product_measure: r.product_measure,
                    image_url: r.product_image_url || null,
                  }
                : null,
              buyer: r.buyer_id
                ? { employee_code: r.buyer_code, employee_name: r.buyer_name }
                : null,
              supplier: r.supplier_id
                ? {
                    master_id: r.supplier_id,
                    name: r.supplier_name,
                    phone: r.supplier_phone,
                  }
                : null,
            }))
          );
        }
      );
    });
  }

  getById(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT pr.*,
          p.gf_item_name AS product_name, p.de_display_name AS product_display_name, p.measure AS product_measure, p.image_url AS product_image_url,
          e.employee_name AS buyer_name, e.employee_code AS buyer_code,
          ml.name AS supplier_name, ml.phone AS supplier_phone
         FROM purchase_reorders pr
         LEFT JOIN products p ON pr.product_id = p.product_id
         LEFT JOIN employees e ON pr.buyer_id = e.employee_code
         LEFT JOIN master_list ml ON pr.supplier_id = ml.master_id
         WHERE pr.id = ?`,
        [id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_REORDERS",
              code: "REPOSITORY.PURCHASE_REORDERS.GETBYID.ERROR",
              description: err.toString(),
              category: "",
              ref: { id },
            });
            reject(err);
            return;
          }
          const r = rows && rows[0];
          if (!r) return resolve(null);
          resolve({
            id: r.id,
            product_id: r.product_id,
            qty: r.qty,
            mrp: r.mrp,
            cost_price: r.cost_price,
            discount: r.discount,
            order_worth: r.order_worth,
            tax_amount: r.tax_amount,
            buyer_id: r.buyer_id,
            supplier_id: r.supplier_id,
            is_purchased: !!r.is_purchased,
            created_at: r.created_at,
            updated_at: r.updated_at,
            product: r.product_id
              ? {
                  product_id: r.product_id,
                  product_name: r.product_name,
                  product_display_name: r.product_display_name,
                  product_measure: r.product_measure,
                  image_url: r.product_image_url || null,
                }
              : null,
            buyer: r.buyer_id
              ? { employee_code: r.buyer_code, employee_name: r.buyer_name }
              : null,
            supplier: r.supplier_id
              ? {
                  master_id: r.supplier_id,
                  name: r.supplier_name,
                  phone: r.supplier_phone,
                }
              : null,
          });
        }
      );
    });
  }

  markAsPurchased(buyer_id, supplier_id, productIds) {
    return new Promise((resolve, reject) => {
      if (!productIds || productIds.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }
      const uniqueIds = [...new Set(productIds)];
      const placeholders = uniqueIds.map(() => "(?, ?, ?)").join(", ");
      const flat = uniqueIds.flatMap((product_id) => [
        product_id,
        buyer_id,
        supplier_id,
      ]);
      const sql = `UPDATE purchase_reorders SET is_purchased = 1, updated_at = CURRENT_TIMESTAMP
        WHERE (product_id, buyer_id, supplier_id) IN (${placeholders})`;
      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PURCHASE_REORDERS",
            code: "REPOSITORY.PURCHASE_REORDERS.MARK_AS_PURCHASED.ERROR",
            description: err.toString(),
            category: "",
            ref: { buyer_id, supplier_id, productIds },
          });
          reject(err);
          return;
        }
        resolve({ affectedRows: result.affectedRows });
      });
    });
  }

  markAsUnpurchased(buyer_id, supplier_id, productIds) {
    return new Promise((resolve, reject) => {
      if (!productIds || productIds.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }
      const uniqueIds = [...new Set(productIds)];
      const placeholders = uniqueIds.map(() => "(?, ?, ?)").join(", ");
      const flat = uniqueIds.flatMap((product_id) => [
        product_id,
        buyer_id,
        supplier_id,
      ]);
      const sql = `UPDATE purchase_reorders SET is_purchased = 0, updated_at = CURRENT_TIMESTAMP
        WHERE (product_id, buyer_id, supplier_id) IN (${placeholders})`;
      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PURCHASE_REORDERS",
            code: "REPOSITORY.PURCHASE_REORDERS.MARK_AS_UNPURCHASED.ERROR",
            description: err.toString(),
            category: "",
            ref: { buyer_id, supplier_id, productIds },
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
      this.db.query(
        "DELETE FROM purchase_reorders WHERE id = ?",
        [id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_REORDERS",
              code: "REPOSITORY.PURCHASE_REORDERS.DELETE.ERROR",
              description: err.toString(),
              category: "",
              ref: { id },
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
  return new PurchaseReordersRepository(db);
};
