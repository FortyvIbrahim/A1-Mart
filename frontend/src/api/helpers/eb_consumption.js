import axiosInstance from "..";

export const createEBConsumption = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/eb-consumption", params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAllEBConsumption = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get("/eb-consumption");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getEBConsumptionById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(`/eb-consumption/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteEBConsumption = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.delete(`/eb-consumption/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};
