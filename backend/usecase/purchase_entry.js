class PurchaseEntryUsecase {
  constructor(purchaseEntryRepo, materialsUsecase = null) {
    this.purchaseEntryRepo = purchaseEntryRepo;
    this.materialsUsecase = materialsUsecase;
  }

  create(purchaseEntryData, items) {
    return new Promise(async (resolve, reject) => {
      try {
        const purchaseEntryId = await this.purchaseEntryRepo.create(
          purchaseEntryData,
          items
        );

        // Increase stock for each purchase entry item
        if (this.materialsUsecase && items && items.length > 0) {
          try {
            for (const item of items) {
              if (item.material_id && item.quantity) {
                await this.materialsUsecase.increaseStock(
                  item.material_id,
                  item.quantity
                );
              }
            }
          } catch (stockErr) {
            console.error("Error increasing stock:", stockErr);
            // Log error but don't fail the purchase entry creation
          }
        }

        resolve({
          code: 200,
          message: "Purchase entry created successfully",
          data: { purchase_entry_id: purchaseEntryId },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll() {
    return new Promise(async (resolve, reject) => {
      try {
        const entries = await this.purchaseEntryRepo.getAll();
        const sortedEntries = entries.sort(
          (a, b) => a.purchase_entry_id - b.purchase_entry_id
        );
        resolve({
          code: 200,
          message: "Purchase entries retrieved successfully",
          data: sortedEntries,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const entry = await this.purchaseEntryRepo.getById(id);
        if (entry) {
          resolve({
            code: 200,
            message: "Purchase entry retrieved successfully",
            data: entry,
          });
        } else {
          resolve({
            code: 404,
            message: "Purchase entry not found",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  getByPurchaseOrderId(purchaseOrderId) {
    return new Promise(async (resolve, reject) => {
      try {
        const entry = await this.purchaseEntryRepo.getByPurchaseOrderId(purchaseOrderId);
        if (entry) {
          resolve({
            code: 200,
            message: "Purchase entry retrieved successfully",
            data: entry,
          });
        } else {
          resolve({
            code: 404,
            message: "Purchase entry not found",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  update(id, purchaseEntryData, items) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if entry exists first and get its items
        const existingEntry = await this.purchaseEntryRepo.getById(id);
        if (!existingEntry) {
          resolve({
            code: 404,
            message: "Purchase entry not found",
          });
          return;
        }

        // Handle stock changes: reduce old items, then increase new items
        if (this.materialsUsecase) {
          try {
            // First, reduce stock for old items (if they exist)
            if (existingEntry.items && existingEntry.items.length > 0) {
              for (const oldItem of existingEntry.items) {
                if (oldItem.material_id && oldItem.quantity) {
                  await this.materialsUsecase.reduceStock(
                    oldItem.material_id,
                    oldItem.quantity
                  );
                }
              }
            }

            // Then, increase stock for new items (if provided)
            if (items && items.length > 0) {
              for (const newItem of items) {
                if (newItem.material_id && newItem.quantity) {
                  await this.materialsUsecase.increaseStock(
                    newItem.material_id,
                    newItem.quantity
                  );
                }
              }
            }
          } catch (stockErr) {
            console.error("Error updating stock:", stockErr);
            // Log error but continue with the update
          }
        }

        await this.purchaseEntryRepo.update(id, purchaseEntryData, items);

        resolve({
          code: 200,
          message: "Purchase entry updated successfully",
          data: { purchase_entry_id: id },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(id) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if entry exists first and get its items
        const existingEntry = await this.purchaseEntryRepo.getById(id);
        if (!existingEntry) {
          resolve({
            code: 404,
            message: "Purchase entry not found",
          });
          return;
        }

        // Reduce stock for each item before deleting
        if (this.materialsUsecase && existingEntry.items) {
          try {
            for (const item of existingEntry.items) {
              if (item.material_id && item.quantity) {
                await this.materialsUsecase.reduceStock(
                  item.material_id,
                  item.quantity
                );
              }
            }
          } catch (stockErr) {
            console.error("Error reducing stock on delete:", stockErr);
            // Log error but continue with deletion
          }
        }

        await this.purchaseEntryRepo.delete(id);
        resolve({
          code: 200,
          message: "Purchase entry deleted successfully",
          data: { purchase_entry_id: id },
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (purchaseEntryRepo, materialsUsecase) => {
  return new PurchaseEntryUsecase(purchaseEntryRepo, materialsUsecase);
};
