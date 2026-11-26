const logger = require("../utils/logger");

class TargetBranchRepository {
  constructor(db) {
    this.db = db;
  }

  create(targetBranchData) {
    return new Promise((resolve, reject) => {
      const { branch_id, target_amount, target_month } = targetBranchData;

      this.db.query(
        `INSERT INTO target_branch (branch_id, target_amount, target_month, created_at) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE 
           target_amount = VALUES(target_amount), 
           target_month = VALUES(target_month),
           updated_at = CURRENT_TIMESTAMP`,
        [branch_id, target_amount, target_month],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_BRANCH",
              code: "REPOSITORY.TARGET_BRANCH.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { targetBranchData },
            });
            reject(err);
            return;
          }
          resolve({ id: result.insertId, ...targetBranchData });
        }
      );
    });
  }

  getAll(branch_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
          tb.target_branch_id,
          tb.branch_id,
          tb.target_amount,
          tb.target_month,
          tb.created_at,
          tb.updated_at,
          b.branch_name,
          EXISTS (
            SELECT 1 FROM target_department td
            WHERE td.branch_id = tb.branch_id
              AND YEAR(td.target_date) = YEAR(tb.target_month)
              AND MONTH(td.target_date) = MONTH(tb.target_month)
          ) AS has_department_targets
         FROM target_branch tb
         LEFT JOIN branches b ON tb.branch_id = b.branch_id
         ${branch_id ? `WHERE tb.branch_id = ?` : ``}
         ORDER BY tb.created_at DESC`,
        branch_id ? [branch_id] : [],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_BRANCH",
              code: "REPOSITORY.TARGET_BRANCH.GET_ALL.ERROR",
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

  getById(targetBranchId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
          tb.target_branch_id,
          tb.branch_id,
          tb.target_amount,
          tb.target_month,
          tb.created_at,
          tb.updated_at,
          b.branch_name
         FROM target_branch tb
         LEFT JOIN branches b ON tb.branch_id = b.branch_id
         WHERE tb.target_branch_id = ?`,
        [targetBranchId],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_BRANCH",
              code: "REPOSITORY.TARGET_BRANCH.GET_BY_ID.ERROR",
              description: err.toString(),
              category: "",
              ref: { targetBranchId },
            });
            reject(err);
            return;
          }
          resolve(docs.length > 0 ? docs[0] : null);
        }
      );
    });
  }

  update(targetBranchId, targetBranchData) {
    return new Promise((resolve, reject) => {
      const { branch_id, target_amount, target_month } = targetBranchData;

      const updateFields = [];
      const updateValues = [];

      if (branch_id !== undefined) {
        updateFields.push("branch_id = ?");
        updateValues.push(branch_id);
      }
      if (target_amount !== undefined) {
        updateFields.push("target_amount = ?");
        updateValues.push(target_amount);
      }
      if (target_month !== undefined) {
        updateFields.push("target_month = ?");
        updateValues.push(target_month);
      }

      if (updateFields.length === 0) {
        resolve({ message: "No fields to update" });
        return;
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(targetBranchId);

      this.db.query(
        `UPDATE target_branch SET ${updateFields.join(
          ", "
        )} WHERE target_branch_id = ?`,
        updateValues,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_BRANCH",
              code: "REPOSITORY.TARGET_BRANCH.UPDATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { targetBranchId, targetBranchData },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows, targetBranchId });
        }
      );
    });
  }

  delete(targetBranchId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM target_branch WHERE target_branch_id = ?",
        [targetBranchId],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TARGET_BRANCH",
              code: "REPOSITORY.TARGET_BRANCH.DELETE.ERROR",
              description: err.toString(),
              category: "",
              ref: { targetBranchId },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows, targetBranchId });
        }
      );
    });
  }
}

module.exports = (db) => {
  return new TargetBranchRepository(db);
};
