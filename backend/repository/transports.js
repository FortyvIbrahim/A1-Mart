const logger = require("../utils/logger");

const TRANSPORT_COLUMNS = [
  "asset_code",
  "asset_name",
  "vehicle_number",
  "engine_number",
  "chassis_number",
  "acquisition_type",
  "dependency_type",
  "working_status",
  "asset_description",
  "customer_asset_no",
  "sub_category",
  "hsn_code",
  "barcode_option",
  "barcode_no",
  "purchased_price",
  "purchased_date",
  "placed_in_service",
  "capitalization_date",
  "bill_no",
  "bill_date",
  "received_date",
  "serial_number",
  "model_number",
  "seller",
  "branch_id",
  "is_depreciation_applicable",
  "salvage_value",
  "exp_end_date",
  "asset_life_span",
  "image_url",
];

function mapRow(row) {
  if (!row) return null;
  const { branch_name, ...rest } = row;
  return {
    ...rest,
    branch: row.branch_id != null
      ? { branch_id: row.branch_id, branch_name: branch_name || null }
      : null,
  };
}

class TransportsRepository {
  constructor(db) {
    this.db = db;
  }

  create(payload) {
    return new Promise((resolve, reject) => {
      const keys = TRANSPORT_COLUMNS.filter((k) => payload[k] !== undefined);
      if (keys.length === 0) {
        reject(new Error("No valid transport fields provided"));
        return;
      }
      const values = keys.map((k) => payload[k]);
      const ticked = keys.map((k) => `\`${k}\``).join(",");
      const placeholders = keys.map(() => "?").join(",");

      this.db.query(
        `INSERT INTO transports (${ticked}) VALUES (${placeholders})`,
        values,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TRANSPORTS",
              code: "REPOSITORY.TRANSPORTS.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { payload },
            });
            reject(err);
            return;
          }
          resolve({ transport_id: result.insertId });
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

      let totalAffected = 0;
      let firstInsertId = null;
      let hasError = false;

      const processRow = (row, callback) => {
        const providedCols = TRANSPORT_COLUMNS.filter(
          (c) => row[c] !== undefined
        );
        if (providedCols.length === 0 || !providedCols.includes("asset_code")) {
          callback(null, 0);
          return;
        }

        const norm = (v) => (v === "" ? null : v);
        const vals = providedCols.map((c) => norm(row[c]));
        const ticked = providedCols.map((c) => `\`${c}\``).join(",");
        const placeholders = providedCols.map(() => "?").join(",");

        const updateCols = providedCols.filter(
          (c) => c !== "asset_code" && c !== "created_at"
        );
        const updateAssignments = updateCols
          .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
          .join(", ");
        const updateClause =
          updateAssignments.length > 0
            ? `ON DUPLICATE KEY UPDATE ${updateAssignments}, updated_at = CURRENT_TIMESTAMP`
            : `ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`;

        const sql = `INSERT INTO transports (${ticked}) VALUES (${placeholders}) ${updateClause}`;

        this.db.query(sql, vals, (err, result) => {
          if (err) {
            callback(err, 0);
            return;
          }
          callback(null, result.affectedRows, result.insertId);
        });
      };

      const next = (idx) => {
        if (hasError || idx >= rows.length) {
          if (!hasError) {
            resolve({
              affectedRows: totalAffected,
              insertedId: firstInsertId,
            });
          }
          return;
        }

        processRow(rows[idx], (err, affected, insertId) => {
          if (err) {
            hasError = true;
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TRANSPORTS",
              code: "REPOSITORY.TRANSPORTS.BULKCREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { rowIndex: idx },
            });
            reject(err);
            return;
          }
          totalAffected += affected;
          if (firstInsertId === null && insertId) {
            firstInsertId = insertId;
          }
          next(idx + 1);
        });
      };

      next(0);
    });
  }

  update(transport_id, payload) {
    return new Promise((resolve, reject) => {
      const keys = TRANSPORT_COLUMNS.filter((k) => payload[k] !== undefined);
      if (keys.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }
      const setClause = keys.map((k) => `\`${k}\` = ?`).join(", ");
      const values = [...keys.map((k) => payload[k]), transport_id];

      this.db.query(
        `UPDATE transports SET ${setClause} WHERE transport_id = ?`,
        values,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TRANSPORTS",
              code: "REPOSITORY.TRANSPORTS.UPDATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { transport_id },
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
        `SELECT t.*, b.branch_name
         FROM transports t
         LEFT JOIN branches b ON t.branch_id = b.branch_id
         ORDER BY t.created_at DESC`,
        [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TRANSPORTS",
              code: "REPOSITORY.TRANSPORTS.GETALL.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve((rows || []).map(mapRow));
        }
      );
    });
  }

  getById(transport_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT t.*, b.branch_name
         FROM transports t
         LEFT JOIN branches b ON t.branch_id = b.branch_id
         WHERE t.transport_id = ?`,
        [transport_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TRANSPORTS",
              code: "REPOSITORY.TRANSPORTS.GETBYID.ERROR",
              description: err.toString(),
              category: "",
              ref: { transport_id },
            });
            reject(err);
            return;
          }
          resolve(rows[0] ? mapRow(rows[0]) : null);
        }
      );
    });
  }

  delete(transport_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM transports WHERE transport_id = ?",
        [transport_id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TRANSPORTS",
              code: "REPOSITORY.TRANSPORTS.DELETE.ERROR",
              description: err.toString(),
              category: "",
              ref: { transport_id },
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
  return new TransportsRepository(db);
};
