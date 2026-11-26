class ProductUsecase {
  constructor(productRepo, productStockPriceUsecase) {
    this.productRepo = productRepo;
    this.productStockPriceUsecase = productStockPriceUsecase;
  }

  getAllProductData(includeStockPrice = true, branchId = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const products = await this.productRepo.getAllProductData();

        if (
          !includeStockPrice ||
          !this.productStockPriceUsecase ||
          !Array.isArray(products) ||
          products.length === 0
        ) {
          resolve(products);
          return;
        }

        const productIds = products.map((p) => p.product_id);
        const stockRows = await this.productStockPriceUsecase.getByProductIds(
          productIds,
          branchId
        );

        const stockByProductId = {};
        stockRows.forEach((row) => {
          if (!stockByProductId[row.product_id]) {
            stockByProductId[row.product_id] = [];
          }
          stockByProductId[row.product_id].push(row);
        });

        const withStock = products.map((p) => ({
          ...p,
          stock_price: stockByProductId[p.product_id] || [],
        }));

        resolve(withStock);
      } catch (err) {
        reject(err);
      }
    });
  }

  getProductById(product_id, includeStockPrice = true, branchId = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.productRepo.getProductById(product_id);

        if (!data) {
          resolve(null);
          return;
        }

        if (!includeStockPrice || !this.productStockPriceUsecase) {
          resolve(data);
          return;
        }

        const stockRows = await this.productStockPriceUsecase.getByProductId(
          product_id,
          branchId
        );
        const stock_price = stockRows;

        const result = { ...data, stock_price };

        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  create(product) {
    return new Promise(async (resolve, reject) => {
      try {
        const code = await this.productRepo.create(product);
        resolve(code);
      } catch (err) {
        reject(err);
        console.log(err);
      }
    });
  }

  updateImageUrl(product_id, image_url) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.productRepo.updateImageUrl(
          product_id,
          image_url
        );
        if (result.affectedRows === 0) {
          resolve({ code: 404, msg: "Product not found" });
          return;
        }
        resolve({
          code: 200,
          msg: "Product image URL updated successfully",
          data: result,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  bulkUpdateImageUrl(items) {
    return this.productRepo.bulkUpdateImageUrl(items);
  }

  upsertCategory(category) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.productRepo.upsertCategory(category);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  upsertDepartment(department) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.productRepo.upsertDepartment(department);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  upsertSubCategory(subCategory) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.productRepo.upsertSubCategory(subCategory);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  upsertBrand(brand) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.productRepo.upsertBrand(brand);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  getAllDepartments() {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.productRepo.getAllDepartments();
        resolve(data);
      } catch (err) {
        reject(err);
      }
    });
  }

  getAllCategories() {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.productRepo.getAllCategories();
        resolve(data);
      } catch (err) {
        reject(err);
      }
    });
  }

  getAllSubcategories() {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.productRepo.getAllSubcategories();
        resolve(data);
      } catch (err) {
        reject(err);
      }
    });
  }

  getAllBrands() {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.productRepo.getAllBrands();
        resolve(data);
      } catch (err) {
        reject(err);
      }
    });
  }

  bulkCreate(products) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.productRepo.bulkCreate(products);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  bulkUpdateEanNumbers(pairs) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.productRepo.bulkUpdateEanNumbers(pairs);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  bulkUpsertCategory(categories) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.productRepo.bulkUpsertCategory(categories);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  bulkUpsertSubCategory(subCategories) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.productRepo.bulkUpsertSubCategory(subCategories);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  bulkUpsertBrand(brands) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.productRepo.bulkUpsertBrand(brands);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  bulkUpsertDepartment(departments) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.productRepo.bulkUpsertDepartment(departments);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (productRepo, productStockPriceUsecase) => {
  return new ProductUsecase(productRepo, productStockPriceUsecase);
};
