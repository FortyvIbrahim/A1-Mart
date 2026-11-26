import axiosInstance from "..";

export const getStockCirclesChecked = (stock_circle_id = null) => {
  return new Promise(function (resolve, reject) {
    const url = stock_circle_id
      ? `/stock-circle-checked?stock_circle_id=${stock_circle_id}`
      : `/stock-circle-checked`;
    axiosInstance
      .get(url)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getStockCircleCheckedById = (stock_circle_id, product_id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/stock-circle-checked/${stock_circle_id}/${product_id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const createStockCircleChecked = (body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/stock-circle-checked`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const createStockCircleCheckedBulk = (body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/stock-circle-checked/bulk`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const updateStockCircleChecked = (stock_circle_id, product_id, body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/stock-circle-checked/${stock_circle_id}/${product_id}`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const deleteStockCircleChecked = (stock_circle_id, product_id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .delete(`/stock-circle-checked/${stock_circle_id}/${product_id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
