import axiosInstance from "..";

export const createPayment = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.post("/payments", params);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updatePayment = (paymentId, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.put(`/payments/${paymentId}`, params);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deletePayment = (paymentId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.delete(`/payments/${paymentId}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAllPayments = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get("/payments", { params });
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getPaymentById = (paymentId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get(`/payments/${paymentId}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAllPaymentItems = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get("/payments/items", {
        params,
      });
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

