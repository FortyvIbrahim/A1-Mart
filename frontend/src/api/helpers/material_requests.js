import axiosInstance from "..";

export const getMaterialRequests = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/material-request`)
      .then(async (res) => {
        resolve(res);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const createMaterialRequests = (body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/material-request`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getMaterialRequestById = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/material-request/${id}`)
      .then(async (res) => {
        resolve(res);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const updateMaterialRequest = (id, body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/material-request/${id}`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const deleteMaterialRequest = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .delete(`/material-request/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
