const logger = require("../utils/logger");

class IncentiveGeneratedRepository {
  constructor(db) {
    this.db = db;
  }

  // ---------- incentive_generated (header) ----------

  /**
   * Normalize designation_id to sorted JSON array for storage/comparison.
   * Treats null/undefined as null; single number as [n]; array as sorted copy.
   */
  _normalizeDesignationId(designation_id) {
    if (designation_id == null) return null;
    const arr = Array.isArray(designation_id)
      ? [...designation_id].filter((id) => id != null).sort((a, b) => a - b)
      : [Number(designation_id)];
    return arr.length === 0 ? null : JSON.stringify(arr);
  }

  /** Ensure designation_id from DB is always returned as an array (for API responses). */
  _designationIdToArray(designation_id) {
    if (designation_id == null) return [];
    if (Array.isArray(designation_id)) return designation_id;
    if (typeof designation_id === "string") {
      try {
        const parsed = JSON.parse(designation_id);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    }
    return [Number(designation_id)];
  }

  /** Fetch designation_id and designation_name for given ids. Returns map id -> { designation_id, designation_name }. */
  _getDesignationsByIds(ids) {
    return new Promise((resolve, reject) => {
      const unique = [...new Set(ids)].filter((id) => id != null);
      if (unique.length === 0) {
        resolve({});
        return;
      }
      const placeholders = unique.map(() => "?").join(",");
      const sql = `SELECT designation_id, designation_name FROM designations WHERE designation_id IN (${placeholders})`;
      this.db.query(sql, unique, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        const map = {};
        (rows || []).forEach((r) => {
          map[r.designation_id] = {
            designation_id: r.designation_id,
            designation_name: r.designation_name,
          };
        });
        resolve(map);
      });
    });
  }

  /** Build designations array in order of ids: [{ designation_id, designation_name }, ...]. */
  _buildDesignationsArray(designationIds, designationsMap) {
    return designationIds.map((id) => designationsMap[id] || { designation_id: id, designation_name: null });
  }

