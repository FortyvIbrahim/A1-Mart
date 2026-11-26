import axiosInstance from "..";

export const getAllWMSPurchaseEntries = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get("/wms-purchase-entry");
      resolve(data.data);
    } catch (err) {
      reject(err.response?.data || err);
    }
  });
};

export const getWMSPurchaseEntryById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(`/wms-purchase-entry/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err.response?.data || err);
    }
  });
};

export const createWMSPurchaseEntry = (body) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/wms-purchase-entry", body);
      resolve(data.data);
    } catch (err) {
      reject(err.response?.data || err);
    }
  });
};

export const updateWMSPurchaseEntry = (id, body) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.put(`/wms-purchase-entry/${id}`, body);
      resolve(data.data);
    } catch (err) {
      reject(err.response?.data || err);
    }
  });
};

export const deleteWMSPurchaseEntry = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.delete(`/wms-purchase-entry/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err.response?.data || err);
    }
  });
};
