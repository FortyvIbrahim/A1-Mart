import axiosInstance from "..";

export const createAccountSheet = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/accounts-sheet", params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateAccountSheet = (id, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.put(`/accounts-sheet/${id}`, params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteAccountSheet = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.delete(`/accounts-sheet/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * @param {{ from_date?: string; to_date?: string }} [filters] - Optional inclusive bounds on `accounts_sheet.date` (YYYY-MM-DD).
 */
export const getAllAccountSheet = (filters = {}) => {
  return new Promise(async function (resolve, reject) {
    try {
      const params = {};
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      const data = await axiosInstance.get("/accounts-sheet", { params });
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAccountSheetById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(`/accounts-sheet/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};
