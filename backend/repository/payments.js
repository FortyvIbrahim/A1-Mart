const logger = require("../utils/logger");

class PaymentsRepository {
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
        "INSERT INTO payments (voucher_date, branch_id, created_by, account_asset_id) VALUES (?, ?, ?, ?)";

      this.db.query(
        sql,
        [voucher_date, branch_id || null, created_by, account_asset_id || null],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYMENTS",
              code: "REPOSITORY.PAYMENTS.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { header },
            });
            reject(err);
            return;
          }

          const payment_id = result.insertId;

          if (!items || !Array.isArray(items) || items.length === 0) {
            resolve({ payment_id });
            return;
          }

          const values = items
            .filter((item) => item && item.ledger_id && item.amount != null)
            .map((item) => [
              payment_id,
              item.ledger_id,
              item.amount,
              item.narration || null,
              item.file_url || null,
            ]);

          if (!values.length) {
            resolve({ payment_id });
            return;
          }

          this.db.query(
            "INSERT INTO payment_items (payment_id, ledger_id, amount, narration, file_url) VALUES ?",
            [values],
            async (err2) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PAYMENTS",
                  code: "REPOSITORY.PAYMENTS.CREATE_ITEMS.ERROR",
                  description: err2.toString(),
                  category: "",
                  ref: { payment_id },
                });
                reject(err2);
                return;
              }

              // If ledgersUsecase is not wired, just resolve
              if (!this.ledgersUsecase) {
                resolve({ payment_id });
                return;
              }

              const branchId = header.branch_id || null;

              try {
                // Reduce per-branch ledger balances by item amounts
                await Promise.all(
                  values.map((row) => {
                    const ledgerId = row[1];
                    const amount = parseFloat(row[2]) || 0;
                    return this.ledgersUsecase.reduceBalance(
                      ledgerId,
                      branchId,
                      amount
                    );
                  })
                );
                // Payment total reduces account asset balance (money out)
                if (this.accountAssetsUsecase && account_asset_id && branchId) {
                  const total = values.reduce(
                    (sum, row) => sum + (parseFloat(row[2]) || 0),
                    0
                  );
                  await this.accountAssetsUsecase.reduceBalance(
                    account_asset_id,
                    branchId,
                    total
                  );
                }
                resolve({ payment_id });
              } catch (balanceErr) {
                reject(balanceErr);
              }
            }
          );
        }
      );
    });
  }

  update(payment_id, payload, items) {
    return new Promise((resolve, reject) => {
      const hasHeaderUpdate = payload && Object.keys(payload).length > 0;
      let headerAffectedRows = 0;

      const replaceItems = (branchId, currentAccountAssetId, newAccountAssetId) => {
        // If items is undefined, caller does not want to touch items.
        if (items === undefined) {
          resolve({ affectedRows: headerAffectedRows });
          return;
        }

        // First fetch existing items to restore their effect, then delete and re-insert
        this.db.query(
          "SELECT ledger_id, amount FROM payment_items WHERE payment_id = ?",
          [payment_id],
          async (fetchErr, existingItems) => {
            if (fetchErr) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.PAYMENTS",
                code: "REPOSITORY.PAYMENTS.UPDATE.FETCHITEMS.ERROR",
                description: fetchErr.toString(),
                category: "",
                ref: { payment_id },
              });
              reject(fetchErr);
              return;
            }

            const oldTotal = (existingItems || []).reduce(
              (sum, row) => sum + (parseFloat(row.amount) || 0),
              0
            );

            try {
              // Undo existing items: add amount back to per-branch ledger balance
              if (this.ledgersUsecase && existingItems.length > 0) {
                await Promise.all(
                  existingItems.map((row) => {
                    const amount = parseFloat(row.amount) || 0;
                    return this.ledgersUsecase.increaseBalance(
                      row.ledger_id,
                      branchId,
                      amount
                    );
                  })
                );
              }
              // Undo account asset: payment had reduced it, so add back
              if (
                this.accountAssetsUsecase &&
                currentAccountAssetId &&
                branchId &&
                oldTotal > 0
              ) {
                await this.accountAssetsUsecase.increaseBalance(
                  currentAccountAssetId,
                  branchId,
                  oldTotal
                );
              }

              this.db.query(
                "DELETE FROM payment_items WHERE payment_id = ?",
                [payment_id],
                (err) => {
                  if (err) {
                    logger.Log({
                      level: logger.LEVEL.ERROR,
                      component: "REPOSITORY.PAYMENTS",
                      code: "REPOSITORY.PAYMENTS.UPDATE.DELETEITEMS.ERROR",
                      description: err.toString(),
                      category: "",
                      ref: { payment_id },
                    });
                    reject(err);
                    return;
                  }

                  if (
                    !items ||
                    !Array.isArray(items) ||
                    items.length === 0
                  ) {
                    // No new items to insert
                    resolve({ affectedRows: headerAffectedRows });
                    return;
                  }

                  const values = items
                    .filter(
                      (item) => item && item.ledger_id && item.amount != null
                    )
                    .map((item) => [
                      payment_id,
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
                    "INSERT INTO payment_items (payment_id, ledger_id, amount, narration, file_url) VALUES ?",
                    [values],
                    async (err2, result2) => {
                      if (err2) {
                        logger.Log({
                          level: logger.LEVEL.ERROR,
                          component: "REPOSITORY.PAYMENTS",
                          code: "REPOSITORY.PAYMENTS.UPDATE.INSERTITEMS.ERROR",
                          description: err2.toString(),
                          category: "",
                          ref: { payment_id },
                        });
                        reject(err2);
                        return;
                      }

                      try {
                        // Apply new items: reduce per-branch ledger balances
                        if (this.ledgersUsecase) {
                          await Promise.all(
                            values.map((row) => {
                              const ledgerId = row[1];
                              const amount = parseFloat(row[2]) || 0;
                              return this.ledgersUsecase.reduceBalance(
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
                          await this.accountAssetsUsecase.reduceBalance(
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

      // Fetch branch_id and account_asset_id for balance operations
      this.db.query(
        "SELECT branch_id, account_asset_id FROM payments WHERE payment_id = ? AND is_deleted = 0",
        [payment_id],
        (bErr, rows) => {
          if (bErr) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYMENTS",
              code: "REPOSITORY.PAYMENTS.UPDATE.BRANCH.ERROR",
              description: bErr.toString(),
              category: "",
              ref: { payment_id },
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
            "UPDATE payments SET ? WHERE payment_id = ? AND is_deleted = 0",
            [payload, payment_id],
            (err, result) => {
              if (err) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PAYMENTS",
                  code: "REPOSITORY.PAYMENTS.UPDATE.ERROR",
                  description: err.toString(),
                  category: "",
                  ref: { payment_id },
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

  delete(payment_id, deleted_by) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT pi.ledger_id, pi.amount, p.branch_id, p.account_asset_id
         FROM payment_items pi
         INNER JOIN payments p ON pi.payment_id = p.payment_id
         WHERE pi.payment_id = ? AND p.is_deleted = 0`,
        [payment_id],
        async (fetchErr, items) => {
          if (fetchErr) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYMENTS",
              code: "REPOSITORY.PAYMENTS.DELETE.FETCHITEMS.ERROR",
              description: fetchErr.toString(),
              category: "",
              ref: { payment_id },
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
                  return this.ledgersUsecase.increaseBalance(
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
              await this.accountAssetsUsecase.increaseBalance(
                accountAssetId,
                branchId,
                total
              );
            }

            this.db.query(
              "UPDATE payments SET is_deleted = 1, deleted_by = ? WHERE payment_id = ? AND is_deleted = 0",
              [deleted_by || null, payment_id],
              (err, result) => {
                if (err) {
                  logger.Log({
                    level: logger.LEVEL.ERROR,
                    component: "REPOSITORY.PAYMENTS",
                    code: "REPOSITORY.PAYMENTS.DELETE.ERROR",
                    description: err.toString(),
                    category: "",
                    ref: { payment_id },
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
           p.payment_id,
           p.voucher_date,
           p.branch_id,
           p.created_by,
           p.account_asset_id,
           p.created_at,
           p.updated_at,
           e.employee_name AS created_by_name,
           b.branch_name,
           aa.label AS account_asset_label,
           COALESCE(pi_sum.total_amount, 0) AS total_amount
         FROM payments p
         LEFT JOIN employees e ON p.created_by = e.employee_code
         LEFT JOIN branches b ON p.branch_id = b.branch_id
         LEFT JOIN account_assets aa ON p.account_asset_id = aa.account_asset_id
         LEFT JOIN (
           SELECT payment_id, SUM(amount) AS total_amount
           FROM payment_items
           GROUP BY payment_id
         ) AS pi_sum ON pi_sum.payment_id = p.payment_id
         WHERE p.is_deleted = 0
         ${branch_id ? "AND p.branch_id = ?" : ""}
         ORDER BY p.created_at DESC`,
        branch_id ? [branch_id] : [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYMENTS",
              code: "REPOSITORY.PAYMENTS.GETALL.ERROR",
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

  getById(payment_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           p.payment_id,
           p.voucher_date,
           p.branch_id,
           p.created_by,
           p.account_asset_id,
           p.created_at,
           p.updated_at,
           e.employee_name AS created_by_name,
           b.branch_name,
           aa.label AS account_asset_label
         FROM payments p
         LEFT JOIN employees e ON p.created_by = e.employee_code
         LEFT JOIN branches b ON p.branch_id = b.branch_id
         LEFT JOIN account_assets aa ON p.account_asset_id = aa.account_asset_id
         WHERE p.payment_id = ? AND p.is_deleted = 0`,
        [payment_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYMENTS",
              code: "REPOSITORY.PAYMENTS.GETBYID.ERROR",
              description: err.toString(),
              category: "",
              ref: { payment_id },
            });
            reject(err);
            return;
          }

          const payment = rows[0];
          if (!payment) {
            resolve(null);
            return;
          }

          this.db.query(
            `SELECT 
               pi.*,
               l.label AS ledger_label,
               aa.label AS account_asset_label
             FROM payment_items pi
             LEFT JOIN ledgers l ON pi.ledger_id = l.ledger_id
             LEFT JOIN payments p ON pi.payment_id = p.payment_id
             LEFT JOIN account_assets aa ON p.account_asset_id = aa.account_asset_id
             WHERE pi.payment_id = ? AND p.is_deleted = 0`,
            [payment_id],
            (err2, items) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PAYMENTS",
                  code: "REPOSITORY.PAYMENTS.GETITEMS.ERROR",
                  description: err2.toString(),
                  category: "",
                  ref: { payment_id },
                });
                reject(err2);
                return;
              }

              resolve({ ...payment, items });
            }
          );
        }
      );
    });
  }

  getItems(payment_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           pi.*,
           l.label AS ledger_label,
           aa.label AS account_asset_label
         FROM payment_items pi
         LEFT JOIN ledgers l ON pi.ledger_id = l.ledger_id
         LEFT JOIN payments p ON pi.payment_id = p.payment_id
         LEFT JOIN account_assets aa ON p.account_asset_id = aa.account_asset_id
         WHERE pi.payment_id = ? AND p.is_deleted = 0`,
        [payment_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYMENTS",
              code: "REPOSITORY.PAYMENTS.GETITEMS.ERROR",
              description: err.toString(),
              category: "",
              ref: { payment_id },
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
           pi.*,
           p.voucher_date,
           p.branch_id,
           p.payment_id,
           e.employee_name AS created_by_name,
           b.branch_name,
           l.label AS ledger_label,
           aa.account_asset_id AS account_asset_id,
           aa.label AS account_asset_label
         FROM payment_items pi
         INNER JOIN payments p ON pi.payment_id = p.payment_id
         LEFT JOIN ledgers l ON pi.ledger_id = l.ledger_id
         LEFT JOIN account_assets aa ON p.account_asset_id = aa.account_asset_id
         LEFT JOIN employees e ON p.created_by = e.employee_code
         LEFT JOIN branches b ON p.branch_id = b.branch_id
         WHERE p.is_deleted = 0
         ${branch_id ? "AND p.branch_id = ?" : ""}
         ORDER BY p.voucher_date DESC, pi.payment_item_id DESC`,
        branch_id ? [branch_id] : [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYMENTS",
              code: "REPOSITORY.PAYMENTS.GETALLITEMS.ERROR",
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

  addItems(payment_id, items) {
    return new Promise((resolve, reject) => {
      if (!items || !Array.isArray(items) || items.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      const values = items
        .filter((item) => item && item.ledger_id && item.amount != null)
        .map((item) => [
          payment_id,
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
        "SELECT branch_id FROM payments WHERE payment_id = ? AND is_deleted = 0",
        [payment_id],
        (bErr, rows) => {
          if (bErr) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYMENTS",
              code: "REPOSITORY.PAYMENTS.ADDITEMS.BRANCH.ERROR",
              description: bErr.toString(),
              category: "",
              ref: { payment_id },
            });
            reject(bErr);
            return;
          }

          const branchId =
            rows && rows.length > 0 ? rows[0].branch_id || null : null;

          this.db.query(
            "INSERT INTO payment_items (payment_id, ledger_id, amount, narration, file_url) VALUES ?",
            [values],
            async (err, result) => {
              if (err) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PAYMENTS",
                  code: "REPOSITORY.PAYMENTS.ADDITEMS.ERROR",
                  description: err.toString(),
                  category: "",
                  ref: { payment_id },
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
                    return this.ledgersUsecase.reduceBalance(
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

  updateItem(payment_item_id, payload) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT pi.ledger_id, pi.amount, p.branch_id
         FROM payment_items pi
         INNER JOIN payments p ON pi.payment_id = p.payment_id
         WHERE pi.payment_item_id = ? AND p.is_deleted = 0`,
        [payment_item_id],
        (fetchErr, rows) => {
          if (fetchErr) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYMENTS",
              code: "REPOSITORY.PAYMENTS.UPDATEITEM.FETCH.ERROR",
              description: fetchErr.toString(),
              category: "",
              ref: { payment_item_id },
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
            "UPDATE payment_items SET ? WHERE payment_item_id = ?",
            [payload, payment_item_id],
            async (err, result) => {
              if (err) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PAYMENTS",
                  code: "REPOSITORY.PAYMENTS.UPDATEITEM.ERROR",
                  description: err.toString(),
                  category: "",
                  ref: { payment_item_id },
                });
                reject(err);
                return;
              }

              // Re-fetch to get new values
              this.db.query(
                `SELECT pi.ledger_id, pi.amount, p.branch_id
                 FROM payment_items pi
                 INNER JOIN payments p ON pi.payment_id = p.payment_id
                 WHERE pi.payment_item_id = ? AND p.is_deleted = 0`,
                [payment_item_id],
                async (fetchErr2, newRows) => {
                  if (fetchErr2) {
                    logger.Log({
                      level: logger.LEVEL.ERROR,
                      component: "REPOSITORY.PAYMENTS",
                      code: "REPOSITORY.PAYMENTS.UPDATEITEM.FETCHNEW.ERROR",
                      description: fetchErr2.toString(),
                      category: "",
                      ref: { payment_item_id },
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
                      // Old effect: -oldAmount; new effect: -newAmount
                      const diff = newAmount - oldAmount;
                      if (diff > 0) {
                        // Need to reduce more
                        await this.ledgersUsecase.reduceBalance(
                          oldLedger,
                          branchId,
                          diff
                        );
                      } else if (diff < 0) {
                        // Need to restore some balance
                        await this.ledgersUsecase.increaseBalance(
                          oldLedger,
                          branchId,
                          -diff
                        );
                      }
                    } else {
                      // Restore old ledger, apply new ledger
                      await this.ledgersUsecase.increaseBalance(
                        oldLedger,
                        branchId,
                        oldAmount
                      );
                      await this.ledgersUsecase.reduceBalance(
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

  deleteItem(payment_item_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT pi.ledger_id, pi.amount, p.branch_id
         FROM payment_items pi
         INNER JOIN payments p ON pi.payment_id = p.payment_id
         WHERE pi.payment_item_id = ? AND p.is_deleted = 0`,
        [payment_item_id],
        (fetchErr, rows) => {
          if (fetchErr) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PAYMENTS",
              code: "REPOSITORY.PAYMENTS.DELETEITEM.FETCH.ERROR",
              description: fetchErr.toString(),
              category: "",
              ref: { payment_item_id },
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
            "DELETE FROM payment_items WHERE payment_item_id = ?",
            [payment_item_id],
            async (err, result) => {
              if (err) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PAYMENTS",
                  code: "REPOSITORY.PAYMENTS.DELETEITEM.ERROR",
                  description: err.toString(),
                  category: "",
                  ref: { payment_item_id },
                });
                reject(err);
                return;
              }

              if (!this.ledgersUsecase) {
                resolve({ affectedRows: result.affectedRows });
                return;
              }

              try {
                // Undo payment effect: increase balance back
                await this.ledgersUsecase.increaseBalance(
                  ledgerId,
                  branchId,
                  amount
                );
                resolve({ affectedRows: result.affectedRows });
              } catch (uErr) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PAYMENTS",
                  code: "REPOSITORY.PAYMENTS.DELETEITEM.BALANCE.ERROR",
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
  return new PaymentsRepository(db);
};

