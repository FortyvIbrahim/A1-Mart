class IncentiveStickeringUsecase {
  constructor(incentiveStickeringRepo) {
    this.incentiveStickeringRepo = incentiveStickeringRepo;
  }

  create(incentiveData) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check for duplicate
        const isDuplicate = await this.incentiveStickeringRepo.checkDuplicate(
          incentiveData.material_type,
          incentiveData.selected_month || null
        );

        if (isDuplicate) {
          resolve({
            code: 400,
            error_code: "INCENTIVE_STICKERING_DUPLICATE",
            message:
              "A record already exists for this material type and selected month",
          });
          return;
        }

        const incentiveId =
          await this.incentiveStickeringRepo.create(incentiveData);

        resolve({
          code: 200,
          message: "Incentive stickering created successfully",
          data: { incentive_stickering_id: incentiveId },
        });
      } catch (err) {
        // Handle duplicate entry error (MySQL unique constraint)
        if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
          resolve({
            code: 400,
            error_code: "INCENTIVE_STICKERING_DUPLICATE",
            message:
              "A record already exists for this material type and selected month",
          });
          return;
        }
        reject(err);
      }
    });
  }

  getAll(material_type = null, month = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.incentiveStickeringRepo.getAll(
          material_type,
          month
        );
        resolve({
          code: 200,
          message: "Incentive stickering records retrieved successfully",
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
        const incentive = await this.incentiveStickeringRepo.getById(id);
        if (incentive) {
          resolve({
            code: 200,
            message: "Incentive stickering retrieved successfully",
            data: incentive,
          });
        } else {
          resolve({
            code: 404,
            message: "Incentive stickering not found",
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
          await this.incentiveStickeringRepo.getById(id);
        if (!existingIncentive) {
          resolve({
            code: 404,
            message: "Incentive stickering not found",
          });
          return;
        }

        // Determine material_type and selected_month for duplicate check
        const material_type =
          incentiveData.material_type !== undefined
            ? incentiveData.material_type
            : existingIncentive.material_type;
        const selected_month =
          incentiveData.selected_month !== undefined
            ? incentiveData.selected_month || null
            : existingIncentive.selected_month;

        // Check for duplicate (excluding current record)
        const isDuplicate = await this.incentiveStickeringRepo.checkDuplicate(
          material_type,
          selected_month,
          id
        );

        if (isDuplicate) {
          resolve({
            code: 400,
            error_code: "INCENTIVE_STICKERING_DUPLICATE",
            message:
              "A record already exists for this material type and selected month",
          });
          return;
        }

        await this.incentiveStickeringRepo.update(id, incentiveData);
        resolve({
          code: 200,
          message: "Incentive stickering updated successfully",
          data: { incentive_stickering_id: id },
        });
      } catch (err) {
        // Handle duplicate entry error (MySQL unique constraint)
        if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
          resolve({
            code: 400,
            error_code: "INCENTIVE_STICKERING_DUPLICATE",
            message:
              "A record already exists for this material type and selected month",
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
          await this.incentiveStickeringRepo.getById(id);
        if (!existingIncentive) {
          resolve({
            code: 404,
            message: "Incentive stickering not found",
          });
          return;
        }

        await this.incentiveStickeringRepo.delete(id);
        resolve({
          code: 200,
          message: "Incentive stickering deleted successfully",
          data: { incentive_stickering_id: id },
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (incentiveStickeringRepo) => {
  return new IncentiveStickeringUsecase(incentiveStickeringRepo);
};
