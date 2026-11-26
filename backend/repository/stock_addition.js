// repository/stock_addition.js
const logger = require("../utils/logger");

class StockAdditionRepository {
  constructor(db) {
    this.db = db;
  }

  createStockAddition(data, items) {
    return new Promise(async (resolve, reject) => {
      try {
        // Fields for stock_addition table (no outlet_id)
        const fields = ["created_by", "is_approved"];
        const values = [data.created_by, data.is_approved];

        // Add optional fields if provided
        if (
          data.invoice_number !== undefined &&
          data.invoice_number !== null &&
          data.invoice_number !== ""
        ) {
          fields.push("invoice_number");
          values.push(data.invoice_number);
        }
        if (data.invoice_date !== undefined && data.invoice_date !== null) {
          fields.push("invoice_date");
          values.push(data.invoice_date);
        }
        if (
          data.supplier_id !== undefined &&
          data.supplier_id !== null &&
          data.supplier_id !== ""
        ) {
          fields.push("supplier_id");
          values.push(data.supplier_id);
        }

        const sql = `INSERT INTO stock_addition (${fields.join(
          ", "
        )}) VALUES (${fields.map(() => "?").join(", ")})`;
        this.db.query(sql, values, async (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_ADDITION",
              code: "REPOSITORY.STOCK_ADDITION.CREATE",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          const stock_addition_id = result.insertId;
          if (items && items.length > 0) {
            const filteredItems = items.map((item) => {
              // Always include all 4 fields for stock_addition_list
              return [
                stock_addition_id,
                item.material_id,
                item.quantity,
                item.remark || null, // Use null if remark is empty/undefined
              ];
            });
            // Filter out items where required fields are missing
            const validItems = filteredItems.filter(
              (arr) =>
                arr[1] !== undefined &&
                arr[1] !== null &&
                arr[1] !== "" && // material_id
                arr[2] !== undefined &&
                arr[2] !== null &&
                arr[2] !== "" // quantity
            );
            if (validItems.length > 0) {
              this.db.query(
                `INSERT INTO stock_addition_list (stock_addition_id, material_id, quantity, remark) VALUES ?`,
                [validItems],
                (err2) => {
                  if (err2) {
                    logger.Log({
                      level: logger.LEVEL.ERROR,
                      component: "REPOSITORY.STOCK_ADDITION",
                      code: "REPOSITORY.STOCK_ADDITION.LIST.CREATE",
                      description: err2.toString(),
                      category: "",
                      ref: {},
                    });
                    reject(err2);
                    return;
                  }
                  resolve(stock_addition_id);
                }
              );
            } else {
              resolve(stock_addition_id);
            }
          } else {
            resolve(stock_addition_id);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getStockAdditionById(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT sa.*, employees.employee_code AS creator_employee_id, employees.employee_name AS creator_employee_name
         FROM stock_addition sa
         LEFT JOIN user ne ON sa.created_by = ne.user_id
         LEFT JOIN employees ON ne.employee_id = employees.employee_code
         WHERE sa.stock_addition_id = ?`,
        [id],
        (err, requests) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_ADDITION",
              code: "REPOSITORY.STOCK_ADDITION.GET-BY-ID",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          if (!requests.length) return resolve(undefined);
          const request = requests[0];
          this.db.query(
            `SELECT sal.*, ml.*
             FROM stock_addition_list sal
             LEFT JOIN materials ml ON sal.material_id = ml.material_id
             WHERE sal.stock_addition_id = ?`,
            [id],
            (err2, items) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.STOCK_ADDITION",
                  code: "REPOSITORY.STOCK_ADDITION.LIST.GET-BY-ID",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }
              resolve({
                stock_addition_id: request.stock_addition_id,
                created_by: request.created_by,
                created_at: request.created_at,
                updated_at: request.updated_at,
                is_approved: request.is_approved,
                invoice_number: request.invoice_number,
                invoice_date: request.invoice_date,
                supplier_id: request.supplier_id,
                creator_data: {
                  employee_id: request.creator_employee_id,
                  employee_name: request.creator_employee_name,
                },
                items: items.map((item) => ({
                  stock_addition_list_id: item.stock_addition_list_id,
                  material_id: item.material_id,
                  quantity: item.quantity,
                  remark: item.remark,
                  material: {
                    material_id: item.material_id,
                    ...item,
                  },
                })),
              });
            }
          );
        }
      );
    });
  }

  getAllStockAdditions(branch_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT sa.*, employees.employee_code AS creator_employee_id, employees.employee_name AS creator_employee_name
         FROM stock_addition sa
         LEFT JOIN user ne ON sa.created_by = ne.user_id
         LEFT JOIN employees ON ne.employee_id = employees.employee_code
         ${
           branch_id
             ? `LEFT JOIN user u ON sa.created_by = u.user_id
         LEFT JOIN branches b ON u.store_id = b.branch_id
         WHERE b.branch_id = ?`
             : ""
         }
         ORDER BY sa.is_approved ASC, sa.created_at DESC`,
        branch_id ? [branch_id] : [],
        (err, requests) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_ADDITION",
              code: "REPOSITORY.STOCK_ADDITION.GET-ALL",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          const results = [];
          let count = 0;
          if (!requests.length) return resolve([]);
          requests.forEach((request) => {
            this.db.query(
              `SELECT sal.*, ml.*
               FROM stock_addition_list sal
               LEFT JOIN materials ml ON sal.material_id = ml.material_id
               WHERE sal.stock_addition_id = ?`,
              [request.stock_addition_id],
              (err2, items) => {
                if (err2) {
                  logger.Log({
                    level: logger.LEVEL.ERROR,
                    component: "REPOSITORY.STOCK_ADDITION",
                    code: "REPOSITORY.STOCK_ADDITION.LIST.GET-ALL",
                    description: err2.toString(),
                    category: "",
                    ref: {},
                  });
                  reject(err2);
                  return;
                }
                results.push({
                  ...request,
                  stock_addition_id: request.stock_addition_id,
                  created_by: request.created_by,
                  created_at: request.created_at,
                  updated_at: request.updated_at,
                  is_approved: request.is_approved,
                  invoice_number: request.invoice_number,
                  invoice_date: request.invoice_date,
                  supplier_id: request.supplier_id,
                  creator_data: {
                    employee_id: request.creator_employee_id,
                    employee_name: request.creator_employee_name,
                  },
                  items: items.map((item) => ({
                    stock_addition_list_id: item.stock_addition_list_id,
                    material_id: item.material_id,
                    quantity: item.quantity,
                    remark: item.remark,
                    material: {
                      material_id: item.material_id,
                      ...item,
                    },
                  })),
                });
                count++;
                if (count === requests.length) {
                  resolve(results);
                }
              }
            );
          });
        }
      );
    });
  }

  updateStockAddition(id, data, items) {
    return new Promise((resolve, reject) => {
      // For updates, we can allow partial updates, but validate that at least one field is provided
      const fields = [];
      const values = [];

      if (
        data.created_by !== undefined &&
        data.created_by !== null &&
        data.created_by !== ""
      ) {
        fields.push("created_by = ?");
        values.push(data.created_by);
      }
      if (
        data.is_approved !== undefined &&
        data.is_approved !== null &&
        data.is_approved !== ""
      ) {
        fields.push("is_approved = ?");
        values.push(data.is_approved);
      }
      if (
        data.invoice_number !== undefined &&
        data.invoice_number !== null &&
        data.invoice_number !== ""
      ) {
        fields.push("invoice_number = ?");
        values.push(data.invoice_number);
      }
      if (data.invoice_date !== undefined && data.invoice_date !== null) {
        fields.push("invoice_date = ?");
        values.push(data.invoice_date);
      }
      if (
        data.supplier_id !== undefined &&
        data.supplier_id !== null &&
        data.supplier_id !== ""
      ) {
        fields.push("supplier_id = ?");
        values.push(data.supplier_id);
      }

      // Always update the updated_at timestamp
      fields.push("updated_at = NOW()");
      const sql = `UPDATE stock_addition SET ${fields.join(
        ", "
      )} WHERE stock_addition_id = ?`;
      values.push(id);
      this.db.query(sql, values, (err) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.STOCK_ADDITION",
            code: "REPOSITORY.STOCK_ADDITION.UPDATE",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        if (items) {
          this.db.query(
            "DELETE FROM stock_addition_list WHERE stock_addition_id = ?",
            [id],
            (err2) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.STOCK_ADDITION",
                  code: "REPOSITORY.STOCK_ADDITION.LIST.DELETE",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }
              if (items.length > 0) {
                const filteredItems = items.map((item) => {
                  // Always include all 4 fields for stock_addition_list
                  return [
                    id,
                    item.material_id,
                    item.quantity,
                    item.remark || null, // Use null if remark is empty/undefined
                  ];
                });
                // Filter out items where required fields are missing
                const validItems = filteredItems.filter(
                  (arr) =>
                    arr[1] !== undefined &&
                    arr[1] !== null &&
                    arr[1] !== "" && // material_id
                    arr[2] !== undefined &&
                    arr[2] !== null &&
                    arr[2] !== "" // quantity
                );
                if (validItems.length > 0) {
                  this.db.query(
                    "INSERT INTO stock_addition_list (stock_addition_id, material_id, quantity, remark) VALUES ?",
                    [validItems],
                    (err3) => {
                      if (err3) {
                        logger.Log({
                          level: logger.LEVEL.ERROR,
                          component: "REPOSITORY.STOCK_ADDITION",
                          code: "REPOSITORY.STOCK_ADDITION.LIST.INSERT",
                          description: err3.toString(),
                          category: "",
                          ref: {},
                        });
                        reject(err3);
                        return;
                      }
                      resolve(true);
                    }
                  );
                } else {
                  resolve(true);
                }
              } else {
                resolve(true);
              }
            }
          );
        } else {
          resolve(true);
        }
      });
    });
  }

  deleteStockAddition(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM stock_addition_list WHERE stock_addition_id = ?",
        [id],
        (err) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_ADDITION",
              code: "REPOSITORY.STOCK_ADDITION.LIST.DELETE",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          this.db.query(
            "DELETE FROM stock_addition WHERE stock_addition_id = ?",
            [id],
            (err2) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.STOCK_ADDITION",
                  code: "REPOSITORY.STOCK_ADDITION.DELETE",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }
              resolve(true);
            }
          );
        }
      );
    });
  }
}

module.exports = (db) => new StockAdditionRepository(db);
