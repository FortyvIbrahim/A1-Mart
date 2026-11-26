import axiosInstance from "..";

export const createAccountsPreloadData = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/accounts-preload-data", params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const bulkCreateAccountsPreloadData = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/accounts-preload-data/bulk", params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAllAccountsPreloadData = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get("/accounts-preload-data");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAccountsPreloadDataById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(`/accounts-preload-data/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateAccountsPreloadData = (id, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.put(`/accounts-preload-data/${id}`, params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteAccountsPreloadData = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.delete(`/accounts-preload-data/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteAccountsPreloadDataByDate = (date) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.delete("/accounts-preload-data/by-date", {
        data: { date },
      });
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};
