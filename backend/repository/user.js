const logger = require("../utils/logger");

class UserRepository {
  constructor(db) {
    this.db = db;
  }

  login(username, password) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT user_id, user_type, employee_id FROM user WHERE username = ? AND password = SHA1(?)`,
        [username, password],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.USER",
              code: "REPOSITORY.USER.ERROR",
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

  checkUserExists(username) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT * FROM user WHERE username = ?",
        [username],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.USER",
              code: "REPOSITORY.USER.CHECKUSEREXISTS.ERROR",
              description: err.toString(),
              category: "",
              ref: { username },
            });
            reject(err);
            return;
          }
          resolve(docs.length > 0);
        }
      );
    });
  }

  createUser(payload) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "INSERT INTO user (username, password, employee_id, user_type) VALUES (?, SHA1(?), ?, ?)",
        [
          payload.username,
          payload.password,
          payload.employee_id,
          payload.user_type,
        ],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.USER",
              code: "REPOSITORY.USER.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }

          resolve({ code: 200, id: docs.insertId });
        }
      );
    });
  }

  getUserDetails(user_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT employees.employee_name, employees.profile_img_url, employees.employee_code, employees.designation_id, totp_enabled, designation_name, employees.department_id, department_name, employees.section_id, section_name, employees.branch_id, branch_name FROM user
        LEFT JOIN employees ON user.employee_id = employees.employee_code
        LEFT JOIN designations ON employees.designation_id = designations.designation_id
        LEFT JOIN departments ON employees.department_id = departments.department_id
        LEFT JOIN branches ON employees.branch_id = branches.branch_id
        LEFT JOIN employee_sections ON employees.section_id = employee_sections.section_id
        WHERE user.user_id = ?`,
        [user_id],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.USER",
              code: "REPOSITORY.USER.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }

          resolve({ code: 200, data: docs[0] });
        }
      );
    });
  }

  getUserTotpSecret(user_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT totp_secret, totp_enabled FROM user WHERE user_id = ?",
        [user_id],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.USER",
              code: "REPOSITORY.USER.GETTOTPSECRET.ERROR",
              description: err.toString(),
              category: "",
              ref: { user_id },
            });
            reject(err);
            return;
          }
          resolve(docs[0] || null);
        }
      );
    });
  }

  saveTotpSecret(user_id, encryptedSecret) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "UPDATE user SET totp_secret = ? WHERE user_id = ?",
        [encryptedSecret, user_id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.USER",
              code: "REPOSITORY.USER.SAVETOTPSECRET.ERROR",
              description: err.toString(),
              category: "",
              ref: { user_id },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }

  enableTotp(user_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "UPDATE user SET totp_enabled = TRUE WHERE user_id = ?",
        [user_id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.USER",
              code: "REPOSITORY.USER.ENABLETOTP.ERROR",
              description: err.toString(),
              category: "",
              ref: { user_id },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }

  disableTotp(user_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "UPDATE user SET totp_enabled = FALSE, totp_secret = NULL WHERE user_id = ?",
        [user_id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.USER",
              code: "REPOSITORY.USER.DISABLETOTP.ERROR",
              description: err.toString(),
              category: "",
              ref: { user_id },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }

  updateTotpEnabledByEmployeeCode(employee_code, enabled) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "UPDATE user SET totp_enabled = ? WHERE employee_id = ?",
        [enabled, employee_code],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.USER",
              code: "REPOSITORY.USER.UPDATETOTPENABLEDBYEMPLOYEECODE.ERROR",
              description: err.toString(),
              category: "",
              ref: { employee_code, enabled },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }

  disableTotpByEmployeeCode(employee_code) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "UPDATE user SET totp_enabled = FALSE, totp_secret = NULL WHERE employee_id = ?",
        [employee_code],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.USER",
              code: "REPOSITORY.USER.DISABLETOTPBYEMPLOYEECODE.ERROR",
              description: err.toString(),
              category: "",
              ref: { employee_code },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }

  deleteByEmployeeCode(employee_code) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM user WHERE employee_id = ?",
        [employee_code],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.USER",
              code: "REPOSITORY.USER.DELETEBYEMPLOYEECODE.ERROR",
              description: err.toString(),
              category: "",
              ref: { employee_code },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }

  getUserWithDesignation(user_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT user.user_id, user.username, user.totp_enabled, employees.designation_id, designations.requires_2fa 
         FROM user
         LEFT JOIN employees ON user.employee_id = employees.employee_code
         LEFT JOIN designations ON employees.designation_id = designations.designation_id
         WHERE user.user_id = ?`,
        [user_id],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.USER",
              code: "REPOSITORY.USER.GETUSERWITHDESIGNATION.ERROR",
              description: err.toString(),
              category: "",
              ref: { user_id },
            });
            reject(err);
            return;
          }
          resolve(docs[0] || null);
        }
      );
    });
  }
}

module.exports = (db) => {
  return new UserRepository(db);
};
