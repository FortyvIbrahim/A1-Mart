import axiosInstance from "..";

export const createReceipt = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.post("/receipts", params);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateReceipt = (receiptId, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.put(`/receipts/${receiptId}`, params);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteReceipt = (receiptId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.delete(`/receipts/${receiptId}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAllReceipts = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get("/receipts", { params });
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getReceiptById = (receiptId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get(`/receipts/${receiptId}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAllReceiptItems = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get("/receipts/items", {
        params,
      });
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

