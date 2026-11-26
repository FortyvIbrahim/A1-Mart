class StickeringUsecase {
  constructor(stickeringRepo, productUsecase) {
    this.stickeringRepo = stickeringRepo;
    this.productUsecase = productUsecase;
  }

  create(stickeringData) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.stickeringRepo.create(stickeringData);
        resolve({
          code: 200,
          message: "Stickering record created successfully",
          data: result,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  bulkCreate(rows) {
    return new Promise(async (resolve, reject) => {
      try {
        // Process each row - create products if needed
        const processedRows = [];
        for (const row of rows) {
          let productId = row.product_id;

          // If it's a new product, create it first
          if (row.is_new_product && row.product_name && this.productUsecase) {
            try {
              const productData = {
                product_id: row.product_id,
                de_name: row.product_name,
              };
              await this.productUsecase.create(productData);
            } catch (productErr) {
              // If product creation fails, log but continue
              console.error("Failed to create product:", productErr);
              // Still proceed with stickering creation
            }
          }

          // Remove is_new_product and product_name from stickering data
          const { is_new_product, product_name, ...stickeringData } = row;
          processedRows.push(stickeringData);
        }

        const result = await this.stickeringRepo.bulkCreate(processedRows);
        resolve({
          code: 200,
          message: "Stickering records created successfully",
          data: result,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll(filters = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const records = await this.stickeringRepo.getAll(filters);
        resolve({
          code: 200,
          message: "Stickering records retrieved successfully",
          data: records,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(stickeringId) {
    return new Promise(async (resolve, reject) => {
      try {
        const record = await this.stickeringRepo.getById(stickeringId);
        if (record) {
          resolve({
            code: 200,
            message: "Stickering record retrieved successfully",
            data: record,
          });
        } else {
          resolve({
            code: 404,
            message: "Stickering record not found",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  getByEmployeeCode(employeeCode) {
    return new Promise(async (resolve, reject) => {
      try {
        const records = await this.stickeringRepo.getByEmployeeCode(
          employeeCode
        );
        resolve({
          code: 200,
          message: "Stickering records retrieved successfully",
          data: records,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getBySupervisorId(supervisorId) {
    return new Promise(async (resolve, reject) => {
      try {
        const records = await this.stickeringRepo.getBySupervisorId(
          supervisorId
        );
        resolve({
          code: 200,
          message: "Stickering records retrieved successfully",
          data: records,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getByPurchaseAcknowledgmentId(purchaseAcknowledgmentId) {
    return new Promise(async (resolve, reject) => {
      try {
        const records =
          await this.stickeringRepo.getByPurchaseAcknowledgmentId(
            purchaseAcknowledgmentId
          );
        resolve({
          code: 200,
          message: "Stickering records retrieved successfully",
          data: records,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  update(stickeringId, stickeringData) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if record exists first
        const existingRecord = await this.stickeringRepo.getById(stickeringId);
        if (!existingRecord) {
          resolve({
            code: 404,
            message: "Stickering record not found",
          });
          return;
        }

        const result = await this.stickeringRepo.update(
          stickeringId,
          stickeringData
        );
        if (result.affectedRows > 0) {
          resolve({
            code: 200,
            message: "Stickering record updated successfully",
            data: { stickeringId, ...stickeringData },
          });
        } else {
          resolve({
            code: 400,
            message: "No changes made to the stickering record",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(stickeringId) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if record exists first
        const existingRecord = await this.stickeringRepo.getById(stickeringId);
        if (!existingRecord) {
          resolve({
            code: 404,
            message: "Stickering record not found",
          });
          return;
        }

        const result = await this.stickeringRepo.delete(stickeringId);
        if (result.affectedRows > 0) {
          resolve({
            code: 200,
            message: "Stickering record deleted successfully",
            data: { stickeringId },
          });
        } else {
          resolve({
            code: 400,
            message: "Failed to delete stickering record",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (stickeringRepo, productUsecase) => {
  return new StickeringUsecase(stickeringRepo, productUsecase);
};
