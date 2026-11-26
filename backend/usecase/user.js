const jwt = require("../services/jwt");
const TOTPService = require("../services/totp");
const userConfig = require("../config/user.json");

class UserUsecase {
  constructor(userRepo, employeesUsecase) {
    this.userRepo = userRepo;
    this.employeesUsecase = employeesUsecase;
  }

  login(username, password) {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.userRepo.login(username, password);
        if (resp.length > 0) {
          const employee = await this.employeesUsecase.getById(
            resp[0].employee_id
          );

          // Check if user's designation requires 2FA
          const userWithDesignation =
            await this.userRepo.getUserWithDesignation(resp[0].user_id);

          const requires2FA =
            userWithDesignation?.requires_2fa === 1 ||
            userWithDesignation?.requires_2fa === true;
          const totpEnabled =
            userWithDesignation?.totp_enabled === 1 ||
            userWithDesignation?.totp_enabled === true;

          // If designation requires 2FA and TOTP is enabled, return temporary token
          if (requires2FA && totpEnabled) {
            const tempInfo = {
              user_id: resp[0].user_id,
              employee_id: resp[0].employee_id,
              user_type: resp[0].user_type,
              designation_id: employee?.designation_id,
              branch_id: employee?.branch_id,
              requires_2fa: true,
            };

            const tempToken = await jwt.sign(tempInfo, "5m"); // 5 minute temporary token
            resolve({
              code: 200,
              requires_2fa: true,
              temp_token: tempToken,
              msg: "2FA verification required",
            });
            return;
          }

          // Normal login flow
          const info = {
            user_id: resp[0].user_id,
            employee_id: resp[0].employee_id,
            user_type: resp[0].user_type,
            designation_id: employee?.designation_id,
            branch_id: employee?.branch_id,
          };

          const token = await jwt.sign(info, "2h");
          resolve({
            code: 200,
            token: token,
            user_data: {
              user_type: resp[0].user_type,
              designation_id: employee?.designation_id,
              employee_name: employee?.employee_name,
              branch_id: employee?.branch_id,
            },
          });
        } else {
          resolve({ code: 404, msg: "Access Denied !" });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  checkUserExists(username) {
    return this.userRepo.checkUserExists(username);
  }

  createUser(payload) {
    return this.userRepo.createUser(payload);
  }

  getUserDetails(user_id) {
    return this.userRepo.getUserDetails(user_id);
  }

  register(username, password) {
    return new Promise(async (resolve, reject) => {
      try {
        const userExists = await this.checkUserExists(username);
        if (userExists) {
          resolve({ code: 400, msg: "Username already exists" });
          return;
        }

        const employeeData = await this.employeesUsecase.getByPhone(username);

        if (!employeeData) {
          resolve({ code: 404 });
          return;
        }

        const employee_code = employeeData.employee_code;
        await this.userRepo.createUser({
          username: username,
          password: password,
          employee_id: employee_code,
          user_type: 2,
        });
        const loginRes = await this.login(username, password);
        resolve(loginRes);
      } catch (err) {
        reject(err);
      }
    });
  }

  generateTotpSecret(user_id) {
    return new Promise(async (resolve, reject) => {
      try {
        const userDetails = await this.userRepo.getUserDetails(user_id);
        if (!userDetails || !userDetails.data) {
          resolve({ code: 404, msg: "User not found" });
          return;
        }

        const username = userDetails.data.employee_name || `user_${user_id}`;
        const secret = TOTPService.generateSecret();
        const encryptedSecret = TOTPService.encryptSecret(secret);
        const qrData = await TOTPService.generateQRCode(secret, username);

        // Save the encrypted secret (but don't enable TOTP yet)
        await this.userRepo.saveTotpSecret(user_id, encryptedSecret);

        resolve({
          code: 200,
          secret: secret, // Return unencrypted secret for QR code generation
          qrCode: qrData.qrCode,
          otpauth: qrData.otpauth,
          msg: "TOTP secret generated. Please verify to enable 2FA.",
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  verifyTotpSetup(user_id, token) {
    return new Promise(async (resolve, reject) => {
      try {
        const totpData = await this.userRepo.getUserTotpSecret(user_id);
        if (!totpData || !totpData.totp_secret) {
          resolve({
            code: 400,
            msg: "TOTP secret not found. Please generate one first.",
          });
          return;
        }

        const decryptedSecret = TOTPService.decryptSecret(totpData.totp_secret);
        if (!decryptedSecret) {
          resolve({ code: 500, msg: "Failed to decrypt TOTP secret" });
          return;
        }

        const isValid = TOTPService.verifyToken(decryptedSecret, token);
        if (!isValid) {
          resolve({ code: 400, msg: "Invalid TOTP token" });
          return;
        }

        // Enable TOTP for the user
        await this.userRepo.enableTotp(user_id);

        resolve({
          code: 200,
          msg: "TOTP enabled successfully",
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  verifyTotpLogin(tempToken, totpToken) {
    return new Promise(async (resolve, reject) => {
      try {
        // Verify the temporary token
        const decoded = await jwt.verify(tempToken);

        if (!decoded.requires_2fa) {
          resolve({
            code: 400,
            msg: "Invalid token. 2FA not required for this token.",
          });
          return;
        }

        // Check for master OTP bypass (developer mode)
        const masterOtp = userConfig.master_otp || null;
        let isValid = false;

        if (masterOtp && totpToken === masterOtp) {
          // Master OTP matched - bypass TOTP verification
          isValid = true;
        } else {
          // Normal TOTP verification
          const user_id = decoded.user_id;
          const totpData = await this.userRepo.getUserTotpSecret(user_id);

          if (!totpData || !totpData.totp_secret) {
            resolve({ code: 400, msg: "TOTP not configured for this user" });
            return;
          }

          const decryptedSecret = TOTPService.decryptSecret(
            totpData.totp_secret
          );
          if (!decryptedSecret) {
            resolve({ code: 500, msg: "Failed to decrypt TOTP secret" });
            return;
          }

          isValid = TOTPService.verifyToken(decryptedSecret, totpToken);
        }

        if (!isValid) {
          resolve({ code: 400, msg: "Invalid TOTP token" });
          return;
        }

        // Get employee details for full token
        const employee = await this.employeesUsecase.getById(
          decoded.employee_id
        );

        // Generate full JWT token
        const info = {
          user_id: decoded.user_id,
          employee_id: decoded.employee_id,
          user_type: decoded.user_type,
          designation_id: decoded.designation_id,
          branch_id: decoded.branch_id,
        };

        const token = await jwt.sign(info, "2h");
        resolve({
          code: 200,
          token: token,
          user_data: {
            user_type: decoded.user_type,
            designation_id: decoded.designation_id,
            employee_name: employee?.employee_name,
            branch_id: decoded.branch_id,
          },
        });
      } catch (err) {
        if (
          err.name === "TokenExpiredError" ||
          err.name === "JsonWebTokenError"
        ) {
          resolve({ code: 401, msg: "Token expired or invalid" });
        } else {
          reject(err);
        }
      }
    });
  }

  disableTotp(user_id) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.userRepo.disableTotp(user_id);
        resolve({
          code: 200,
          msg: "TOTP disabled successfully",
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  updateTotpEnabledByEmployeeCode(employee_code, enabled) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.userRepo.updateTotpEnabledByEmployeeCode(
          employee_code,
          enabled
        );
        if (result.affectedRows === 0) {
          resolve({
            code: 404,
            msg: "User not found for the given employee code",
          });
          return;
        }
        resolve({
          code: 200,
          msg: `TOTP ${enabled ? "enabled" : "disabled"} successfully`,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  disableTotpByEmployeeCode(employee_code) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.userRepo.disableTotpByEmployeeCode(
          employee_code
        );
        if (result.affectedRows === 0) {
          resolve({
            code: 404,
            msg: "User not found for the given employee code",
          });
          return;
        }
        resolve({
          code: 200,
          msg: "2FA disabled successfully and secret removed",
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  deleteUserByEmployeeCode(employee_code) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.userRepo.deleteByEmployeeCode(employee_code);
        if (result.affectedRows === 0) {
          resolve({
            code: 404,
            msg: "User not found for the given employee code",
          });
          return;
        }
        resolve({
          code: 200,
          msg: "User deleted successfully",
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (userRepo, employeesUsecase) => {
  return new UserUsecase(userRepo, employeesUsecase);
};
