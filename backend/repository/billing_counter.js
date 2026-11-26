const logger = require("../utils/logger");

class BillingCounterRepository {
  constructor(db) {
    this.db = db;
  }

  create(counterData) {
    return new Promise((resolve, reject) => {
      const { counter_name, branch_id, counter_code } = counterData;

      this.db.query(
        "INSERT INTO billing_counter (counter_name, branch_id, counter_code) VALUES (?, ?, ?)",
        [counter_name, branch_id, counter_code || null],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.BILLING_COUNTER",
              code: "REPOSITORY.BILLING_COUNTER.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { counterData },
            });
            reject(err);
            return;
          }
          resolve({ id: result.insertId, ...counterData });
        }
      );
    });
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT bc.*, b.branch_name 
         FROM billing_counter bc
         LEFT JOIN branches b ON bc.branch_id = b.branch_id
         ORDER BY bc.created_at DESC`,
        [],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.BILLING_COUNTER",
              code: "REPOSITORY.BILLING_COUNTER.GET_ALL.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(docs);
        }
      );
    });
  }

  getById(counterId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT bc.*, b.branch_name 
         FROM billing_counter bc
         LEFT JOIN branches b ON bc.branch_id = b.branch_id
         WHERE bc.counter_id = ?`,
        [counterId],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.BILLING_COUNTER",
              code: "REPOSITORY.BILLING_COUNTER.GET_BY_ID.ERROR",
              description: err.toString(),
              category: "",
              ref: { counterId },
            });
            reject(err);
            return;
          }
          resolve(docs.length > 0 ? docs[0] : null);
        }
      );
    });
  }

  getByBranchId(branchId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT bc.*, b.branch_name 
         FROM billing_counter bc
         LEFT JOIN branches b ON bc.branch_id = b.branch_id
         WHERE bc.branch_id = ?
         ORDER BY bc.created_at DESC`,
        [branchId],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.BILLING_COUNTER",
              code: "REPOSITORY.BILLING_COUNTER.GET_BY_BRANCH_ID.ERROR",
              description: err.toString(),
              category: "",
              ref: { branchId },
            });
            reject(err);
            return;
          }
          resolve(docs);
        }
      );
    });
  }

  update(counterId, counterData) {
    return new Promise((resolve, reject) => {
      const { counter_name, branch_id, counter_code } = counterData;

      const updateFields = [];
      const updateValues = [];

      if (counter_name !== undefined) {
        updateFields.push("counter_name = ?");
        updateValues.push(counter_name);
      }
      if (branch_id !== undefined) {
        updateFields.push("branch_id = ?");
        updateValues.push(branch_id);
      }
      if (counter_code !== undefined) {
        updateFields.push("counter_code = ?");
        updateValues.push(counter_code || null);
      }

      if (updateFields.length === 0) {
        resolve({ message: "No fields to update" });
        return;
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(counterId);

      this.db.query(
        `UPDATE billing_counter SET ${updateFields.join(", ")} WHERE counter_id = ?`,
        updateValues,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.BILLING_COUNTER",
              code: "REPOSITORY.BILLING_COUNTER.UPDATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { counterId, counterData },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows, counterId });
        }
      );
    });
  }

  delete(counterId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM billing_counter WHERE counter_id = ?",
        [counterId],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.BILLING_COUNTER",
              code: "REPOSITORY.BILLING_COUNTER.DELETE.ERROR",
              description: err.toString(),
              category: "",
              ref: { counterId },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows, counterId });
        }
      );
    });
  }
}

module.exports = (db) => {
  return new BillingCounterRepository(db);
};

