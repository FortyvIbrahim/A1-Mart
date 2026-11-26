import axiosInstance from "..";

export const getTargetDepartments = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/target-department`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const createTargetDepartment = (body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/target-department`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getTargetDepartmentById = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/target-department/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const updateTargetDepartment = (id, body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/target-department/${id}`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const deleteTargetDepartment = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .delete(`/target-department/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
