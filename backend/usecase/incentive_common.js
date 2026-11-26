class IncentiveCommonUsecase {
  constructor(incentiveCommonRepo) {
    this.incentiveCommonRepo = incentiveCommonRepo;
  }

  create(incentiveData) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check for duplicate (type, selected_month, cluster_size)
        const isDuplicate = await this.incentiveCommonRepo.checkDuplicate(
          incentiveData.type,
          incentiveData.selected_month || null,
          incentiveData.cluster_size ?? null
        );

        if (isDuplicate) {
          resolve({
            code: 400,
            error_code: "INCENTIVE_COMMON_DUPLICATE",
            message:
              "A record already exists for this type, selected month and cluster size",
          });
          return;
        }

        const incentiveId =
          await this.incentiveCommonRepo.create(incentiveData);

        resolve({
          code: 200,
          message: "Incentive common created successfully",
          data: { incentive_common_id: incentiveId },
        });
      } catch (err) {
        // Handle duplicate entry error (MySQL unique constraint)
        if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
          resolve({
            code: 400,
            error_code: "INCENTIVE_COMMON_DUPLICATE",
            message:
              "A record already exists for this type, selected month and cluster size",
          });
          return;
        }
        reject(err);
      }
    });
  }

  getAll(type = null, month = null, cluster_size = undefined) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.incentiveCommonRepo.getAll(type, month, cluster_size);
        resolve({
          code: 200,
          message: "Incentive common records retrieved successfully",
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
        const incentive = await this.incentiveCommonRepo.getById(id);
        if (incentive) {
          resolve({
            code: 200,
            message: "Incentive common retrieved successfully",
            data: incentive,
          });
        } else {
          resolve({
            code: 404,
            message: "Incentive common not found",
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
          await this.incentiveCommonRepo.getById(id);
        if (!existingIncentive) {
          resolve({
            code: 404,
            message: "Incentive common not found",
          });
          return;
        }

        // Determine type, selected_month and cluster_size for duplicate check
        const type =
          incentiveData.type !== undefined
            ? incentiveData.type
            : existingIncentive.type;
        const selected_month =
          incentiveData.selected_month !== undefined
            ? incentiveData.selected_month || null
            : existingIncentive.selected_month;
        const cluster_size =
          incentiveData.cluster_size !== undefined
            ? incentiveData.cluster_size ?? null
            : (existingIncentive.cluster_size ?? null);

        // Check for duplicate (excluding current record)
        const isDuplicate = await this.incentiveCommonRepo.checkDuplicate(
          type,
          selected_month,
          cluster_size,
          id
        );

        if (isDuplicate) {
          resolve({
            code: 400,
            error_code: "INCENTIVE_COMMON_DUPLICATE",
            message:
              "A record already exists for this type, selected month and cluster size",
          });
          return;
        }

        await this.incentiveCommonRepo.update(id, incentiveData);
        resolve({
          code: 200,
          message: "Incentive common updated successfully",
          data: { incentive_common_id: id },
        });
      } catch (err) {
        // Handle duplicate entry error (MySQL unique constraint)
        if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
          resolve({
            code: 400,
            error_code: "INCENTIVE_COMMON_DUPLICATE",
            message:
              "A record already exists for this type, selected month and cluster size",
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
          await this.incentiveCommonRepo.getById(id);
        if (!existingIncentive) {
          resolve({
            code: 404,
            message: "Incentive common not found",
          });
          return;
        }

        await this.incentiveCommonRepo.delete(id);
        resolve({
          code: 200,
          message: "Incentive common deleted successfully",
          data: { incentive_common_id: id },
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (incentiveCommonRepo) => {
  return new IncentiveCommonUsecase(incentiveCommonRepo);
};
