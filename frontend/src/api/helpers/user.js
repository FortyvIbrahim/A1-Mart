import axiosInstance from "..";

export const handleLogin = (username, password) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/user/login", {
        username,
        password,
      });
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const handleRegister = (username, password) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/user/register", {
        username,
        password,
      });
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getDetails = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get("/user/info");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

// TOTP 2FA Functions
export const setupTOTP = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/user/totp/setup");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const verifyTOTPSetup = (token) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/user/totp/verify-setup", {
        token,
      });
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const verifyTOTPLogin = (tempToken, totpToken) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/user/totp/verify-login", {
        temp_token: tempToken,
        totp_token: totpToken,
      });
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const disableTOTP = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/user/totp/disable");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const checkTOTPStatus = () => {
  return new Promise(async function (resolve, reject) {
    try {
      // Try to setup TOTP - if it fails with a specific error, 2FA might already be enabled
      // Alternatively, check user info if it includes 2FA status
      const userData = await axiosInstance.get("/user/info");
      // If backend returns totp_enabled in user info, use that
      // Otherwise, we'll infer from setupTOTP response
      resolve(userData.data);
    } catch (err) {
      reject(err);
    }
  });
};
