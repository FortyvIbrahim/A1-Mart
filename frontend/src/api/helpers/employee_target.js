import axiosInstance from "..";

export const createTargetEntry = (body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/employee-sales`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getAllTargetEntry = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get("/employee-sales");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getTargetEntryById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await axiosInstance.get(`/employee-sales/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};
