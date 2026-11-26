const logger = require("../utils/logger");

class AccountsSheetRepository {
  constructor(db) {
    this.db = db;
  }

  create(payload) {
    return new Promise((resolve, reject) => {
      const columns = Object.keys(payload);
      const values = columns.map((c) => payload[c]);
      const tickedColumns = columns.map((c) => `\`${c}\``).join(",");
      const placeholders = columns.map(() => "?").join(",");

      const sql = `INSERT INTO accounts_sheet (${tickedColumns}) VALUES (${placeholders})`;

      this.db.query(sql, values, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.ACCOUNTS_SHEET",
            code: "REPOSITORY.ACCOUNTS_SHEET.CREATE.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve({ id: result.insertId });
      });
    });
  }

  update(id, payload) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "UPDATE accounts_sheet SET ? WHERE id = ?",
        [payload, id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.ACCOUNTS_SHEET",
              code: "REPOSITORY.ACCOUNTS_SHEET.UPDATE.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }

  getAll(branch_id, filters = {}) {
    return new Promise((resolve, reject) => {
      try {
        const whereParts = [];
        const params = [];
        if (branch_id != null) {
          whereParts.push("b.branch_id = ?");
          params.push(branch_id);
        }
        if (filters.from_date != null) {
          whereParts.push("accSheet.date >= DATE(?)");
          params.push(filters.from_date);
        }
        if (filters.to_date != null) {
          whereParts.push("accSheet.date <= DATE(?)");
          params.push(filters.to_date);
        }
        const whereSql =
          whereParts.length > 0
            ? `WHERE ${whereParts.join(" AND ")}`
            : "";

        this.db.query(
          `SELECT 
            accSheet.*,
            e.employee_name,
            e.designation_id,
            d.designation_name,
            b.branch_name,
            b.branch_id,
            b.cluster_size,
            bc.counter_name
          FROM accounts_sheet accSheet 
          LEFT JOIN employees e ON accSheet.employee_id = e.employee_code
          LEFT JOIN branches b ON e.branch_id = b.branch_id 
          LEFT JOIN billing_counter bc ON accSheet.billing_counter_id = bc.counter_id
          LEFT JOIN designations d ON e.designation_id = d.designation_id
          ${whereSql}
          ORDER BY accSheet.created_at DESC`,
          params,
          (err, rows) => {
            if (err) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.ACCOUNTS_SHEET",
                code: "REPOSITORY.ACCOUNTS_SHEET.GETALL.ERROR",
                description: err.toString(),
                category: "",
                ref: {},
              });
              reject(err);
              return;
            }
            resolve(rows);
          }
        );
      } catch (error) {
        logger.Log({
          level: logger.LEVEL.ERROR,
          component: "REPOSITORY.ACCOUNTS_SHEET",
          code: "REPOSITORY.ACCOUNTS_SHEET.GETALL.ERROR",
          description: error.toString(),
          category: "",
          ref: {},
        });
        reject(error);
      }
    });
  }

  getById(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
          accSheet.*,
          e.employee_name,
          bc.counter_name
        FROM accounts_sheet accSheet 
        LEFT JOIN employees e ON accSheet.employee_id = e.employee_code 
        LEFT JOIN billing_counter bc ON accSheet.billing_counter_id = bc.counter_id
        WHERE accSheet.id = ?`,
        [id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.ACCOUNTS_SHEET",
              code: "REPOSITORY.ACCOUNTS_SHEET.GETBYID.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(rows[0] || null);
        }
      );
    });
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM accounts_sheet WHERE id = ?",
        [id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.ACCOUNTS_SHEET",
              code: "REPOSITORY.ACCOUNTS_SHEET.DELETE.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
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
  return new AccountsSheetRepository(db);
};
