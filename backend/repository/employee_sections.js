const logger = require("../utils/logger");

class EmployeeSectionsRepository {
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
        `INSERT INTO employee_sections SET ? ${
          updateAssignments.length > 0
            ? `ON DUPLICATE KEY UPDATE ${updateAssignments}`
            : ""
        }`,
        [payload],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEE_SECTIONS",
              code: "REPOSITORY.EMPLOYEE_SECTIONS.CREATE.ERROR",
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
        `INSERT INTO employee_sections (${columns.join(
          ","
        )}) VALUES ${placeholders}` +
        (updateAssignments.length > 0
          ? ` ON DUPLICATE KEY UPDATE ${updateAssignments}`
          : "");

      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.EMPLOYEE_SECTIONS",
            code: "REPOSITORY.EMPLOYEE_SECTIONS.BULKCREATE.ERROR",
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
        "UPDATE employee_sections SET ? WHERE section_id = ?",
        [payload, id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEE_SECTIONS",
              code: "REPOSITORY.EMPLOYEE_SECTIONS.UPDATE.ERROR",
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
        "SELECT * FROM employee_sections ORDER BY section_id DESC",
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEE_SECTIONS",
              code: "REPOSITORY.EMPLOYEE_SECTIONS.GETALL.ERROR",
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
        "SELECT * FROM employee_sections WHERE section_id = ?",
        [id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEE_SECTIONS",
              code: "REPOSITORY.EMPLOYEE_SECTIONS.GETBYID.ERROR",
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

  getByBranchAndDepartmentUsingEmployees(branch_id, department_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT DISTINCT s.* FROM employees e
        INNER JOIN employee_sections s ON e.section_id = s.section_id
        WHERE e.branch_id = ? AND e.department_id = ? AND e.terminated = 0
        ORDER BY s.section_name ASC`,
        [branch_id, department_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEE_SECTIONS",
              code: "REPOSITORY.EMPLOYEE_SECTIONS.GETBYBRANCHDEPTUSINGEMPLOYEES.ERROR",
              description: err.toString(),
              category: "",
              ref: { branch_id, department_id },
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
        "DELETE FROM employee_sections WHERE section_id = ?",
        [id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEE_SECTIONS",
              code: "REPOSITORY.EMPLOYEE_SECTIONS.DELETE.ERROR",
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
  return new EmployeeSectionsRepository(db);
};
