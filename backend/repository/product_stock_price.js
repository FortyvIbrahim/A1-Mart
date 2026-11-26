const logger = require("../utils/logger");
const { parseProductStockQty } = require("../utils/product_stock_qty");

class ProductStockPriceRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Bulk upsert product stock/price rows
   * rows: [product_id, branch_id, stock, cost_price, selling_price, purchase_price][]
   * `stock` is stored as DECIMAL(16,4).
   */
  bulkUpsert(rows) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(rows) || rows.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      // rows is an array of arrays in the order:
      // [product_id, branch_id, stock, cost_price, selling_price, purchase_price]
      // We construct a derived table from these values and join with
      // products & branches so that rows without valid foreign keys are skipped.

      const selectParts = [];
      const flat = [];

      rows.forEach((row, index) => {
        // Ensure exactly 6 values per row
        const [
          product_id,
          branch_id,
          stock,
          cost_price,
          selling_price,
          purchase_price,
        ] = row;
        flat.push(
          product_id,
          branch_id,
          parseProductStockQty(stock),
          cost_price,
          selling_price,
          purchase_price
        );

        if (index === 0) {
          // First SELECT defines column aliases
          selectParts.push(
            "SELECT ? AS product_id, ? AS branch_id, ? AS stock, ? AS cost_price, ? AS selling_price, ? AS purchase_price"
          );
        } else {
          selectParts.push("SELECT ?, ?, ?, ?, ?, ?");
        }
      });

      const derivedTableSql = selectParts.join(" UNION ALL ");

      const updateAssignments = [
        "`stock` = VALUES(`stock`)",
        "`cost_price` = VALUES(`cost_price`)",
        "`selling_price` = VALUES(`selling_price`)",
        "`purchase_price` = VALUES(`purchase_price`)",
      ].join(", ");

      const sql = `
        INSERT INTO product_stock_price (product_id, branch_id, stock, cost_price, selling_price, purchase_price)
        SELECT
          v.product_id,
          v.branch_id,
          v.stock,
          v.cost_price,
          v.selling_price,
          v.purchase_price
        FROM (
          ${derivedTableSql}
        ) AS v
        INNER JOIN products p ON p.product_id = v.product_id
        INNER JOIN branches b ON b.branch_id = v.branch_id
        ON DUPLICATE KEY UPDATE ${updateAssignments}, updated_at = CURRENT_TIMESTAMP
      `;

      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PRODUCT_STOCK_PRICE",
            code: "REPOSITORY.PRODUCT_STOCK_PRICE.BULKUPSERT.ERROR",
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

  /**
   * Get all stock/price rows for a single product
   */
  getByProductId(productId, branchId = null) {
    return new Promise((resolve, reject) => {
      let query = `SELECT product_id, product_stock_price.branch_id, b.branch_name, stock, cost_price, selling_price, purchase_price
         FROM product_stock_price
         INNER JOIN branches b ON b.branch_id = product_stock_price.branch_id
         WHERE product_id = ?`;
      const params = [productId];

      if (branchId !== null && branchId !== undefined) {
        query += ` AND product_stock_price.branch_id = ?`;
        params.push(branchId);
      }

      this.db.query(query, params, (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PRODUCT_STOCK_PRICE",
            code: "REPOSITORY.PRODUCT_STOCK_PRICE.GET_BY_PRODUCT_ID.ERROR",
            description: err.toString(),
            category: "",
            ref: { productId, branchId },
          });
          reject(err);
          return;
        }
        resolve(rows.map((r) => ({ ...r, stock: parseProductStockQty(r.stock) })));
      });
    });
  }

  /**
   * Get all stock/price rows for multiple products
   */
  getByProductIds(productIds, branchId = null) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(productIds) || productIds.length === 0) {
        resolve([]);
        return;
      }

      const placeholders = productIds.map(() => "?").join(",");
      let query = `SELECT product_id, product_stock_price.branch_id, b.branch_name, stock, cost_price, selling_price, purchase_price
         FROM product_stock_price
         INNER JOIN branches b ON b.branch_id = product_stock_price.branch_id
         WHERE product_id IN (${placeholders})`;
      const params = [...productIds];

      if (branchId !== null && branchId !== undefined) {
        query += ` AND product_stock_price.branch_id = ?`;
        params.push(branchId);
      }

      this.db.query(query, params, (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PRODUCT_STOCK_PRICE",
            code: "REPOSITORY.PRODUCT_STOCK_PRICE.GET_BY_PRODUCT_IDS.ERROR",
            description: err.toString(),
            category: "",
            ref: { productIds, branchId },
          });
          reject(err);
          return;
        }
        resolve(rows.map((r) => ({ ...r, stock: parseProductStockQty(r.stock) })));
      });
    });
  }
}

module.exports = (db) => {
  return new ProductStockPriceRepository(db);
};
