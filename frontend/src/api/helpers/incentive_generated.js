import axiosInstance from "..";

const BASE_PATH = "/incentive-generated";

export const getIncentiveGeneratedList = () => {
  return new Promise((resolve, reject) => {
    axiosInstance
      .get(BASE_PATH)
      .then((res) => resolve(res.data))
      .catch((err) => reject(err));
  });
};

export const getIncentiveGeneratedById = (id) => {
  return new Promise((resolve, reject) => {
    axiosInstance
      .get(`${BASE_PATH}/${id}`)
      .then((res) => resolve(res.data))
      .catch((err) => reject(err));
  });
};

export const createIncentiveGenerated = (body) => {
  return new Promise((resolve, reject) => {
    axiosInstance
      .post(BASE_PATH, body)
      .then((res) => resolve(res.data))
      .catch((err) => reject(err));
  });
};

export const updateIncentiveGenerated = (id, body) => {
  return new Promise((resolve, reject) => {
    axiosInstance
      .put(`${BASE_PATH}/${id}`, body)
      .then((res) => resolve(res.data))
      .catch((err) => reject(err));
  });
};

export const deleteIncentiveGenerated = (id) => {
  return new Promise((resolve, reject) => {
    axiosInstance
      .delete(`${BASE_PATH}/${id}`)
      .then((res) => resolve(res.data))
      .catch((err) => reject(err));
  });
};

export const upsertIncentiveGeneratedItems = (id, items) => {
  return new Promise((resolve, reject) => {
    axiosInstance
      .post(`${BASE_PATH}/${id}/items`, items)
      .then((res) => resolve(res.data))
      .catch((err) => reject(err));
  });
};

export const deleteIncentiveGeneratedItem = (id, employeeCode) => {
  return new Promise((resolve, reject) => {
    axiosInstance
      .delete(`${BASE_PATH}/${id}/items/${encodeURIComponent(employeeCode)}`)
      .then((res) => resolve(res.data))
      .catch((err) => reject(err));
  });
};
