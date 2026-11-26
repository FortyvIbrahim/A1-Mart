const mysql = require("mysql");
const fs = require("fs");
const path = require("path");
const env = global.env;

// DB settings: environment variables (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD,
// DB_NAME) win; otherwise config.json (git-ignored) for the current NODE_ENV.
function dbSettings() {
  let fileCfg = {};
  const cfgPath = path.resolve(__dirname, "../config.json");
  if (fs.existsSync(cfgPath)) {
    fileCfg = require(cfgPath).db?.mysql?.[env] || {};
  }
  return {
    host: process.env.DB_HOST || fileCfg.host || "localhost",
    port: Number(process.env.DB_PORT || fileCfg.port || 3306),
    user: process.env.DB_USER || fileCfg.username,
    password: process.env.DB_PASSWORD ?? fileCfg.password,
    database: process.env.DB_NAME || fileCfg.database,
  };
}

const logger = require("../utils/logger");

class MySqlModel {
  constructor() {
    this.connection = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.connection = mysql.createPool({
        connectionLimit: 10,
        ...dbSettings(),
        debug: false,
        supportBigNumbers: true,
        bigNumberStrings: true,
        typeCast: function (field, next) {
          if (field.type === "JSON") {
            return field.string("utf8");
          }
          return next();
        }
      });

      this.connection.getConnection((err, connection) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.FATAL,
            component: "DRIVER",
            code: "DRIVER.CONNECTION.ERROR",
            description: err.toString(),
            category: "",
            ref: {}
          });

          reject(err);
          return;
        }

        if (connection) {
          logger.Log({
            level: logger.LEVEL.INFO,
            component: "DRIVER",
            code: "",
            description: "DB Connection Established",
            catego3ry: "",
            ref: {}
          });

          connection.release();
          resolve(this);
        }
      });
    });
  }

  close() {
    if (this.connection !== null) {
      this.connection.end();
    }
  }
}

module.exports = () => {
  return new MySqlModel();
};
