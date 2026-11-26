const logger = require("../utils/logger");

class BranchesRepository {
  constructor(db) {
    this.db = db;
  }

  create(branchData) {
    return new Promise((resolve, reject) => {
      const {
        branch_id,
        de_branch_id = null,
        branch_name,
        branch_address,
        branch_phone,
        phone,
        branch_nickname,
        telegram_chat_id,
        is_active = 1,
        cluster_size = null,
      } = branchData;

      // If branch_id is provided, include it in the insert
      const fields =
        branch_id !== undefined
          ? "branch_id, de_branch_id, branch_name, branch_address, branch_phone, phone, branch_nickname, telegram_chat_id, is_active, cluster_size"
          : "de_branch_id, branch_name, branch_address, branch_phone, phone, branch_nickname, telegram_chat_id, is_active, cluster_size";

      const placeholders =
        branch_id !== undefined
          ? "?, ?, ?, ?, ?, ?, ?, ?, ?, ?"
          : "?, ?, ?, ?, ?, ?, ?, ?, ?";

      const values =
        branch_id !== undefined
          ? [
              branch_id,
              de_branch_id,
              branch_name,
              branch_address,
              branch_phone,
              phone,
              branch_nickname,
              telegram_chat_id,
              is_active,
              cluster_size,
            ]
          : [
              de_branch_id,
              branch_name,
              branch_address,
              branch_phone,
              phone,
              branch_nickname,
              telegram_chat_id,
              is_active,
              cluster_size,
            ];

      this.db.query(
        `INSERT INTO branches (${fields}) VALUES (${placeholders})`,
        values,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.BRANCHES",
              code: "REPOSITORY.BRANCHES.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { branchData },
            });
            reject(err);
            return;
          }
          const insertedId =
            branch_id !== undefined ? branch_id : result.insertId;
          resolve({ id: insertedId, ...branchData });
        }
      );
    });
  }

  bulkCreate(rows) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(rows) || rows.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      // Extract all unique columns from all rows
      const allColumns = new Set();
      rows.forEach((row) => {
        Object.keys(row).forEach((key) => allColumns.add(key));
      });

      // Build column array - put branch_id first if it exists
      const columns = Array.from(allColumns);
      const hasBranchId = columns.includes("branch_id");
      const finalColumns = hasBranchId
        ? ["branch_id", ...columns.filter((c) => c !== "branch_id")]
        : columns;

      const values = rows.map((r) =>
        finalColumns.map((c) => (r[c] === null || r[c] === "" ? null : r[c]))
      );

      const placeholders = values
        .map(() => `(${finalColumns.map(() => "?").join(",")})`)
        .join(",");

      const flat = [].concat(...values);

      // Build ON DUPLICATE KEY UPDATE clause
      // Update all columns except branch_id (which is the primary key)
      const updateColumns = finalColumns.filter((c) => c !== "branch_id");
      const updateAssignments = updateColumns
        .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
        .join(", ");

      // Also update updated_at timestamp
      const updateClause =
        updateAssignments.length > 0
          ? `ON DUPLICATE KEY UPDATE ${updateAssignments}, updated_at = CURRENT_TIMESTAMP`
          : "";

      const sql = `INSERT INTO branches (${finalColumns
        .map((c) => `\`${c}\``)
        .join(", ")}) VALUES ${placeholders} ${updateClause}`;

      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.BRANCHES",
            code: "REPOSITORY.BRANCHES.BULKCREATE.ERROR",
            description: err.toString(),
            category: "",
            ref: { rows },
          });
          reject(err);
          return;
        }
        resolve({
          affectedRows: result.affectedRows,
          insertedId: result.insertId,
        });
      });
    });
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT * FROM branches WHERE is_active = 1 ORDER BY created_at DESC",
        [],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.BRANCHES",
              code: "REPOSITORY.BRANCHES.GET_ALL.ERROR",
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

  getById(branchId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT * FROM branches WHERE branch_id = ?",
        [branchId],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.BRANCHES",
              code: "REPOSITORY.BRANCHES.GET_BY_ID.ERROR",
              description: err.toString(),
              category: "",
              ref: { branchId },
            });
            reject(err);
            return;
          }
          resolve(docs.length > 0 ? docs[0] : null);
        }
      );
    });
  }

  update(branchId, branchData) {
    return new Promise((resolve, reject) => {
      const {
        de_branch_id,
        branch_name,
        branch_address,
        branch_phone,
        phone,
        branch_nickname,
        telegram_chat_id,
        is_active,
        cluster_size,
      } = branchData;

      const updateFields = [];
      const updateValues = [];

      if (de_branch_id !== undefined) {
        updateFields.push("de_branch_id = ?");
        updateValues.push(de_branch_id);
      }
      if (branch_name !== undefined) {
        updateFields.push("branch_name = ?");
        updateValues.push(branch_name);
      }
      if (branch_address !== undefined) {
        updateFields.push("branch_address = ?");
        updateValues.push(branch_address);
      }
      if (branch_phone !== undefined) {
        updateFields.push("branch_phone = ?");
        updateValues.push(branch_phone);
      }
      if (phone !== undefined) {
        updateFields.push("phone = ?");
        updateValues.push(phone);
      }
      if (branch_nickname !== undefined) {
        updateFields.push("branch_nickname = ?");
        updateValues.push(branch_nickname);
      }
      if (telegram_chat_id !== undefined) {
        updateFields.push("telegram_chat_id = ?");
        updateValues.push(telegram_chat_id);
      }
      if (is_active !== undefined) {
        updateFields.push("is_active = ?");
        updateValues.push(is_active);
      }
      if (cluster_size !== undefined) {
        updateFields.push("cluster_size = ?");
        updateValues.push(cluster_size);
      }

      if (updateFields.length === 0) {
        resolve({ message: "No fields to update" });
        return;
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(branchId);

      this.db.query(
        `UPDATE branches SET ${updateFields.join(", ")} WHERE branch_id = ?`,
        updateValues,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.BRANCHES",
              code: "REPOSITORY.BRANCHES.UPDATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { branchId, branchData },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows, branchId });
        }
      );
    });
  }

  delete(branchId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM branches WHERE branch_id = ?",
        [branchId],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.BRANCHES",
              code: "REPOSITORY.BRANCHES.DELETE.ERROR",
              description: err.toString(),
              category: "",
              ref: { branchId },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows, branchId });
        }
      );
    });
  }
}

module.exports = (db) => {
  return new BranchesRepository(db);
};
