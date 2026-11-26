import axiosInstance from "..";

export const getAllBranches = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get("/branches");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const createBranch = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.post("/branches", params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateBranch = (branchId, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.put(`/branches/${branchId}`, params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getBranchById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(`/branches/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};
