const logger = require("../utils/logger");

class MaterialsRepository {
  constructor(db) {
    this.db = db;
  }

  // --- materials CRUD ---
  getMaterials(offset, limit) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT ml.*, mc.material_category_id as cat_id, mc.category_name, mc.is_active as cat_is_active, mc.created_at as cat_created_at, mc.updated_at as cat_updated_at, master_list.name as supplier_name, master_list.phone as supplier_phone FROM materials ml
        LEFT JOIN materials_category mc ON ml.material_category_id = mc.material_category_id
        LEFT JOIN master_list ON master_id = ml.supplier_id
        LIMIT ?, ?`,
        [offset, limit],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MATERIALS",
              code: "REPOSITORY.MATERIALS.GET",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          // Map category fields into a nested object
          const result = docs.map((row) => {
            const {
              cat_id,
              category_name,
              cat_is_active,
              cat_created_at,
              cat_updated_at,
              ...material
            } = row;
            return {
              ...material,
              category: cat_id
                ? {
                  material_category_id: cat_id,
                  category_name,
                  is_active: cat_is_active,
                  created_at: cat_created_at,
                  updated_at: cat_updated_at,
                }
                : null,
            };
          });
          resolve(result);
        }
      );
    });
  }

  getMaterialById(material_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT ml.*, mc.material_category_id as cat_id, mc.category_name, mc.is_active as cat_is_active, mc.created_at as cat_created_at, mc.updated_at as cat_updated_at FROM materials ml LEFT JOIN materials_category mc ON ml.material_category_id = mc.material_category_id WHERE ml.material_id = ?`,
        [material_id],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MATERIALS",
              code: "REPOSITORY.MATERIALS.GET-BY-ID",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          if (!docs[0]) return resolve(undefined);
          const row = docs[0];
          const {
            cat_id,
            category_name,
            cat_is_active,
            cat_created_at,
            cat_updated_at,
            ...material
          } = row;
          const result = {
            ...material,
            category: cat_id
              ? {
                material_category_id: cat_id,
                category_name,
                is_active: cat_is_active,
                created_at: cat_created_at,
                updated_at: cat_updated_at,
              }
              : null,
          };
          resolve(result);
        }
      );
    });
  }

  createMaterial(material) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `INSERT INTO materials (name, description, image_url, live_stock, unit_id, material_category_id, supplier_id, is_active, tax_percentage, hsn_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          material.name,
          material.description,
          material.image_url,
          material.live_stock,
          material.unit_id,
          material.material_category_id,
          material.supplier_id ?? null,
          material.is_active ?? true,
          material.tax_percentage ?? null,
          material.hsn_number ?? null,
        ],
        (err, res) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MATERIALS",
              code: "REPOSITORY.MATERIALS.CREATE",
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

  updateMaterial(material_id, material) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `UPDATE materials SET ? WHERE material_id = ?`,
        [material, material_id],
        (err, res) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MATERIALS",
              code: "REPOSITORY.MATERIALS.UPDATE",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve({ code: 200 });
        }
      );
    });
  }

  deleteMaterial(material_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `DELETE FROM materials WHERE material_id = ?`,
        [material_id],
        (err, res) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MATERIALS",
              code: "REPOSITORY.MATERIALS.DELETE",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve({ code: 200 });
        }
      );
    });
  }

  reduceStock(material_id, stock) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `UPDATE materials SET live_stock = live_stock - ? WHERE material_id = ?`,
        [stock, material_id],
        (err, res) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MATERIALS",
              code: "REPOSITORY.MATERIALS.REDUCE-STOCK",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve({ code: 200, affectedRows: res.affectedRows });
        }
      );
    });
  }

  increaseStock(material_id, stock) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `UPDATE materials SET live_stock = live_stock + ? WHERE material_id = ?`,
        [stock, material_id],
        (err, res) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MATERIALS",
              code: "REPOSITORY.MATERIALS.INCREASE-STOCK",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve({ code: 200, affectedRows: res.affectedRows });
        }
      );
    });
  }

  getMaterialsWithLatestRate(offset, limit) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
          ml.*, 
          mc.material_category_id as cat_id, 
          mc.category_name, 
          mc.is_active as cat_is_active, 
          mc.created_at as cat_created_at, 
          mc.updated_at as cat_updated_at, 
          master_list.name as supplier_name, 
          master_list.phone as supplier_phone,
          latest_rate.rate as latest_rate,
          latest_rate.purchase_entry_item_id as latest_purchase_entry_item_id,
          latest_rate.created_at as latest_rate_date
        FROM materials ml
        LEFT JOIN materials_category mc ON ml.material_category_id = mc.material_category_id
        LEFT JOIN master_list ON master_id = ml.supplier_id
        LEFT JOIN (
          SELECT poi1.material_id, poi1.rate, poi1.purchase_entry_item_id, poi1.created_at
          FROM purchase_entry_items poi1
          INNER JOIN (
            SELECT material_id, MAX(created_at) as max_created_at
            FROM purchase_entry_items
            GROUP BY material_id
          ) poi2 ON poi1.material_id = poi2.material_id AND poi1.created_at = poi2.max_created_at
        ) latest_rate ON ml.material_id = latest_rate.material_id
        LIMIT ?, ?`,
        [offset, limit],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MATERIALS",
              code: "REPOSITORY.MATERIALS.GET-WITH-LATEST-RATE",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          // Map category fields into a nested object
          const result = docs.map((row) => {
            const {
              cat_id,
              category_name,
              cat_is_active,
              cat_created_at,
              cat_updated_at,
              latest_rate,
              latest_purchase_entry_item_id,
              latest_rate_date,
              ...material
            } = row;
            return {
              ...material,
              category: cat_id
                ? {
                  material_category_id: cat_id,
                  category_name,
                  is_active: cat_is_active,
                  created_at: cat_created_at,
                  updated_at: cat_updated_at,
                }
                : null,
              latest_rate:
                latest_rate !== null ? parseFloat(latest_rate) : null,
              latest_rate_info:
                latest_rate !== null
                  ? {
                    purchase_entry_item_id: latest_purchase_entry_item_id,
                    rate: parseFloat(latest_rate),
                    date: latest_rate_date,
                  }
                  : null,
            };
          });
          resolve(result);
        }
      );
    });
  }

  // --- materials_category CRUD ---
  getCategories(offset, limit) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT * FROM materials_category LIMIT ?, ?`,
        [offset, limit],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MATERIALS.CATEGORY",
              code: "REPOSITORY.MATERIALS.CATEGORY.GET",
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

  getCategoryById(material_category_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT * FROM materials_category WHERE material_category_id = ?`,
        [material_category_id],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MATERIALS.CATEGORY",
              code: "REPOSITORY.MATERIALS.CATEGORY.GET-BY-ID",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(docs[0]);
        }
      );
    });
  }

  createCategory(category) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `INSERT INTO materials_category (category_name, is_active) VALUES (?, ?)`,
        [category.category_name, category.is_active ?? true],
        (err, res) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MATERIALS.CATEGORY",
              code: "REPOSITORY.MATERIALS.CATEGORY.CREATE",
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

  updateCategory(material_category_id, category) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `UPDATE materials_category SET ? WHERE material_category_id = ?`,
        [category, material_category_id],
        (err, res) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MATERIALS.CATEGORY",
              code: "REPOSITORY.MATERIALS.CATEGORY.UPDATE",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve({ code: 200 });
        }
      );
    });
  }

  deleteCategory(material_category_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `DELETE FROM materials_category WHERE material_category_id = ?`,
        [material_category_id],
        (err, res) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MATERIALS.CATEGORY",
              code: "REPOSITORY.MATERIALS.CATEGORY.DELETE",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve({ code: 200 });
        }
      );
    });
  }
}

module.exports = (db) => {
  return new MaterialsRepository(db);
};
