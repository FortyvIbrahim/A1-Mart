import axiosInstance from "..";

export const getAllCleaningPacking = (filters = {}) => {
  return new Promise(function (resolve, reject) {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      queryParams.append(key, filters[key]);
    });

    const url = `/cleaning-packing${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    axiosInstance
      .get(url)
      .then(async (res) => {
        if (res.status === 200) {
          resolve(res.data);
        } else {
          reject(res.data.msg || "Failed to fetch cleaning packing list");
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getAllCleaningPackingAsPDF = (data) => {
  return new Promise(function (resolve, reject) {
    const url = `/cleaning-packing/pdf`;

    axiosInstance
      .post(url, data)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const syncCleaningPacking = () => {
  return new Promise(function (resolve, reject) {
    const url = `/cleaning-packing/sync`;

    axiosInstance
      .post(url)
      .then(async (res) => {
        if (res.status === 200) {
          resolve(res.data);
        } else {
          reject(res.data.msg || "Failed to sync");
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};
