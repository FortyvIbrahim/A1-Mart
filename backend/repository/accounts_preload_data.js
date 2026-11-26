const logger = require("../utils/logger");

class AccountsPreloadDataRepository {
  constructor(db) {
    this.db = db;
  }

  deleteByDate(date, branch_id, billing_counter_id) {
    return new Promise((resolve, reject) => {
      let sql =
        "DELETE FROM accounts_preload_data WHERE date = ? AND branch_id = ?";
      const params = [date, branch_id];

      if (billing_counter_id !== null && billing_counter_id !== undefined) {
        sql += " AND billing_counter_id = ?";
        params.push(billing_counter_id);
      } else {
        sql += " AND billing_counter_id IS NULL";
      }

      this.db.query(sql, params, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.ACCOUNTS_PRELOAD_DATA",
            code: "REPOSITORY.ACCOUNTS_PRELOAD_DATA.DELETE_BY_DATE.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve({ affectedRows: result.affectedRows });
      });
    });
  }

  deleteAllByDate(date) {
    return new Promise((resolve, reject) => {
      const sql = "DELETE FROM accounts_preload_data WHERE date = ?";
      const params = [date];

      this.db.query(sql, params, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.ACCOUNTS_PRELOAD_DATA",
            code: "REPOSITORY.ACCOUNTS_PRELOAD_DATA.DELETE_ALL_BY_DATE.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve({ affectedRows: result.affectedRows });
      });
    });
  }

  bulkCreate(rows) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(rows) || rows.length === 0) {
        resolve({ affectedRows: 0, insertedIds: [] });
        return;
      }

      const columns = Object.keys(rows[0]);
      const values = rows.map((r) => columns.map((c) => r[c]));
      const placeholders = values
        .map(() => `(${columns.map(() => "?").join(",")})`)
        .join(",");
      const flat = [].concat(...values);

      const tickedColumns = columns.map((c) => `\`${c}\``).join(",");

      const sql = `INSERT INTO accounts_preload_data (${tickedColumns}) VALUES ${placeholders}`;

      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.ACCOUNTS_PRELOAD_DATA",
            code: "REPOSITORY.ACCOUNTS_PRELOAD_DATA.BULKCREATE.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve({
          affectedRows: result.affectedRows,
          insertedIds: Array.from(
            { length: result.affectedRows },
            (_, i) => result.insertId + i
          ),
        });
      });
    });
  }

  create(payload) {
    return new Promise((resolve, reject) => {
      const columns = Object.keys(payload);
      const values = columns.map((c) => payload[c]);
      const tickedColumns = columns.map((c) => `\`${c}\``).join(",");
      const placeholders = columns.map(() => "?").join(",");

      const sql = `INSERT INTO accounts_preload_data (${tickedColumns}) VALUES (${placeholders})`;

      this.db.query(sql, values, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.ACCOUNTS_PRELOAD_DATA",
            code: "REPOSITORY.ACCOUNTS_PRELOAD_DATA.CREATE.ERROR",
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

  update(id, payload) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "UPDATE accounts_preload_data SET ? WHERE id = ?",
        [payload, id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.ACCOUNTS_PRELOAD_DATA",
              code: "REPOSITORY.ACCOUNTS_PRELOAD_DATA.UPDATE.ERROR",
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

  getAll(branch_id) {
    return new Promise((resolve, reject) => {
      try {
        this.db.query(
          `SELECT 
            apd.*,
            b.branch_name,
            bc.counter_name,
            bc.counter_code,
            CASE 
              WHEN accSheet.id IS NOT NULL THEN 1 
              ELSE 0 
            END as exists_in_accounts_sheet
          FROM accounts_preload_data apd 
          LEFT JOIN branches b ON apd.branch_id = b.branch_id
          LEFT JOIN billing_counter bc ON apd.billing_counter_id = bc.counter_id
          LEFT JOIN accounts_sheet accSheet 
            ON apd.date = accSheet.date
            AND (
              (apd.billing_counter_id IS NULL AND accSheet.billing_counter_id IS NULL)
              OR apd.billing_counter_id = accSheet.billing_counter_id
            )
          LEFT JOIN employees e ON accSheet.employee_id = e.employee_code
            AND apd.branch_id = e.branch_id
          ${branch_id ? `WHERE apd.branch_id = ?` : ""}
          ORDER BY apd.created_at DESC`,
          branch_id ? [branch_id] : [],
          (err, rows) => {
            if (err) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.ACCOUNTS_PRELOAD_DATA",
                code: "REPOSITORY.ACCOUNTS_PRELOAD_DATA.GETALL.ERROR",
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
      } catch (error) {
        logger.Log({
          level: logger.LEVEL.ERROR,
          component: "REPOSITORY.ACCOUNTS_PRELOAD_DATA",
          code: "REPOSITORY.ACCOUNTS_PRELOAD_DATA.GETALL.ERROR",
          description: error.toString(),
          category: "",
          ref: {},
        });
        reject(error);
      }
    });
  }

  getById(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
          apd.*,
          b.branch_name,
          bc.counter_name,
          bc.counter_code,
          CASE 
            WHEN accSheet.id IS NOT NULL THEN 1 
            ELSE 0 
          END as exists_in_accounts_sheet
        FROM accounts_preload_data apd 
        LEFT JOIN branches b ON apd.branch_id = b.branch_id
        LEFT JOIN billing_counter bc ON apd.billing_counter_id = bc.counter_id
        LEFT JOIN accounts_sheet accSheet 
          ON apd.date = accSheet.date
          AND (
            (apd.billing_counter_id IS NULL AND accSheet.billing_counter_id IS NULL)
            OR apd.billing_counter_id = accSheet.billing_counter_id
          )
        LEFT JOIN employees e ON accSheet.employee_id = e.employee_code
          AND apd.branch_id = e.branch_id
        WHERE apd.id = ?`,
        [id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.ACCOUNTS_PRELOAD_DATA",
              code: "REPOSITORY.ACCOUNTS_PRELOAD_DATA.GETBYID.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(rows[0] || null);
        }
      );
    });
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM accounts_preload_data WHERE id = ?",
        [id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.ACCOUNTS_PRELOAD_DATA",
              code: "REPOSITORY.ACCOUNTS_PRELOAD_DATA.DELETE.ERROR",
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

  countMatchingInAccountsSheet(branch_id) {
    return new Promise((resolve, reject) => {
      try {
        const sql = `
          SELECT COUNT(*) as count
          FROM accounts_preload_data apd
          INNER JOIN accounts_sheet accSheet 
            ON apd.date = accSheet.date
            AND (
              (apd.billing_counter_id IS NULL AND accSheet.billing_counter_id IS NULL)
              OR apd.billing_counter_id = accSheet.billing_counter_id
            )
          INNER JOIN employees e ON accSheet.employee_id = e.employee_code
          WHERE apd.branch_id = e.branch_id
          ${branch_id ? `AND apd.branch_id = ?` : ""}
        `;

        this.db.query(sql, branch_id ? [branch_id] : [], (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.ACCOUNTS_PRELOAD_DATA",
              code: "REPOSITORY.ACCOUNTS_PRELOAD_DATA.COUNT_MATCHING.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(rows[0]?.count || 0);
        });
      } catch (error) {
        logger.Log({
          level: logger.LEVEL.ERROR,
          component: "REPOSITORY.ACCOUNTS_PRELOAD_DATA",
          code: "REPOSITORY.ACCOUNTS_PRELOAD_DATA.COUNT_MATCHING.ERROR",
          description: error.toString(),
          category: "",
          ref: {},
        });
        reject(error);
      }
    });
  }
}

module.exports = (db) => {
  return new AccountsPreloadDataRepository(db);
};
