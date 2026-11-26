const logger = require("../utils/logger");

class SyncConfigRepository {
  constructor(db) {
    this.db = db;
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT sync_key, cron, is_active FROM sync_config ORDER BY sync_key`,
        [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.SYNC_CONFIG",
              code: "REPOSITORY.SYNC_CONFIG.GETALL.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(rows || []);
        }
      );
    });
  }

  getBySyncKey(sync_key) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT sync_key, cron, is_active FROM sync_config WHERE sync_key = ? LIMIT 1`,
        [sync_key],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.SYNC_CONFIG",
              code: "REPOSITORY.SYNC_CONFIG.GETBYSYNCKEY.ERROR",
              description: err.toString(),
              category: "",
              ref: { sync_key },
            });
            reject(err);
            return;
          }
          resolve(rows && rows[0] ? rows[0] : null);
        }
      );
    });
  }

  /**
   * @param {string} sync_key
   * @param {{ cron?: string, is_active?: number|boolean }} fields
   */
  updateBySyncKey(sync_key, fields) {
    return new Promise((resolve, reject) => {
      const parts = [];
      const values = [];
      if (fields.cron !== undefined) {
        parts.push("`cron` = ?");
        values.push(fields.cron);
      }
      if (fields.is_active !== undefined) {
        parts.push("`is_active` = ?");
        const v = fields.is_active;
        values.push(v === true || v === 1 || v === "1" ? 1 : 0);
      }
      if (parts.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }
      values.push(sync_key);
      const sql = `UPDATE sync_config SET ${parts.join(
        ", "
      )} WHERE sync_key = ?`;
      this.db.query(sql, values, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.SYNC_CONFIG",
            code: "REPOSITORY.SYNC_CONFIG.UPDATE.ERROR",
            description: err.toString(),
            category: "",
            ref: { sync_key, fields },
          });
          reject(err);
          return;
        }
        resolve({ affectedRows: result.affectedRows });
      });
    });
  }
}

module.exports = (db) => new SyncConfigRepository(db);
