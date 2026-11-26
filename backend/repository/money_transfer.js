const logger = require("../utils/logger");

class MoneyTransferRepository {
  constructor(db) {
    this.db = db;
    this.accountAssetsUsecase = null;
  }

  setAccountAssetsUsecase(accountAssetsUsecase) {
    this.accountAssetsUsecase = accountAssetsUsecase;
  }

  create(payload) {
    return new Promise((resolve, reject) => {
      const {
        from_branch_id,
        to_branch_id,
        amount,
        account_asset_id,
      } = payload;

      const sql =
        "INSERT INTO money_transfer (from_branch_id, to_branch_id, amount, account_asset_id) VALUES (?, ?, ?, ?)";

      this.db.query(
        sql,
        [from_branch_id, to_branch_id, amount, account_asset_id],
        async (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MONEY_TRANSFER",
              code: "REPOSITORY.MONEY_TRANSFER.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { payload },
            });
            reject(err);
            return;
          }

          const money_transfer_id = result.insertId;

          if (this.accountAssetsUsecase && account_asset_id && amount) {
            try {
              await this.accountAssetsUsecase.reduceBalance(
                account_asset_id,
                from_branch_id,
                amount
              );
              await this.accountAssetsUsecase.increaseBalance(
                account_asset_id,
                to_branch_id,
                amount
              );
            } catch (balanceErr) {
              reject(balanceErr);
              return;
            }
          }

          resolve({ money_transfer_id });
        }
      );
    });
  }

  update(money_transfer_id, payload) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT from_branch_id, to_branch_id, amount, account_asset_id FROM money_transfer WHERE money_transfer_id = ?",
        [money_transfer_id],
        async (fetchErr, rows) => {
          if (fetchErr) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MONEY_TRANSFER",
              code: "REPOSITORY.MONEY_TRANSFER.UPDATE.FETCH.ERROR",
              description: fetchErr.toString(),
              category: "",
              ref: { money_transfer_id },
            });
            reject(fetchErr);
            return;
          }

          const oldRow = rows[0];
          if (!oldRow) {
            resolve({ affectedRows: 0 });
            return;
          }

          const oldFrom = oldRow.from_branch_id;
          const oldTo = oldRow.to_branch_id;
          const oldAmount = parseFloat(oldRow.amount) || 0;
          const oldAssetId = oldRow.account_asset_id;

          if (
            this.accountAssetsUsecase &&
            oldAssetId &&
            oldAmount !== 0
          ) {
            try {
              await this.accountAssetsUsecase.increaseBalance(
                oldAssetId,
                oldFrom,
                oldAmount
              );
              await this.accountAssetsUsecase.reduceBalance(
                oldAssetId,
                oldTo,
                oldAmount
              );
            } catch (balanceErr) {
              reject(balanceErr);
              return;
            }
          }

          this.db.query(
            "UPDATE money_transfer SET ? WHERE money_transfer_id = ?",
            [payload, money_transfer_id],
            async (err, result) => {
              if (err) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.MONEY_TRANSFER",
                  code: "REPOSITORY.MONEY_TRANSFER.UPDATE.ERROR",
                  description: err.toString(),
                  category: "",
                  ref: { money_transfer_id },
                });
                reject(err);
                return;
              }

              const newFrom = payload.from_branch_id !== undefined ? payload.from_branch_id : oldFrom;
              const newTo = payload.to_branch_id !== undefined ? payload.to_branch_id : oldTo;
              const newAmount = payload.amount !== undefined ? parseFloat(payload.amount) || 0 : oldAmount;
              const newAssetId = payload.account_asset_id !== undefined ? payload.account_asset_id : oldAssetId;

              if (
                this.accountAssetsUsecase &&
                newAssetId &&
                newAmount !== 0
              ) {
                try {
                  await this.accountAssetsUsecase.reduceBalance(
                    newAssetId,
                    newFrom,
                    newAmount
                  );
                  await this.accountAssetsUsecase.increaseBalance(
                    newAssetId,
                    newTo,
                    newAmount
                  );
                } catch (balanceErr) {
                  reject(balanceErr);
                  return;
                }
              }

              resolve({ affectedRows: result.affectedRows });
            }
          );
        }
      );
    });
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
          mt.money_transfer_id,
          mt.from_branch_id,
          mt.to_branch_id,
          mt.amount,
          mt.account_asset_id,
          mt.created_at,
          mt.updated_at,
          fb.branch_name AS from_branch_name,
          tb.branch_name AS to_branch_name,
          aa.label AS account_asset_label
        FROM money_transfer mt
        LEFT JOIN branches fb ON mt.from_branch_id = fb.branch_id
        LEFT JOIN branches tb ON mt.to_branch_id = tb.branch_id
        LEFT JOIN account_assets aa ON mt.account_asset_id = aa.account_asset_id
        ORDER BY mt.created_at DESC`,
        [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MONEY_TRANSFER",
              code: "REPOSITORY.MONEY_TRANSFER.GETALL.ERROR",
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

  getById(money_transfer_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
          mt.money_transfer_id,
          mt.from_branch_id,
          mt.to_branch_id,
          mt.amount,
          mt.account_asset_id,
          mt.created_at,
          mt.updated_at,
          fb.branch_name AS from_branch_name,
          tb.branch_name AS to_branch_name,
          aa.label AS account_asset_label
        FROM money_transfer mt
        LEFT JOIN branches fb ON mt.from_branch_id = fb.branch_id
        LEFT JOIN branches tb ON mt.to_branch_id = tb.branch_id
        LEFT JOIN account_assets aa ON mt.account_asset_id = aa.account_asset_id
        WHERE mt.money_transfer_id = ?`,
        [money_transfer_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MONEY_TRANSFER",
              code: "REPOSITORY.MONEY_TRANSFER.GETBYID.ERROR",
              description: err.toString(),
              category: "",
              ref: { money_transfer_id },
            });
            reject(err);
            return;
          }
          resolve(rows[0] || null);
        }
      );
    });
  }

  delete(money_transfer_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT from_branch_id, to_branch_id, amount, account_asset_id FROM money_transfer WHERE money_transfer_id = ?",
        [money_transfer_id],
        async (fetchErr, rows) => {
          if (fetchErr) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MONEY_TRANSFER",
              code: "REPOSITORY.MONEY_TRANSFER.DELETE.FETCH.ERROR",
              description: fetchErr.toString(),
              category: "",
              ref: { money_transfer_id },
            });
            reject(fetchErr);
            return;
          }

          const row = rows[0];
          if (!row) {
            resolve({ affectedRows: 0 });
            return;
          }

          const { from_branch_id, to_branch_id, amount, account_asset_id } = row;

          if (
            this.accountAssetsUsecase &&
            account_asset_id &&
            parseFloat(amount) !== 0
          ) {
            try {
              await this.accountAssetsUsecase.increaseBalance(
                account_asset_id,
                from_branch_id,
                amount
              );
              await this.accountAssetsUsecase.reduceBalance(
                account_asset_id,
                to_branch_id,
                amount
              );
            } catch (balanceErr) {
              reject(balanceErr);
              return;
            }
          }

          this.db.query(
            "DELETE FROM money_transfer WHERE money_transfer_id = ?",
            [money_transfer_id],
            (err, result) => {
              if (err) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.MONEY_TRANSFER",
                  code: "REPOSITORY.MONEY_TRANSFER.DELETE.ERROR",
                  description: err.toString(),
                  category: "",
                  ref: { money_transfer_id },
                });
                reject(err);
                return;
              }
              resolve({ affectedRows: result.affectedRows });
            }
          );
        }
      );
    });
  }
}

module.exports = (db) => {
  return new MoneyTransferRepository(db);
};
