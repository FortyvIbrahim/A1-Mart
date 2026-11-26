const logger = require("../utils/logger");

class StockCircleCheckedRepository {
  constructor(db) {
    this.db = db;
  }

  create(checkedData) {
    return new Promise((resolve, reject) => {
      const { stock_circle_id, product_id, checked_stock, created_by } =
        checkedData;

      this.db.query(
        `INSERT INTO stock_circle_checked 
         (stock_circle_id, product_id, checked_stock, created_by) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           checked_stock = VALUES(checked_stock),
           updated_at = CURRENT_TIMESTAMP`,
        [stock_circle_id, product_id, checked_stock, created_by],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_CIRCLE_CHECKED",
              code: "REPOSITORY.STOCK_CIRCLE_CHECKED.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { checkedData },
            });
            reject(err);
            return;
          }
          resolve({
            stock_circle_id,
            product_id,
            checked_stock,
            created_by,
          });
        }
      );
    });
  }

  bulkCreate(rows) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(rows) || rows.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      const columns = [
        "stock_circle_id",
        "product_id",
        "checked_stock",
        "created_by",
      ];

      const values = rows.map((r) =>
        columns.map((c) => (r[c] === undefined ? null : r[c]))
      );

      const placeholders = values
        .map(() => `(${columns.map(() => "?").join(",")})`)
        .join(",");

      const flat = [].concat(...values);

      const updateAssignments = [
        "`checked_stock` = VALUES(`checked_stock`)",
      ].join(", ");

      const sql = `INSERT INTO stock_circle_checked (${columns
        .map((c) => `\`${c}\``)
        .join(
          ", "
        )}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${updateAssignments}, updated_at = CURRENT_TIMESTAMP`;

      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.STOCK_CIRCLE_CHECKED",
            code: "REPOSITORY.STOCK_CIRCLE_CHECKED.BULKCREATE.ERROR",
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

  getAll(stockCircleId = null) {
    return new Promise((resolve, reject) => {
      let query = `SELECT 
           scc.*,
           p.de_name as product_name,
           e.employee_name as created_by_name
         FROM stock_circle_checked scc
         LEFT JOIN products p
           ON scc.product_id = p.product_id
         LEFT JOIN employees e
           ON scc.created_by COLLATE utf8mb4_unicode_ci = e.employee_code COLLATE utf8mb4_unicode_ci`;
      const params = [];

      if (stockCircleId !== null && stockCircleId !== undefined) {
        query += ` WHERE scc.stock_circle_id = ?`;
        params.push(stockCircleId);
      }

      query += ` ORDER BY scc.created_at DESC`;

      this.db.query(query, params, (err, docs) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.STOCK_CIRCLE_CHECKED",
            code: "REPOSITORY.STOCK_CIRCLE_CHECKED.GET_ALL.ERROR",
            description: err.toString(),
            category: "",
            ref: { stockCircleId },
          });
          reject(err);
          return;
        }
        resolve(docs);
      });
    });
  }

  getById(stockCircleId, productId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           scc.*,
           p.de_name as product_name,
           e.employee_name as created_by_name
         FROM stock_circle_checked scc
         LEFT JOIN products p
           ON scc.product_id = p.product_id
         LEFT JOIN employees e
           ON scc.created_by COLLATE utf8mb4_unicode_ci = e.employee_code COLLATE utf8mb4_unicode_ci
         WHERE scc.stock_circle_id = ? AND scc.product_id = ?`,
        [stockCircleId, productId],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_CIRCLE_CHECKED",
              code: "REPOSITORY.STOCK_CIRCLE_CHECKED.GET_BY_ID.ERROR",
              description: err.toString(),
              category: "",
              ref: { stockCircleId, productId },
            });
            reject(err);
            return;
          }
          resolve(docs.length > 0 ? docs[0] : null);
        }
      );
    });
  }

  update(stockCircleId, productId, checkedData) {
    return new Promise((resolve, reject) => {
      const { checked_stock } = checkedData;

      const updateFields = [];
      const updateValues = [];

      if (checked_stock !== undefined) {
        updateFields.push("checked_stock = ?");
        updateValues.push(checked_stock);
      }

      if (updateFields.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(stockCircleId, productId);

      this.db.query(
        `UPDATE stock_circle_checked SET ${updateFields.join(
          ", "
        )} WHERE stock_circle_id = ? AND product_id = ?`,
        updateValues,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_CIRCLE_CHECKED",
              code: "REPOSITORY.STOCK_CIRCLE_CHECKED.UPDATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { stockCircleId, productId, checkedData },
            });
            reject(err);
            return;
          }
          resolve({
            affectedRows: result.affectedRows,
            stockCircleId,
            productId,
          });
        }
      );
    });
  }

  delete(stockCircleId, productId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `DELETE FROM stock_circle_checked WHERE stock_circle_id = ? AND product_id = ?`,
        [stockCircleId, productId],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_CIRCLE_CHECKED",
              code: "REPOSITORY.STOCK_CIRCLE_CHECKED.DELETE.ERROR",
              description: err.toString(),
              category: "",
              ref: { stockCircleId, productId },
            });
            reject(err);
            return;
          }
          resolve({
            affectedRows: result.affectedRows,
            stockCircleId,
            productId,
          });
        }
      );
    });
  }

  deleteByStockCircleId(stockCircleId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `DELETE FROM stock_circle_checked WHERE stock_circle_id = ?`,
        [stockCircleId],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_CIRCLE_CHECKED",
              code: "REPOSITORY.STOCK_CIRCLE_CHECKED.DELETE_BY_STOCK_CIRCLE_ID.ERROR",
              description: err.toString(),
              category: "",
              ref: { stockCircleId },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows, stockCircleId });
        }
      );
    });
  }
}

module.exports = (db) => {
  return new StockCircleCheckedRepository(db);
};
