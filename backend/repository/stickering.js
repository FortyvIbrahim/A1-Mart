const logger = require("../utils/logger");

const COMMON_GET_ALL_QUERY = `SELECT 
         s.*, 
         p.de_name as product_name, 
         p.repln_mode, 
         e.employee_name, 
         p.store_uom,
         -- Sticker type 1 material fields
         m1.material_id as st1_material_id,
         m1.name as st1_name,
         m1.description as st1_description,
         m1.image_url as st1_image_url,
         m1.live_stock as st1_live_stock,
         m1.unit_id as st1_unit_id,
         m1.material_category_id as st1_material_category_id,
         m1.supplier_id as st1_supplier_id,
         m1.is_active as st1_is_active,
         m1.tax_percentage as st1_tax_percentage,
         m1.hsn_number as st1_hsn_number,
         -- Sticker type 2 material fields
         m2.material_id as st2_material_id,
         m2.name as st2_name,
         m2.description as st2_description,
         m2.image_url as st2_image_url,
         m2.live_stock as st2_live_stock,
         m2.unit_id as st2_unit_id,
         m2.material_category_id as st2_material_category_id,
         m2.supplier_id as st2_supplier_id,
         m2.is_active as st2_is_active,
         m2.tax_percentage as st2_tax_percentage,
         m2.hsn_number as st2_hsn_number,
         pa.invoice_no as purchase_acknowledgment_invoice_no,
         pa.created_at as purchase_acknowledgment_created_at,
         pa.invoice_date as purchase_acknowledgment_invoice_date,
         pa.amount as purchase_acknowledgment_amount,
         pa.branch_id as purchase_acknowledgment_branch_id,
         bpa.branch_name as purchase_acknowledgment_branch_name,
         ml.name as supplier_name,
         sup.employee_name as supervisor_name,
         repack_sup.employee_name as repack_supervisor_name
         FROM stickering s
         LEFT JOIN products p ON s.product_id = p.product_id
         LEFT JOIN employees e ON s.employee_code = e.employee_code
         LEFT JOIN purchase_acknowledgment pa ON s.purchase_acknowledgment_id = pa.purchase_acknowledgment_id
         LEFT JOIN master_list ml ON pa.supplier_id = ml.master_id
         LEFT JOIN branches bpa ON pa.branch_id = bpa.branch_id
         LEFT JOIN employees sup ON s.supervisor_id = sup.employee_code
         LEFT JOIN employees repack_sup ON s.repack_supervisor_id = repack_sup.employee_code
         LEFT JOIN materials m1 ON s.sticker_type_1 = m1.material_id
         LEFT JOIN materials m2 ON s.sticker_type_2 = m2.material_id`

class StickeringRepository {
  constructor(db) {
    this.db = db;
  }

