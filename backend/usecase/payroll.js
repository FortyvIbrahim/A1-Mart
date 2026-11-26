class PayrollUsecase {
  constructor(payrollRepo) {
    this.payrollRepo = payrollRepo;
    this.pdfService = null;
  }

  setPdfService(pdfService) {
    this.pdfService = pdfService;
  }

  create(data) {
    return new Promise(async (resolve, reject) => {
      try {
        // Enforce single payroll per month/year
        if (!data || !data.payroll_month) {
          resolve({
            code: 400,
            error_code: "PAYROLL_MONTH_REQUIRED",
            message: "payroll_month is required",
          });
          return;
        }

        const existingForMonth = await this.payrollRepo.getPayrollByMonth(
          data.payroll_month
        );
        if (existingForMonth) {
          resolve({
            code: 400,
            error_code: "PAYROLL_DUPLICATE_MONTH",
            message: "Payroll already exists for this month/year",
          });
          return;
        }

        const payroll_id = await this.payrollRepo.createPayroll(
          data?.payroll_month || null,
          data?.employees || [],
          data?.is_approved ?? false
        );
        resolve({
          code: 200,
          message: "Payroll created successfully",
          data: { payroll_id },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll() {
    return new Promise(async (resolve, reject) => {
      try {
        const rows = await this.payrollRepo.getAllPayrolls();
        resolve({
          code: 200,
          message: "Payroll list retrieved successfully",
          data: rows,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const payroll = await this.payrollRepo.getPayrollById(id);
        if (!payroll) {
          resolve({
            code: 404,
            message: "Payroll not found",
          });
          return;
        }
        resolve({
          code: 200,
          message: "Payroll retrieved successfully",
          data: payroll,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getMyPayrollDetails(employee_code) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!employee_code) {
          resolve({
            code: 403,
            message: "Unauthorized: employee context required",
          });
          return;
        }
        const rows = await this.payrollRepo.getPayrollEmployeesByEmployeeCode(
          employee_code
        );
        resolve({
          code: 200,
          message: "Payroll details retrieved successfully",
          data: rows,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAllPayslips() {
    return new Promise(async (resolve, reject) => {
      try {
        const rows = await this.payrollRepo.getAllPayrollEmployeesPayslips();
        resolve({
          code: 200,
          message: "Payslips retrieved successfully",
          data: rows,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Prepare payslip data for given (employee_code, selected_month) pairs.
   * Fetches full payslip data and stores in payroll_generated_payslip. Does not generate PDF.
   */
  preparePayslips(items) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!Array.isArray(items) || items.length === 0) {
          resolve({
            code: 400,
            message: "items array with employee_code and selected_month is required",
          });
          return;
        }
        const results = [];
        for (const item of items) {
          const { employee_code, selected_month } = item;
          if (!employee_code || selected_month == null) {
            results.push({ employee_code: employee_code ?? null, selected_month: selected_month ?? null, success: false, error: "employee_code and selected_month required" });
            continue;
          }
          const peRef = await this.payrollRepo.getPayrollEmployeeByEmployeeCodeAndMonth(employee_code, selected_month);
          if (!peRef) {
            results.push({ employee_code, selected_month, success: false, error: "Payroll employee not found for this month" });
            continue;
          }
          const { payroll_employee_id, payroll_id } = peRef;
          const payslipData = await this.payrollRepo.getPayrollEmployeeById(payroll_employee_id);
          if (!payslipData) {
            results.push({ employee_code, selected_month, payroll_employee_id, success: false, error: "Payroll employee data not found" });
            continue;
          }
          const { payroll_generated_payslip_id } = await this.payrollRepo.createPayrollGeneratedPayslip(
            payroll_id,
            employee_code,
            selected_month,
            payslipData
          );
          results.push({
            employee_code,
            selected_month,
            payroll_employee_id,
            payroll_id,
            payroll_generated_payslip_id,
            success: true,
          });
        }
        resolve({
          code: 200,
          message: "Payslip data prepared",
          data: { items: results },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  generatePayslip(payroll_employee_id) {
    return new Promise(async (resolve, reject) => {
      try {
        const generatedRow = await this.payrollRepo.getLatestPayrollGeneratedPayslipByPayrollEmployeeId(payroll_employee_id);
        if (!generatedRow) {
          resolve({
            code: 400,
            message: "No payslip data found for this payroll employee. Call the prepare endpoint first.",
          });
          return;
        }
        const data = generatedRow.payslip_data;
        if (!data) {
          resolve({
            code: 400,
            message: "Payslip data is empty",
          });
          return;
        }
        if (generatedRow.payslip_url) {
          resolve({
            code: 200,
            message: "Payslip already generated",
            data: { payslip_url: generatedRow.payslip_url },
          });
          return;
        }
        if (!this.pdfService) {
          resolve({
            code: 503,
            message: "PDF service not available",
          });
          return;
        }
        const payslip_url = await this.pdfService.generatePayslipPDF(data);
        await this.payrollRepo.updatePayrollGeneratedPayslipUrl(generatedRow.payroll_generated_payslip_id, payslip_url);
        resolve({
          code: 200,
          message: "Payslip generated successfully",
          data: { payslip_url },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  update(id, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.payrollRepo.getPayrollById(id);
        if (!existing) {
          resolve({
            code: 404,
            message: "Payroll not found",
          });
          return;
        }

        // If month is changing, ensure no other payroll exists for that month
        if (data && data.payroll_month) {
          const existingForMonth = await this.payrollRepo.getPayrollByMonth(
            data.payroll_month
          );
          if (existingForMonth && existingForMonth.payroll_id !== id) {
            resolve({
              code: 400,
              error_code: "PAYROLL_DUPLICATE_MONTH",
              message: "Payroll already exists for this month/year",
            });
            return;
          }
        }

        const result = await this.payrollRepo.updatePayroll(
          id,
          data?.employees,
          data?.payroll_month,
          data?.is_approved
        );
        resolve({
          code: 200,
          message: "Payroll updated successfully",
          data: { payroll_id: id, affectedRows: result.affectedRows },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.payrollRepo.getPayrollById(id);
        if (!existing) {
          resolve({
            code: 404,
            message: "Payroll not found",
          });
          return;
        }

        const result = await this.payrollRepo.deletePayroll(id);
        resolve({
          code: 200,
          message: "Payroll deleted successfully",
          data: { payroll_id: id, affectedRows: result.affectedRows },
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (payrollRepo) => {
  return new PayrollUsecase(payrollRepo);
};

