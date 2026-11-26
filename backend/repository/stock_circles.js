const logger = require("../utils/logger");

class StockCirclesRepository {
  constructor(db) {
    this.db = db;
  }

  _uniqueDepartmentIds(departmentIds) {
    return [...new Set(departmentIds.map((id) => parseInt(id, 10)).filter(Number.isFinite))];
  }

  _baseSelectFrom() {
    return `FROM stock_circles sc
         LEFT JOIN products_categories pc
           ON sc.category_id = pc.category_id
         LEFT JOIN products_subcategories psc
           ON sc.subcategory_id = psc.subcategory_id
         LEFT JOIN branches b
           ON sc.branch_id = b.branch_id`;
  }

  _selectColumns() {
    return `SELECT
           sc.*,
           pc.category_name,
           psc.subcategory_name,
           b.branch_name`;
  }

  _fetchDepartmentsForCircleIds(stockCircleIds) {
    return new Promise((resolve, reject) => {
      if (!stockCircleIds.length) {
        resolve({});
        return;
      }
      const placeholders = stockCircleIds.map(() => "?").join(", ");
      this.db.query(
        `SELECT scd.stock_circle_id, pd.department_id, pd.department_name
         FROM stock_circle_departments scd
         INNER JOIN products_department pd ON pd.department_id = scd.department_id
         WHERE scd.stock_circle_id IN (${placeholders})
         ORDER BY scd.stock_circle_id, pd.department_id`,
        stockCircleIds,
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          const byCircle = {};
          for (const r of rows) {
            if (!byCircle[r.stock_circle_id]) {
              byCircle[r.stock_circle_id] = [];
            }
            byCircle[r.stock_circle_id].push({
              department_id: r.department_id,
              department_name: r.department_name,
            });
          }
          resolve(byCircle);
        }
      );
    });
  }

  _attachDepartments(rows) {
    return new Promise(async (resolve, reject) => {
      try {
        const ids = rows.map((r) => r.id);
        const byCircle = await this._fetchDepartmentsForCircleIds(ids);
        const enriched = rows.map((r) => ({
          ...r,
          departments: byCircle[r.id] || [],
        }));
        resolve(enriched);
      } catch (e) {
        reject(e);
      }
    });
  }

  replaceDepartments(stockCircleId, departmentIds) {
    return new Promise((resolve, reject) => {
      const unique = this._uniqueDepartmentIds(departmentIds);
      this.db.query(
        `DELETE FROM stock_circle_departments WHERE stock_circle_id = ?`,
        [stockCircleId],
        (err) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_CIRCLES",
              code: "REPOSITORY.STOCK_CIRCLES.REPLACE_DEPARTMENTS.DELETE.ERROR",
              description: err.toString(),
              category: "",
              ref: { stockCircleId },
            });
            reject(err);
            return;
          }
          if (unique.length === 0) {
            resolve();
            return;
          }
          const valuePlaceholders = unique.map(() => "(?, ?)").join(", ");
          const params = unique.flatMap((d) => [stockCircleId, d]);
          this.db.query(
            `INSERT INTO stock_circle_departments (stock_circle_id, department_id) VALUES ${valuePlaceholders}`,
            params,
            (err2) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.STOCK_CIRCLES",
                  code: "REPOSITORY.STOCK_CIRCLES.REPLACE_DEPARTMENTS.INSERT.ERROR",
                  description: err2.toString(),
                  category: "",
                  ref: { stockCircleId, departmentIds: unique },
                });
                reject(err2);
                return;
              }
              resolve();
            }
          );
        }
      );
    });
  }

  create(circleData) {
    return new Promise((resolve, reject) => {
      const {
        department_ids,
        category_id,
        subcategory_id,
        branch_id,
        period_type,
        period,
        period_start_date,
        period_end_date,
        is_active = true,
      } = circleData;

      const uniqueDeptIds = this._uniqueDepartmentIds(department_ids || []);
      if (uniqueDeptIds.length === 0) {
        reject(new Error("department_ids must contain at least one valid id"));
        return;
      }

      this.db.query(
        `INSERT INTO stock_circles
         (category_id, subcategory_id, branch_id, period_type, period, period_start_date, period_end_date, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          category_id || null,
          subcategory_id || null,
          branch_id,
          period_type,
          period || null,
          period_start_date || null,
          period_end_date || null,
          is_active ? 1 : 0,
        ],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_CIRCLES",
              code: "REPOSITORY.STOCK_CIRCLES.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { circleData },
            });
            reject(err);
            return;
          }
          const circleId = result.insertId;
          this.replaceDepartments(circleId, uniqueDeptIds)
            .then(() => {
              resolve({ id: circleId, ...circleData, department_ids: uniqueDeptIds });
            })
            .catch(reject);
        }
      );
    });
  }

  getAll(branchId = null) {
    return new Promise((resolve, reject) => {
      let query = `${this._selectColumns()}
         ${this._baseSelectFrom()}`;
      const params = [];

      if (branchId !== null && branchId !== undefined) {
        query += ` WHERE sc.branch_id = ?`;
        params.push(branchId);
      }

      query += ` ORDER BY sc.created_at DESC`;

      this.db.query(query, params, (err, docs) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.STOCK_CIRCLES",
            code: "REPOSITORY.STOCK_CIRCLES.GET_ALL.ERROR",
            description: err.toString(),
            category: "",
            ref: {},
          });
          reject(err);
          return;
        }
        this._attachDepartments(docs)
          .then(resolve)
          .catch((e) => {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_CIRCLES",
              code: "REPOSITORY.STOCK_CIRCLES.GET_ALL.DEPARTMENTS.ERROR",
              description: e.toString(),
              category: "",
              ref: {},
            });
            reject(e);
          });
      });
    });
  }

  getById(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `${this._selectColumns()}
         ${this._baseSelectFrom()}
         WHERE sc.id = ?`,
        [id],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_CIRCLES",
              code: "REPOSITORY.STOCK_CIRCLES.GET_BY_ID.ERROR",
              description: err.toString(),
              category: "",
              ref: { id },
            });
            reject(err);
            return;
          }
          if (docs.length === 0) {
            resolve(null);
            return;
          }
          this._attachDepartments([docs[0]])
            .then((enriched) => resolve(enriched[0]))
            .catch((e) => {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.STOCK_CIRCLES",
                code: "REPOSITORY.STOCK_CIRCLES.GET_BY_ID.DEPARTMENTS.ERROR",
                description: e.toString(),
                category: "",
                ref: { id },
              });
              reject(e);
            });
        }
      );
    });
  }

  update(id, circleData) {
    return new Promise((resolve, reject) => {
      const {
        department_ids,
        category_id,
        subcategory_id,
        branch_id,
        period_type,
        period,
        period_start_date,
        period_end_date,
        is_active,
      } = circleData;

      const updateFields = [];
      const updateValues = [];

      if (category_id !== undefined) {
        updateFields.push("category_id = ?");
        updateValues.push(category_id);
      }
      if (subcategory_id !== undefined) {
        updateFields.push("subcategory_id = ?");
        updateValues.push(subcategory_id);
      }
      if (branch_id !== undefined) {
        updateFields.push("branch_id = ?");
        updateValues.push(branch_id);
      }
      if (period_type !== undefined) {
        updateFields.push("period_type = ?");
        updateValues.push(period_type);
      }
      if (period !== undefined) {
        updateFields.push("period = ?");
        updateValues.push(period);
      }
      if (period_start_date !== undefined) {
        updateFields.push("period_start_date = ?");
        updateValues.push(period_start_date);
      }
      if (period_end_date !== undefined) {
        updateFields.push("period_end_date = ?");
        updateValues.push(period_end_date);
      }
      if (is_active !== undefined) {
        updateFields.push("is_active = ?");
        updateValues.push(is_active ? 1 : 0);
      }

      const runDeptUpdate =
        department_ids !== undefined
          ? () => {
              const unique = this._uniqueDepartmentIds(department_ids);
              if (unique.length === 0) {
                return Promise.reject(
                  new Error("department_ids must contain at least one valid id")
                );
              }
              return this.replaceDepartments(id, unique);
            }
          : null;

      const finish = (circleAffectedRows, deptUpdated) => {
        const anyChange = circleAffectedRows > 0 || deptUpdated;
        resolve({ affectedRows: anyChange ? 1 : 0, id });
      };

      if (updateFields.length === 0 && !runDeptUpdate) {
        resolve({ affectedRows: 0 });
        return;
      }

      const applyDept = () => {
        if (!runDeptUpdate) {
          finish(0, false);
          return;
        }
        runDeptUpdate()
          .then(() => finish(0, true))
          .catch(reject);
      };

      if (updateFields.length === 0) {
        applyDept();
        return;
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(id);

      this.db.query(
        `UPDATE stock_circles SET ${updateFields.join(", ")} WHERE id = ?`,
        updateValues,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_CIRCLES",
              code: "REPOSITORY.STOCK_CIRCLES.UPDATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { id, circleData },
            });
            reject(err);
            return;
          }
          const circleAffected = result.affectedRows;
          if (runDeptUpdate) {
            runDeptUpdate()
              .then(() => finish(circleAffected, true))
              .catch(reject);
          } else {
            finish(circleAffected, false);
          }
        }
      );
    });
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `DELETE FROM stock_circles WHERE id = ?`,
        [id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.STOCK_CIRCLES",
              code: "REPOSITORY.STOCK_CIRCLES.DELETE.ERROR",
              description: err.toString(),
              category: "",
              ref: { id },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows, id });
        }
      );
    });
  }
}

module.exports = (db) => {
  return new StockCirclesRepository(db);
};
