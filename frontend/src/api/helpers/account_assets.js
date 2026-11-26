import axiosInstance from "..";

export const getAllAccountAssets = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get("/account-assets");
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAccountAssetById = (accountAssetId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.get(
        `/account-assets/${accountAssetId}`
      );
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const createAccountAsset = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.post("/account-assets", params);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateAccountAsset = (accountAssetId, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.put(
        `/account-assets/${accountAssetId}`,
        params
      );
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteAccountAsset = (accountAssetId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const response = await axiosInstance.delete(
        `/account-assets/${accountAssetId}`
      );
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};
