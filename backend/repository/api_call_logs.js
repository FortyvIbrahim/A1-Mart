const logger = require("../utils/logger");

class ApiCallLogsRepository {
  constructor(db) {
    this.db = db;
  }

  create(payload) {
    return new Promise((resolve, reject) => {
      const columns = Object.keys(payload);
      const values = columns.map((c) => {
        const val = payload[c];
        // Convert objects to JSON strings for JSON columns
        if (typeof val === "object" && val !== null) {
          return JSON.stringify(val);
        }
        return val;
      });
      const tickedColumns = columns.map((c) => `\`${c}\``).join(",");
      const placeholders = columns.map(() => "?").join(",");

      const sql = `INSERT INTO api_call_logs (${tickedColumns}) VALUES (${placeholders})`;

      this.db.query(sql, values, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.API_CALL_LOGS",
            code: "REPOSITORY.API_CALL_LOGS.CREATE.ERROR",
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

  bulkCreate(logs) {
    return new Promise((resolve, reject) => {
      if (!logs || logs.length === 0) {
        resolve({ insertedCount: 0 });
        return;
      }

      const columns = [
        "api_type",
        "secondary_type",
        "api_url",
        "http_method",
        "status_code",
        "time_taken_ms",
        "is_success",
        "error_message",
        "error_stack",
        "request_headers",
        "request_body",
        "response_error_body",
        "caller_function",
        "caller_file",
        "correlation_id",
        "retry_count",
      ];

      const tickedColumns = columns.map((c) => `\`${c}\``).join(",");
      const placeholders = logs
        .map(() => `(${columns.map(() => "?").join(",")})`)
        .join(",");

      const values = logs.flatMap((log) =>
        columns.map((col) => {
          const val = log[col];
          if (typeof val === "object" && val !== null) {
            return JSON.stringify(val);
          }
          return val !== undefined ? val : null;
        })
      );

      const sql = `INSERT INTO api_call_logs (${tickedColumns}) VALUES ${placeholders}`;

      this.db.query(sql, values, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.API_CALL_LOGS",
            code: "REPOSITORY.API_CALL_LOGS.BULK_CREATE.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve({ insertedCount: result.affectedRows });
      });
    });
  }

  getAll(options = {}) {
    return new Promise((resolve, reject) => {
      const { limit = 100, offset = 0, api_type, secondary_type, is_success } = options;
      
      let whereConditions = [];
      let params = [];

      if (api_type) {
        whereConditions.push("api_type = ?");
        params.push(api_type);
      }

      if (secondary_type) {
        whereConditions.push("secondary_type = ?");
        params.push(secondary_type);
      }

      if (is_success !== undefined) {
        whereConditions.push("is_success = ?");
        params.push(is_success ? 1 : 0);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(" AND ")}` 
        : "";

      params.push(limit, offset);

      const sql = `
        SELECT * FROM api_call_logs 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;

      this.db.query(sql, params, (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.API_CALL_LOGS",
            code: "REPOSITORY.API_CALL_LOGS.GETALL.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  getById(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT * FROM api_call_logs WHERE id = ?",
        [id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.API_CALL_LOGS",
              code: "REPOSITORY.API_CALL_LOGS.GETBYID.ERROR",
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

  getByApiType(apiType, options = {}) {
    return new Promise((resolve, reject) => {
      const { limit = 100, offset = 0 } = options;

      this.db.query(
        `SELECT * FROM api_call_logs 
         WHERE api_type = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [apiType, limit, offset],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.API_CALL_LOGS",
              code: "REPOSITORY.API_CALL_LOGS.GETBYAPITYPE.ERROR",
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

  getBySecondaryType(secondaryType, options = {}) {
    return new Promise((resolve, reject) => {
      const { limit = 100, offset = 0 } = options;

      this.db.query(
        `SELECT * FROM api_call_logs 
         WHERE secondary_type = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [secondaryType, limit, offset],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.API_CALL_LOGS",
              code: "REPOSITORY.API_CALL_LOGS.GETBYSECONDARYTYPE.ERROR",
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

  getFailedCalls(options = {}) {
    return new Promise((resolve, reject) => {
      const { limit = 100, offset = 0, api_type, secondary_type } = options;

      let whereConditions = ["is_success = 0"];
      let params = [];

      if (api_type) {
        whereConditions.push("api_type = ?");
        params.push(api_type);
      }

      if (secondary_type) {
        whereConditions.push("secondary_type = ?");
        params.push(secondary_type);
      }

      params.push(limit, offset);

      const sql = `
        SELECT * FROM api_call_logs 
        WHERE ${whereConditions.join(" AND ")}
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;

      this.db.query(sql, params, (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.API_CALL_LOGS",
            code: "REPOSITORY.API_CALL_LOGS.GETFAILEDCALLS.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  getByCorrelationId(correlationId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT * FROM api_call_logs 
         WHERE correlation_id = ? 
         ORDER BY created_at ASC`,
        [correlationId],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.API_CALL_LOGS",
              code: "REPOSITORY.API_CALL_LOGS.GETBYCORRELATIONID.ERROR",
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

  getStats(startDate, endDate) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          api_type,
          secondary_type,
          COUNT(*) as total_calls,
          SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) as successful_calls,
          SUM(CASE WHEN is_success = 0 THEN 1 ELSE 0 END) as failed_calls,
          AVG(time_taken_ms) as avg_time_ms,
          MIN(time_taken_ms) as min_time_ms,
          MAX(time_taken_ms) as max_time_ms
        FROM api_call_logs
        WHERE created_at BETWEEN ? AND ?
        GROUP BY api_type, secondary_type
        ORDER BY api_type, secondary_type
      `;

      this.db.query(sql, [startDate, endDate], (err, rows) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.API_CALL_LOGS",
            code: "REPOSITORY.API_CALL_LOGS.GETSTATS.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  deleteOlderThan(days) {
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM api_call_logs 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      `;

      this.db.query(sql, [days], (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.API_CALL_LOGS",
            code: "REPOSITORY.API_CALL_LOGS.DELETEOLDERTHAN.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve({ deletedCount: result.affectedRows });
      });
    });
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM api_call_logs WHERE id = ?",
        [id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.API_CALL_LOGS",
              code: "REPOSITORY.API_CALL_LOGS.DELETE.ERROR",
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
  return new ApiCallLogsRepository(db);
};
