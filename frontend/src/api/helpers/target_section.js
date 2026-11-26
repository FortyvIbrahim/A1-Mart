import axiosInstance from "..";

export const getTargetSections = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/target-section`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const createTargetSection = (body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/target-section`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getTargetSectionById = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/target-section/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const updateTargetSection = (id, body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/target-section/${id}`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const deleteTargetSection = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .delete(`/target-section/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
