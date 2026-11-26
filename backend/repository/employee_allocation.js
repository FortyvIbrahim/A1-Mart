const logger = require("../utils/logger");

class EmployeeAllocationRepository {
  constructor(db) {
    this.db = db;
  }

  _existsForPair(branch_id, designation_id, excludeId = null) {
    return new Promise((resolve, reject) => {
      const params = [branch_id, designation_id];
      let sql = `
        SELECT employee_allocation_id
        FROM employee_allocation
        WHERE branch_id = ? AND designation_id = ?
      `;

      if (excludeId !== null) {
        sql += " AND employee_allocation_id <> ?";
        params.push(excludeId);
      }

      sql += " LIMIT 1";

      this.db.query(sql, params, (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.EMPLOYEE_ALLOCATION",
            code: "REPOSITORY.EMPLOYEE_ALLOCATION.EXISTSFORPAIR.ERROR",
            description: err.toString(),
            category: "",
            ref: { branch_id, designation_id, excludeId },
          });
          reject(err);
          return;
        }
        resolve(rows.length > 0);
      });
    });
  }

  create(payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const { branch_id, designation_id, required_count } = payload;

        // Ensure only one entry per (branch_id, designation_id)
        const exists = await this._existsForPair(branch_id, designation_id);
        if (exists) {
          const err = new Error(
            "Employee allocation already exists for this branch and designation"
          );
          err.name = "ValidationError";
          err.appCode = "EMPLOYEE_ALLOCATION_DUPLICATE";
          reject(err);
          return;
        }

        this.db.query(
          `INSERT INTO employee_allocation
            (branch_id, designation_id, required_count, created_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
          [branch_id, designation_id, required_count],
          (err, result) => {
            if (err) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.EMPLOYEE_ALLOCATION",
                code: "REPOSITORY.EMPLOYEE_ALLOCATION.CREATE.ERROR",
                description: err.toString(),
                category: "",
                ref: { payload },
              });
              reject(err);
              return;
            }
            resolve({
              employee_allocation_id: result.insertId,
              branch_id,
              designation_id,
              required_count,
            });
          }
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll(branch_id) {
    return new Promise((resolve, reject) => {
      const whereClause = branch_id ? "WHERE ea.branch_id = ?" : "";
      const params = branch_id ? [branch_id] : [];

      const sql = `
        SELECT
          ea.employee_allocation_id,
          ea.branch_id,
          ea.designation_id,
          ea.required_count,
          d.working_days,
          ea.created_at,
          ea.updated_at,
          b.branch_name,
          d.designation_name,
          (
            SELECT COUNT(*) 
            FROM employees e
            WHERE e.branch_id = ea.branch_id
              AND e.designation_id = ea.designation_id
              AND e.terminated = 0
          ) AS existing_count
        FROM employee_allocation ea
        LEFT JOIN branches b ON ea.branch_id = b.branch_id
        LEFT JOIN designations d ON ea.designation_id = d.designation_id
        ${whereClause}
        ORDER BY ea.created_at DESC
      `;

      this.db.query(sql, params, (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.EMPLOYEE_ALLOCATION",
            code: "REPOSITORY.EMPLOYEE_ALLOCATION.GETALL.ERROR",
            description: err.toString(),
            category: "",
            ref: { branch_id },
          });
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  getById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          ea.employee_allocation_id,
          ea.branch_id,
          ea.designation_id,
          ea.required_count,
          d.working_days,
          ea.created_at,
          ea.updated_at,
          b.branch_name,
          d.designation_name,
          (
            SELECT COUNT(*) 
            FROM employees e
            WHERE e.branch_id = ea.branch_id
              AND e.designation_id = ea.designation_id
              AND e.terminated = 0
          ) AS existing_count
        FROM employee_allocation ea
        LEFT JOIN branches b ON ea.branch_id = b.branch_id
        LEFT JOIN designations d ON ea.designation_id = d.designation_id
        WHERE ea.employee_allocation_id = ?
      `;

      this.db.query(sql, [id], (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.EMPLOYEE_ALLOCATION",
            code: "REPOSITORY.EMPLOYEE_ALLOCATION.GETBYID.ERROR",
            description: err.toString(),
            category: "",
            ref: { id },
          });
          reject(err);
          return;
        }
        resolve(rows.length > 0 ? rows[0] : null);
      });
    });
  }

  update(id, payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const allowed = ["branch_id", "designation_id", "required_count"];
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

        // If branch / designation are being changed, ensure uniqueness
        const willChangeBranchOrDesignation =
          payload.branch_id !== undefined || payload.designation_id !== undefined;

        if (willChangeBranchOrDesignation) {
          // Get current row to compute final pair
          const current = await this.getById(id);
          if (!current) {
            resolve({ affectedRows: 0 });
            return;
          }

          const finalBranchId =
            payload.branch_id !== undefined ? payload.branch_id : current.branch_id;
          const finalDesignationId =
            payload.designation_id !== undefined
              ? payload.designation_id
              : current.designation_id;

          const exists = await this._existsForPair(
            finalBranchId,
            finalDesignationId,
            id
          );
          if (exists) {
            const err = new Error(
              "Employee allocation already exists for this branch and designation"
            );
            err.name = "ValidationError";
            err.appCode = "EMPLOYEE_ALLOCATION_DUPLICATE";
            reject(err);
            return;
          }
        }

        sets.push("updated_at = CURRENT_TIMESTAMP");
        values.push(id);

        const sql = `UPDATE employee_allocation SET ${sets.join(
          ", "
        )} WHERE employee_allocation_id = ?`;

        this.db.query(sql, values, (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEE_ALLOCATION",
              code: "REPOSITORY.EMPLOYEE_ALLOCATION.UPDATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { id, payload },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM employee_allocation WHERE employee_allocation_id = ?",
        [id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.EMPLOYEE_ALLOCATION",
              code: "REPOSITORY.EMPLOYEE_ALLOCATION.DELETE.ERROR",
              description: err.toString(),
              category: "",
              ref: { id },
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
  return new EmployeeAllocationRepository(db);
};

