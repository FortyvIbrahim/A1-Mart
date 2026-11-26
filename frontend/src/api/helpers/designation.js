import axiosInstance from "..";

export const getAllDesignations = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get("/designations");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getDesignation = (designationId) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(`/designations/${designationId}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateDesignation = (designationId, data) => {
  return new Promise(async function (resolve, reject) {
    try {
      const res = await axiosInstance.put(
        `/designations/${designationId}`,
        data
      );
      resolve(res.data);
    } catch (err) {
      reject(err);
    }
  });
};
