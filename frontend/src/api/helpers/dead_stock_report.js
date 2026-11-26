import axiosInstance from "..";

export const getDeadStockReports = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.get("/dead-stock-report/");
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

export const createDeadStockReport = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.post("/dead-stock-report/", payload);
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

export const deleteDeadStockReport = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.delete(`/dead-stock-report/${id}`);
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

export const getLatestDeadStockReportByDate = (date) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.get("/dead-stock-report/latest", {
        params: { date },
      });
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};
