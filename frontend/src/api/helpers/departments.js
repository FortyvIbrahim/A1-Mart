import axiosInstance from "..";

export const getAllDepartmentsByBranchId = (branchId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(
        `/departments/by-branch/${branchId}`
      );
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAllDepartments = (branchId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(`/departments`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};
