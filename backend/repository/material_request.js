// repository/material_request.js
const logger = require("../utils/logger");

class MaterialRequestRepository {
  constructor(db) {
    this.db = db;
  }

  createMaterialRequest(data, items) {
    return new Promise(async (resolve, reject) => {
      try {
        // All fields are required for material_request table
        const fields = ["created_by", "outlet_id", "is_approved"];
        const values = [data.created_by, data.outlet_id, data.is_approved];
        const sql = `INSERT INTO material_request (${fields.join(
          ", "
        )}) VALUES (${fields.map(() => "?").join(", ")})`;
        this.db.query(sql, values, async (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MATERIAL_REQUEST",
              code: "REPOSITORY.MATERIAL_REQUEST.CREATE",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          const material_request_id = result.insertId;
          if (items && items.length > 0) {
            const filteredItems = items.map((item) => {
              // Always include all 4 fields for material_request_list
              return [
                material_request_id,
                item.material_id,
                item.quantity,
                item.remark || null, // Use null if remark is empty/undefined
              ];
            });
            // Filter out items where required fields are missing
            const validItems = filteredItems.filter(
              (arr) =>
                arr[1] !== undefined &&
                arr[1] !== null &&
                arr[1] !== "" && // material_id
                arr[2] !== undefined &&
                arr[2] !== null &&
                arr[2] !== "" // quantity
            );
            if (validItems.length > 0) {
              this.db.query(
                `INSERT INTO material_request_list (material_request_id, material_id, quantity, remark) VALUES ?`,
                [validItems],
                (err2) => {
                  if (err2) {
                    logger.Log({
                      level: logger.LEVEL.ERROR,
                      component: "REPOSITORY.MATERIAL_REQUEST",
                      code: "REPOSITORY.MATERIAL_REQUEST.LIST.CREATE",
                      description: err2.toString(),
                      category: "",
                      ref: {},
                    });
                    reject(err2);
                    return;
                  }
                  resolve(material_request_id);
                }
              );
            } else {
              resolve(material_request_id);
            }
          } else {
            resolve(material_request_id);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getMaterialRequestById(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT mr.*, employees.employee_code AS creator_employee_id, employees.employee_name AS creator_employee_name
         FROM material_request mr
         LEFT JOIN user ne ON mr.created_by = ne.user_id
         LEFT JOIN employees ON ne.employee_id = employees.employee_code
         WHERE mr.material_request_id = ?`,
        [id],
        (err, requests) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MATERIAL_REQUEST",
              code: "REPOSITORY.MATERIAL_REQUEST.GET-BY-ID",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          if (!requests.length) return resolve(undefined);
          const request = requests[0];
          this.db.query(
            `SELECT mrl.*, ml.*
             FROM material_request_list mrl
             LEFT JOIN materials ml ON mrl.material_id = ml.material_id
             WHERE mrl.material_request_id = ?`,
            [id],
            (err2, items) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.MATERIAL_REQUEST",
                  code: "REPOSITORY.MATERIAL_REQUEST.LIST.GET-BY-ID",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }
              resolve({
                material_request_id: request.material_request_id,
                created_by: request.created_by,
                outlet_id: request.outlet_id,
                created_at: request.created_at,
                updated_at: request.updated_at,
                is_approved: request.is_approved,
                creator_data: {
                  employee_id: request.creator_employee_id,
                  employee_name: request.creator_employee_name,
                },
                items: items.map((item) => ({
                  material_request_list_id: item.material_request_list_id,
                  material_id: item.material_id,
                  quantity: item.quantity,
                  remark: item.remark,
                  material: {
                    material_id: item.material_id,
                    ...item,
                  },
                })),
              });
            }
          );
        }
      );
    });
  }

  getAllMaterialRequests(branch_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT mr.*, employees.employee_code AS creator_employee_id, employees.employee_name AS creator_employee_name
         FROM material_request mr
         LEFT JOIN user ne ON mr.created_by = ne.user_id
         LEFT JOIN employees ON ne.employee_id = employees.employee_code
         LEFT JOIN branches ON mr.outlet_id = branches.branch_id
         ${branch_id ? `WHERE branches.branch_id = ?` : ""}
         ORDER BY mr.is_approved ASC`,
        branch_id ? [branch_id] : [],
        (err, requests) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MATERIAL_REQUEST",
              code: "REPOSITORY.MATERIAL_REQUEST.GET-ALL",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          const results = [];
          let count = 0;
          if (!requests.length) return resolve([]);
          requests.forEach((request) => {
            this.db.query(
              `SELECT mrl.*, ml.*
               FROM material_request_list mrl
               LEFT JOIN materials ml ON mrl.material_id = ml.material_id
               WHERE mrl.material_request_id = ?`,
              [request.material_request_id],
              (err2, items) => {
                if (err2) {
                  logger.Log({
                    level: logger.LEVEL.ERROR,
                    component: "REPOSITORY.MATERIAL_REQUEST",
                    code: "REPOSITORY.MATERIAL_REQUEST.LIST.GET-ALL",
                    description: err2.toString(),
                    category: "",
                    ref: {},
                  });
                  reject(err2);
                  return;
                }
                results.push({
                  ...request,
                  material_request_id: request.material_request_id,
                  created_by: request.created_by,
                  outlet_id: request.outlet_id,
                  created_at: request.created_at,
                  updated_at: request.updated_at,
                  is_approved: request.is_approved,
                  creator_data: {
                    employee_id: request.creator_employee_id,
                    employee_name: request.creator_employee_name,
                  },
                  items: items.map((item) => ({
                    material_request_list_id: item.material_request_list_id,
                    material_id: item.material_id,
                    quantity: item.quantity,
                    remark: item.remark,
                    material: {
                      material_id: item.material_id,
                      ...item,
                    },
                  })),
                });
                count++;
                if (count === requests.length) {
                  resolve(results);
                }
              }
            );
          });
        }
      );
    });
  }

  updateMaterialRequest(id, data, items) {
    return new Promise((resolve, reject) => {
      // For updates, we can allow partial updates, but validate that at least one field is provided
      const fields = [];
      const values = [];

      if (
        data.created_by !== undefined &&
        data.created_by !== null &&
        data.created_by !== ""
      ) {
        fields.push("created_by = ?");
        values.push(data.created_by);
      }
      if (
        data.outlet_id !== undefined &&
        data.outlet_id !== null &&
        data.outlet_id !== ""
      ) {
        fields.push("outlet_id = ?");
        values.push(data.outlet_id);
      }
      if (
        data.is_approved !== undefined &&
        data.is_approved !== null &&
        data.is_approved !== ""
      ) {
        fields.push("is_approved = ?");
        values.push(data.is_approved);
      }

      // Always update the updated_at timestamp
      fields.push("updated_at = NOW()");
      const sql = `UPDATE material_request SET ${fields.join(
        ", "
      )} WHERE material_request_id = ?`;
      values.push(id);
      this.db.query(sql, values, (err) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.MATERIAL_REQUEST",
            code: "REPOSITORY.MATERIAL_REQUEST.UPDATE",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        if (items) {
          this.db.query(
            "DELETE FROM material_request_list WHERE material_request_id = ?",
            [id],
            (err2) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.MATERIAL_REQUEST",
                  code: "REPOSITORY.MATERIAL_REQUEST.LIST.DELETE",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }
              if (items.length > 0) {
                const filteredItems = items.map((item) => {
                  // Always include all 4 fields for material_request_list
                  return [
                    id,
                    item.material_id,
                    item.quantity,
                    item.remark || null, // Use null if remark is empty/undefined
                  ];
                });
                // Filter out items where required fields are missing
                const validItems = filteredItems.filter(
                  (arr) =>
                    arr[1] !== undefined &&
                    arr[1] !== null &&
                    arr[1] !== "" && // material_id
                    arr[2] !== undefined &&
                    arr[2] !== null &&
                    arr[2] !== "" // quantity
                );
                if (validItems.length > 0) {
                  this.db.query(
                    "INSERT INTO material_request_list (material_request_id, material_id, quantity, remark) VALUES ?",
                    [validItems],
                    (err3) => {
                      if (err3) {
                        logger.Log({
                          level: logger.LEVEL.ERROR,
                          component: "REPOSITORY.MATERIAL_REQUEST",
                          code: "REPOSITORY.MATERIAL_REQUEST.LIST.INSERT",
                          description: err3.toString(),
                          category: "",
                          ref: {},
                        });
                        reject(err3);
                        return;
                      }
                      resolve(true);
                    }
                  );
                } else {
                  resolve(true);
                }
              } else {
                resolve(true);
              }
            }
          );
        } else {
          resolve(true);
        }
      });
    });
  }

  deleteMaterialRequest(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM material_request_list WHERE material_request_id = ?",
        [id],
        (err) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MATERIAL_REQUEST",
              code: "REPOSITORY.MATERIAL_REQUEST.LIST.DELETE",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          this.db.query(
            "DELETE FROM material_request WHERE material_request_id = ?",
            [id],
            (err2) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.MATERIAL_REQUEST",
                  code: "REPOSITORY.MATERIAL_REQUEST.DELETE",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }
              resolve(true);
            }
          );
        }
      );
    });
  }
}

module.exports = (db) => new MaterialRequestRepository(db);
