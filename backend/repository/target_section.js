const logger = require("../utils/logger");

class TargetSectionRepository {
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
      const department_id = payloads[0].department_id;
      const monthDate = payloads[0].target_date; // any date within the target month

      // Delete existing for branch, department and month, then insert all
      const deleteSql = `DELETE FROM target_section 
        WHERE branch_id = ? 
          AND department_id = ?
          AND YEAR(target_date) = YEAR(?) 
          AND MONTH(target_date) = MONTH(?)`;

      const columns = [
        "branch_id",
        "department_id",
        "section_id",
        "target_amount",
        "target_date",
      ];
      const values = payloads.map((p) => [
        p.branch_id,
        p.department_id,
        p.section_id,
        p.target_amount,
        p.target_date,
      ]);
      const placeholders = values
        .map(() => `(${columns.map(() => "?").join(", ")}, CURRENT_TIMESTAMP)`)
        .join(", ");
      const flatValues = [].concat(...values);

      const insertSql = `INSERT INTO target_section (${columns.join(
        ", "
      )}, created_at)
        VALUES ${placeholders}`;

      this.db.query(
        deleteSql,
        [branch_id, department_id, monthDate, monthDate],
        (delErr) => {
          if (delErr) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_SECTION",
              code: "REPOSITORY.TARGET_SECTION.BULK_DELETE_MONTH.ERROR",
              description: delErr.toString(),
              category: "",
              ref: { branch_id, department_id, monthDate },
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
                component: "REPOSITORY.TARGET_SECTION",
                code: "REPOSITORY.TARGET_SECTION.BULK_INSERT.ERROR",
                description: insErr.toString(),
                category: "",
                ref: {},
              });
              reject(insErr);
              return;
            }
            resolve({ affectedRows: result.affectedRows });
          });
        }
      );
    });
  }

  getAll(branch_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
          ts.target_section_id,
          ts.branch_id,
          ts.department_id,
          ts.section_id,
          ts.target_amount,
          ts.target_date,
          ts.created_at,
          ts.updated_at,
          b.branch_name,
          d.department_name,
          es.section_name,
          EXISTS (
            SELECT 1 FROM target_employee te
            WHERE te.branch_id = ts.branch_id
              AND te.department_id = ts.department_id
              AND te.section_id = ts.section_id
              AND YEAR(te.target_date) = YEAR(ts.target_date)
              AND MONTH(te.target_date) = MONTH(ts.target_date)
          ) AS has_employee_targets
        FROM target_section ts
        LEFT JOIN branches b ON ts.branch_id = b.branch_id
        LEFT JOIN departments d ON ts.department_id = d.department_id
        LEFT JOIN employee_sections es ON ts.section_id = es.section_id
        ${branch_id ? `WHERE ts.branch_id = ?` : ``}
        ORDER BY ts.created_at DESC`,
        branch_id ? [branch_id] : [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_SECTION",
              code: "REPOSITORY.TARGET_SECTION.GETALL.ERROR",
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
          ts.target_section_id,
          ts.branch_id,
          ts.department_id,
          ts.section_id,
          ts.target_amount,
          ts.target_date,
          ts.created_at,
          ts.updated_at,
          b.branch_name,
          d.department_name,
          es.section_name
        FROM target_section ts
        LEFT JOIN branches b ON ts.branch_id = b.branch_id
        LEFT JOIN departments d ON ts.department_id = d.department_id
        LEFT JOIN employee_sections es ON ts.section_id = es.section_id
        WHERE ts.target_section_id = ?`,
        [id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_SECTION",
              code: "REPOSITORY.TARGET_SECTION.GETBYID.ERROR",
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
        "section_id",
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
        `UPDATE target_section SET ${sets.join(
          ", "
        )} WHERE target_section_id = ?`,
        values,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_SECTION",
              code: "REPOSITORY.TARGET_SECTION.UPDATE.ERROR",
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
  return new TargetSectionRepository(db);
};
