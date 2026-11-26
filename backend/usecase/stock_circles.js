class StockCirclesUsecase {
  constructor(stockCirclesRepo) {
    this.stockCirclesRepo = stockCirclesRepo;
  }

  create(circleData) {
    return new Promise(async (resolve, reject) => {
      try {
        const created = await this.stockCirclesRepo.create(circleData);
        const full = await this.stockCirclesRepo.getById(created.id);
        resolve({
          code: 200,
          message: "Stock circle created successfully",
          data: full,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll(branchId = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const circles = await this.stockCirclesRepo.getAll(branchId);
        resolve({
          code: 200,
          message: "Stock circles retrieved successfully",
          data: circles,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const circle = await this.stockCirclesRepo.getById(id);
        if (circle) {
          resolve({
            code: 200,
            message: "Stock circle retrieved successfully",
            data: circle,
          });
        } else {
          resolve({
            code: 404,
            message: "Stock circle not found",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  update(id, circleData) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if circle exists first
        const existingCircle = await this.stockCirclesRepo.getById(id);
        if (!existingCircle) {
          resolve({
            code: 404,
            message: "Stock circle not found",
          });
          return;
        }

        const result = await this.stockCirclesRepo.update(id, circleData);
        if (result.affectedRows > 0) {
          const full = await this.stockCirclesRepo.getById(id);
          resolve({
            code: 200,
            message: "Stock circle updated successfully",
            data: full,
          });
        } else {
          resolve({
            code: 400,
            message: "No changes made to the stock circle",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(id) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if circle exists first
        const existingCircle = await this.stockCirclesRepo.getById(id);
        if (!existingCircle) {
          resolve({
            code: 404,
            message: "Stock circle not found",
          });
          return;
        }

        const result = await this.stockCirclesRepo.delete(id);
        if (result.affectedRows > 0) {
          resolve({
            code: 200,
            message: "Stock circle deleted successfully",
            data: { id },
          });
        } else {
          resolve({
            code: 400,
            message: "Failed to delete stock circle",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (stockCirclesRepo) => {
  return new StockCirclesUsecase(stockCirclesRepo);
};
