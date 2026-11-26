const logger = require("../utils/logger");

class IncentiveStickeringRepository {
  constructor(db) {
    this.db = db;
  }

  checkDuplicate(material_type, selected_month, excludeId = null) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT incentive_stickering_id FROM incentive_stickering 
                 WHERE material_type = ? AND selected_month`;
      const params = [material_type];

      if (selected_month === null || selected_month === undefined) {
        sql += ` IS NULL`;
      } else {
        sql += ` = ?`;
        params.push(selected_month);
      }

      if (excludeId) {
        sql += ` AND incentive_stickering_id != ?`;
        params.push(excludeId);
      }

      this.db.query(sql, params, (err, results) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.INCENTIVE_STICKERING",
            code: "REPOSITORY.INCENTIVE_STICKERING.CHECK-DUPLICATE",
            description: err.toString(),
            category: "",
            ref: { material_type, selected_month },
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
          material_type,
          incentive_type,
          value,
          ranges,
          selected_month,
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

        const sql = `INSERT INTO incentive_stickering 
          (material_type, incentive_type, value, ranges, selected_month) 
          VALUES (?, ?, ?, ?, ?)`;

        this.db.query(
          sql,
          [material_type, incentive_type, value, rangesJson, formattedMonth],
          (err, result) => {
            if (err) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.INCENTIVE_STICKERING",
                code: "REPOSITORY.INCENTIVE_STICKERING.CREATE",
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

  getAll(material_type = null, month = null) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM incentive_stickering WHERE 1=1`;
      const params = [];

      if (material_type) {
        sql += ` AND material_type = ?`;
        params.push(material_type);
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

      sql += ` ORDER BY created_at DESC`;

      this.db.query(sql, params, (err, results) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.INCENTIVE_STICKERING",
            code: "REPOSITORY.INCENTIVE_STICKERING.GET-ALL",
            description: err.toString(),
            category: "",
            ref: { material_type, month },
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
        `SELECT * FROM incentive_stickering WHERE incentive_stickering_id = ?`,
        [id],
        (err, results) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.INCENTIVE_STICKERING",
              code: "REPOSITORY.INCENTIVE_STICKERING.GET-BY-ID",
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

      if (incentiveData.material_type !== undefined) {
        updateFields.push("material_type = ?");
        updateValues.push(incentiveData.material_type);
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

      if (updateFields.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(id);

      const sql = `UPDATE incentive_stickering SET ${updateFields.join(
        ", "
      )} WHERE incentive_stickering_id = ?`;

      this.db.query(sql, updateValues, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.INCENTIVE_STICKERING",
            code: "REPOSITORY.INCENTIVE_STICKERING.UPDATE",
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
        "DELETE FROM incentive_stickering WHERE incentive_stickering_id = ?",
        [id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.INCENTIVE_STICKERING",
              code: "REPOSITORY.INCENTIVE_STICKERING.DELETE",
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
  return new IncentiveStickeringRepository(db);
};
