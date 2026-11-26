import axiosInstance from "..";

export const getPurchaseEntries = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/purchase-entry`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getPurchaseEntryById = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/purchase-entry/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const createPurchaseEntry = (body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/purchase-entry`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const updatePurchaseEntry = (id, body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/purchase-entry/${id}`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const deletePurchaseEntry = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .delete(`/purchase-entry/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

