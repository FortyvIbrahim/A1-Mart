import axiosInstance from "..";

export const getAllGRNs = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get("/grn");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getGRNById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(`/grn/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getGRNByPurchaseAcknowledgmentId = (purchaseAckId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(
        `/grn/purchase-acknowledgment/${purchaseAckId}`
      );
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const createGRN = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/grn", params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateGRN = (id, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.put(`/grn/${id}`, params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteGRN = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.delete(`/grn/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

