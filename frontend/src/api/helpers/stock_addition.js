import axiosInstance from "..";

export const getStockAdditions = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/stock-addition?offset=0&limit=1000`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getStockAdditionById = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/stock-addition/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const createStockAddition = (body) =>
  new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/stock-addition`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });

export const updateStockAddition = (id, body) =>
  new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/stock-addition/${id}`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
