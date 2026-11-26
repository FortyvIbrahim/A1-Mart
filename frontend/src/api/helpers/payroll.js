import axiosInstance from "..";

// Get all payroll headers with summary info
export const getPayrolls = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/payroll`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// Get my payroll headers with summary info
export const getMyPayrolls = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/payroll/me`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// Get my payroll headers with summary info
export const getPayslips = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/payroll/payslips`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// Get a single payroll with employees by ID
export const getPayrollById = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/payroll/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// Create a new payroll with employees
export const createPayroll = (body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/payroll`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const generatePayslip = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/payroll/payslips/generate-payslip`, { payroll_employee_id: id })
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

/**
 * Prepare payslip data for selected employees and month.
 * For each item, finds payroll + payroll_employee, loads payslip payload and inserts into payroll_generated_payslip (no PDF).
 * Body: { items: [ { employee_code: string, selected_month: date }, ... ] }
 * Response: { code: 200, data: { items: [ { employee_code, selected_month, payroll_employee_id, payroll_generated_payslip_id, success: true } | { ..., success: false, error } ] } }
 */
export const preparePayslipData = (body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/payroll/payslips/prepare`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// Update payroll header and/or employees
export const updatePayroll = (id, body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/payroll/${id}`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// Delete payroll (header + employees via cascade)
export const deletePayroll = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .delete(`/payroll/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

