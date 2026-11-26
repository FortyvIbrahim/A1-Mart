import axiosInstance from "..";

/**
 * List attendance records with optional filters.
 * @param {Object} params
 * @param {string} [params.employee_code] - Filter by employee code
 * @param {string} [params.from_date] - ISO date or YYYY-MM-DD (clock_date_time >= from_date)
 * @param {string} [params.to_date]   - ISO date or YYYY-MM-DD (clock_date_time <= to_date)
 * @returns {Promise<{ code: number, data: Array }>}
 */
export const getAttendanceList = (params = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const query = new URLSearchParams();
      if (params.employee_code) query.set("employee_code", params.employee_code);
      if (params.from_date) query.set("from_date", params.from_date);
      if (params.to_date) query.set("to_date", params.to_date);
      const url = `/employee-attendance${query.toString() ? `?${query.toString()}` : ""}`;
      const res = await axiosInstance.get(url);
      resolve(res.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getProcessedAttendanceList = (params = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const query = new URLSearchParams();
      if (params.employee_code) query.set("employee_code", params.employee_code);
      if (params.from_date) query.set("from_date", params.from_date);
      if (params.to_date) query.set("to_date", params.to_date);
      const url = `/employee-attendance/processed${
        query.toString() ? `?${query.toString()}` : ""
      }`;
      const res = await axiosInstance.get(url);
      resolve(res.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAttendanceById = (attendanceId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await axiosInstance.get(`/employee-attendance/${attendanceId}`);
      resolve(res.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const syncAttendance = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await axiosInstance.post(`/employee-attendance/sync`);
      resolve(res.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const createAttendance = (body) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await axiosInstance.post("/employee-attendance", body);
      resolve(res.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateAttendance = (attendanceId, body) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await axiosInstance.put(`/employee-attendance/${attendanceId}`, body);
      resolve(res.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteAttendance = (attendanceId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await axiosInstance.delete(`/employee-attendance/${attendanceId}`);
      resolve(res.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const bulkCreateAttendance = (rows) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await axiosInstance.post("/employee-attendance/bulk", { rows });
      resolve(res.data);
    } catch (err) {
      reject(err);
    }
  });
};
