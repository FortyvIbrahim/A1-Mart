import axiosInstance from "..";

export const getMaterials = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/materials?offset=0&limit=1000`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getMaterialsWithRate = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/materials/with-latest-rate?offset=0&limit=1000`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getMaterialById = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/materials/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getMaterialCategories = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/materials/categories?offset=0&limit=1000`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getMaterialCategoryById = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/materials/categories/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const createMaterial = (body) =>
  new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/materials`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });

export const updateMaterial = (id, body) =>
  new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/materials/${id}`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });

export const createMaterialCategory = (body) =>
  new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/materials/categories`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });

export const updateMaterialCategory = (id, body) =>
  new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/materials/categories/${id}`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
