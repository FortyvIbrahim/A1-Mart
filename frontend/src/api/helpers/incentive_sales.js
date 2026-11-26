import axiosInstance from "..";

export const getIncentiveSales = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/incentive-sales`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getIncentiveSalesById = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/incentive-sales/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const createIncentiveSales = (body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/incentive-sales`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const updateIncentiveSales = (id, body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/incentive-sales/${id}`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const deleteIncentiveSales = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .delete(`/incentive-sales/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getIncentiveSalesByClusterTypeAndMonth = (clusterType, month) => {
  return new Promise(function (resolve, reject) {
    // Build query string manually to handle null month properly
    let url = `/incentive-sales?cluster_type=${clusterType}`;

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
