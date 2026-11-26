import axiosInstance from "..";

export const createRepackItem = (data) =>
  new Promise(function (resolve, reject) {
    axiosInstance
      .post("/repack-item/create", data)
      .then(async (res) => {
        if (res.status === 200) {
          resolve(res.data);
        } else {
          reject(res.data.msg || "Failed to create repack item");
        }
      })
      .catch((err) => {
        reject(err);
      });
  });

export const getRepackItemById = (repackItemId) =>
  new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/repack-item/${repackItemId}`)
      .then(async (res) => {
        if (res.status === 200) {
          resolve(res.data);
        } else {
          reject(res.data.msg || "Failed to fetch repack item");
        }
      })
      .catch((err) => {
        reject(err);
      });
  });

export const getAllRepackItems = (filters = {}) =>
  new Promise(function (resolve, reject) {
    const queryParams = new URLSearchParams();
    if (filters.offset) queryParams.append("offset", filters.offset);
    if (filters.limit) queryParams.append("limit", filters.limit);
    if (filters.item_id) queryParams.append("item_id", filters.item_id);

    const url = `/repack-item/all${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    axiosInstance
      .get(url)
      .then(async (res) => {
        if (res.status === 200) {
          resolve(res.data);
        } else {
          reject(res.data.msg || "Failed to fetch repack items");
        }
      })
      .catch((err) => {
        reject(err);
      });
  });

export const updateRepackItem = (repackItemId, data) =>
  new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/repack-item/${repackItemId}`, data)
      .then(async (res) => {
        if (res.status === 200) {
          resolve(res.data);
        } else {
          reject(res.data.msg || "Failed to update repack item");
        }
      })
      .catch((err) => {
        reject(err);
      });
  });

export const deleteRepackItem = (repackItemId) =>
  new Promise(function (resolve, reject) {
    axiosInstance
      .delete(`/repack-item/${repackItemId}`)
      .then(async (res) => {
        if (res.status === 200) {
          resolve(res.data);
        } else {
          reject(res.data.msg || "Failed to delete repack item");
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
