import axiosInstance from "..";

export const getAllEmployees = (allBranches = false) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(
        `/employees?all_branches=${allBranches}`
      );
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAllEmployeesByDepartmentId = (
  branchId,
  departmentId,
  sectionId
) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(
        `/employees/by-branch/${branchId}/${departmentId}/${sectionId}`
      );
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getEmployeeByCode = (employeeCode) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(`/employees/${employeeCode}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const syncEmployees = () => {
  return new Promise(function (resolve, reject) {
    const url = `/employees/sync`;

    axiosInstance
      .post(url)
      .then(async (res) => {
        if (res.status === 200) {
          resolve(res.data);
        } else {
          reject(res.data.msg || "Failed to sync employees");
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const removeTOTP = (employeeCode) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.delete(`/user/totp/${employeeCode}`);
      resolve(data.data);
    } catch (err) {
      reject(err.response?.data || err);
    }
  });
};

export const removeEmployeeLogin = (employeeCode) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.delete(`/user/employee/${employeeCode}`);
      resolve(data.data);
    } catch (err) {
      reject(err.response?.data || err);
    }
  });
};

export const updateEmployee = (employeeCode, body) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.put(`/employees/${employeeCode}`, body);
      resolve(data.data);
    } catch (err) {
      reject(err.response?.data || err);
    }
  });
};
