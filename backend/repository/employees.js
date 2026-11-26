const logger = require("../utils/logger");

class EmployeesRepository {
  constructor(db) {
    this.db = db;
  }

  create(payload) {
    return new Promise((resolve, reject) => {
      const columns = Object.keys(payload);
      const values = columns.map((c) => payload[c]);
      const tickedColumns = columns.map((c) => `\`${c}\``).join(",");
      const placeholders = columns.map(() => "?").join(",");

      // Exclude primary key and immutable columns from update
      const doNotUpdate = new Set(["employee_code", "created_at"]);
      const updateAssignments = columns
        .filter((c) => !doNotUpdate.has(c))
        .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
        .join(", ");

      const sql =
        `INSERT INTO employees (${tickedColumns}) VALUES (${placeholders})` +
        (updateAssignments.length > 0
          ? ` ON DUPLICATE KEY UPDATE ${updateAssignments}`
          : "");

      this.db.query(sql, values, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.EMPLOYEES",
            code: "REPOSITORY.EMPLOYEES.CREATE.ERROR",
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

      const tickedColumns = columns.map((c) => `\`${c}\``).join(",");

      // Exclude primary key and immutable columns from update
      const doNotUpdate = new Set(["employee_code", "created_at"]);
      const updateAssignments = columns
        .filter((c) => !doNotUpdate.has(c))
        .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
        .join(", ");

      const sql =
        `INSERT INTO employees (${tickedColumns}) VALUES ${placeholders}` +
        (updateAssignments.length > 0
          ? ` ON DUPLICATE KEY UPDATE ${updateAssignments}`
          : "");

      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.EMPLOYEES",
            code: "REPOSITORY.EMPLOYEES.BULKCREATE.ERROR",
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

  update(employee_code, payload) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "UPDATE employees SET ? WHERE employee_code = ?",
        [payload, employee_code],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEES",
              code: "REPOSITORY.EMPLOYEES.UPDATE.ERROR",
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

  getAll(branch_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT employees.*,
                designation_name,
                department_name,
                user_id,
                section_name,
                section_code,
                branch_name,
                totp_enabled,
                IF(totp_secret IS NOT NULL, 'setup-done', 'setup-required') as totp_status,
                COALESCE(employees.incentive_type, designations.incentive_type) AS incentive_type_resolved,
                ed.dl_number AS driver_dl_number,
                ed.dl_file AS driver_dl_file,
                ed.vehicle_classes AS driver_vehicle_classes,
                ed.valid_till AS driver_valid_till
         FROM employees
        LEFT JOIN designations ON employees.designation_id = designations.designation_id
        LEFT JOIN departments ON employees.department_id = departments.department_id
        LEFT JOIN employee_sections ON employees.section_id = employee_sections.section_id
        LEFT JOIN branches ON employees.branch_id = branches.branch_id
		    LEFT JOIN user ON employees.employee_code = user.employee_id
        LEFT JOIN employee_driver ed ON employees.employee_code = ed.employee_code
        ${branch_id ? `WHERE employees.branch_id = ?` : ""}
        ORDER BY employees.employee_code ASC;`,
        branch_id ? [branch_id] : [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEES",
              code: "REPOSITORY.EMPLOYEES.GETALL.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve((rows || []).map((r) => this._mapRowWithDriver(r)));
        }
      );
    });
  }

  upsertDriver(employee_code, payload) {
    return new Promise((resolve, reject) => {
      const vehicleClasses =
        payload.vehicle_classes != null
          ? JSON.stringify(payload.vehicle_classes)
          : null;
      const sql = `INSERT INTO employee_driver (employee_code, dl_number, dl_file, vehicle_classes, valid_till)
                   VALUES (?, ?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE
                     dl_number = VALUES(dl_number),
                     dl_file = VALUES(dl_file),
                     vehicle_classes = VALUES(vehicle_classes),
                     valid_till = VALUES(valid_till)`;
      this.db.query(
        sql,
        [
          employee_code,
          payload.dl_number ?? null,
          payload.dl_file ?? null,
          vehicleClasses,
          payload.valid_till ?? null,
        ],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEES",
              code: "REPOSITORY.EMPLOYEES.UPSERTDRIVER.ERROR",
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

  _mapRowWithDriver(row) {
    if (!row) return null;
    const {
      driver_dl_number,
      driver_dl_file,
      driver_vehicle_classes,
      driver_valid_till,
      ...emp
    } = row;
    const hasDriver =
      driver_dl_number != null ||
      driver_dl_file != null ||
      driver_vehicle_classes != null ||
      driver_valid_till != null;
    emp.driver_details = hasDriver
      ? {
          dl_number: driver_dl_number ?? null,
          dl_file: driver_dl_file ?? null,
          vehicle_classes:
            driver_vehicle_classes != null
              ? typeof driver_vehicle_classes === "string"
                ? JSON.parse(driver_vehicle_classes)
                : driver_vehicle_classes
              : null,
          valid_till: driver_valid_till ?? null,
        }
      : null;
    return emp;
  }

  getById(employee_code) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT employees.*,
                COALESCE(employees.incentive_type, designations.incentive_type) AS incentive_type_resolved,
                ed.dl_number AS driver_dl_number,
                ed.dl_file AS driver_dl_file,
                ed.vehicle_classes AS driver_vehicle_classes,
                ed.valid_till AS driver_valid_till
         FROM employees
         LEFT JOIN designations ON employees.designation_id = designations.designation_id
         LEFT JOIN employee_driver ed ON employees.employee_code = ed.employee_code
         WHERE employees.employee_code = ?`,
        [employee_code],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEES",
              code: "REPOSITORY.EMPLOYEES.GETBYID.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(this._mapRowWithDriver(rows[0]) ?? null);
        }
      );
    });
  }

  getByPhone(phone_number) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT * FROM employees WHERE mobile_number = ?",
        [phone_number],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEES",
              code: "REPOSITORY.EMPLOYEES.GETBYPHONE.ERROR",
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

  getByBranchDepartmentSection(branch_id, department_id, section_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT employees.*,
                designation_name,
                department_name,
                user_id,
                section_name,
                section_code,
                branch_name,
                COALESCE(employees.incentive_type, designations.incentive_type) AS incentive_type_resolved,
                ed.dl_number AS driver_dl_number,
                ed.dl_file AS driver_dl_file,
                ed.vehicle_classes AS driver_vehicle_classes,
                ed.valid_till AS driver_valid_till
         FROM employees
        LEFT JOIN designations ON employees.designation_id = designations.designation_id
        LEFT JOIN departments ON employees.department_id = departments.department_id
        LEFT JOIN employee_sections ON employees.section_id = employee_sections.section_id
        LEFT JOIN branches ON employees.branch_id = branches.branch_id
        LEFT JOIN user ON employees.employee_code = user.employee_id
        LEFT JOIN employee_driver ed ON employees.employee_code = ed.employee_code
        WHERE employees.branch_id = ? AND employees.department_id = ? AND employees.section_id = ? AND employees.terminated = 0
        ORDER BY employees.created_at DESC;`,
        [branch_id, department_id, section_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEES",
              code: "REPOSITORY.EMPLOYEES.GETBYBRANCHDEPTSECTION.ERROR",
              description: err.toString(),
              category: "",
              ref: { branch_id, department_id, section_id },
            });
            reject(err);
            return;
          }
          resolve((rows || []).map((r) => this._mapRowWithDriver(r)));
        }
      );
    });
  }

  delete(employee_code) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM employees WHERE employee_code = ?",
        [employee_code],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEES",
              code: "REPOSITORY.EMPLOYEES.DELETE.ERROR",
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

  terminateAll() {
    return new Promise((resolve, reject) => {
      this.db.query(
        "UPDATE employees SET `terminated` = TRUE",
        [],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEES",
              code: "REPOSITORY.EMPLOYEES.DELETEALL",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(docs);
        }
      );
    });
  }
}

module.exports = (db) => {
  return new EmployeesRepository(db);
};
