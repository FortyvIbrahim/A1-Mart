class OutstandingReportUsecase {
  constructor(outstandingReportRepo) {
    this.outstandingReportRepo = outstandingReportRepo;
  }

  create(payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.outstandingReportRepo.create(payload);
        resolve({
          code: 200,
          message: "Outstanding report created successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  createHeader(payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const outstanding_report_id =
          await this.outstandingReportRepo.createReportHeader(payload);
        resolve({
          code: 200,
          message: "Outstanding report header created successfully",
          data: {
            outstanding_report_id,
            report_name: payload.report_name,
            date: payload.date,
            created_by: payload.created_by,
            invoice_count: 0,
          },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  appendInvoices(outstandingReportId, invoices) {
    return new Promise(async (resolve, reject) => {
      try {
        const exists = await this.outstandingReportRepo.reportExists(
          outstandingReportId
        );
        if (!exists) {
          resolve({
            code: 404,
            message: "Outstanding report not found",
          });
          return;
        }
        const data = await this.outstandingReportRepo.appendInvoices(
          outstandingReportId,
          invoices
        );
        resolve({
          code: 200,
          message: "Outstanding invoices appended successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAllReports() {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.outstandingReportRepo.getAllReports();
        resolve({
          code: 200,
          message: "Outstanding reports fetched successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(outstandingReportId, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.outstandingReportRepo.getById(
          outstandingReportId,
          options
        );
        if (!data) {
          resolve({
            code: 404,
            message: "Outstanding report not found",
          });
          return;
        }
        resolve({
          code: 200,
          message: "Outstanding report fetched successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getReportById(date, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.outstandingReportRepo.getLatestReportByDate(
          date,
          options
        );
        if (!data) {
          resolve({
            code: 404,
            message: "Outstanding report not found",
          });
          return;
        }
        resolve({
          code: 200,
          message:
            "Latest outstanding report on or before date fetched successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getLatestInvoicesPage(date, limit, offset) {
    return new Promise(async (resolve, reject) => {
      try {
        const data =
          await this.outstandingReportRepo.getLatestInvoicesPageByDate(
            date,
            limit,
            offset
          );
        if (!data) {
          resolve({
            code: 404,
            message: "Outstanding report not found",
          });
          return;
        }
        resolve({
          code: 200,
          message: "Outstanding report invoices fetched successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(outstandingReportId) {
    return new Promise(async (resolve, reject) => {
      try {
        const exists = await this.outstandingReportRepo.reportExists(
          outstandingReportId
        );
        if (!exists) {
          resolve({
            code: 404,
            message: "Outstanding report not found",
          });
          return;
        }

        const result = await this.outstandingReportRepo.delete(
          outstandingReportId
        );
        resolve({
          code: 200,
          message: "Outstanding report deleted successfully",
          data: result,
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (outstandingReportRepo) => {
  return new OutstandingReportUsecase(outstandingReportRepo);
};
