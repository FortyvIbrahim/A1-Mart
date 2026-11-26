class ProductStockPriceUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  bulkUpsert(rows) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.repo.bulkUpsert(rows);
        resolve({ code: 200, ...result });
      } catch (err) {
        reject(err);
      }
    });
  }

  getByProductId(productId, branchId = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const rows = await this.repo.getByProductId(productId, branchId);
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    });
  }

  getByProductIds(productIds, branchId = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const rows = await this.repo.getByProductIds(productIds, branchId);
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (repo) => {
  return new ProductStockPriceUsecase(repo);
};
