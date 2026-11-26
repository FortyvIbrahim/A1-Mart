const logger = require("../utils/logger");

class TargetDepartmentRepository {
  constructor(db) {
    this.db = db;
  }

  create(payloads) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(payloads) || payloads.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      const branch_id = payloads[0].branch_id;
      const monthDate = payloads[0].target_date; // any date within the target month

      // Delete existing for branch and month, then insert all
      const deleteSql = `DELETE FROM target_department 
        WHERE branch_id = ? 
          AND YEAR(target_date) = YEAR(?) 
          AND MONTH(target_date) = MONTH(?)`;

      const columns = [
        "branch_id",
        "department_id",
        "target_amount",
        "target_date",
      ];
      const values = payloads.map((p) => [
        p.branch_id,
        p.department_id,
        p.target_amount,
        p.target_date,
      ]);
      const placeholders = values
        .map(() => `(${columns.map(() => "?").join(", ")}, CURRENT_TIMESTAMP)`)
        .join(", ");
      const flatValues = [].concat(...values);

      const insertSql = `INSERT INTO target_department (${columns.join(
        ", "
      )}, created_at)
        VALUES ${placeholders}`;

      this.db.query(deleteSql, [branch_id, monthDate, monthDate], (delErr) => {
        if (delErr) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.TARGET_DEPARTMENT",
            code: "REPOSITORY.TARGET_DEPARTMENT.BULK_DELETE_MONTH.ERROR",
            description: delErr.toString(),
            category: "",
            ref: { branch_id, monthDate },
          });
          reject(delErr);
          return;
        }

        if (values.length === 0) {
          resolve({ affectedRows: 0 });
          return;
        }

        this.db.query(insertSql, flatValues, (insErr, result) => {
          if (insErr) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_DEPARTMENT",
              code: "REPOSITORY.TARGET_DEPARTMENT.BULK_INSERT.ERROR",
              description: insErr.toString(),
              category: "",
              ref: {},
            });
            reject(insErr);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        });
      });
    });
  }

  getAll(branch_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
          td.target_department_id,
          td.branch_id,
          td.department_id,
          td.target_amount,
          td.target_date,
          td.created_at,
          td.updated_at,
          b.branch_name,
          d.department_name,
          EXISTS (
            SELECT 1 FROM target_section ts
            WHERE ts.branch_id = td.branch_id
              AND ts.department_id = td.department_id
              AND YEAR(ts.target_date) = YEAR(td.target_date)
              AND MONTH(ts.target_date) = MONTH(td.target_date)
          ) AS has_section_targets
        FROM target_department td
        LEFT JOIN branches b ON td.branch_id = b.branch_id
        LEFT JOIN departments d ON td.department_id = d.department_id
        ${branch_id ? `WHERE td.branch_id = ?` : ``}
        ORDER BY td.created_at DESC`,
        branch_id ? [branch_id] : [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_DEPARTMENT",
              code: "REPOSITORY.TARGET_DEPARTMENT.GETALL.ERROR",
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
        `SELECT 
          td.target_department_id,
          td.branch_id,
          td.department_id,
          td.target_amount,
          td.target_date,
          td.created_at,
          td.updated_at,
          b.branch_name,
          d.department_name
        FROM target_department td
        LEFT JOIN branches b ON td.branch_id = b.branch_id
        LEFT JOIN departments d ON td.department_id = d.department_id
        WHERE td.target_department_id = ?`,
        [id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_DEPARTMENT",
              code: "REPOSITORY.TARGET_DEPARTMENT.GETBYID.ERROR",
              description: err.toString(),
              category: "",
              ref: { id },
            });
            reject(err);
            return;
          }
          resolve(rows.length > 0 ? rows[0] : null);
        }
      );
    });
  }

  update(id, payload) {
    return new Promise((resolve, reject) => {
      const allowed = [
        "branch_id",
        "department_id",
        "target_amount",
        "target_date",
      ];
      const sets = [];
      const values = [];
      for (const key of allowed) {
        if (payload[key] !== undefined) {
          sets.push(`${key} = ?`);
          values.push(payload[key]);
        }
      }
      if (sets.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }
      sets.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id);

      this.db.query(
        `UPDATE target_department SET ${sets.join(
          ", "
        )} WHERE target_department_id = ?`,
        values,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_DEPARTMENT",
              code: "REPOSITORY.TARGET_DEPARTMENT.UPDATE.ERROR",
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
}

module.exports = (db) => {
  return new TargetDepartmentRepository(db);
};
