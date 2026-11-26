class DeadStockReportUsecase {
  constructor(deadStockReportRepo) {
    this.deadStockReportRepo = deadStockReportRepo;
  }

  create(payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.deadStockReportRepo.create(payload);
        resolve({
          code: 200,
          message: "Dead stock report created successfully",
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
        const data = await this.deadStockReportRepo.getAllReports();
        resolve({
          code: 200,
          message: "Dead stock reports fetched successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(deadStockReportId) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.deadStockReportRepo.getById(deadStockReportId);
        if (!data) {
          resolve({
            code: 404,
            message: "Dead stock report not found",
          });
          return;
        }
        resolve({
          code: 200,
          message: "Dead stock report fetched successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getReportById(date) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.deadStockReportRepo.getLatestReportByDate(date);
        if (!data) {
          resolve({
            code: 404,
            message: "Dead stock report not found",
          });
          return;
        }
        resolve({
          code: 200,
          message:
            "Latest dead stock report on or before date fetched successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(deadStockReportId) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.deadStockReportRepo.getById(deadStockReportId);
        if (!existing) {
          resolve({
            code: 404,
            message: "Dead stock report not found",
          });
          return;
        }

        const result = await this.deadStockReportRepo.delete(deadStockReportId);
        resolve({
          code: 200,
          message: "Dead stock report deleted successfully",
          data: result,
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (deadStockReportRepo) => {
  return new DeadStockReportUsecase(deadStockReportRepo);
};
