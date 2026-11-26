import axiosInstance from "..";

export const getStockCircles = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/stock-circles`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getStockCircleById = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/stock-circles/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const createStockCircle = (body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/stock-circles`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const updateStockCircle = (id, body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/stock-circles/${id}`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const deleteStockCircle = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .delete(`/stock-circles/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
