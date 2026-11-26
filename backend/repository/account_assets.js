const logger = require("../utils/logger");

class AccountAssetsRepository {
  constructor(db) {
    this.db = db;
  }

  create(payload) {
    return new Promise((resolve, reject) => {
      const columns = Object.keys(payload);
      const values = columns.map((c) => payload[c]);
      const tickedColumns = columns.map((c) => `\`${c}\``).join(",");
      const placeholders = columns.map(() => "?").join(",");

      const sql = `INSERT INTO account_assets (${tickedColumns}) VALUES (${placeholders})`;

      this.db.query(sql, values, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.ACCOUNT_ASSETS",
            code: "REPOSITORY.ACCOUNT_ASSETS.CREATE.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve({ id: result.insertId });
      });
    });
  }

  update(account_asset_id, payload) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "UPDATE account_assets SET ? WHERE account_asset_id = ?",
        [payload, account_asset_id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.ACCOUNT_ASSETS",
              code: "REPOSITORY.ACCOUNT_ASSETS.UPDATE.ERROR",
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

  getAll() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           aa.account_asset_id,
           aa.label,
           aab.branch_id,
           b.branch_name,
           aab.balance,
           aa.created_at,
           aa.updated_at
         FROM account_assets aa
         LEFT JOIN account_asset_balances aab ON aab.account_asset_id = aa.account_asset_id
         LEFT JOIN branches b ON aab.branch_id = b.branch_id
         ORDER BY aa.created_at DESC, COALESCE(aab.branch_id, 0) ASC`,
        [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.ACCOUNT_ASSETS",
              code: "REPOSITORY.ACCOUNT_ASSETS.GETALL.ERROR",
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

  getById(account_asset_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           aa.account_asset_id,
           aa.label,
           aab.branch_id,
           b.branch_name,
           aab.balance,
           aa.created_at,
           aa.updated_at
         FROM account_assets aa
         LEFT JOIN account_asset_balances aab ON aab.account_asset_id = aa.account_asset_id
         LEFT JOIN branches b ON aab.branch_id = b.branch_id
         WHERE aa.account_asset_id = ?
         ORDER BY COALESCE(aab.branch_id, 0) ASC`,
        [account_asset_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.ACCOUNT_ASSETS",
              code: "REPOSITORY.ACCOUNT_ASSETS.GETBYID.ERROR",
              description: err.toString(),
              category: "",
              ref: { account_asset_id },
            });
            reject(err);
            return;
          }
          resolve(rows);
        }
      );
    });
  }

  getBalance(account_asset_id, branch_id) {
    return new Promise((resolve, reject) => {
      if (account_asset_id == null || branch_id == null) {
        resolve(0);
        return;
      }
      this.db.query(
        "SELECT balance FROM account_asset_balances WHERE account_asset_id = ? AND branch_id = ?",
        [account_asset_id, branch_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.ACCOUNT_ASSETS",
              code: "REPOSITORY.ACCOUNT_ASSETS.GETBALANCE.ERROR",
              description: err.toString(),
              category: "",
              ref: { account_asset_id, branch_id },
            });
            reject(err);
            return;
          }
          const balance = rows.length > 0 ? parseFloat(rows[0].balance) || 0 : 0;
          resolve(balance);
        }
      );
    });
  }

  adjustBalance(account_asset_id, branch_id, delta) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `INSERT INTO account_asset_balances (account_asset_id, branch_id, balance)
           VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance)`,
        [account_asset_id, branch_id, delta],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.ACCOUNT_ASSETS",
              code: "REPOSITORY.ACCOUNT_ASSETS.ADJUSTBALANCE.ERROR",
              description: err.toString(),
              category: "",
              ref: { account_asset_id, branch_id, delta },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }

  countPaymentReceiptReferences(account_asset_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT
           (SELECT COUNT(*) FROM payments WHERE account_asset_id = ? AND is_deleted = 0) +
           (SELECT COUNT(*) FROM receipts WHERE account_asset_id = ? AND is_deleted = 0) AS total`,
        [account_asset_id, account_asset_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.ACCOUNT_ASSETS",
              code: "REPOSITORY.ACCOUNT_ASSETS.COUNTREFERENCES.ERROR",
              description: err.toString(),
              category: "",
              ref: { account_asset_id },
            });
            reject(err);
            return;
          }
          resolve(rows.length > 0 ? parseInt(rows[0].total, 10) || 0 : 0);
        }
      );
    });
  }

  delete(account_asset_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM account_assets WHERE account_asset_id = ?",
        [account_asset_id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.ACCOUNT_ASSETS",
              code: "REPOSITORY.ACCOUNT_ASSETS.DELETE.ERROR",
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
}

module.exports = (db) => {
  return new AccountAssetsRepository(db);
};
