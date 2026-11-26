class WmsPurchaseEntryUsecase {
  constructor(repo, productUsecase = null) {
    this.repo = repo;
    this.productUsecase = productUsecase;
  }

  create(payload, items) {
    return new Promise(async (resolve, reject) => {
      try {
        // Process items - create products if needed
        const processedItems = [];
        if (items && items.length > 0 && this.productUsecase) {
          for (const item of items) {
            // Check if product exists, create if it doesn't
            if (item.product_id) {
              try {
                const existingProduct = await this.productUsecase.getProductById(
                  item.product_id,
                  false
                );

                // If product doesn't exist and product_name is provided, create it
                if (!existingProduct && item.product_name) {
                  const productData = {
                    product_id: item.product_id,
                    de_name: item.product_name,
                  };
                  await this.productUsecase.create(productData);
                }
              } catch (productErr) {
                // If product check/creation fails, log but continue
                console.error("Failed to check/create product:", productErr);
                // Still proceed with item creation
              }
            }

            // Remove is_new_product and product_name from item data (not stored in items table)
            const { is_new_product, product_name, ...itemData } = item;
            processedItems.push(itemData);
          }
        } else {
          processedItems = items || [];
        }

        const purchase_entry_id = await this.repo.create(payload, processedItems);
        resolve({ purchase_entry_id });
      } catch (err) {
        reject(err);
      }
    });
  }

  update(purchase_entry_id, payload, items) {
    return new Promise(async (resolve, reject) => {
      try {
        // Process items - create products if needed
        let processedItems = items;
        if (items && items.length > 0 && this.productUsecase) {
          processedItems = [];
          for (const item of items) {
            // Check if product exists, create if it doesn't
            if (item.product_id) {
              try {
                const existingProduct = await this.productUsecase.getProductById(
                  item.product_id,
                  false
                );

                // If product doesn't exist and product_name is provided, create it
                if (!existingProduct && item.product_name) {
                  const productData = {
                    product_id: item.product_id,
                    de_name: item.product_name,
                  };
                  await this.productUsecase.create(productData);
                }
              } catch (productErr) {
                // If product check/creation fails, log but continue
                console.error("Failed to check/create product:", productErr);
                // Still proceed with item update
              }
            }

            // Remove is_new_product and product_name from item data (not stored in items table)
            const { is_new_product, product_name, ...itemData } = item;
            processedItems.push(itemData);
          }
        }

        const result = await this.repo.update(
          purchase_entry_id,
          payload,
          processedItems
        );
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll() {
    return this.repo.getAll();
  }

  getById(purchase_entry_id) {
    return this.repo.getById(purchase_entry_id);
  }

  delete(purchase_entry_id) {
    return this.repo.delete(purchase_entry_id);
  }
}

module.exports = (repo, productUsecase) => {
  return new WmsPurchaseEntryUsecase(repo, productUsecase);
};
