import axiosInstance from "..";

// Create single stickering record
export const createStickeringEntry = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/stickering", params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

// Bulk create stickering records
export const bulkCreateStickeringEntries = (items) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/stickering/bulk", items);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

// Update stickering record
export const updateStickeringEntry = (id, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.put(`/stickering/${id}`, params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

// Get stickering record by ID
export const getStickeringById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(`/stickering/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * @param {{ from?: string; to?: string }} [filters] - Optional `from` / `to` (YYYY-MM-DD); server filters on joined PA `created_at`.
 */
export const getAllStickeringEntries = (filters = {}) => {
  return new Promise(async function (resolve, reject) {
    try {
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const data = await axiosInstance.get("/stickering", { params });
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAllStickeringEntriesByPurchaseAcknowledgment = (purchaseAckId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(`/stickering/purchase-ack/${purchaseAckId}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

// Get stickering records assigned to current logged-in employee
export const getMyStickeringEntries = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get("/stickering/mine");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getMySupervisorEntries = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get("/stickering/supervisor");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

// Delete stickering record
export const deleteStickeringEntry = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.delete(`/stickering/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};
