const logger = require("../utils/logger");

class LedgersRepository {
  constructor(db) {
    this.db = db;
  }

  create(payload) {
    return new Promise((resolve, reject) => {
      const columns = Object.keys(payload);
      const values = columns.map((c) => payload[c]);
      const tickedColumns = columns.map((c) => `\`${c}\``).join(",");
      const placeholders = columns.map(() => "?").join(",");

      const sql = `INSERT INTO ledgers (${tickedColumns}) VALUES (${placeholders})`;

      this.db.query(sql, values, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.LEDGERS",
            code: "REPOSITORY.LEDGERS.CREATE.ERROR",
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

  update(ledger_id, payload) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "UPDATE ledgers SET ? WHERE ledger_id = ?",
        [payload, ledger_id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.LEDGERS",
              code: "REPOSITORY.LEDGERS.UPDATE.ERROR",
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
           l.ledger_id,
           l.label,
           l.category,
           lb.branch_id,
           b.branch_name,
           lb.balance,
           l.created_at,
           l.updated_at
         FROM ledgers l
         LEFT JOIN ledger_balances lb ON lb.ledger_id = l.ledger_id
         LEFT JOIN branches b ON lb.branch_id = b.branch_id
         ORDER BY l.created_at DESC, COALESCE(lb.branch_id, 0) ASC`,
        [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.LEDGERS",
              code: "REPOSITORY.LEDGERS.GETALL.ERROR",
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

  getById(ledger_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           l.ledger_id,
           l.label,
           l.category,
           lb.branch_id,
           b.branch_name,
           lb.balance,
           l.created_at,
           l.updated_at
         FROM ledgers l
         LEFT JOIN ledger_balances lb ON lb.ledger_id = l.ledger_id
         LEFT JOIN branches b ON lb.branch_id = b.branch_id
         WHERE l.ledger_id = ?
         ORDER BY COALESCE(lb.branch_id, 0) ASC`,
        [ledger_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.LEDGERS",
              code: "REPOSITORY.LEDGERS.GETBYID.ERROR",
              description: err.toString(),
              category: "",
              ref: { ledger_id },
            });
            reject(err);
            return;
          }
          resolve(rows);
        }
      );
    });
  }

  adjustBalance(ledger_id, branch_id, delta) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `INSERT INTO ledger_balances (ledger_id, branch_id, balance)
           VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance)`,
        [ledger_id, branch_id, delta],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.LEDGERS",
              code: "REPOSITORY.LEDGERS.ADJUSTBALANCE.ERROR",
              description: err.toString(),
              category: "",
              ref: { ledger_id, branch_id, delta },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }

  countPaymentReceiptItemReferences(ledger_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT
           (SELECT COUNT(*) FROM payment_items WHERE ledger_id = ?) +
           (SELECT COUNT(*) FROM receipt_items WHERE ledger_id = ?) AS total`,
        [ledger_id, ledger_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.LEDGERS",
              code: "REPOSITORY.LEDGERS.COUNTREFERENCES.ERROR",
              description: err.toString(),
              category: "",
              ref: { ledger_id },
            });
            reject(err);
            return;
          }
          resolve(rows.length > 0 ? parseInt(rows[0].total, 10) || 0 : 0);
        }
      );
    });
  }

  delete(ledger_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM ledgers WHERE ledger_id = ?",
        [ledger_id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.LEDGERS",
              code: "REPOSITORY.LEDGERS.DELETE.ERROR",
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
  return new LedgersRepository(db);
};

