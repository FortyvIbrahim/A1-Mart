import axiosInstance from "..";

export const getAllTransports = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get("/transports");
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getTransportById = (transportId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get(`/transports/${transportId}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const createTransport = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.post("/transports", params);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateTransport = (transportId, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.put(`/transports/${transportId}`, params);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteTransport = (transportId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.delete(`/transports/${transportId}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const bulkInsertTransports = (payload) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.post("/transports/bulk", payload);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};
