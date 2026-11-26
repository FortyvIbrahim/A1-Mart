const logger = require("../utils/logger");

class DepartmentsRepository {
  constructor(db) {
    this.db = db;
  }

  create(payload) {
    return new Promise((resolve, reject) => {
      const columns = Object.keys(payload);
      const updateAssignments = columns
        .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
        .join(", ");

      this.db.query(
        `INSERT INTO departments SET ? ${
          updateAssignments.length > 0
            ? `ON DUPLICATE KEY UPDATE ${updateAssignments}`
            : ""
        }`,
        [payload],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.DEPARTMENTS",
              code: "REPOSITORY.DEPARTMENTS.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve({ id: result.insertId });
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

      const columns = Object.keys(rows[0]);
      const values = rows.map((r) => columns.map((c) => r[c]));
      const placeholders = values
        .map(() => `(${columns.map(() => "?").join(",")})`)
        .join(",");
      const flat = [].concat(...values);

      const updateAssignments = columns
        .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
        .join(", ");

      const sql =
        `INSERT INTO departments (${columns.join(
          ","
        )}) VALUES ${placeholders}` +
        (updateAssignments.length > 0
          ? ` ON DUPLICATE KEY UPDATE ${updateAssignments}`
          : "");

      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.DEPARTMENTS",
            code: "REPOSITORY.DEPARTMENTS.BULKCREATE.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
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
      this.db.query(
        "UPDATE departments SET ? WHERE department_id = ?",
        [payload, id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.DEPARTMENTS",
              code: "REPOSITORY.DEPARTMENTS.UPDATE.ERROR",
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

  getAll() {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT * FROM departments ORDER BY department_id DESC",
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.DEPARTMENTS",
              code: "REPOSITORY.DEPARTMENTS.GETALL.ERROR",
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

  getById(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT * FROM departments WHERE department_id = ?",
        [id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.DEPARTMENTS",
              code: "REPOSITORY.DEPARTMENTS.GETBYID.ERROR",
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

  getByBranchUsingEmployees(branch_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT DISTINCT d.* FROM employees e
        INNER JOIN departments d ON e.department_id = d.department_id
        WHERE e.branch_id = ? AND e.terminated = 0
        ORDER BY d.department_name ASC`,
        [branch_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.DEPARTMENTS",
              code: "REPOSITORY.DEPARTMENTS.GETBYBRANCHUSINGEMPLOYEES.ERROR",
              description: err.toString(),
              category: "",
              ref: { branch_id },
            });
            reject(err);
            return;
          }
          resolve(rows);
        }
      );
    });
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM departments WHERE department_id = ?",
        [id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.DEPARTMENTS",
              code: "REPOSITORY.DEPARTMENTS.DELETE.ERROR",
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
  return new DepartmentsRepository(db);
};