  /**
   * Find existing incentive_generated for same branch, overlapping designations, and overlapping date range.
   * Designation [1,2,3] can exist once between date-a and date-b, and again between date-c and date-d (per branch).
   * branch_id null is considered a distinct value.
   */
  getExistingByBranchAndDesignations(branch_id, designation_id, start_date, end_date, exclude_id = null) {
    return new Promise((resolve, reject) => {
      const ids = this._designationIdToArray(designation_id);
      if (ids.length === 0) {
        resolve(null);
        return;
      }
      const designationJson = JSON.stringify(ids);

      let sql = `
        SELECT incentive_generated_id FROM incentive_generated
        WHERE (
          (branch_id IS NULL AND ? IS NULL)
          OR (branch_id <=> ?)
        )
        AND designation_id IS NOT NULL
        AND JSON_OVERLAPS(designation_id, ?)
        AND start_date <= ? AND end_date >= ?
      `;
      const params = [branch_id, branch_id, designationJson, end_date, start_date];

      if (exclude_id != null) {
        sql += " AND incentive_generated_id != ?";
        params.push(exclude_id);
      }

      this.db.query(sql, params, (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.INCENTIVE_GENERATED",
            code: "REPOSITORY.INCENTIVE_GENERATED.HEADER.GET_EXISTING",
            description: err.toString(),
            category: "",
            ref: { branch_id, designation_id },
          });
          reject(err);
          return;
        }
        resolve(rows[0] || null);
      });
    });
  }

  createHeader(data) {
    return new Promise((resolve, reject) => {
      const {
        start_date,
        end_date,
        branch_id = null,
        designation_id = null,
        incentive_type,
        status = "unapproved",
      } = data;

      const designationJson = this._normalizeDesignationId(designation_id);

      const sql = `INSERT INTO incentive_generated
        (start_date, end_date, branch_id, designation_id, incentive_type, status)
        VALUES (?, ?, ?, ?, ?, ?)`;

      this.db.query(
        sql,
        [start_date, end_date, branch_id, designationJson, incentive_type, status],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.INCENTIVE_GENERATED",
              code: "REPOSITORY.INCENTIVE_GENERATED.HEADER.CREATE",
              description: err.toString(),
              category: "",
              ref: { data },
            });
            reject(err);
            return;
          }
          resolve(result.insertId);
        }
      );
    });
  }

  getAllHeaders() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT ig.*, 
          b.branch_name,
          (SELECT COUNT(*) FROM incentive_generated_items igi 
           WHERE igi.incentive_generated_id = ig.incentive_generated_id) AS incentive_generated_items_count
        FROM incentive_generated ig
        LEFT JOIN branches b ON ig.branch_id = b.branch_id
        ORDER BY ig.created_at DESC`;

      this.db.query(sql, [], (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.INCENTIVE_GENERATED",
            code: "REPOSITORY.INCENTIVE_GENERATED.HEADER.GET_ALL",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        const mapped = (rows || []).map((row) => ({
          ...row,
          designation_id: this._designationIdToArray(row.designation_id),
        }));
        const allDesignationIds = [...new Set(mapped.flatMap((r) => r.designation_id))];
        this._getDesignationsByIds(allDesignationIds)
          .then((designationsMap) => {
            mapped.forEach((row) => {
              row.designations = this._buildDesignationsArray(row.designation_id, designationsMap);
            });
            resolve(mapped);
          })
          .catch(reject);
      });
    });
  }

  getHeaderById(id) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT ig.*, 
          b.branch_name
        FROM incentive_generated ig
        LEFT JOIN branches b ON ig.branch_id = b.branch_id
        WHERE ig.incentive_generated_id = ?`;

      this.db.query(sql, [id], (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.INCENTIVE_GENERATED",
            code: "REPOSITORY.INCENTIVE_GENERATED.HEADER.GET_BY_ID",
            description: err.toString(),
            category: "",
            ref: { id },
          });
          reject(err);
          return;
        }
        const row = rows[0] || null;
        if (row) {
          row.designation_id = this._designationIdToArray(row.designation_id);
          this._getDesignationsByIds(row.designation_id)
            .then((designationsMap) => {
              row.designations = this._buildDesignationsArray(row.designation_id, designationsMap);
              resolve(row);
            })
            .catch(reject);
        } else {
          resolve(null);
        }
      });
    });
  }

  updateHeader(id, data) {
    return new Promise((resolve, reject) => {
      const {
        start_date,
        end_date,
        branch_id,
        designation_id,
        incentive_type,
        status,
      } = data;

      const fields = [];
      const values = [];

      if (start_date !== undefined) {
        fields.push("start_date = ?");
        values.push(start_date);
      }
      if (end_date !== undefined) {
        fields.push("end_date = ?");
        values.push(end_date);
      }
      if (branch_id !== undefined) {
        fields.push("branch_id = ?");
        values.push(branch_id);
      }
      if (designation_id !== undefined) {
        fields.push("designation_id = ?");
        values.push(
          this._normalizeDesignationId(designation_id)
        );
      }
      if (incentive_type !== undefined) {
        fields.push("incentive_type = ?");
        values.push(incentive_type);
      }
      if (status !== undefined) {
        fields.push("status = ?");
        values.push(status);
      }

      if (fields.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      fields.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id);

      const sql = `UPDATE incentive_generated SET ${fields.join(
        ", "
      )} WHERE incentive_generated_id = ?`;

      this.db.query(sql, values, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.INCENTIVE_GENERATED",
            code: "REPOSITORY.INCENTIVE_GENERATED.HEADER.UPDATE",
            description: err.toString(),
            category: "",
            ref: { id, data },
          });
          reject(err);
          return;
        }
        resolve({ affectedRows: result.affectedRows });
      });
    });
  }

  deleteHeader(id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM incentive_generated WHERE incentive_generated_id = ?`;

      this.db.query(sql, [id], (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.INCENTIVE_GENERATED",
            code: "REPOSITORY.INCENTIVE_GENERATED.HEADER.DELETE",
            description: err.toString(),
            category: "",
            ref: { id },
          });
          reject(err);
          return;
        }
        resolve({ affectedRows: result.affectedRows });
      });
    });
  }

  // ---------- incentive_generated_items (detail rows) ----------

  upsertItems(incentive_generated_id, items) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(items) || items.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      const values = items.map((row) => [
        incentive_generated_id,
        row.employee_code,
        row.incentive,
        row.extra_data != null ? JSON.stringify(row.extra_data) : null,
      ]);

      const sql = `
        INSERT INTO incentive_generated_items 
          (incentive_generated_id, employee_code, incentive, extra_data)
        VALUES ?
        ON DUPLICATE KEY UPDATE
          incentive = VALUES(incentive),
          extra_data = VALUES(extra_data),
          updated_at = CURRENT_TIMESTAMP
      `;

      this.db.query(sql, [values], (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.INCENTIVE_GENERATED",
            code: "REPOSITORY.INCENTIVE_GENERATED.ITEMS.UPSERT",
            description: err.toString(),
            category: "",
            ref: { incentive_generated_id, items },
          });
          reject(err);
          return;
        }
        resolve({ affectedRows: result.affectedRows });
      });
    });
  }

  _mapItemRow(row) {
    const { employee_name, profile_img_url, ...rest } = row;
    const extra_data =
      rest.extra_data != null
        ? (typeof rest.extra_data === "string"
          ? JSON.parse(rest.extra_data)
          : rest.extra_data)
        : null;
    return {
      ...rest,
      extra_data,
      employee: row.employee_code
        ? {
          employee_code: row.employee_code,
          employee_name,
          profile_img_url,
        }
        : null,
    };
  }

  /**
   * Get incentive_generated_items for headers whose date range overlaps the given month/year.
   * Returns one row per employee_code: the latest updated item (by igi.updated_at).
   */
  getItemsByMonthYear(month, year) {
    return new Promise((resolve, reject) => {
      const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const sql = `
        SELECT igi.*, e.employee_name, e.profile_img_url
        FROM incentive_generated_items igi
        INNER JOIN incentive_generated ig ON ig.incentive_generated_id = igi.incentive_generated_id
        LEFT JOIN employees e ON igi.employee_code = e.employee_code
        WHERE ig.start_date <= ? AND ig.end_date >= ?
        ORDER BY igi.employee_code ASC, igi.updated_at DESC
      `;

      this.db.query(sql, [endOfMonth, startOfMonth], (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.INCENTIVE_GENERATED",
            code: "REPOSITORY.INCENTIVE_GENERATED.ITEMS.GET_BY_MONTH_YEAR",
            description: err.toString(),
            category: "",
            ref: { month, year },
          });
          reject(err);
          return;
        }
        const byEmployee = new Map();
        (rows || []).forEach((row) => {
          if (!byEmployee.has(row.employee_code)) {
            byEmployee.set(row.employee_code, row);
          }
        });
        const mapped = Array.from(byEmployee.values()).map((row) =>
          this._mapItemRow(row)
        );
        resolve(mapped);
      });
    });
  }

  getItemsByGeneratedId(incentive_generated_id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT igi.*, e.employee_name, e.profile_img_url
        FROM incentive_generated_items igi
        LEFT JOIN employees e ON igi.employee_code = e.employee_code
        WHERE igi.incentive_generated_id = ?
        ORDER BY igi.employee_code ASC
      `;

      this.db.query(sql, [incentive_generated_id], (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.INCENTIVE_GENERATED",
            code: "REPOSITORY.INCENTIVE_GENERATED.ITEMS.GET_BY_GENERATED_ID",
            description: err.toString(),
            category: "",
            ref: { incentive_generated_id },
          });
          reject(err);
          return;
        }
        const mapped = (rows || []).map((row) => this._mapItemRow(row));
        resolve(mapped);
      });
    });
  }

  deleteItem(incentive_generated_id, employee_code) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM incentive_generated_items 
                   WHERE incentive_generated_id = ? AND employee_code = ?`;

      this.db.query(sql, [incentive_generated_id, employee_code], (err, res) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.INCENTIVE_GENERATED",
            code: "REPOSITORY.INCENTIVE_GENERATED.ITEMS.DELETE",
            description: err.toString(),
            category: "",
            ref: { incentive_generated_id, employee_code },
          });
          reject(err);
          return;
        }
        resolve({ affectedRows: res.affectedRows });
      });
    });
  }
}

module.exports = (db) => {
  return new IncentiveGeneratedRepository(db);
};

