import axiosInstance from "..";

const BASE = "/purchase-returns";

export const createPurchaseReturn = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.post(BASE, params);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updatePurchaseReturn = (id, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.put(`${BASE}/${id}`, params);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deletePurchaseReturn = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.delete(`${BASE}/${id}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAllPurchaseReturns = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get(BASE, { params });
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getPurchaseReturnById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get(`${BASE}/${id}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

// --- Delivered (items delivered) ---

export const createDelivered = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.post(`${BASE}/delivered`, params);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getDeliveredById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get(`${BASE}/delivered/${id}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateDelivered = (id, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.put(`${BASE}/delivered/${id}`, params);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteDelivered = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.delete(`${BASE}/delivered/${id}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};
