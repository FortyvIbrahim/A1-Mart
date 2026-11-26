import axiosInstance from "..";

export const getTargetBranches = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/target-branch`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const createTargetBranch = (body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/target-branch`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getTargetBranchById = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/target-branch/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const updateTargetBranch = (id, body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/target-branch/${id}`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const deleteTargetBranch = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .delete(`/target-branch/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