  create(stickeringData) {
    return new Promise((resolve, reject) => {
      const {
        product_id,
        qty,
        employee_code,
        status = "open",
        packing = null,
        loose = null,
        pur_ret = null,
        wastage = null,
        purchase_acknowledgment_id = null,
        supervisor_id = null,
        repack_supervisor_id = null,
        sticker_type_1 = null,
        sticker_type_2 = null,
        material_type = null,
      } = stickeringData;

      this.db.query(
        "INSERT INTO stickering (product_id, qty, employee_code, status, packing, loose, pur_ret, wastage, purchase_acknowledgment_id, supervisor_id, repack_supervisor_id, sticker_type_1, sticker_type_2, material_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          product_id,
          qty,
          employee_code || null,
          status,
          packing,
          loose,
          pur_ret,
          wastage,
          purchase_acknowledgment_id,
          supervisor_id,
          repack_supervisor_id,
          sticker_type_1,
          sticker_type_2,
          material_type || null,
        ],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STICKERING",
              code: "REPOSITORY.STICKERING.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { stickeringData },
            });
            reject(err);
            return;
          }
          resolve({ id: result.insertId, ...stickeringData });
        }
      );
    });
  }

  bulkCreate(rows) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(rows) || rows.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      const columns = [
        "product_id",
        "qty",
        "employee_code",
        "status",
        "packing",
        "loose",
        "pur_ret",
        "wastage",
        "purchase_acknowledgment_id",
        "supervisor_id",
        "repack_supervisor_id",
        "sticker_type_1",
        "sticker_type_2",
        "material_type",
      ];
      const values = rows.map((r) => [
        r.product_id,
        r.qty,
        r.employee_code ?? null,
        r.status || "open",
        r.packing ?? null,
        r.loose ?? null,
        r.pur_ret ?? null,
        r.wastage ?? null,
        r.purchase_acknowledgment_id ?? null,
        r.supervisor_id ?? null,
        r.repack_supervisor_id ?? null,
        r.sticker_type_1 ?? null,
        r.sticker_type_2 ?? null,
        r.material_type ?? null,
      ]);
      const placeholders = values
        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .join(",");
      const flat = [].concat(...values);

      const sql = `INSERT INTO stickering (product_id, qty, employee_code, status, packing, loose, pur_ret, wastage, purchase_acknowledgment_id, supervisor_id, repack_supervisor_id, sticker_type_1, sticker_type_2, material_type) VALUES ${placeholders}`;

      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.STICKERING",
            code: "REPOSITORY.STICKERING.BULKCREATE.ERROR",
            description: err.toString(),
            category: "",
            ref: { rows },
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

  getAll(filters = {}) {
    return new Promise((resolve, reject) => {
      const dateWhereParts = [];
      const dateParams = [];
      if (filters.from != null) {
        dateWhereParts.push("DATE(pa.created_at) >= DATE(?)");
        dateParams.push(filters.from);
      }
      if (filters.to != null) {
        dateWhereParts.push("DATE(pa.created_at) <= DATE(?)");
        dateParams.push(filters.to);
      }
      const dateWhereSql =
        dateWhereParts.length > 0
          ? ` WHERE ${dateWhereParts.join(" AND ")}`
          : "";

      this.db.query(
        `${COMMON_GET_ALL_QUERY}
         ${dateWhereSql}
         ORDER BY s.created_at DESC`,
        dateParams,
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STICKERING",
              code: "REPOSITORY.STICKERING.GET_ALL.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          // Map material fields into nested objects
          const mapped = docs.map((row) => {
            const {
              st1_material_id,
              st1_name,
              st1_description,
              st1_image_url,
              st1_live_stock,
              st1_unit_id,
              st1_material_category_id,
              st1_supplier_id,
              st1_is_active,
              st1_tax_percentage,
              st1_hsn_number,
              st2_material_id,
              st2_name,
              st2_description,
              st2_image_url,
              st2_live_stock,
              st2_unit_id,
              st2_material_category_id,
              st2_supplier_id,
              st2_is_active,
              st2_tax_percentage,
              st2_hsn_number,
              ...rest
            } = row;

            return {
              ...rest,
              sticker_type_1_material: st1_material_id
                ? {
                  material_id: st1_material_id,
                  name: st1_name,
                  description: st1_description,
                  image_url: st1_image_url,
                  live_stock: st1_live_stock,
                  unit_id: st1_unit_id,
                  material_category_id: st1_material_category_id,
                  supplier_id: st1_supplier_id,
                  is_active: st1_is_active,
                  tax_percentage: st1_tax_percentage,
                  hsn_number: st1_hsn_number,
                }
                : null,
              sticker_type_2_material: st2_material_id
                ? {
                  material_id: st2_material_id,
                  name: st2_name,
                  description: st2_description,
                  image_url: st2_image_url,
                  live_stock: st2_live_stock,
                  unit_id: st2_unit_id,
                  material_category_id: st2_material_category_id,
                  supplier_id: st2_supplier_id,
                  is_active: st2_is_active,
                  tax_percentage: st2_tax_percentage,
                  hsn_number: st2_hsn_number,
                }
                : null,
            };
          });

          resolve(mapped);
        }
      );
    });
  }

  getById(stickeringId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `${COMMON_GET_ALL_QUERY}
         WHERE s.stickering_id = ?`,
        [stickeringId],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STICKERING",
              code: "REPOSITORY.STICKERING.GET_BY_ID.ERROR",
              description: err.toString(),
              category: "",
              ref: { stickeringId },
            });
            reject(err);
            return;
          }
          if (docs.length === 0) {
            resolve(null);
            return;
          }

          const row = docs[0];
          const {
            st1_material_id,
            st1_name,
            st1_description,
            st1_image_url,
            st1_live_stock,
            st1_unit_id,
            st1_material_category_id,
            st1_supplier_id,
            st1_is_active,
            st1_tax_percentage,
            st1_hsn_number,
            st2_material_id,
            st2_name,
            st2_description,
            st2_image_url,
            st2_live_stock,
            st2_unit_id,
            st2_material_category_id,
            st2_supplier_id,
            st2_is_active,
            st2_tax_percentage,
            st2_hsn_number,
            ...rest
          } = row;

          const result = {
            ...rest,
            sticker_type_1_material: st1_material_id
              ? {
                material_id: st1_material_id,
                name: st1_name,
                description: st1_description,
                image_url: st1_image_url,
                live_stock: st1_live_stock,
                unit_id: st1_unit_id,
                material_category_id: st1_material_category_id,
                supplier_id: st1_supplier_id,
                is_active: st1_is_active,
                tax_percentage: st1_tax_percentage,
                hsn_number: st1_hsn_number,
              }
              : null,
            sticker_type_2_material: st2_material_id
              ? {
                material_id: st2_material_id,
                name: st2_name,
                description: st2_description,
                image_url: st2_image_url,
                live_stock: st2_live_stock,
                unit_id: st2_unit_id,
                material_category_id: st2_material_category_id,
                supplier_id: st2_supplier_id,
                is_active: st2_is_active,
                tax_percentage: st2_tax_percentage,
                hsn_number: st2_hsn_number,
              }
              : null,
          };

          resolve(result);
        }
      );
    });
  }

  getByEmployeeCode(employeeCode) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `${COMMON_GET_ALL_QUERY}
         WHERE s.employee_code = ? OR s.supervisor_id = ?
         ORDER BY s.created_at DESC`,
        [employeeCode, employeeCode],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STICKERING",
              code: "REPOSITORY.STICKERING.GET_BY_EMPLOYEE_CODE.ERROR",
              description: err.toString(),
              category: "",
              ref: { employeeCode },
            });
            reject(err);
            return;
          }
          const mapped = docs.map((row) => {
            const {
              st1_material_id,
              st1_name,
              st1_description,
              st1_image_url,
              st1_live_stock,
              st1_unit_id,
              st1_material_category_id,
              st1_supplier_id,
              st1_is_active,
              st1_tax_percentage,
              st1_hsn_number,
              st2_material_id,
              st2_name,
              st2_description,
              st2_image_url,
              st2_live_stock,
              st2_unit_id,
              st2_material_category_id,
              st2_supplier_id,
              st2_is_active,
              st2_tax_percentage,
              st2_hsn_number,
              ...rest
            } = row;

            return {
              ...rest,
              sticker_type_1_material: st1_material_id
                ? {
                  material_id: st1_material_id,
                  name: st1_name,
                  description: st1_description,
                  image_url: st1_image_url,
                  live_stock: st1_live_stock,
                  unit_id: st1_unit_id,
                  material_category_id: st1_material_category_id,
                  supplier_id: st1_supplier_id,
                  is_active: st1_is_active,
                  tax_percentage: st1_tax_percentage,
                  hsn_number: st1_hsn_number,
                }
                : null,
              sticker_type_2_material: st2_material_id
                ? {
                  material_id: st2_material_id,
                  name: st2_name,
                  description: st2_description,
                  image_url: st2_image_url,
                  live_stock: st2_live_stock,
                  unit_id: st2_unit_id,
                  material_category_id: st2_material_category_id,
                  supplier_id: st2_supplier_id,
                  is_active: st2_is_active,
                  tax_percentage: st2_tax_percentage,
                  hsn_number: st2_hsn_number,
                }
                : null,
            };
          });

          resolve(mapped);
        }
      );
    });
  }

  getBySupervisorId(supervisorId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `${COMMON_GET_ALL_QUERY}
         WHERE s.repack_supervisor_id = ?
         ORDER BY s.created_at DESC`,
        [supervisorId],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STICKERING",
              code: "REPOSITORY.STICKERING.GET_BY_SUPERVISOR_ID.ERROR",
              description: err.toString(),
              category: "",
              ref: { supervisorId },
            });
            reject(err);
            return;
          }
          const mapped = docs.map((row) => {
            const {
              st1_material_id,
              st1_name,
              st1_description,
              st1_image_url,
              st1_live_stock,
              st1_unit_id,
              st1_material_category_id,
              st1_supplier_id,
              st1_is_active,
              st1_tax_percentage,
              st1_hsn_number,
              st2_material_id,
              st2_name,
              st2_description,
              st2_image_url,
              st2_live_stock,
              st2_unit_id,
              st2_material_category_id,
              st2_supplier_id,
              st2_is_active,
              st2_tax_percentage,
              st2_hsn_number,
              ...rest
            } = row;

            return {
              ...rest,
              sticker_type_1_material: st1_material_id
                ? {
                  material_id: st1_material_id,
                  name: st1_name,
                  description: st1_description,
                  image_url: st1_image_url,
                  live_stock: st1_live_stock,
                  unit_id: st1_unit_id,
                  material_category_id: st1_material_category_id,
                  supplier_id: st1_supplier_id,
                  is_active: st1_is_active,
                  tax_percentage: st1_tax_percentage,
                  hsn_number: st1_hsn_number,
                }
                : null,
              sticker_type_2_material: st2_material_id
                ? {
                  material_id: st2_material_id,
                  name: st2_name,
                  description: st2_description,
                  image_url: st2_image_url,
                  live_stock: st2_live_stock,
                  unit_id: st2_unit_id,
                  material_category_id: st2_material_category_id,
                  supplier_id: st2_supplier_id,
                  is_active: st2_is_active,
                  tax_percentage: st2_tax_percentage,
                  hsn_number: st2_hsn_number,
                }
                : null,
            };
          });

          resolve(mapped);
        }
      );
    });
  }

  getByPurchaseAcknowledgmentId(purchaseAcknowledgmentId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `${COMMON_GET_ALL_QUERY}
         WHERE s.purchase_acknowledgment_id = ?
         ORDER BY s.created_at DESC`,
        [purchaseAcknowledgmentId],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STICKERING",
              code: "REPOSITORY.STICKERING.GET_BY_PURCHASE_ACK_ID.ERROR",
              description: err.toString(),
              category: "",
              ref: { purchaseAcknowledgmentId },
            });
            reject(err);
            return;
          }
          const mapped = docs.map((row) => {
            const {
              st1_material_id,
              st1_name,
              st1_description,
              st1_image_url,
              st1_live_stock,
              st1_unit_id,
              st1_material_category_id,
              st1_supplier_id,
              st1_is_active,
              st1_tax_percentage,
              st1_hsn_number,
              st2_material_id,
              st2_name,
              st2_description,
              st2_image_url,
              st2_live_stock,
              st2_unit_id,
              st2_material_category_id,
              st2_supplier_id,
              st2_is_active,
              st2_tax_percentage,
              st2_hsn_number,
              ...rest
            } = row;

            return {
              ...rest,
              sticker_type_1_material: st1_material_id
                ? {
                  material_id: st1_material_id,
                  name: st1_name,
                  description: st1_description,
                  image_url: st1_image_url,
                  live_stock: st1_live_stock,
                  unit_id: st1_unit_id,
                  material_category_id: st1_material_category_id,
                  supplier_id: st1_supplier_id,
                  is_active: st1_is_active,
                  tax_percentage: st1_tax_percentage,
                  hsn_number: st1_hsn_number,
                }
                : null,
              sticker_type_2_material: st2_material_id
                ? {
                  material_id: st2_material_id,
                  name: st2_name,
                  description: st2_description,
                  image_url: st2_image_url,
                  live_stock: st2_live_stock,
                  unit_id: st2_unit_id,
                  material_category_id: st2_material_category_id,
                  supplier_id: st2_supplier_id,
                  is_active: st2_is_active,
                  tax_percentage: st2_tax_percentage,
                  hsn_number: st2_hsn_number,
                }
                : null,
            };
          });

          resolve(mapped);
        }
      );
    });
  }

  update(stickeringId, stickeringData) {
    return new Promise((resolve, reject) => {
      const {
        product_id,
        qty,
        employee_code,
        status,
        packing,
        loose,
        pur_ret,
        wastage,
        purchase_acknowledgment_id,
        supervisor_id,
        repack_supervisor_id,
        sticker_type_1,
        sticker_type_2,
        material_type,
      } = stickeringData;

      const updateFields = [];
      const updateValues = [];

      if (product_id !== undefined) {
        updateFields.push("product_id = ?");
        updateValues.push(product_id);
      }
      if (qty !== undefined) {
        updateFields.push("qty = ?");
        updateValues.push(qty);
      }
      if (employee_code !== undefined) {
        updateFields.push("employee_code = ?");
        updateValues.push(employee_code || null);
      }
      if (status !== undefined) {
        updateFields.push("status = ?");
        updateValues.push(status);
      }
      if (packing !== undefined) {
        updateFields.push("packing = ?");
        updateValues.push(packing);
      }
      if (loose !== undefined) {
        updateFields.push("loose = ?");
        updateValues.push(loose);
      }
      if (pur_ret !== undefined) {
        updateFields.push("pur_ret = ?");
        updateValues.push(pur_ret);
      }
      if (wastage !== undefined) {
        updateFields.push("wastage = ?");
        updateValues.push(wastage);
      }
      if (purchase_acknowledgment_id !== undefined) {
        updateFields.push("purchase_acknowledgment_id = ?");
        updateValues.push(purchase_acknowledgment_id);
      }
      if (supervisor_id !== undefined) {
        updateFields.push("supervisor_id = ?");
        updateValues.push(supervisor_id);
      }
      if (repack_supervisor_id !== undefined) {
        updateFields.push("repack_supervisor_id = ?");
        updateValues.push(repack_supervisor_id);
      }
      if (sticker_type_1 !== undefined) {
        updateFields.push("sticker_type_1 = ?");
        updateValues.push(sticker_type_1);
      }
      if (sticker_type_2 !== undefined) {
        updateFields.push("sticker_type_2 = ?");
        updateValues.push(sticker_type_2);
      }
      if (material_type !== undefined) {
        updateFields.push("material_type = ?");
        updateValues.push(material_type || null);
      }

      if (updateFields.length === 0) {
        resolve({ message: "No fields to update" });
        return;
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(stickeringId);

      this.db.query(
        `UPDATE stickering SET ${updateFields.join(
          ", "
        )} WHERE stickering_id = ?`,
        updateValues,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STICKERING",
              code: "REPOSITORY.STICKERING.UPDATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { stickeringId, stickeringData },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows, stickeringId });
        }
      );
    });
  }

  delete(stickeringId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM stickering WHERE stickering_id = ?",
        [stickeringId],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STICKERING",
              code: "REPOSITORY.STICKERING.DELETE.ERROR",
              description: err.toString(),
              category: "",
              ref: { stickeringId },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows, stickeringId });
        }
      );
    });
  }
}

module.exports = (db) => {
  return new StickeringRepository(db);
};
