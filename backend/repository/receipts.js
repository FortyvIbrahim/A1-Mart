const logger = require("../utils/logger");

class ReceiptsRepository {
  constructor(db) {
    this.db = db;
    this.ledgersUsecase = null;
    this.accountAssetsUsecase = null;
  }

  setLedgersUsecase(ledgersUsecase) {
    this.ledgersUsecase = ledgersUsecase;
  }

  setAccountAssetsUsecase(accountAssetsUsecase) {
    this.accountAssetsUsecase = accountAssetsUsecase;
  }

  create(header, items) {
    return new Promise((resolve, reject) => {
      const { voucher_date, branch_id, created_by, account_asset_id } = header;

      const sql =
        "INSERT INTO receipts (voucher_date, branch_id, created_by, account_asset_id) VALUES (?, ?, ?, ?)";

      this.db.query(
        sql,
        [voucher_date, branch_id || null, created_by, account_asset_id || null],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.RECEIPTS",
              code: "REPOSITORY.RECEIPTS.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { header },
            });
            reject(err);
            return;
          }

          const receipt_id = result.insertId;

          if (!items || !Array.isArray(items) || items.length === 0) {
            resolve({ receipt_id });
            return;
          }

          const values = items
            .filter((item) => item && item.ledger_id && item.amount != null)
            .map((item) => [
              receipt_id,
              item.ledger_id,
              item.amount,
              item.narration || null,
              item.file_url || null,
            ]);

          if (!values.length) {
            resolve({ receipt_id });
            return;
          }

          this.db.query(
            "INSERT INTO receipt_items (receipt_id, ledger_id, amount, narration, file_url) VALUES ?",
            [values],
            async (err2) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.RECEIPTS",
                  code: "REPOSITORY.RECEIPTS.CREATE_ITEMS.ERROR",
                  description: err2.toString(),
                  category: "",
                  ref: { receipt_id },
                });
                reject(err2);
                return;
              }

              // If ledgersUsecase is not wired, just resolve
              if (!this.ledgersUsecase) {
                resolve({ receipt_id });
                return;
              }

              const branchId = header.branch_id || null;

              try {
                // Increase per-branch ledger balances by item amounts
                await Promise.all(
                  values.map((row) => {
                    const ledgerId = row[1];
                    const amount = parseFloat(row[2]) || 0;
                    return this.ledgersUsecase.increaseBalance(
                      ledgerId,
                      branchId,
                      amount
                    );
                  })
                );
                // Receipt total increases account asset balance (money in)
                if (this.accountAssetsUsecase && account_asset_id && branchId) {
                  const total = values.reduce(
                    (sum, row) => sum + (parseFloat(row[2]) || 0),
                    0
                  );
                  await this.accountAssetsUsecase.increaseBalance(
                    account_asset_id,
                    branchId,
                    total
                  );
                }
                resolve({ receipt_id });
              } catch (balanceErr) {
                reject(balanceErr);
              }
            }
          );
        }
      );
    });
  }

  update(receipt_id, payload, items) {
    return new Promise((resolve, reject) => {
      const hasHeaderUpdate = payload && Object.keys(payload).length > 0;
      let headerAffectedRows = 0;

      const replaceItems = (branchId, currentAccountAssetId, newAccountAssetId) => {
        if (items === undefined) {
          resolve({ affectedRows: headerAffectedRows });
          return;
        }

        this.db.query(
          "SELECT ledger_id, amount FROM receipt_items WHERE receipt_id = ?",
          [receipt_id],
          async (fetchErr, existingItems) => {
            if (fetchErr) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.RECEIPTS",
                code: "REPOSITORY.RECEIPTS.UPDATE.FETCHITEMS.ERROR",
                description: fetchErr.toString(),
                category: "",
                ref: { receipt_id },
              });
              reject(fetchErr);
              return;
            }

            const oldTotal = (existingItems || []).reduce(
              (sum, row) => sum + (parseFloat(row.amount) || 0),
              0
            );

            try {
              // Undo existing items: reduce per-branch ledger balances
              if (this.ledgersUsecase && existingItems.length > 0) {
                await Promise.all(
                  existingItems.map((row) => {
                    const amount = parseFloat(row.amount) || 0;
                    return this.ledgersUsecase.reduceBalance(
                      row.ledger_id,
                      branchId,
                      amount
                    );
                  })
                );
              }
              // Undo account asset: receipt had increased it, so reduce back
              if (
                this.accountAssetsUsecase &&
                currentAccountAssetId &&
                branchId &&
                oldTotal > 0
              ) {
                await this.accountAssetsUsecase.reduceBalance(
                  currentAccountAssetId,
                  branchId,
                  oldTotal
                );
              }

              this.db.query(
                "DELETE FROM receipt_items WHERE receipt_id = ?",
                [receipt_id],
                (err) => {
                  if (err) {
                    logger.Log({
                      level: logger.LEVEL.ERROR,
                      component: "REPOSITORY.RECEIPTS",
                      code: "REPOSITORY.RECEIPTS.UPDATE.DELETEITEMS.ERROR",
                      description: err.toString(),
                      category: "",
                      ref: { receipt_id },
                    });
                    reject(err);
                    return;
                  }

                  if (
                    !items ||
                    !Array.isArray(items) ||
                    items.length === 0
                  ) {
                    resolve({ affectedRows: headerAffectedRows });
                    return;
                  }

                  const values = items
                    .filter(
                      (item) => item && item.ledger_id && item.amount != null
                    )
                    .map((item) => [
                      receipt_id,
                      item.ledger_id,
                      item.amount,
                      item.narration || null,
                      item.file_url || null,
                    ]);

                  if (!values.length) {
                    resolve({ affectedRows: headerAffectedRows });
                    return;
                  }

                  this.db.query(
                    "INSERT INTO receipt_items (receipt_id, ledger_id, amount, narration, file_url) VALUES ?",
                    [values],
                    async (err2, result2) => {
                      if (err2) {
                        logger.Log({
                          level: logger.LEVEL.ERROR,
                          component: "REPOSITORY.RECEIPTS",
                          code: "REPOSITORY.RECEIPTS.UPDATE.INSERTITEMS.ERROR",
                          description: err2.toString(),
                          category: "",
                          ref: { receipt_id },
                        });
                        reject(err2);
                        return;
                      }

                      try {
                        // Apply new items: increase per-branch ledger balances
                        if (this.ledgersUsecase) {
                          await Promise.all(
                            values.map((row) => {
                              const ledgerId = row[1];
                              const amount = parseFloat(row[2]) || 0;
                              return this.ledgersUsecase.increaseBalance(
                                ledgerId,
                                branchId,
                                amount
                              );
                            })
                          );
                        }
                        const newTotal = values.reduce(
                          (sum, row) => sum + (parseFloat(row[2]) || 0),
                          0
                        );
                        if (
                          this.accountAssetsUsecase &&
                          newAccountAssetId &&
                          branchId &&
                          newTotal > 0
                        ) {
                          await this.accountAssetsUsecase.increaseBalance(
                            newAccountAssetId,
                            branchId,
                            newTotal
                          );
                        }

                        resolve({
                          affectedRows: headerAffectedRows,
                          itemsAffected: result2.affectedRows,
                        });
                      } catch (balanceErr) {
                        reject(balanceErr);
                      }
                    }
                  );
                }
              );
            } catch (balanceErr) {
              reject(balanceErr);
            }
          }
        );
      };

      this.db.query(
        "SELECT branch_id, account_asset_id FROM receipts WHERE receipt_id = ? AND is_deleted = 0",
        [receipt_id],
        (bErr, rows) => {
          if (bErr) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.RECEIPTS",
              code: "REPOSITORY.RECEIPTS.UPDATE.BRANCH.ERROR",
              description: bErr.toString(),
              category: "",
              ref: { receipt_id },
            });
            reject(bErr);
            return;
          }

          const currentRow = rows && rows.length > 0 ? rows[0] : {};
          const branchId = currentRow.branch_id || null;
          const currentAccountAssetId = currentRow.account_asset_id || null;
          const newAccountAssetId =
            payload && payload.account_asset_id !== undefined
              ? payload.account_asset_id
              : currentAccountAssetId;

          if (!hasHeaderUpdate) {
            replaceItems(branchId, currentAccountAssetId, newAccountAssetId);
            return;
          }

          this.db.query(
            "UPDATE receipts SET ? WHERE receipt_id = ? AND is_deleted = 0",
            [payload, receipt_id],
            (err, result) => {
              if (err) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.RECEIPTS",
                  code: "REPOSITORY.RECEIPTS.UPDATE.ERROR",
                  description: err.toString(),
                  category: "",
                  ref: { receipt_id },
                });
                reject(err);
                return;
              }
              headerAffectedRows = result.affectedRows;
              replaceItems(branchId, currentAccountAssetId, newAccountAssetId);
            }
          );
        }
      );
    });
  }

  delete(receipt_id, deleted_by) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT ri.ledger_id, ri.amount, r.branch_id, r.account_asset_id
         FROM receipt_items ri
         INNER JOIN receipts r ON ri.receipt_id = r.receipt_id
         WHERE ri.receipt_id = ? AND r.is_deleted = 0`,
        [receipt_id],
        async (fetchErr, items) => {
          if (fetchErr) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.RECEIPTS",
              code: "REPOSITORY.RECEIPTS.DELETE.FETCHITEMS.ERROR",
              description: fetchErr.toString(),
              category: "",
              ref: { receipt_id },
            });
            reject(fetchErr);
            return;
          }

          try {
            if (this.ledgersUsecase && items.length > 0) {
              await Promise.all(
                items.map((row) => {
                  const branchId = row.branch_id || null;
                  const amount = parseFloat(row.amount) || 0;
                  return this.ledgersUsecase.reduceBalance(
                    row.ledger_id,
                    branchId,
                    amount
                  );
                })
              );
            }
            const branchId = items.length > 0 ? items[0].branch_id || null : null;
            const accountAssetId = items.length > 0 ? items[0].account_asset_id || null : null;
            const total = (items || []).reduce(
              (sum, row) => sum + (parseFloat(row.amount) || 0),
              0
            );
            if (
              this.accountAssetsUsecase &&
              accountAssetId &&
              branchId &&
              total > 0
            ) {
              await this.accountAssetsUsecase.reduceBalance(
                accountAssetId,
                branchId,
                total
              );
            }

            this.db.query(
              "UPDATE receipts SET is_deleted = 1, deleted_by = ? WHERE receipt_id = ? AND is_deleted = 0",
              [deleted_by || null, receipt_id],
              (err, result) => {
                if (err) {
                  logger.Log({
                    level: logger.LEVEL.ERROR,
                    component: "REPOSITORY.RECEIPTS",
                    code: "REPOSITORY.RECEIPTS.DELETE.ERROR",
                    description: err.toString(),
                    category: "",
                    ref: { receipt_id },
                  });
                  reject(err);
                  return;
                }
                resolve({ affectedRows: result.affectedRows });
              }
            );
          } catch (balanceErr) {
            reject(balanceErr);
          }
        }
      );
    });
  }

  getAll(branch_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           r.receipt_id,
           r.voucher_date,
           r.branch_id,
           r.created_by,
           r.account_asset_id,
           r.created_at,
           r.updated_at,
           e.employee_name AS created_by_name,
           b.branch_name,
           aa.label AS account_asset_label,
           COALESCE(ri_sum.total_amount, 0) AS total_amount
         FROM receipts r
         LEFT JOIN employees e ON r.created_by = e.employee_code
         LEFT JOIN branches b ON r.branch_id = b.branch_id
         LEFT JOIN account_assets aa ON r.account_asset_id = aa.account_asset_id
         LEFT JOIN (
           SELECT receipt_id, SUM(amount) AS total_amount
           FROM receipt_items
           GROUP BY receipt_id
         ) AS ri_sum ON ri_sum.receipt_id = r.receipt_id
         WHERE r.is_deleted = 0
         ${branch_id ? "AND r.branch_id = ?" : ""}
         ORDER BY r.created_at DESC`,
        branch_id ? [branch_id] : [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.RECEIPTS",
              code: "REPOSITORY.RECEIPTS.GETALL.ERROR",
              description: err.toString(),
              category: "",
              ref: { branch_id },
            });
            reject(err);
            return;
          }
          resolve(rows);
        }
      );
    });
  }

  getById(receipt_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           r.receipt_id,
           r.voucher_date,
           r.branch_id,
           r.created_by,
           r.account_asset_id,
           r.created_at,
           r.updated_at,
           e.employee_name AS created_by_name,
           b.branch_name,
           aa.label AS account_asset_label
         FROM receipts r
         LEFT JOIN employees e ON r.created_by = e.employee_code
         LEFT JOIN branches b ON r.branch_id = b.branch_id
         LEFT JOIN account_assets aa ON r.account_asset_id = aa.account_asset_id
         WHERE r.receipt_id = ? AND r.is_deleted = 0`,
        [receipt_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.RECEIPTS",
              code: "REPOSITORY.RECEIPTS.GETBYID.ERROR",
              description: err.toString(),
              category: "",
              ref: { receipt_id },
            });
            reject(err);
            return;
          }

          const receipt = rows[0];
          if (!receipt) {
            resolve(null);
            return;
          }

          this.db.query(
            `SELECT 
               ri.*,
               l.label AS ledger_label,
               aa.label AS account_asset_label
             FROM receipt_items ri
             LEFT JOIN ledgers l ON ri.ledger_id = l.ledger_id
             LEFT JOIN receipts r ON ri.receipt_id = r.receipt_id
             LEFT JOIN account_assets aa ON r.account_asset_id = aa.account_asset_id
             WHERE ri.receipt_id = ? AND r.is_deleted = 0`,
            [receipt_id],
            (err2, items) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.RECEIPTS",
                  code: "REPOSITORY.RECEIPTS.GETITEMS.ERROR",
                  description: err2.toString(),
                  category: "",
                  ref: { receipt_id },
                });
                reject(err2);
                return;
              }

              resolve({ ...receipt, items });
            }
          );
        }
      );
    });
  }

  getItems(receipt_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           ri.*,
           l.label AS ledger_label
         FROM receipt_items ri
         LEFT JOIN ledgers l ON ri.ledger_id = l.ledger_id
         LEFT JOIN receipts r ON ri.receipt_id = r.receipt_id
         WHERE ri.receipt_id = ? AND r.is_deleted = 0`,
        [receipt_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.RECEIPTS",
              code: "REPOSITORY.RECEIPTS.GETITEMS.ERROR",
              description: err.toString(),
              category: "",
              ref: { receipt_id },
            });
            reject(err);
            return;
          }
          resolve(rows);
        }
      );
    });
  }

  getAllItems(branch_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           ri.*,
           r.voucher_date,
           r.branch_id,
           r.receipt_id,
           e.employee_name AS created_by_name,
           b.branch_name,
           l.label AS ledger_label,
           aa.account_asset_id AS account_asset_id,
           aa.label AS account_asset_label
         FROM receipt_items ri
         INNER JOIN receipts r ON ri.receipt_id = r.receipt_id
         LEFT JOIN ledgers l ON ri.ledger_id = l.ledger_id
         LEFT JOIN account_assets aa ON r.account_asset_id = aa.account_asset_id
         LEFT JOIN employees e ON r.created_by = e.employee_code
         LEFT JOIN branches b ON r.branch_id = b.branch_id
         WHERE r.is_deleted = 0
         ${branch_id ? "AND r.branch_id = ?" : ""}
         ORDER BY r.voucher_date DESC, ri.receipt_item_id DESC`,
        branch_id ? [branch_id] : [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.RECEIPTS",
              code: "REPOSITORY.RECEIPTS.GETALLITEMS.ERROR",
              description: err.toString(),
              category: "",
              ref: { branch_id },
            });
            reject(err);
            return;
          }
          resolve(rows);
        }
      );
    });
  }

  addItems(receipt_id, items) {
    return new Promise((resolve, reject) => {
      if (!items || !Array.isArray(items) || items.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      const values = items
        .filter((item) => item && item.ledger_id && item.amount != null)
        .map((item) => [
          receipt_id,
          item.ledger_id,
          item.amount,
          item.narration || null,
          item.file_url || null,
        ]);

      if (!values.length) {
        resolve({ affectedRows: 0 });
        return;
      }

      // Fetch branch_id to adjust per-branch balances
      this.db.query(
        "SELECT branch_id FROM receipts WHERE receipt_id = ? AND is_deleted = 0",
        [receipt_id],
        (bErr, rows) => {
          if (bErr) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.RECEIPTS",
              code: "REPOSITORY.RECEIPTS.ADDITEMS.BRANCH.ERROR",
              description: bErr.toString(),
              category: "",
              ref: { receipt_id },
            });
            reject(bErr);
            return;
          }

          const branchId =
            rows && rows.length > 0 ? rows[0].branch_id || null : null;

          this.db.query(
            "INSERT INTO receipt_items (receipt_id, ledger_id, amount, narration, file_url) VALUES ?",
            [values],
            async (err, result) => {
              if (err) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.RECEIPTS",
                  code: "REPOSITORY.RECEIPTS.ADDITEMS.ERROR",
                  description: err.toString(),
                  category: "",
                  ref: { receipt_id },
                });
                reject(err);
                return;
              }

              if (!this.ledgersUsecase) {
                resolve({ affectedRows: result.affectedRows });
                return;
              }

              try {
                await Promise.all(
                  values.map((row) => {
                    const ledgerId = row[1];
                    const amount = parseFloat(row[2]) || 0;
                    return this.ledgersUsecase.increaseBalance(
                      ledgerId,
                      branchId,
                      amount
                    );
                  })
                );
                resolve({ affectedRows: result.affectedRows });
              } catch (balanceErr) {
                reject(balanceErr);
              }
            }
          );
        }
      );
    });
  }

  updateItem(receipt_item_id, payload) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT ri.ledger_id, ri.amount, r.branch_id
         FROM receipt_items ri
         INNER JOIN receipts r ON ri.receipt_id = r.receipt_id
         WHERE ri.receipt_item_id = ? AND r.is_deleted = 0`,
        [receipt_item_id],
        (fetchErr, rows) => {
          if (fetchErr) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.RECEIPTS",
              code: "REPOSITORY.RECEIPTS.UPDATEITEM.FETCH.ERROR",
              description: fetchErr.toString(),
              category: "",
              ref: { receipt_item_id },
            });
            reject(fetchErr);
            return;
          }

          const existing = rows[0];
          if (!existing) {
            resolve({ affectedRows: 0 });
            return;
          }

          this.db.query(
            "UPDATE receipt_items SET ? WHERE receipt_item_id = ?",
            [payload, receipt_item_id],
            async (err, result) => {
              if (err) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.RECEIPTS",
                  code: "REPOSITORY.RECEIPTS.UPDATEITEM.ERROR",
                  description: err.toString(),
                  category: "",
                  ref: { receipt_item_id },
                });
                reject(err);
                return;
              }

              this.db.query(
                `SELECT ri.ledger_id, ri.amount, r.branch_id
                 FROM receipt_items ri
                 INNER JOIN receipts r ON ri.receipt_id = r.receipt_id
                 WHERE ri.receipt_item_id = ? AND r.is_deleted = 0`,
                [receipt_item_id],
                async (fetchErr2, newRows) => {
                  if (fetchErr2) {
                    logger.Log({
                      level: logger.LEVEL.ERROR,
                      component: "REPOSITORY.RECEIPTS",
                      code: "REPOSITORY.RECEIPTS.UPDATEITEM.FETCHNEW.ERROR",
                      description: fetchErr2.toString(),
                      category: "",
                      ref: { receipt_item_id },
                    });
                    reject(fetchErr2);
                    return;
                  }

                  const updated = newRows[0];
                  if (!updated) {
                    resolve({ affectedRows: result.affectedRows });
                    return;
                  }
                  if (!this.ledgersUsecase) {
                    resolve({ affectedRows: result.affectedRows });
                    return;
                  }

                  const oldLedger = existing.ledger_id;
                  const oldAmount = parseFloat(existing.amount);
                  const newLedger = updated.ledger_id;
                  const newAmount = parseFloat(updated.amount);
                  const branchId = updated.branch_id || null;

                  try {
                    if (oldLedger === newLedger) {
                      // Old effect: +oldAmount; new effect: +newAmount
                      const diff = newAmount - oldAmount;
                      if (diff > 0) {
                        // Need to increase more
                        await this.ledgersUsecase.increaseBalance(
                          oldLedger,
                          branchId,
                          diff
                        );
                      } else if (diff < 0) {
                        // Need to reduce some balance
                        await this.ledgersUsecase.reduceBalance(
                          oldLedger,
                          branchId,
                          -diff
                        );
                      }
                    } else {
                      // Undo old ledger, apply new ledger
                      await this.ledgersUsecase.reduceBalance(
                        oldLedger,
                        branchId,
                        oldAmount
                      );
                      await this.ledgersUsecase.increaseBalance(
                        newLedger,
                        branchId,
                        newAmount
                      );
                    }

                    resolve({ affectedRows: result.affectedRows });
                  } catch (balanceErr) {
                    reject(balanceErr);
                  }
                }
              );
            }
          );
        }
      );
    });
  }

  deleteItem(receipt_item_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT ri.ledger_id, ri.amount, r.branch_id
         FROM receipt_items ri
         INNER JOIN receipts r ON ri.receipt_id = r.receipt_id
         WHERE ri.receipt_item_id = ? AND r.is_deleted = 0`,
        [receipt_item_id],
        (fetchErr, rows) => {
          if (fetchErr) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.RECEIPTS",
              code: "REPOSITORY.RECEIPTS.DELETEITEM.FETCH.ERROR",
              description: fetchErr.toString(),
              category: "",
              ref: { receipt_item_id },
            });
            reject(fetchErr);
            return;
          }

          const existing = rows[0];
          if (!existing) {
            resolve({ affectedRows: 0 });
            return;
          }

          const ledgerId = existing.ledger_id;
          const amount = parseFloat(existing.amount);
          const branchId = existing.branch_id || null;

          this.db.query(
            "DELETE FROM receipt_items WHERE receipt_item_id = ?",
            [receipt_item_id],
            async (err, result) => {
              if (err) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.RECEIPTS",
                  code: "REPOSITORY.RECEIPTS.DELETEITEM.ERROR",
                  description: err.toString(),
                  category: "",
                  ref: { receipt_item_id },
                });
                reject(err);
                return;
              }

              if (!this.ledgersUsecase) {
                resolve({ affectedRows: result.affectedRows });
                return;
              }

              try {
                // Undo receipt effect: reduce balance back
                await this.ledgersUsecase.reduceBalance(
                  ledgerId,
                  branchId,
                  amount
                );
                resolve({ affectedRows: result.affectedRows });
              } catch (uErr) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.RECEIPTS",
                  code: "REPOSITORY.RECEIPTS.DELETEITEM.BALANCE.ERROR",
                  description: uErr.toString(),
                  category: "",
                  ref: { ledgerId, branchId, amount },
                });
                reject(uErr);
              }
            }
          );
        }
      );
    });
  }
}

module.exports = (db) => {
  return new ReceiptsRepository(db);
};

