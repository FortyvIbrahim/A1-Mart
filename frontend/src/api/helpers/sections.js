import axiosInstance from "..";

export const getAllSectionsByDepartmentId = (branchId, departmentId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(
        `/employee-sections/by-branch/${branchId}/${departmentId}`
      );
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAllSections = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(`/employee-sections`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};
