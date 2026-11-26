import axiosInstance from "..";

export const getPurchaseOrders = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/purchase-order`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getPurchaseOrderById = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/purchase-order/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const createPurchaseOrder = (body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/purchase-order`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const updatePurchaseOrder = (id, body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/purchase-order/${id}`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const deletePurchaseOrder = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .delete(`/purchase-order/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
