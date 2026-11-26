import axiosInstance from "..";

export const getIncentiveStickering = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/incentive-stickering`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getIncentiveStickeringById = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/incentive-stickering/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const createIncentiveStickering = (body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/incentive-stickering`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const updateIncentiveStickering = (id, body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/incentive-stickering/${id}`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const deleteIncentiveStickering = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .delete(`/incentive-stickering/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getIncentiveStickeringByMaterialTypeAndMonth = (materialType, month) => {
  return new Promise(function (resolve, reject) {
    // Build query string manually to handle null month properly
    let url = `/incentive-stickering?material_type=${materialType}`;

    // If month is provided, add it to the query
    // If month is null, explicitly send null to find entries with null month
    if (month !== null && month !== undefined) {
      url += `&month=${month}`;
    }

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
