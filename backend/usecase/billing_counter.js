class BillingCounterUsecase {
  constructor(billingCounterRepo) {
    this.billingCounterRepo = billingCounterRepo;
  }

  create(counterData) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.billingCounterRepo.create(counterData);
        resolve({
          code: 200,
          message: "Billing counter created successfully",
          data: result,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll() {
    return new Promise(async (resolve, reject) => {
      try {
        const counters = await this.billingCounterRepo.getAll();
        resolve({
          code: 200,
          message: "Billing counters retrieved successfully",
          data: counters,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(counterId) {
    return new Promise(async (resolve, reject) => {
      try {
        const counter = await this.billingCounterRepo.getById(counterId);
        if (counter) {
          resolve({
            code: 200,
            message: "Billing counter retrieved successfully",
            data: counter,
          });
        } else {
          resolve({
            code: 404,
            message: "Billing counter not found",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  getByBranchId(branchId) {
    return new Promise(async (resolve, reject) => {
      try {
        const counters = await this.billingCounterRepo.getByBranchId(branchId);
        resolve({
          code: 200,
          message: "Billing counters retrieved successfully",
          data: counters,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  update(counterId, counterData) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if counter exists first
        const existingCounter = await this.billingCounterRepo.getById(counterId);
        if (!existingCounter) {
          resolve({
            code: 404,
            message: "Billing counter not found",
          });
          return;
        }

        const result = await this.billingCounterRepo.update(counterId, counterData);
        if (result.affectedRows > 0) {
          resolve({
            code: 200,
            message: "Billing counter updated successfully",
            data: { counterId, ...counterData },
          });
        } else {
          resolve({
            code: 400,
            message: "No changes made to the billing counter",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(counterId) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if counter exists first
        const existingCounter = await this.billingCounterRepo.getById(counterId);
        if (!existingCounter) {
          resolve({
            code: 404,
            message: "Billing counter not found",
          });
          return;
        }

        const result = await this.billingCounterRepo.delete(counterId);
        if (result.affectedRows > 0) {
          resolve({
            code: 200,
            message: "Billing counter deleted successfully",
            data: { counterId },
          });
        } else {
          resolve({
            code: 400,
            message: "Failed to delete billing counter",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (billingCounterRepo) => {
  return new BillingCounterUsecase(billingCounterRepo);
};

