class IncentiveSalesUsecase {
  constructor(incentiveSalesRepo) {
    this.incentiveSalesRepo = incentiveSalesRepo;
  }

  create(incentiveData) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check for duplicate
        const isDuplicate = await this.incentiveSalesRepo.checkDuplicate(
          incentiveData.cluster_type,
          incentiveData.selected_month || null
        );

        if (isDuplicate) {
          resolve({
            code: 400,
            error_code: "INCENTIVE_SALES_DUPLICATE",
            message:
              "A record already exists for this cluster type and selected month",
          });
          return;
        }

        const incentiveId =
          await this.incentiveSalesRepo.create(incentiveData);

        resolve({
          code: 200,
          message: "Incentive sales created successfully",
          data: { incentive_sales_id: incentiveId },
        });
      } catch (err) {
        // Handle duplicate entry error (MySQL unique constraint)
        if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
          resolve({
            code: 400,
            error_code: "INCENTIVE_SALES_DUPLICATE",
            message:
              "A record already exists for this cluster type and selected month",
          });
          return;
        }
        reject(err);
      }
    });
  }

  getAll(cluster_type = null, month = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.incentiveSalesRepo.getAll(
          cluster_type,
          month
        );
        resolve({
          code: 200,
          message: "Incentive sales records retrieved successfully",
          data: result,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const incentive = await this.incentiveSalesRepo.getById(id);
        if (incentive) {
          resolve({
            code: 200,
            message: "Incentive sales retrieved successfully",
            data: incentive,
          });
        } else {
          resolve({
            code: 404,
            message: "Incentive sales not found",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  update(id, incentiveData) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if incentive exists first
        const existingIncentive =
          await this.incentiveSalesRepo.getById(id);
        if (!existingIncentive) {
          resolve({
            code: 404,
            message: "Incentive sales not found",
          });
          return;
        }

        // Determine cluster_type and selected_month for duplicate check
        const cluster_type =
          incentiveData.cluster_type !== undefined
            ? incentiveData.cluster_type
            : existingIncentive.cluster_type;
        const selected_month =
          incentiveData.selected_month !== undefined
            ? incentiveData.selected_month || null
            : existingIncentive.selected_month;

        // Check for duplicate (excluding current record)
        const isDuplicate = await this.incentiveSalesRepo.checkDuplicate(
          cluster_type,
          selected_month,
          id
        );

        if (isDuplicate) {
          resolve({
            code: 400,
            error_code: "INCENTIVE_SALES_DUPLICATE",
            message:
              "A record already exists for this cluster type and selected month",
          });
          return;
        }

        await this.incentiveSalesRepo.update(id, incentiveData);
        resolve({
          code: 200,
          message: "Incentive sales updated successfully",
          data: { incentive_sales_id: id },
        });
      } catch (err) {
        // Handle duplicate entry error (MySQL unique constraint)
        if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
          resolve({
            code: 400,
            error_code: "INCENTIVE_SALES_DUPLICATE",
            message:
              "A record already exists for this cluster type and selected month",
          });
          return;
        }
        reject(err);
      }
    });
  }

  delete(id) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if incentive exists first
        const existingIncentive =
          await this.incentiveSalesRepo.getById(id);
        if (!existingIncentive) {
          resolve({
            code: 404,
            message: "Incentive sales not found",
          });
          return;
        }

        await this.incentiveSalesRepo.delete(id);
        resolve({
          code: 200,
          message: "Incentive sales deleted successfully",
          data: { incentive_sales_id: id },
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (incentiveSalesRepo) => {
  return new IncentiveSalesUsecase(incentiveSalesRepo);
};
