import axiosInstance from "..";

export const getAllMoneyTransfers = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get("/money-transfers");
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getMoneyTransferById = (moneyTransferId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get(
        `/money-transfers/${moneyTransferId}`
      );
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const createMoneyTransfer = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.post("/money-transfers", params);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateMoneyTransfer = (moneyTransferId, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.put(
        `/money-transfers/${moneyTransferId}`,
        params
      );
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteMoneyTransfer = (moneyTransferId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.delete(
        `/money-transfers/${moneyTransferId}`
      );
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};
