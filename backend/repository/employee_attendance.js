const logger = require("../utils/logger");

class EmployeeAttendanceRepository {
  constructor(db) {
    this.db = db;
  }

  create(payload) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `INSERT IGNORE INTO employee_attendance (employee_code, clock_date_time, punch_action)
         VALUES (?, ?, ?)`,
        [
          payload.employee_code,
          payload.clock_date_time,
          payload.punch_action,
        ],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEE_ATTENDANCE",
              code: "REPOSITORY.EMPLOYEE_ATTENDANCE.CREATE",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          const inserted = result.affectedRows === 1;
          resolve({
            attendance_id: inserted ? result.insertId : null,
            inserted,
          });
        }
      );
    });
  }

  bulkInsert(rows) {
    return new Promise((resolve, reject) => {
      if (!rows || rows.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }
      const values = rows.map((r) => [
        r.employee_code,
        r.clock_date_time,
        r.punch_action,
      ]);
      const placeholders = values.map(() => "(?, ?, ?)").join(", ");
      const flat = values.flat();

      this.db.query(
        `INSERT IGNORE INTO employee_attendance (employee_code, clock_date_time, punch_action)
         VALUES ${placeholders}`,
        flat,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEE_ATTENDANCE",
              code: "REPOSITORY.EMPLOYEE_ATTENDANCE.BULK_INSERT",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          const inserted = result.affectedRows;
          resolve({
            inserted,
            skipped: rows.length - inserted,
          });
        }
      );
    });
  }

  bulkUpsertProcessed(rows) {
    return new Promise((resolve, reject) => {
      if (!rows || rows.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      const values = rows.map((r) => [
        r.employee_code,
        r.date,
        !!r.is_late,
        !!r.is_early,
      ]);
      const placeholders = values.map(() => "(?, ?, ?, ?)").join(", ");
      const flat = values.flat();

      this.db.query(
        `INSERT INTO employee_attendance_processed (employee_code, date, is_late, is_early)
         VALUES ${placeholders}
         ON DUPLICATE KEY UPDATE
           is_late = VALUES(is_late),
           is_early = VALUES(is_early)`,
        flat,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEE_ATTENDANCE",
              code: "REPOSITORY.EMPLOYEE_ATTENDANCE.BULK_UPSERT_PROCESSED",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve({
            affectedRows: result.affectedRows,
          });
        }
      );
    });
  }

  getById(attendance_id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT ea.attendance_id, ea.employee_code, ea.clock_date_time, ea.punch_action, ea.created_at,
               e.employee_name, e.profile_img_url, e.branch_id,
               des.designation_name, dep.department_name, b.branch_name
        FROM employee_attendance ea
        LEFT JOIN employees e ON ea.employee_code = e.employee_code
        LEFT JOIN designations des ON e.designation_id = des.designation_id
        LEFT JOIN departments dep ON e.department_id = dep.department_id
        LEFT JOIN branches b ON e.branch_id = b.branch_id
        WHERE ea.attendance_id = ?
      `;
      this.db.query(sql, [attendance_id], (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.EMPLOYEE_ATTENDANCE",
            code: "REPOSITORY.EMPLOYEE_ATTENDANCE.GET_BY_ID",
            description: err.toString(),
            category: "",
            ref: { attendance_id },
          });
          reject(err);
          return;
        }
        const row = rows?.[0];
        resolve(row ? this._mapRowWithEmployee(row) : null);
      });
    });
  }

  _mapRowWithEmployee(row) {
    const {
      employee_name,
      profile_img_url,
      branch_id,
      designation_name,
      department_name,
      branch_name,
      ...attendance
    } = row;
    return {
      ...attendance,
      employee:
        row.employee_code != null
          ? {
            employee_code: row.employee_code,
            employee_name: employee_name ?? null,
            profile_img_url: profile_img_url ?? null,
            branch_id: branch_id ?? null,
            designation_name: designation_name ?? null,
            department_name: department_name ?? null,
            branch_name: branch_name ?? null,
          }
          : null,
    };
  }

  getAll(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT ea.attendance_id, ea.employee_code, ea.clock_date_time, ea.punch_action, ea.created_at,
               e.employee_name, e.profile_img_url, e.branch_id,
               des.designation_name, dep.department_name, b.branch_name
        FROM employee_attendance ea
        LEFT JOIN employees e ON ea.employee_code = e.employee_code
        LEFT JOIN designations des ON e.designation_id = des.designation_id
        LEFT JOIN departments dep ON e.department_id = dep.department_id
        LEFT JOIN branches b ON e.branch_id = b.branch_id
        WHERE 1=1
      `;
      const params = [];

      if (filters.employee_code != null && filters.employee_code !== "") {
        sql += " AND ea.employee_code = ?";
        params.push(filters.employee_code);
      }
      if (filters.from_date) {
        sql += " AND ea.clock_date_time >= ?";
        params.push(filters.from_date);
      }
      if (filters.to_date) {
        sql += " AND ea.clock_date_time <= ?";
        params.push(filters.to_date);
      }

      sql += " ORDER BY ea.clock_date_time DESC, ea.attendance_id DESC";

      this.db.query(sql, params, (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.EMPLOYEE_ATTENDANCE",
            code: "REPOSITORY.EMPLOYEE_ATTENDANCE.GET_ALL",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve((rows || []).map((r) => this._mapRowWithEmployee(r)));
      });
    });
  }

  getProcessed(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT eap.attendance_processed_id, eap.employee_code, eap.date, eap.is_late, eap.is_early, eap.created_at, eap.updated_at,
               e.employee_name, e.profile_img_url, e.branch_id,
               des.designation_name, dep.department_name, b.branch_name
        FROM employee_attendance_processed eap
        LEFT JOIN employees e ON eap.employee_code = e.employee_code
        LEFT JOIN designations des ON e.designation_id = des.designation_id
        LEFT JOIN departments dep ON e.department_id = dep.department_id
        LEFT JOIN branches b ON e.branch_id = b.branch_id
        WHERE 1=1
      `;
      const params = [];

      if (filters.employee_code != null && filters.employee_code !== "") {
        sql += " AND eap.employee_code = ?";
        params.push(filters.employee_code);
      }
      if (filters.from_date) {
        sql += " AND eap.date >= ?";
        params.push(filters.from_date);
      }
      if (filters.to_date) {
        sql += " AND eap.date <= ?";
        params.push(filters.to_date);
      }

      sql += " ORDER BY eap.date DESC, eap.attendance_processed_id DESC";

      this.db.query(sql, params, (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.EMPLOYEE_ATTENDANCE",
            code: "REPOSITORY.EMPLOYEE_ATTENDANCE.GET_PROCESSED",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve((rows || []).map((r) => this._mapRowWithEmployee(r)));
      });
    });
  }

  update(attendance_id, payload) {
    return new Promise((resolve, reject) => {
      const allowed = ["employee_code", "clock_date_time", "punch_action"];
      const set = [];
      const values = [];
      allowed.forEach((key) => {
        if (payload[key] !== undefined) {
          set.push(`${key} = ?`);
          values.push(payload[key]);
        }
      });
      if (set.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }
      values.push(attendance_id);

      this.db.query(
        `UPDATE employee_attendance SET ${set.join(", ")} WHERE attendance_id = ?`,
        values,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEE_ATTENDANCE",
              code: "REPOSITORY.EMPLOYEE_ATTENDANCE.UPDATE",
              description: err.toString(),
              category: "",
              ref: { attendance_id },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }

  delete(attendance_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM employee_attendance WHERE attendance_id = ?",
        [attendance_id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEE_ATTENDANCE",
              code: "REPOSITORY.EMPLOYEE_ATTENDANCE.DELETE",
              description: err.toString(),
              category: "",
              ref: { attendance_id },
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
  return new EmployeeAttendanceRepository(db);
};
