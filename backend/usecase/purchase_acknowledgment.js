class PurchaseAcknowledgmentUsecase {
  constructor(purchaseAcknowledgmentRepo) {
    this.purchaseAcknowledgmentRepo = purchaseAcknowledgmentRepo;
  }

  create(purchaseAcknowledgmentData) {
    return new Promise(async (resolve, reject) => {
      try {
        const purchaseAcknowledgmentId =
          await this.purchaseAcknowledgmentRepo.create(
            purchaseAcknowledgmentData
          );

        resolve({
          code: 200,
          message: "Purchase acknowledgment created successfully",
          data: { purchase_acknowledgment_id: purchaseAcknowledgmentId },
        });
      } catch (err) {
        // Handle duplicate invoice number (unique key violation)
        if (err && err.code === "ER_DUP_ENTRY") {
          resolve({
            code: 400,
            error_code: "PURCHASE_ACK_DUP_INVOICE_NO",
            message: "Invoice number already exists",
          });
          return;
        }
        reject(err);
      }
    });
  }

  getAll(filters = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.purchaseAcknowledgmentRepo.getAll(filters);
        resolve({
          code: 200,
          message: "Purchase acknowledgments retrieved successfully",
          data: result.data,
          total_count: result.total_count,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const acknowledgment = await this.purchaseAcknowledgmentRepo.getById(
          id
        );
        if (acknowledgment) {
          resolve({
            code: 200,
            message: "Purchase acknowledgment retrieved successfully",
            data: acknowledgment,
          });
        } else {
          resolve({
            code: 404,
            message: "Purchase acknowledgment not found",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  update(id, purchaseAcknowledgmentData) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if acknowledgment exists first
        const existingAcknowledgment =
          await this.purchaseAcknowledgmentRepo.getById(id);
        if (!existingAcknowledgment) {
          resolve({
            code: 404,
            message: "Purchase acknowledgment not found",
          });
          return;
        }

        await this.purchaseAcknowledgmentRepo.update(
          id,
          purchaseAcknowledgmentData
        );
        resolve({
          code: 200,
          message: "Purchase acknowledgment updated successfully",
          data: { purchase_acknowledgment_id: id },
        });
      } catch (err) {
        // Handle duplicate invoice number (unique key violation)
        if (err && err.code === "ER_DUP_ENTRY") {
          resolve({
            code: 400,
            error_code: "PURCHASE_ACK_DUP_INVOICE_NO",
            message: "Invoice number already exists",
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
        // Check if acknowledgment exists first
        const existingAcknowledgment =
          await this.purchaseAcknowledgmentRepo.getById(id);
        if (!existingAcknowledgment) {
          resolve({
            code: 404,
            message: "Purchase acknowledgment not found",
          });
          return;
        }

        await this.purchaseAcknowledgmentRepo.delete(id);
        resolve({
          code: 200,
          message: "Purchase acknowledgment deleted successfully",
          data: { purchase_acknowledgment_id: id },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getEntriesByProductId(product_id) {
    return new Promise(async (resolve, reject) => {
      try {
        const entries =
          await this.purchaseAcknowledgmentRepo.getEntriesByProductId(
            product_id
          );
        resolve({
          code: 200,
          message: "Purchase entry items retrieved successfully",
          data: entries,
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (purchaseAcknowledgmentRepo) => {
  return new PurchaseAcknowledgmentUsecase(purchaseAcknowledgmentRepo);
};
