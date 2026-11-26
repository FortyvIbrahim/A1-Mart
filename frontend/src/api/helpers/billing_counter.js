import axiosInstance from "..";

export const getAllBillingCounters = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get("/billing-counter");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getBillingCounterById = (counterId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(`/billing-counter/${counterId}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getBillingCountersByBranch = (branchId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(
        `/billing-counter/branch/${branchId}`
      );
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const createBillingCounter = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/billing-counter", params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateBillingCounter = (counterId, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.put(
        `/billing-counter/${counterId}`,
        params
      );
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteBillingCounter = (counterId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.delete(`/billing-counter/${counterId}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};
