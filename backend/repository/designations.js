const logger = require("../utils/logger");

class DesignationsRepository {
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
        `INSERT INTO designations SET ? ${
          updateAssignments.length > 0
            ? `ON DUPLICATE KEY UPDATE ${updateAssignments}`
            : ""
        }`,
        [payload],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.DESIGNATIONS",
              code: "REPOSITORY.DESIGNATIONS.CREATE.ERROR",
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
        `INSERT INTO designations (${columns.join(
          ","
        )}) VALUES ${placeholders}` +
        (updateAssignments.length > 0
          ? ` ON DUPLICATE KEY UPDATE ${updateAssignments}`
          : "");

      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.DESIGNATIONS",
            code: "REPOSITORY.DESIGNATIONS.BULKCREATE.ERROR",
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
        "UPDATE designations SET ? WHERE designation_id = ?",
        [payload, id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.DESIGNATIONS",
              code: "REPOSITORY.DESIGNATIONS.UPDATE.ERROR",
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

  addPermissions(designation_id, permission) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "INSERT INTO permissions SET permission_key = ?, designation_id = ?",
        [permission, designation_id],
        (err, result) => {
          if (err) reject(err);
          resolve(result);
        }
      );
    });
  }

  deletePermissions(designation_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM permissions WHERE designation_id = ?",
        [designation_id],
        (err, result) => {
          if (err) reject(err);
          resolve(result);
        }
      );
    });
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT * FROM designations ORDER BY designation_id DESC",
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.DESIGNATIONS",
              code: "REPOSITORY.DESIGNATIONS.GETALL.ERROR",
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
        "SELECT * FROM designations WHERE designation_id = ?",
        [id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.DESIGNATIONS",
              code: "REPOSITORY.DESIGNATIONS.GETBYID.ERROR",
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

  getPermissions(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT * FROM permissions WHERE designation_id = ?",
        [id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.DESIGNATIONS",
              code: "REPOSITORY.DESIGNATIONS.GETPERMISSIONS.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(rows || null);
        }
      );
    });
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM designations WHERE designation_id = ?",
        [id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.DESIGNATIONS",
              code: "REPOSITORY.DESIGNATIONS.DELETE.ERROR",
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

  checkEmployeePermissions(employee_id, permission_keys) {
    return new Promise((resolve, reject) => {
      if (!permission_keys || permission_keys.length === 0) {
        resolve([]);
        return;
      }

      const placeholders = permission_keys.map(() => "?").join(",");
      const query = `
        SELECT DISTINCT p.permission_key 
        FROM permissions p
        INNER JOIN employees e ON p.designation_id = e.designation_id
        WHERE e.employee_code = ? AND p.permission_key IN (${placeholders})
      `;

      this.db.query(query, [employee_id, ...permission_keys], (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.DESIGNATIONS",
            code: "REPOSITORY.DESIGNATIONS.CHECKEMPLOYEEPERMISSIONS.ERROR",
            description: err.toString(),
            category: "",
            ref: { employee_id, permission_keys },
          });
          reject(err);
          return;
        }
        resolve(rows.map((row) => row.permission_key));
      });
    });
  }
}

module.exports = (db) => {
  return new DesignationsRepository(db);
};
