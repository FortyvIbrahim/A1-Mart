import axiosInstance from "..";

export const getAllEmployeeAllocations = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get("/employee-allocation");
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getEmployeeAllocationById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get(`/employee-allocation/${id}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const createEmployeeAllocation = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.post("/employee-allocation", params);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateEmployeeAllocation = (id, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.put(
        `/employee-allocation/${id}`,
        params
      );
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteEmployeeAllocation = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.delete(`/employee-allocation/${id}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};


