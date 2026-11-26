const logger = require("../utils/logger");

class IncentiveCommonRepository {
  constructor(db) {
    this.db = db;
  }

  checkDuplicate(type, selected_month, cluster_size, excludeId = null) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT incentive_common_id FROM incentive_common 
                 WHERE type = ? AND selected_month`;
      const params = [type];

      if (selected_month === null || selected_month === undefined) {
        sql += ` IS NULL`;
      } else {
        sql += ` = ?`;
        params.push(selected_month);
      }

      sql += ` AND ( (cluster_size IS NULL AND ? IS NULL) OR (cluster_size <=> ?) )`;
      params.push(cluster_size, cluster_size);

      if (excludeId) {
        sql += ` AND incentive_common_id != ?`;
        params.push(excludeId);
      }

      this.db.query(sql, params, (err, results) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.INCENTIVE_COMMON",
            code: "REPOSITORY.INCENTIVE_COMMON.CHECK-DUPLICATE",
            description: err.toString(),
            category: "",
            ref: { type, selected_month, cluster_size },
          });
          reject(err);
          return;
        }
        resolve(results.length > 0);
      });
    });
  }

  create(incentiveData) {
    return new Promise((resolve, reject) => {
      try {
        const {
          type,
          incentive_type,
          value,
          ranges,
          selected_month,
          cluster_size = null,
        } = incentiveData;

        // Convert ranges array to JSON string if provided
        const rangesJson = ranges ? JSON.stringify(ranges) : null;

        // Format selected_month to first day of the month if provided
        let formattedMonth = null;
        if (selected_month) {
          const date = new Date(selected_month);
          formattedMonth = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-01`;
        }

        const sql = `INSERT INTO incentive_common 
          (type, incentive_type, value, ranges, selected_month, cluster_size) 
          VALUES (?, ?, ?, ?, ?, ?)`;

        this.db.query(
          sql,
          [type, incentive_type, value, rangesJson, formattedMonth, cluster_size],
          (err, result) => {
            if (err) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.INCENTIVE_COMMON",
                code: "REPOSITORY.INCENTIVE_COMMON.CREATE",
                description: err.toString(),
                category: "",
                ref: { incentiveData },
              });
              reject(err);
              return;
            }

            resolve(result.insertId);
          }
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll(type = null, month = null, cluster_size = undefined) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM incentive_common WHERE 1=1`;
      const params = [];

      if (type) {
        sql += ` AND type = ?`;
        params.push(type);
      }

      if (month !== null && month !== undefined) {
        // Format month to first day of the month for comparison
        const date = new Date(month);
        const formattedMonth = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}-01`;
        sql += ` AND selected_month = ?`;
        params.push(formattedMonth);
      }

      if (cluster_size !== undefined) {
        if (cluster_size === null) {
          sql += ` AND cluster_size IS NULL`;
        } else {
          sql += ` AND cluster_size = ?`;
          params.push(cluster_size);
        }
      }

      sql += ` ORDER BY created_at DESC`;

      this.db.query(sql, params, (err, results) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.INCENTIVE_COMMON",
            code: "REPOSITORY.INCENTIVE_COMMON.GET-ALL",
            description: err.toString(),
            category: "",
            ref: { type, month, cluster_size },
          });
          reject(err);
          return;
        }

        // Parse JSON ranges for each result
        const data = results.map((row) => ({
          ...row,
          ranges:
            typeof row.ranges === "string"
              ? JSON.parse(row.ranges)
              : row.ranges || null,
        }));

        resolve(data);
      });
    });
  }

  getById(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT * FROM incentive_common WHERE incentive_common_id = ?`,
        [id],
        (err, results) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.INCENTIVE_COMMON",
              code: "REPOSITORY.INCENTIVE_COMMON.GET-BY-ID",
              description: err.toString(),
              category: "",
              ref: { id },
            });
            reject(err);
            return;
          }

          if (!results.length) return resolve(undefined);

          const result = results[0];
          resolve({
            ...result,
            ranges:
              typeof result.ranges === "string"
                ? JSON.parse(result.ranges)
                : result.ranges || null,
          });
        }
      );
    });
  }

  update(id, incentiveData) {
    return new Promise((resolve, reject) => {
      const updateFields = [];
      const updateValues = [];

      if (incentiveData.type !== undefined) {
        updateFields.push("type = ?");
        updateValues.push(incentiveData.type);
      }
      if (incentiveData.incentive_type !== undefined) {
        updateFields.push("incentive_type = ?");
        updateValues.push(incentiveData.incentive_type);
      }
      if (incentiveData.value !== undefined) {
        updateFields.push("value = ?");
        updateValues.push(incentiveData.value);
      }
      if (incentiveData.ranges !== undefined) {
        updateFields.push("ranges = ?");
        updateValues.push(
          incentiveData.ranges ? JSON.stringify(incentiveData.ranges) : null
        );
      }
      if (incentiveData.selected_month !== undefined) {
        updateFields.push("selected_month = ?");
        // Format selected_month to first day of the month if provided
        let formattedMonth = null;
        if (incentiveData.selected_month) {
          const date = new Date(incentiveData.selected_month);
          formattedMonth = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-01`;
        }
        updateValues.push(formattedMonth);
      }
      if (incentiveData.cluster_size !== undefined) {
        updateFields.push("cluster_size = ?");
        updateValues.push(incentiveData.cluster_size);
      }

      if (updateFields.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(id);

      const sql = `UPDATE incentive_common SET ${updateFields.join(
        ", "
      )} WHERE incentive_common_id = ?`;

      this.db.query(sql, updateValues, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.INCENTIVE_COMMON",
            code: "REPOSITORY.INCENTIVE_COMMON.UPDATE",
            description: err.toString(),
            category: "",
            ref: { id, incentiveData },
          });
          reject(err);
          return;
        }
        resolve({ affectedRows: result.affectedRows });
      });
    });
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM incentive_common WHERE incentive_common_id = ?",
        [id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.INCENTIVE_COMMON",
              code: "REPOSITORY.INCENTIVE_COMMON.DELETE",
              description: err.toString(),
              category: "",
              ref: { id },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows, id });
        }
      );
    });
  }
}

module.exports = (db) => {
  return new IncentiveCommonRepository(db);
};
