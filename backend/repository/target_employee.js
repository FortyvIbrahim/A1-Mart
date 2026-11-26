const moment = require("moment");
const logger = require("../utils/logger");

class TargetEmployeeRepository {
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
      const section_id = payloads[0].section_id;
      const monthDate = payloads[0].target_date; // any date within the target month

      // Delete existing for branch, department, section and month, then insert all
      const deleteSql = `DELETE FROM target_employee 
        WHERE branch_id = ? 
          AND department_id = ?
          AND section_id = ?
          AND YEAR(target_date) = YEAR(?) 
          AND MONTH(target_date) = MONTH(?)`;

      const columns = [
        "branch_id",
        "department_id",
        "section_id",
        "employee_id",
        "target_amount",
        "target_date",
      ];
      const values = payloads.map((p) => [
        p.branch_id,
        p.department_id,
        p.section_id,
        p.employee_id,
        p.target_amount,
        p.target_date,
      ]);
      const placeholders = values
        .map(() => `(${columns.map(() => "?").join(", ")}, CURRENT_TIMESTAMP)`)
        .join(", ");
      const flatValues = [].concat(...values);

      const insertSql = `INSERT INTO target_employee (${columns.join(
        ", "
      )}, created_at)
        VALUES ${placeholders}`;

      this.db.query(
        deleteSql,
        [branch_id, department_id, section_id, monthDate, monthDate],
        (delErr) => {
          if (delErr) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_EMPLOYEE",
              code: "REPOSITORY.TARGET_EMPLOYEE.BULK_DELETE_MONTH.ERROR",
              description: delErr.toString(),
              category: "",
              ref: { branch_id, department_id, section_id, monthDate },
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
                component: "REPOSITORY.TARGET_EMPLOYEE",
                code: "REPOSITORY.TARGET_EMPLOYEE.BULK_INSERT.ERROR",
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
          te.target_employee_id,
          te.branch_id,
          te.department_id,
          te.section_id,
          te.employee_id,
          te.target_amount,
          te.target_date,
          te.created_at,
          te.updated_at,
          b.branch_name,
          d.department_name,
          es.section_name,
          e.employee_name
        FROM target_employee te
        LEFT JOIN branches b ON te.branch_id = b.branch_id
        LEFT JOIN departments d ON te.department_id = d.department_id
        LEFT JOIN employee_sections es ON te.section_id = es.section_id
        LEFT JOIN employees e ON te.employee_id = e.employee_code
        ${branch_id ? `WHERE te.branch_id = ?` : ``}
        ORDER BY te.created_at DESC`,
        branch_id ? [branch_id] : [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_EMPLOYEE",
              code: "REPOSITORY.TARGET_EMPLOYEE.GETALL.ERROR",
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
          te.target_employee_id,
          te.branch_id,
          te.department_id,
          te.section_id,
          te.employee_id,
          te.target_amount,
          te.target_date,
          te.created_at,
          te.updated_at,
          b.branch_name,
          d.department_name,
          es.section_name,
          e.employee_name
        FROM target_employee te
        LEFT JOIN branches b ON te.branch_id = b.branch_id
        LEFT JOIN departments d ON te.department_id = d.department_id
        LEFT JOIN employee_sections es ON te.section_id = es.section_id
        LEFT JOIN employees e ON te.employee_id = e.employee_id
        WHERE te.target_employee_id = ?`,
        [id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_EMPLOYEE",
              code: "REPOSITORY.TARGET_EMPLOYEE.GETBYID.ERROR",
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

  getUserTarget(employee_code, date) {
    return new Promise((resolve, reject) => {
      const formattedDate = moment(date).format("YYYY-MM-DD");
      this.db.query(
        `SELECT
                te.target_amount,
                CASE WHEN te.employee_id IS NOT NULL THEN 0 ELSE 1 END as is_merged
            FROM
                target_employee te
            LEFT JOIN
                employees e ON e.employee_code = ?
            WHERE
                YEAR(te.target_date) = YEAR(?)
                AND MONTH(te.target_date) = MONTH(?)
                AND (
                    te.employee_id = e.employee_code
                    OR (
                        te.employee_id IS NULL
                        AND te.branch_id = e.branch_id
                        AND te.department_id = e.department_id
                        AND te.section_id = e.section_id
                    )
                )
            ORDER BY
                CASE WHEN te.employee_id IS NOT NULL THEN 1 ELSE 2 END
            LIMIT 1;`,
        [employee_code, formattedDate, formattedDate],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_EMPLOYEE",
              code: "REPOSITORY.TARGET_EMPLOYEE.GETUSERTARGET.ERROR",
              description: err.toString(),
              category: "",
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
        "employee_id",
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
        `UPDATE target_employee SET ${sets.join(
          ", "
        )} WHERE target_employee_id = ?`,
        values,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_EMPLOYEE",
              code: "REPOSITORY.TARGET_EMPLOYEE.UPDATE.ERROR",
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
  return new TargetEmployeeRepository(db);
};
