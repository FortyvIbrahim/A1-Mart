class StockCircleCheckedUsecase {
  constructor(stockCircleCheckedRepo) {
    this.stockCircleCheckedRepo = stockCircleCheckedRepo;
  }

  create(checkedData) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.stockCircleCheckedRepo.create(checkedData);
        resolve({
          code: 200,
          message: "Stock circle checked created/updated successfully",
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
        const result = await this.stockCircleCheckedRepo.bulkCreate(rows);
        resolve({
          code: 200,
          message: "Stock circles checked bulk created/updated successfully",
          data: result,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll(stockCircleId = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const checked = await this.stockCircleCheckedRepo.getAll(stockCircleId);
        resolve({
          code: 200,
          message: "Stock circles checked retrieved successfully",
          data: checked,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(stockCircleId, productId) {
    return new Promise(async (resolve, reject) => {
      try {
        const checked = await this.stockCircleCheckedRepo.getById(
          stockCircleId,
          productId
        );
        if (checked) {
          resolve({
            code: 200,
            message: "Stock circle checked retrieved successfully",
            data: checked,
          });
        } else {
          resolve({
            code: 404,
            message: "Stock circle checked not found",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  update(stockCircleId, productId, checkedData) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.stockCircleCheckedRepo.getById(
          stockCircleId,
          productId
        );
        if (!existing) {
          resolve({
            code: 404,
            message: "Stock circle checked not found",
          });
          return;
        }

        const result = await this.stockCircleCheckedRepo.update(
          stockCircleId,
          productId,
          checkedData
        );
        if (result.affectedRows > 0) {
          resolve({
            code: 200,
            message: "Stock circle checked updated successfully",
            data: { stockCircleId, productId, ...checkedData },
          });
        } else {
          resolve({
            code: 400,
            message: "No changes made to the stock circle checked",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(stockCircleId, productId) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.stockCircleCheckedRepo.getById(
          stockCircleId,
          productId
        );
        if (!existing) {
          resolve({
            code: 404,
            message: "Stock circle checked not found",
          });
          return;
        }

        const result = await this.stockCircleCheckedRepo.delete(
          stockCircleId,
          productId
        );
        if (result.affectedRows > 0) {
          resolve({
            code: 200,
            message: "Stock circle checked deleted successfully",
            data: { stockCircleId, productId },
          });
        } else {
          resolve({
            code: 400,
            message: "Failed to delete stock circle checked",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (stockCircleCheckedRepo) => {
  return new StockCircleCheckedUsecase(stockCircleCheckedRepo);
};
