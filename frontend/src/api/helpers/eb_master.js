import axiosInstance from "..";

export const getAllMasterList = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(`/master-list`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getMasterListById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(`/master-list/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const createMasterList = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/master-list", params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const bulkCreateMasterList = (items) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/master-list/bulk", items);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const assignMasterListBuyersIfEmpty = (assignments) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post(
        "/master-list/assign-buyers-if-empty",
        assignments
      );
      resolve(data.data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

export const assignMasterListBuyersAdd = (assignments) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post(
        "/master-list/assign-buyers-add",
        assignments
      );
      resolve(data.data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

export const updateMasterList = (id, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.put(`/master-list/${id}`, params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteMasterList = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.delete(`/master-list/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};
