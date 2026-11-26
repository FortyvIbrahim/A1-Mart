const logger = require("../utils/logger");

class EmployeeSalesRepository {
  constructor(db) {
    this.db = db;
  }

  // Upsert by unique key (date, employee_code)
  create(payload) {
    return new Promise((resolve, reject) => {
      const columns = ["date", "employee_code", "sales_amount"];
      const values = [
        payload.date,
        payload.employee_code,
        payload.sales_amount,
      ];

      const sql = `INSERT INTO employee_sales (${columns.join(", ")}) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          sales_amount = VALUES(sales_amount),
          updated_at = CURRENT_TIMESTAMP`;

      this.db.query(sql, values, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.EMPLOYEE_SALES",
            code: "REPOSITORY.EMPLOYEE_SALES.UPSERT.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve({ affectedRows: result.affectedRows });
      });
    });
  }

  getAll(filters = {}) {
    return new Promise((resolve, reject) => {
      const where = [];
      const params = [];

      if (filters.employee_code) {
        where.push("employee_code = ?");
        params.push(filters.employee_code);
      }
      if (filters.from_date) {
        where.push("date >= ?");
        params.push(filters.from_date);
      }
      if (filters.to_date) {
        where.push("date <= ?");
        params.push(filters.to_date);
      }
      if (filters.branch_id) {
        where.push("employees.branch_id = ?");
        params.push(filters.branch_id);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const baseSelect = `SELECT 
          employee_sales.date,
          employee_sales.employee_code,
          employee_sales.sales_amount,
          employee_sales.created_at,
          employee_sales.updated_at,
          employee_name,
          employees.department_id,
          employees.branch_id,
          employees.section_id,
          department_name,
          branch_name,
          section_name
        FROM employee_sales
        LEFT JOIN employees ON employees.employee_code = employee_sales.employee_code
        LEFT JOIN departments ON departments.department_id = employees.department_id
        LEFT JOIN branches ON branches.branch_id = employees.branch_id
        LEFT JOIN employee_sections ON employee_sections.section_id = employees.section_id`;

      this.db.query(
        `${baseSelect}
        ${whereSql}
        ORDER BY employee_sales.date DESC, employee_sales.employee_code ASC`,
        params,
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEE_SALES",
              code: "REPOSITORY.EMPLOYEE_SALES.GETALL.ERROR",
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
    });
  }

  getById(date, employee_code) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
          date,
          employee_code,
          sales_amount,
          created_at,
          updated_at
        FROM employee_sales
        WHERE date = ? AND employee_code = ?`,
        [date, employee_code],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEE_SALES",
              code: "REPOSITORY.EMPLOYEE_SALES.GETBYID.ERROR",
              description: err.toString(),
              category: "",
              ref: { date, employee_code },
            });
            reject(err);
            return;
          }
          resolve(rows.length > 0 ? rows[0] : null);
        }
      );
    });
  }

  delete(date, employee_code) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `DELETE FROM employee_sales WHERE date = ? AND employee_code = ?`,
        [date, employee_code],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEE_SALES",
              code: "REPOSITORY.EMPLOYEE_SALES.DELETE.ERROR",
              description: err.toString(),
              category: "",
              ref: { date, employee_code },
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
  return new EmployeeSalesRepository(db);
};
