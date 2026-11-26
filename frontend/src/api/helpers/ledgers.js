import axiosInstance from "..";

export const getAllLedgers = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get("/ledgers");
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getLedgerById = (ledgerId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get(`/ledgers/${ledgerId}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const createLedger = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.post("/ledgers", params);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateLedger = (ledgerId, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.put(`/ledgers/${ledgerId}`, params);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteLedger = (ledgerId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.delete(`/ledgers/${ledgerId}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

