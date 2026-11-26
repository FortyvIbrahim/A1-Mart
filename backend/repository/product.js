const logger = require("../utils/logger");

class ProductRepository {
  constructor(db) {
    this.db = db;
  }

  create(product) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `INSERT INTO products (product_id, variant, variant_of, gf_item_name, gf_description, gf_detailed_description, gf_weight_grams, gf_applies_online, gf_item_product_type, gf_manufacturer, gf_food_type, gf_tax_id, gf_status, de_distributor, distributor_id, brand_id, category_id, subcategory_id, measure, measure_in, packaging_type, cleaning, sticker, grinding, cover_type, cover_sizes, return_prod, de_display_name, department_id, de_name, de_packaging_type, de_preparation_type, de_combo_name, de_buyer_name, image_url, repln_mode, store_uom, ean_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          
          ON DUPLICATE KEY UPDATE variant = ?, variant_of = ?, gf_item_name = ?, gf_description = ?, gf_detailed_description = ?, gf_weight_grams = ?, gf_applies_online = ?, gf_item_product_type = ?,
          gf_manufacturer = ?, gf_food_type = ?, gf_tax_id = ?, gf_status = ?, de_distributor = ?, distributor_id = ?, brand_id = ?, category_id = ?, subcategory_id = ?, measure = ?, measure_in = ?, packaging_type = ?,
          cleaning = ?, sticker = ?, grinding = ?, cover_type = ?, cover_sizes = ?, return_prod = ?, de_display_name = ?, department_id = ?, de_name = ?, de_packaging_type = ?, de_preparation_type = ?, de_combo_name = ?, de_buyer_name = ?, repln_mode = ?, store_uom = ?, ean_number = ?`,
        [
          product.product_id,
          product.variant,
          product.variant_of,
          product.gf_item_name,
          product.gf_description,
          product.gf_detailed_description,
          product.gf_weight_grams,
          product.gf_applies_online,
          product.gf_item_product_type,
          product.gf_manufacturer,
          product.gf_food_type,
          product.gf_tax_id,
          product.gf_status,
          product.de_distributor,
          product.distributor_id ?? null,
          product.brand_id,
          product.category_id,
          product.subcategory_id,
          product.measure,
          product.measure_in,
          product.packaging_type,
          product.cleaning,
          product.sticker,
          product.grinding,
          product.cover_type,
          product.cover_sizes,
          product.return,
          product.de_display_name,
          product.department_id,
          product.de_name,
          product.de_packaging_type,
          product.de_preparation_type,
          product.de_combo_name,
          product.de_buyer_name,
          product.image_url,
          product.repln_mode,
          product.store_uom || null,
          product.ean_number ?? null,

          product.variant,
          product.variant_of,
          product.gf_item_name,
          product.gf_description,
          product.gf_detailed_description,
          product.gf_weight_grams,
          product.gf_applies_online,
          product.gf_item_product_type,
          product.gf_manufacturer,
          product.gf_food_type,
          product.gf_tax_id,
          product.gf_status,
          product.de_distributor,
          product.distributor_id ?? null,
          product.brand_id,
          product.category_id,
          product.subcategory_id,
          product.measure,
          product.measure_in,
          product.packaging_type,
          product.cleaning,
          product.sticker,
          product.grinding,
          product.cover_type,
          product.cover_sizes,
          product.return,
          product.de_display_name,
          product.department_id,
          product.de_name,
          product.de_packaging_type,
          product.de_preparation_type,
          product.de_combo_name,
          product.de_buyer_name,
          product.repln_mode,
          product.store_uom || null,
          product.ean_number ?? null,
        ],
        (err, res) => {
          if (err) {
            if (err.code === "ER_DUP_ENTRY") {
              resolve({ code: 101 });
              return;
            }
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PRODUCT",
              code: "REPOSITORY.PRODUCT.CREATE",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve({ code: 200, id: res.insertId });
        }
      );
    });
  }

  getAllProductData() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           products.product_id,
           products.de_name as product_name,
           products.category_id,
           products.subcategory_id,
           products.department_id,
           products.brand_id,
           products.store_uom,
           pc.category_name,
           psc.subcategory_name,
           pd.department_name,
           pb.brand_name,
           products.gf_manufacturer,
           products.de_buyer_name,
           products.image_url,
           products.repln_mode,
           products.ean_number,
           ml_supplier.master_id AS supplier_id,
           ml_supplier.name AS supplier_name
         FROM products
         LEFT JOIN products_categories pc
           ON products.category_id = pc.category_id
         LEFT JOIN products_subcategories psc
           ON psc.subcategory_id = products.subcategory_id
         LEFT JOIN products_department pd
           ON pd.department_id = products.department_id
         LEFT JOIN products_brands pb
           ON pb.brand_id = products.brand_id
         LEFT JOIN master_list ml_supplier
           ON ml_supplier.master_id = products.distributor_id`,
        [],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PRODUCT",
              code: "REPOSITORY.PRODUCT.GETALL",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(docs);
        }
      );
    });
  }

  getByProductIds(productIds = []) {
    const ids = (productIds || []).filter(
      (id) => id != null && Number.isFinite(Number(id))
    );
    if (!ids.length) {
      return Promise.resolve([]);
    }

    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT product_id, de_name, de_buyer_name, holding_days
         FROM products
         WHERE product_id IN (?)`,
        [ids],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows || []);
        }
      );
    });
  }

  getProductById(product_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           products.*,
           pc.category_name,
           psc.subcategory_name,
           pd.department_name,
           pb.brand_name,
           ml_supplier.master_id AS supplier_id,
           ml_supplier.name AS supplier_name
         FROM products
         LEFT JOIN products_categories pc
           ON products.category_id = pc.category_id
         LEFT JOIN products_subcategories psc
           ON psc.subcategory_id = products.subcategory_id
         LEFT JOIN products_department pd
           ON pd.department_id = products.department_id
         LEFT JOIN products_brands pb
           ON pb.brand_id = products.brand_id
         LEFT JOIN master_list ml_supplier
           ON ml_supplier.master_id = products.distributor_id
         WHERE products.product_id = ?
         GROUP BY products.product_id`,
        [product_id],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PRODUCT",
              code: "REPOSITORY.PRODUCT.GET-ID",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(docs.length > 0 ? docs[0] : null);
        }
      );
    });
  }

  updateImageUrl(product_id, image_url) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `UPDATE products SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
        [image_url, product_id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PRODUCT",
              code: "REPOSITORY.PRODUCT.UPDATE_IMAGE_URL",
              description: err.toString(),
              category: "",
              ref: { product_id, image_url },
            });
            reject(err);
            return;
          }
          resolve({
            affectedRows: result.affectedRows,
            changedRows: result.changedRows,
          });
        }
      );
    });
  }

  bulkUpdateImageUrl(items) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(items) || items.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }
      const ids = [];
      const caseClauses = [];
      const params = [];
      items.forEach(({ product_id, image_url }) => {
        ids.push(product_id);
        caseClauses.push("WHEN ? THEN ?");
        params.push(product_id, image_url == null ? null : image_url);
      });
      params.push(...ids);
      const sql =
        `UPDATE products SET image_url = CASE product_id ${caseClauses.join(" ")} END, updated_at = CURRENT_TIMESTAMP WHERE product_id IN (${ids.map(() => "?").join(",")})`;
      this.db.query(sql, params, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PRODUCT",
            code: "REPOSITORY.PRODUCT.BULK_UPDATE_IMAGE_URL",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve({
          affectedRows: result.affectedRows,
          changedRows: result.changedRows,
        });
      });
    });
  }

  upsertCategory(category) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `INSERT INTO products_categories (category_id, category_name, department_id) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE category_name = ?, department_id = ?`,
        [
          category.category_id,
          category.category_name,
          category.department_id,
          category.category_name,
          category.department_id,
        ],
        (err) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PRODUCT",
              code: "REPOSITORY.PRODUCT.UPSERT-CATEGORY",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  upsertDepartment(department) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `INSERT INTO products_department (department_id, department_name) 
           VALUES (?, ?) 
           ON DUPLICATE KEY UPDATE department_name = ?`,
        [
          department.department_id,
          department.department_name,
          department.department_name,
        ],
        (err) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PRODUCT",
              code: "REPOSITORY.PRODUCT.UPSERT-DEPARTMENT",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  upsertSubCategory(subCategory) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `INSERT INTO products_subcategories (subcategory_id, subcategory_name, category_id) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE subcategory_name = ?, category_id = ?`,
        [
          subCategory.subcategory_id,
          subCategory.subcategory_name,
          subCategory.category_id,
          subCategory.subcategory_name,
          subCategory.category_id,
        ],
        (err) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PRODUCT",
              code: "REPOSITORY.PRODUCT.UPSERT-SUBCATEGORY",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  upsertBrand(brand) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `INSERT INTO products_brands (brand_id, brand_name, category_id) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE brand_name = ?, category_id = ?`,
        [
          brand.brand_id,
          brand.brand_name,
          brand.category_id,
          brand.brand_name,
          brand.category_id,
        ],
        (err) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PRODUCT",
              code: "REPOSITORY.PRODUCT.UPSERT-BRAND",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  getAllDepartments() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT * FROM products_department ORDER BY department_id`,
        [],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PRODUCT",
              code: "REPOSITORY.PRODUCT.GET_ALL_DEPARTMENTS",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(docs);
        }
      );
    });
  }

  getAllCategories() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT * FROM products_categories ORDER BY category_id`,
        [],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PRODUCT",
              code: "REPOSITORY.PRODUCT.GET_ALL_CATEGORIES",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(docs);
        }
      );
    });
  }

  getAllSubcategories() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT * FROM products_subcategories ORDER BY subcategory_id`,
        [],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PRODUCT",
              code: "REPOSITORY.PRODUCT.GET_ALL_SUBCATEGORIES",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(docs);
        }
      );
    });
  }

  getAllBrands() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT * FROM products_brands ORDER BY brand_id`,
        [],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PRODUCT",
              code: "REPOSITORY.PRODUCT.GET_ALL_BRANDS",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(docs);
        }
      );
    });
  }

  bulkCreate(products) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(products) || products.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      // Find all columns that are actually provided in at least one product
      const allPossibleColumns = [
        "product_id",
        "variant",
        "variant_of",
        "gf_item_name",
        "gf_description",
        "gf_detailed_description",
        "gf_weight_grams",
        "gf_applies_online",
        "gf_item_product_type",
        "gf_manufacturer",
        "gf_food_type",
        "gf_tax_id",
        "gf_status",
        "de_distributor",
        "distributor_id",
        "brand_id",
        "category_id",
        "subcategory_id",
        "measure",
        "measure_in",
        "packaging_type",
        "cleaning",
        "sticker",
        "grinding",
        "cover_type",
        "cover_sizes",
        "return_prod",
        "de_display_name",
        "department_id",
        "de_name",
        "de_packaging_type",
        "de_preparation_type",
        "de_combo_name",
        "de_buyer_name",
        "image_url",
        "repln_mode",
        "store_uom",
        "ean_number",
      ];

      // Find columns that exist in at least one product
      const providedColumnsSet = new Set();
      products.forEach((p) => {
        allPossibleColumns.forEach((col) => {
          if (p.hasOwnProperty(col) && p[col] !== undefined) {
            providedColumnsSet.add(col);
          }
        });
      });

      // product_id is required, ensure it's included
      if (!providedColumnsSet.has("product_id")) {
        reject(new Error("product_id is required for all products"));
        return;
      }

      // Sort columns: product_id first, then others
      const columns = ["product_id", ...Array.from(providedColumnsSet).filter((c) => c !== "product_id").sort()];

      // Build values array with only provided columns
      const values = products.map((p) => {
        return columns.map((col) => {
          if (p.hasOwnProperty(col)) {
            return p[col] === undefined ? null : p[col];
          }
          return null;
        });
      });

      const placeholders = values
        .map(() => `(${columns.map(() => "?").join(",")})`)
        .join(",");
      const flat = [].concat(...values);

      // Only update columns that were provided (excluding product_id)
      const updateColumns = columns.filter((c) => c !== "product_id");
      const updateAssignments = updateColumns
        .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
        .join(", ");

      const tickedColumns = columns.map((c) => `\`${c}\``).join(",");

      const sql =
        `INSERT INTO products (${tickedColumns}) VALUES ${placeholders}` +
        (updateAssignments.length > 0
          ? ` ON DUPLICATE KEY UPDATE ${updateAssignments}`
          : "");

      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PRODUCT",
            code: "REPOSITORY.PRODUCT.BULKCREATE.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve({
          affectedRows: result.affectedRows,
          insertedId: result.insertId,
        });
      });
    });
  }

  /**
   * @param {Array<[number, string]>} pairs - [product_id, ean_number]
   */
  bulkUpdateEanNumbers(pairs) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(pairs) || pairs.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      const CHUNK_SIZE = 500;
      let offset = 0;

      const runNext = () => {
        const chunk = pairs.slice(offset, offset + CHUNK_SIZE);
        if (chunk.length === 0) {
          resolve({ affectedRows: pairs.length });
          return;
        }

        const whenParts = chunk.map(() => "WHEN ? THEN ?").join(" ");
        const params = [];
        for (const [productId, ean] of chunk) {
          params.push(Number(productId), ean);
        }
        const inPlaceholders = chunk.map(() => "?").join(",");
        params.push(...chunk.map(([productId]) => Number(productId)));

        const sql = `UPDATE products SET ean_number = CASE product_id ${whenParts} END WHERE product_id IN (${inPlaceholders})`;

        this.db.query(sql, params, (err) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PRODUCT",
              code: "REPOSITORY.PRODUCT.BULKUPDATE-EAN.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          offset += CHUNK_SIZE;
          runNext();
        });
      };

      runNext();
    });
  }

  bulkUpsertCategory(categories) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(categories) || categories.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      const values = categories.map((c) => [
        c.category_id,
        c.category_name,
        c.department_id,
      ]);

      const placeholders = values.map(() => "(?, ?, ?)").join(",");
      const flat = [].concat(...values);

      const sql = `INSERT INTO products_categories (category_id, category_name, department_id) 
         VALUES ${placeholders} 
         ON DUPLICATE KEY UPDATE category_name = VALUES(category_name), department_id = VALUES(department_id)`;

      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PRODUCT",
            code: "REPOSITORY.PRODUCT.BULKUPSERT-CATEGORY.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve({
          affectedRows: result.affectedRows,
          insertedId: result.insertId,
        });
      });
    });
  }

  bulkUpsertSubCategory(subCategories) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(subCategories) || subCategories.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      const values = subCategories.map((sc) => [
        sc.subcategory_id,
        sc.subcategory_name,
        sc.category_id,
      ]);

      const placeholders = values.map(() => "(?, ?, ?)").join(",");
      const flat = [].concat(...values);

      const sql = `INSERT INTO products_subcategories (subcategory_id, subcategory_name, category_id) 
         VALUES ${placeholders} 
         ON DUPLICATE KEY UPDATE subcategory_name = VALUES(subcategory_name), category_id = VALUES(category_id)`;

      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PRODUCT",
            code: "REPOSITORY.PRODUCT.BULKUPSERT-SUBCATEGORY.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve({
          affectedRows: result.affectedRows,
          insertedId: result.insertId,
        });
      });
    });
  }

  bulkUpsertBrand(brands) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(brands) || brands.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      const values = brands.map((b) => [
        b.brand_id,
        b.brand_name,
        b.category_id,
      ]);

      const placeholders = values.map(() => "(?, ?, ?)").join(",");
      const flat = [].concat(...values);

      const sql = `INSERT INTO products_brands (brand_id, brand_name, category_id) 
         VALUES ${placeholders} 
         ON DUPLICATE KEY UPDATE brand_name = VALUES(brand_name), category_id = VALUES(category_id)`;

      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PRODUCT",
            code: "REPOSITORY.PRODUCT.BULKUPSERT-BRAND.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve({
          affectedRows: result.affectedRows,
          insertedId: result.insertId,
        });
      });
    });
  }

  bulkUpsertDepartment(departments) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(departments) || departments.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      const values = departments.map((d) => [
        d.department_id,
        d.department_name,
      ]);

      const placeholders = values.map(() => "(?, ?)").join(",");
      const flat = [].concat(...values);

      const sql = `INSERT INTO products_department (department_id, department_name) 
         VALUES ${placeholders} 
         ON DUPLICATE KEY UPDATE department_name = VALUES(department_name)`;

      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PRODUCT",
            code: "REPOSITORY.PRODUCT.BULKUPSERT-DEPARTMENT.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        resolve({
          affectedRows: result.affectedRows,
          insertedId: result.insertId,
        });
      });
    });
  }
}

module.exports = (db) => {
  return new ProductRepository(db);
};
