import axiosInstance from "..";

export const getIncentiveCommon = (filters = {}) => {
  return new Promise(function (resolve, reject) {
    // Build query string with filters
    let url = `/incentive-common`;
    const queryParams = [];

    if (filters.type) {
      queryParams.push(`type=${encodeURIComponent(filters.type)}`);
    }

    if (filters.month) {
      queryParams.push(`month=${filters.month}`);
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join("&")}`;
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

export const getIncentiveCommonById = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/incentive-common/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const createIncentiveCommon = (body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/incentive-common`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const updateIncentiveCommon = (id, body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/incentive-common/${id}`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const deleteIncentiveCommon = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .delete(`/incentive-common/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getIncentiveCommonByTypeAndMonth = (type, month, clusterSize) => {
  return new Promise(function (resolve, reject) {
    // Build query string manually to handle null month properly
    let url = `/incentive-common?type=${encodeURIComponent(type)}`;

    // If month is provided, add it to the query
    // If month is null, explicitly send null to find entries with null month
    if (month !== undefined) {
      url += `&month=${month}`;
    }

    if (clusterSize != null && clusterSize !== "") {
      url += `&cluster_size=${encodeURIComponent(clusterSize)}`;
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
