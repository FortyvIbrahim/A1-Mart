class StockAdditionUsecase {
  constructor(stockAdditionRepo, materialsUsecase) {
    this.stockAdditionRepo = stockAdditionRepo;
    this.materialsUsecase = materialsUsecase;
  }

  createStockAddition(data, items) {
    return new Promise(async (resolve, reject) => {
      try {
        const id = await this.stockAdditionRepo.createStockAddition(
          data,
          items
        );
        resolve(id);
      } catch (err) {
        reject(err);
      }
    });
  }

  getStockAdditionById(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.stockAdditionRepo.getStockAdditionById(id);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    });
  }

  getAllStockAdditions(branch_id) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.stockAdditionRepo.getAllStockAdditions(
          branch_id
        );
        resolve(data);
      } catch (err) {
        reject(err);
      }
    });
  }

  updateStockAddition(id, data, items) {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.stockAdditionRepo.updateStockAddition(
          id,
          data,
          items
        );

        // If approved (is_approved === 1), increase stock
        // If not approved (is_approved === 0), reduce stock
        if (data?.is_approved === 1 && items) {
          items.forEach(async (element) => {
            await this.materialsUsecase.increaseStock(
              element.material_id,
              element.quantity
            );
          });
        } else if (data?.is_approved === 0 && items) {
          items.forEach(async (element) => {
            await this.materialsUsecase.reduceStock(
              element.material_id,
              element.quantity
            );
          });
        }
        resolve(resp);
      } catch (err) {
        reject(err);
      }
    });
  }

  approveStockAddition(id, is_approved, items) {
    return new Promise(async (resolve, reject) => {
      try {
        // Get the current stock addition to check previous approval status
        const currentStockAddition = await this.stockAdditionRepo.getStockAdditionById(id);
        if (!currentStockAddition) {
          return reject(new Error("Stock addition not found"));
        }

        const previousApprovalStatus = currentStockAddition.is_approved;
        // Use provided items or items from current stock addition
        const itemsToProcess = items || currentStockAddition.items || [];

        // If approval status is changing, adjust stock accordingly
        // If previously approved (1) and now not approved (0): reduce stock (revert the increase)
        // If previously not approved (0) and now approved (1): increase stock
        // If status is the same, no stock change needed
        if (previousApprovalStatus !== is_approved && itemsToProcess.length > 0) {
          if (previousApprovalStatus === 1 && is_approved === 0) {
            // Was approved, now not approved - reduce stock to revert
            for (const element of itemsToProcess) {
              await this.materialsUsecase.reduceStock(
                element.material_id,
                element.quantity
              );
            }
          } else if (previousApprovalStatus === 0 && is_approved === 1) {
            // Was not approved, now approved - increase stock
            for (const element of itemsToProcess) {
              await this.materialsUsecase.increaseStock(
                element.material_id,
                element.quantity
              );
            }
          }
        }

        // Update the approval status (use items parameter if provided, otherwise keep existing items)
        const resp = await this.stockAdditionRepo.updateStockAddition(
          id,
          { is_approved },
          items // If items provided, update them; otherwise keep existing
        );

        resolve(resp);
      } catch (err) {
        reject(err);
      }
    });
  }

  deleteStockAddition(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.stockAdditionRepo.deleteStockAddition(id);
        resolve(resp);
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (stockAdditionRepo, materialsUsecase) => {
  return new StockAdditionUsecase(stockAdditionRepo, materialsUsecase);
};

