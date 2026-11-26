import axiosInstance from "..";

/**
 * @param {{ from?: string; to?: string }} [filters] - Optional `from` / `to` (YYYY-MM-DD) for server-side date filter on `created_at`.
 */
export const getAllPurchaseAcknowledgments = (filters = {}) => {
  return new Promise(async function (resolve, reject) {
    try {
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const data = await axiosInstance.get("/purchase-acknowledgment", {
        params,
      });
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getPurchaseAcknowledgmentById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(`/purchase-acknowledgment/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const createPurchaseAcknowledgment = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/purchase-acknowledgment", params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updatePurchaseAcknowledgment = (id, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.put(`/purchase-acknowledgment/${id}`, params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deletePurchaseAcknowledgment = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.delete(`/purchase-acknowledgment/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getPurchaseEntriesByProductId = (productId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(
        `/purchase-acknowledgment/by-product/${productId}`
      );
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

