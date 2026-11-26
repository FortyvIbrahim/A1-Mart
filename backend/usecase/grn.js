class GrnUsecase {
  constructor(grnRepo) {
    this.grnRepo = grnRepo;
  }

  create(grnData) {
    return new Promise(async (resolve, reject) => {
      try {
        const grnId = await this.grnRepo.create(grnData);

        resolve({
          code: 200,
          message: "GRN created successfully",
          data: { grn_id: grnId },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll() {
    return new Promise(async (resolve, reject) => {
      try {
        const grns = await this.grnRepo.getAll();
        resolve({
          code: 200,
          message: "GRN records retrieved successfully",
          data: grns,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const grn = await this.grnRepo.getById(id);
        if (grn) {
          resolve({
            code: 200,
            message: "GRN retrieved successfully",
            data: grn,
          });
        } else {
          resolve({
            code: 404,
            message: "GRN not found",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  getByPurchaseAcknowledgmentId(purchaseAcknowledgmentId) {
    return new Promise(async (resolve, reject) => {
      try {
        const grn = await this.grnRepo.getByPurchaseAcknowledgmentId(
          purchaseAcknowledgmentId
        );
        if (grn) {
          resolve({
            code: 200,
            message: "GRN retrieved successfully",
            data: grn,
          });
        } else {
          resolve({
            code: 404,
            message: "GRN not found for this purchase acknowledgment",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  update(id, grnData) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if GRN exists first
        const existingGrn = await this.grnRepo.getById(id);
        if (!existingGrn) {
          resolve({
            code: 404,
            message: "GRN not found",
          });
          return;
        }

        await this.grnRepo.update(id, grnData);
        resolve({
          code: 200,
          message: "GRN updated successfully",
          data: { grn_id: id },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(id) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if GRN exists first
        const existingGrn = await this.grnRepo.getById(id);
        if (!existingGrn) {
          resolve({
            code: 404,
            message: "GRN not found",
          });
          return;
        }

        await this.grnRepo.delete(id);
        resolve({
          code: 200,
          message: "GRN deleted successfully",
          data: { grn_id: id },
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (grnRepo) => {
  return new GrnUsecase(grnRepo);
};

