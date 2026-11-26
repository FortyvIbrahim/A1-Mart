import axiosInstance from "..";
import moment from "moment";

export const getTargetEmployees = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/target-employee`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const createTargetEmployee = (body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/target-employee`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getTargetEmployeeById = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/target-employee/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getUserTarget = (date = new Date()) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(
        `/target-employee/user-target${
          date ? `/${moment(date).format("YYYY-MM-DD")}` : ""
        }`
      )
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const updateTargetEmployee = (id, body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/target-employee/${id}`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const deleteTargetEmployee = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .delete(`/target-employee/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
