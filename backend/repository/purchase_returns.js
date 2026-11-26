// repository/purchase_returns.js
const logger = require("../utils/logger");

class PurchaseReturnsRepository {
  constructor(db) {
    this.db = db;
  }

  create(data) {
    return new Promise((resolve, reject) => {
      const { driver_id, attachment, receipt_entry_handled_by, receiving_branch_id, employees = [] } = data;
      const status = data.status !== undefined ? data.status : "open";

      this.db.query(
        `INSERT INTO purchase_returns (driver_id, attachment, status, receipt_entry_handled_by, receiving_branch_id) VALUES (?, ?, ?, ?, ?)`,
        [driver_id, attachment || null, status, receipt_entry_handled_by || null, receiving_branch_id != null ? receiving_branch_id : null],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_RETURNS",
              code: "REPOSITORY.PURCHASE_RETURNS.CREATE",
              description: err.toString(),
              category: "",
              ref: { data },
            });
            reject(err);
            return;
          }
          const purchase_return_id = result.insertId;
          if (employees.length === 0) {
            return resolve(purchase_return_id);
          }
          this._insertBuyersAndItems(purchase_return_id, employees)
            .then(() => resolve(purchase_return_id))
            .catch(reject);
        }
      );
    });
  }

  _insertBuyersAndItems(purchase_return_id, employees) {
    return new Promise((resolve, reject) => {
      const validEmployees = employees.filter(
        (e) =>
          e &&
          e.employee_code !== undefined &&
          e.employee_code !== null &&
          e.employee_code !== ""
      );
      if (validEmployees.length === 0) return resolve();

      const placeholders = validEmployees
        .map(() => "(?, ?)")
        .join(", ");
      const values = validEmployees.flatMap((e) => [
        e.employee_code,
        purchase_return_id,
      ]);
      this.db.query(
        `INSERT INTO purchase_returns_buyers (employee_code, purchase_return_id) VALUES ${placeholders}`,
        values,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_RETURNS",
              code: "REPOSITORY.PURCHASE_RETURNS.BUYERS.CREATE",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          const firstInsertId = result.insertId;
          const buyerIds = validEmployees.map((_, i) => firstInsertId + i);
          const itemRows = [];
          const itemsPerSupplier = [];
          validEmployees.forEach((emp, idx) => {
            const suppliers = (emp.suppliers || []).filter(
              (s) =>
                s &&
                s.supplier_id !== undefined &&
                s.supplier_id !== null &&
                (s.no_of_boxes !== undefined && s.no_of_boxes !== null)
            );
            suppliers.forEach((s) => {
              itemRows.push([
                buyerIds[idx],
                s.supplier_id,
                Number(s.no_of_boxes) || 0,
              ]);
              itemsPerSupplier.push(s.items || []);
            });
          });
          if (itemRows.length === 0) return resolve();
          this.db.query(
            `INSERT INTO purchase_returns_items (purchase_returns_buyers_id, supplier_id, no_of_boxes) VALUES ?`,
            [itemRows],
            (err2, insertResult) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PURCHASE_RETURNS",
                  code: "REPOSITORY.PURCHASE_RETURNS.ITEMS.CREATE",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }
              const itemsFirstId = insertResult.insertId;
              const productRows = [];
              itemsPerSupplier.forEach((itemList, flatIdx) => {
                const itemId = itemsFirstId + flatIdx;
                (itemList || []).forEach((it) => {
                  if (
                    it &&
                    it.product_id !== undefined &&
                    it.product_id !== null &&
                    it.qty !== undefined &&
                    it.qty !== null
                  ) {
                    productRows.push([
                      itemId,
                      it.product_id,
                      Number(it.qty) || 0,
                      it.total_amount != null ? Number(it.total_amount) : null,
                      it.pr_date != null && it.pr_date !== "" ? String(it.pr_date) : null,
                      it.pr_no != null && it.pr_no !== "" ? String(it.pr_no) : null,
                      it.outlet_id != null ? Number(it.outlet_id) : null,
                    ]);
                  }
                });
              });
              if (productRows.length === 0) return resolve();
              this.db.query(
                `INSERT INTO purchase_return_products (purchase_returns_items_id, product_id, qty, total_amount, pr_date, pr_no, outlet_id) VALUES ?`,
                [productRows],
                (err3) => {
                  if (err3) {
                    logger.Log({
                      level: logger.LEVEL.ERROR,
                      component: "REPOSITORY.PURCHASE_RETURNS",
                      code: "REPOSITORY.PURCHASE_RETURNS.PRODUCTS.CREATE",
                      description: err3.toString(),
                      category: "",
                      ref: {},
                    });
                    reject(err3);
                    return;
                  }
                  resolve();
                }
              );
            }
          );
        }
      );
    });
  }

  // Returns full purchase return including delivered details (array per supplier item with supplier mapped) for GET /purchase-returns/:id
  getById(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT pr.*, b.branch_name AS receiving_branch_name
         FROM purchase_returns pr
         LEFT JOIN branches b ON pr.receiving_branch_id = b.branch_id
         WHERE pr.purchase_return_id = ?`,
        [id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_RETURNS",
              code: "REPOSITORY.PURCHASE_RETURNS.GET-BY-ID",
              description: err.toString(),
              category: "",
              ref: { id },
            });
            reject(err);
            return;
          }
          if (!rows || rows.length === 0) return resolve(undefined);
          const header = rows[0];
          this.db.query(
            `SELECT * FROM purchase_returns_buyers WHERE purchase_return_id = ? ORDER BY purchase_returns_buyers_id`,
            [id],
            (err2, buyers) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PURCHASE_RETURNS",
                  code: "REPOSITORY.PURCHASE_RETURNS.BUYERS.GET",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }
              if (!buyers || buyers.length === 0) {
                return this._enrichGetById(header, [], id, resolve, reject);
              }
              const buyerIds = buyers.map((b) => b.purchase_returns_buyers_id);
              const placeholders = buyerIds.map(() => "?").join(", ");
              this.db.query(
                `SELECT * FROM purchase_returns_items WHERE purchase_returns_buyers_id IN (${placeholders}) ORDER BY purchase_returns_buyers_id, purchase_returns_items_id`,
                buyerIds,
                (err3, items) => {
                  if (err3) {
                    logger.Log({
                      level: logger.LEVEL.ERROR,
                      component: "REPOSITORY.PURCHASE_RETURNS",
                      code: "REPOSITORY.PURCHASE_RETURNS.ITEMS.GET",
                      description: err3.toString(),
                      category: "",
                      ref: {},
                    });
                    reject(err3);
                    return;
                  }
                  const itemIds = (items || []).map((it) => it.purchase_returns_items_id);
                  if (itemIds.length === 0) {
                    const itemsByBuyer = {};
                    const employees = buyers.map((b) => ({
                      purchase_returns_buyers_id: b.purchase_returns_buyers_id,
                      employee_code: b.employee_code,
                      suppliers: [],
                    }));
                    return this._enrichGetById(
                      { ...header, employees },
                      [],
                      id,
                      resolve,
                      reject
                    );
                  }
                  const itemPlaceholders = itemIds.map(() => "?").join(", ");
                  this.db.query(
                    `SELECT prp.*, b.branch_name AS outlet_name
                     FROM purchase_return_products prp
                     LEFT JOIN branches b ON prp.outlet_id = b.branch_id
                     WHERE prp.purchase_returns_items_id IN (${itemPlaceholders})
                     ORDER BY prp.purchase_returns_items_id, prp.purchase_return_products_id`,
                    itemIds,
                    (err4, products) => {
                      if (err4) {
                        logger.Log({
                          level: logger.LEVEL.ERROR,
                          component: "REPOSITORY.PURCHASE_RETURNS",
                          code: "REPOSITORY.PURCHASE_RETURNS.PRODUCTS.GET",
                          description: err4.toString(),
                          category: "",
                          ref: {},
                        });
                        reject(err4);
                        return;
                      }
                      const productsByItemId = {};
                      (products || []).forEach((p) => {
                        if (!productsByItemId[p.purchase_returns_items_id])
                          productsByItemId[p.purchase_returns_items_id] = [];
                        productsByItemId[p.purchase_returns_items_id].push(p);
                      });
                      const itemPlaceholdersDelivered = itemIds.map(() => "?").join(", ");
                      this.db.query(
                        `SELECT prid.purchase_returns_items_delivered_id, prid.supplier_id, prid.pick_up_name, prid.pick_up_number, prid.created_at, prid.updated_at, pridi.purchase_returns_items_id
                         FROM purchase_returns_items_delivered_items pridi
                         INNER JOIN purchase_returns_items_delivered prid ON pridi.purchase_returns_items_delivered_id = prid.purchase_returns_items_delivered_id
                         WHERE pridi.purchase_returns_items_id IN (${itemPlaceholdersDelivered})`,
                        itemIds,
                        (errDel, deliveredRows) => {
                          if (errDel) {
                            logger.Log({
                              level: logger.LEVEL.ERROR,
                              component: "REPOSITORY.PURCHASE_RETURNS",
                              code: "REPOSITORY.PURCHASE_RETURNS.DELIVERED.GET",
                              description: errDel.toString(),
                              category: "",
                              ref: {},
                            });
                            reject(errDel);
                            return;
                          }
                          const deliveredByItemId = {};
                          itemIds.forEach((id) => {
                            deliveredByItemId[id] = [];
                          });
                          const deliveredCache = {};
                          const seenByItem = {};
                          (deliveredRows || []).forEach((r) => {
                            const key = r.purchase_returns_items_delivered_id;
                            const itemId = r.purchase_returns_items_id;
                            if (!deliveredCache[key]) {
                              deliveredCache[key] = {
                                purchase_returns_items_delivered_id: r.purchase_returns_items_delivered_id,
                                supplier_id: r.supplier_id,
                                pick_up_name: r.pick_up_name,
                                pick_up_number: r.pick_up_number,
                                created_at: r.created_at,
                                updated_at: r.updated_at,
                              };
                            }
                            if (!seenByItem[itemId]) seenByItem[itemId] = new Set();
                            if (!seenByItem[itemId].has(key)) {
                              seenByItem[itemId].add(key);
                              deliveredByItemId[itemId].push(deliveredCache[key]);
                            }
                          });
                          const deliveredIdsUniq = Object.keys(deliveredCache);
                          const continueWithDelivered = () => {
                            const itemsByBuyer = {};
                            (items || []).forEach((it) => {
                              if (!itemsByBuyer[it.purchase_returns_buyers_id])
                                itemsByBuyer[it.purchase_returns_buyers_id] = [];
                              itemsByBuyer[it.purchase_returns_buyers_id].push(it);
                            });
                            const employees = buyers.map((b) => ({
                              purchase_returns_buyers_id: b.purchase_returns_buyers_id,
                              employee_code: b.employee_code,
                              suppliers: (
                                itemsByBuyer[b.purchase_returns_buyers_id] || []
                              ).map((it) => ({
                                purchase_returns_items_id: it.purchase_returns_items_id,
                                supplier_id: it.supplier_id,
                                no_of_boxes: it.no_of_boxes,
                                delivered: deliveredByItemId[it.purchase_returns_items_id] || [],
                                items: (
                                  productsByItemId[it.purchase_returns_items_id] || []
                                ).map((p) => ({
                                  purchase_return_products_id: p.purchase_return_products_id,
                                  product_id: p.product_id,
                                  qty: p.qty,
                                  total_amount: p.total_amount,
                                  pr_date: p.pr_date,
                                  pr_no: p.pr_no,
                                  outlet_id: p.outlet_id,
                                  outlet_name: p.outlet_name ?? null,
                                })),
                              })),
                            }));
                            this._enrichGetById(
                              { ...header, employees },
                              itemIds,
                              id,
                              resolve,
                              reject
                            );
                          };
                          if (deliveredIdsUniq.length === 0) {
                            Object.keys(deliveredCache).forEach((id) => { deliveredCache[id].attachment = []; });
                            continueWithDelivered();
                          } else {
                            const ph = deliveredIdsUniq.map(() => "?").join(", ");
                            this.db.query(
                              `SELECT purchase_returns_items_delivered_id, file_url FROM purchase_returns_items_delivered_attachments WHERE purchase_returns_items_delivered_id IN (${ph}) ORDER BY purchase_returns_items_delivered_attachment_id`,
                              deliveredIdsUniq,
                              (errAtt, attRows) => {
                                if (errAtt) {
                                  logger.Log({
                                    level: logger.LEVEL.ERROR,
                                    component: "REPOSITORY.PURCHASE_RETURNS",
                                    code: "REPOSITORY.PURCHASE_RETURNS.DELIVERED.ATTACHMENTS.GET",
                                    description: errAtt.toString(),
                                    category: "",
                                    ref: {},
                                  });
                                  reject(errAtt);
                                  return;
                                }
                                const byId = {};
                                deliveredIdsUniq.forEach((id) => { byId[String(id)] = []; });
                                (attRows || []).forEach((a) => {
                                  const k = String(a.purchase_returns_items_delivered_id);
                                  if (byId[k]) byId[k].push(a.file_url);
                                });
                                Object.keys(deliveredCache).forEach((id) => {
                                  deliveredCache[id].attachment = byId[String(id)] || [];
                                });
                                continueWithDelivered();
                              }
                            );
                          }
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  }

  _enrichGetById(headerWithEmployees, itemIds, id, resolve, reject) {
    const header = { ...headerWithEmployees };
    const employees = header.employees || [];
    const driverId = header.driver_id;
    const receiptEntryHandledBy = header.receipt_entry_handled_by;
    const employeeCodes = [...new Set([driverId, receiptEntryHandledBy, ...employees.map((e) => e.employee_code)].filter((x) => x != null && x !== ""))];
    const supplierIds = [];
    const productIds = [];
    employees.forEach((e) => {
      (e.suppliers || []).forEach((s) => {
        if (s.supplier_id != null) supplierIds.push(s.supplier_id);
        (s.delivered || []).forEach((d) => {
          if (d.supplier_id != null) supplierIds.push(d.supplier_id);
        });
        (s.items || []).forEach((it) => {
          if (it.product_id != null) productIds.push(it.product_id);
        });
      });
    });
    const masterIds = [...new Set(supplierIds)];
    const productIdsUniq = [...new Set(productIds)];

    const done = (employeesMap, suppliersMap, productsMap) => {
      const driverDetail = driverId != null && driverId !== "" ? (employeesMap[driverId] || null) : null;
      const receipt_entry_handled_by_employee =
        receiptEntryHandledBy != null && receiptEntryHandledBy !== ""
          ? (employeesMap[receiptEntryHandledBy] || null)
          : null;
      const enrichedEmployees = employees.map((e) => ({
        ...e,
        employee: employeesMap[e.employee_code] || null,
        suppliers: (e.suppliers || []).map((s) => ({
          ...s,
          supplier: suppliersMap[s.supplier_id] || null,
          delivered: (s.delivered || []).map((d) => ({
            ...d,
            supplier: d.supplier_id != null ? (suppliersMap[d.supplier_id] || null) : null,
          })),
          items: (s.items || []).map((it) => ({
            ...it,
            product: productsMap[it.product_id] || null,
          })),
        })),
      }));
      resolve({
        ...header,
        driver_id: header.driver_id,
        driver: driverDetail,
        receipt_entry_handled_by: header.receipt_entry_handled_by,
        receipt_entry_handled_by_employee,
        employees: enrichedEmployees,
      });
    };

    if (masterIds.length === 0 && productIdsUniq.length === 0 && employeeCodes.length === 0) {
      return done({}, {}, {});
    }

    let masterList = [];
    let employeesList = [];
    let productsList = [];
    let pending = 0;
    if (masterIds.length > 0) pending += 1;
    if (employeeCodes.length > 0) pending += 1;
    if (productIdsUniq.length > 0) pending += 1;

    const tryFinish = () => {
      if (pending > 0) return;
      const suppliersMap = {};
      masterList.forEach((m) => {
        suppliersMap[m.master_id] = m;
      });
      const employeesMap = {};
      employeesList.forEach((emp) => {
        employeesMap[emp.employee_code] = emp;
      });
      const productsMap = {};
      productsList.forEach((p) => {
        productsMap[p.product_id] = p;
      });
      done(employeesMap, suppliersMap, productsMap);
    };

    if (masterIds.length > 0) {
      const ph = masterIds.map(() => "?").join(", ");
      this.db.query(
        `SELECT * FROM master_list WHERE master_id IN (${ph})`,
        masterIds,
        (e, rows) => {
          if (!e) masterList = rows || [];
          pending--;
          tryFinish();
        }
      );
    }
    if (employeeCodes.length > 0) {
      const ph = employeeCodes.map(() => "?").join(", ");
      this.db.query(
        `SELECT employees.*, COALESCE(employees.incentive_type, designations.incentive_type) AS incentive_type_resolved
         FROM employees
         LEFT JOIN designations ON employees.designation_id = designations.designation_id
         WHERE employees.employee_code IN (${ph})`,
        employeeCodes,
        (e, rows) => {
          if (!e) employeesList = rows || [];
          pending--;
          tryFinish();
        }
      );
    }
    if (productIdsUniq.length > 0) {
      const ph = productIdsUniq.map(() => "?").join(", ");
      this.db.query(
        `SELECT products.*, pc.category_name, psc.subcategory_name, pd.department_name, pb.brand_name
         FROM products
         LEFT JOIN products_categories pc ON products.category_id = pc.category_id
         LEFT JOIN products_subcategories psc ON psc.subcategory_id = products.subcategory_id
         LEFT JOIN products_department pd ON pd.department_id = products.department_id
         LEFT JOIN products_brands pb ON pb.brand_id = products.brand_id
         WHERE products.product_id IN (${ph})
         GROUP BY products.product_id`,
        productIdsUniq,
        (e, rows) => {
          if (!e) productsList = rows || [];
          pending--;
          tryFinish();
        }
      );
    }
  }

  // Returns all purchase returns with same shape as getById (including delivered per supplier item) for GET /purchase-returns
  // branchId: when set, filter by receiving_branch_id (for branch-scoped list)
  getAll(branchId) {
    return new Promise((resolve, reject) => {
      const filterByBranch = branchId != null && branchId !== "";
      this.db.query(
        `SELECT * FROM purchase_returns${filterByBranch ? " WHERE receiving_branch_id = ?" : ""} ORDER BY purchase_return_id DESC`,
        filterByBranch ? [branchId] : [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_RETURNS",
              code: "REPOSITORY.PURCHASE_RETURNS.GET-ALL",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          if (!rows || rows.length === 0) return resolve([]);
          let pending = rows.length;
          const results = [];
          rows.forEach((row, idx) => {
            this.getById(row.purchase_return_id).then(
              (full) => {
                results[idx] = full;
                pending--;
                if (pending === 0) resolve(results);
              },
              (e) => {
                pending = -1;
                reject(e);
              }
            );
          });
        }
      );
    });
  }

  update(id, data, employees) {
    return new Promise((resolve, reject) => {
      const updateFields = [];
      const updateValues = [];
      if (data.driver_id !== undefined) {
        updateFields.push("driver_id = ?");
        updateValues.push(data.driver_id);
      }
      if (data.attachment !== undefined) {
        updateFields.push("attachment = ?");
        updateValues.push(data.attachment);
      }
      if (data.status !== undefined) {
        updateFields.push("status = ?");
        updateValues.push(data.status);
      }
      if (data.receipt_entry_handled_by !== undefined) {
        updateFields.push("receipt_entry_handled_by = ?");
        updateValues.push(data.receipt_entry_handled_by || null);
      }
      if (data.receiving_branch_id !== undefined) {
        updateFields.push("receiving_branch_id = ?");
        updateValues.push(data.receiving_branch_id != null ? data.receiving_branch_id : null);
      }
      const runReplace = () => {
        if (!employees || employees.length === 0) {
          this.db.query(
            `DELETE pri FROM purchase_returns_items pri
             INNER JOIN purchase_returns_buyers prb ON pri.purchase_returns_buyers_id = prb.purchase_returns_buyers_id
             WHERE prb.purchase_return_id = ?`,
            [id],
            (delErr) => {
              if (delErr) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PURCHASE_RETURNS",
                  code: "REPOSITORY.PURCHASE_RETURNS.ITEMS.DELETE",
                  description: delErr.toString(),
                  category: "",
                  ref: {},
                });
                reject(delErr);
                return;
              }
              this.db.query(
                "DELETE FROM purchase_returns_buyers WHERE purchase_return_id = ?",
                [id],
                (del2Err) => {
                  if (del2Err) {
                    logger.Log({
                      level: logger.LEVEL.ERROR,
                      component: "REPOSITORY.PURCHASE_RETURNS",
                      code: "REPOSITORY.PURCHASE_RETURNS.BUYERS.DELETE",
                      description: del2Err.toString(),
                      category: "",
                      ref: {},
                    });
                    reject(del2Err);
                    return;
                  }
                  resolve({ affectedRows: 1 });
                }
              );
            }
          );
          return;
        }
        this.db.query(
          `DELETE pri FROM purchase_returns_items pri
           INNER JOIN purchase_returns_buyers prb ON pri.purchase_returns_buyers_id = prb.purchase_returns_buyers_id
           WHERE prb.purchase_return_id = ?`,
          [id],
          (delErr) => {
            if (delErr) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.PURCHASE_RETURNS",
                code: "REPOSITORY.PURCHASE_RETURNS.ITEMS.DELETE",
                description: delErr.toString(),
                category: "",
                ref: {},
              });
              reject(delErr);
              return;
            }
            this.db.query(
              "DELETE FROM purchase_returns_buyers WHERE purchase_return_id = ?",
              [id],
              (del2Err) => {
                if (del2Err) {
                  logger.Log({
                    level: logger.LEVEL.ERROR,
                    component: "REPOSITORY.PURCHASE_RETURNS",
                    code: "REPOSITORY.PURCHASE_RETURNS.BUYERS.DELETE",
                    description: del2Err.toString(),
                    category: "",
                    ref: {},
                  });
                  reject(del2Err);
                  return;
                }
                this._insertBuyersAndItems(id, employees)
                  .then(() => resolve({ affectedRows: 1 }))
                  .catch(reject);
              }
            );
          }
        );
      };

      if (updateFields.length === 0 && employees === undefined) {
        return resolve({ affectedRows: 0 });
      }
      if (updateFields.length === 0) {
        return runReplace();
      }
      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(id);
      this.db.query(
        `UPDATE purchase_returns SET ${updateFields.join(", ")} WHERE purchase_return_id = ?`,
        updateValues,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_RETURNS",
              code: "REPOSITORY.PURCHASE_RETURNS.UPDATE",
              description: err.toString(),
              category: "",
              ref: { id, data },
            });
            reject(err);
            return;
          }
          if (employees !== undefined) {
            runReplace();
          } else {
            resolve({ affectedRows: result.affectedRows });
          }
        }
      );
    });
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `DELETE pri FROM purchase_returns_items pri
         INNER JOIN purchase_returns_buyers prb ON pri.purchase_returns_buyers_id = prb.purchase_returns_buyers_id
         WHERE prb.purchase_return_id = ?`,
        [id],
        (err) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_RETURNS",
              code: "REPOSITORY.PURCHASE_RETURNS.ITEMS.DELETE",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          this.db.query(
            "DELETE FROM purchase_returns_buyers WHERE purchase_return_id = ?",
            [id],
            (err2) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PURCHASE_RETURNS",
                  code: "REPOSITORY.PURCHASE_RETURNS.BUYERS.DELETE",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }
              this.db.query(
                "DELETE FROM purchase_returns WHERE purchase_return_id = ?",
                [id],
                (err3, result) => {
                  if (err3) {
                    logger.Log({
                      level: logger.LEVEL.ERROR,
                      component: "REPOSITORY.PURCHASE_RETURNS",
                      code: "REPOSITORY.PURCHASE_RETURNS.DELETE",
                      description: err3.toString(),
                      category: "",
                      ref: {},
                    });
                    reject(err3);
                    return;
                  }
                  resolve({ affectedRows: result.affectedRows });
                }
              );
            }
          );
        }
      );
    });
  }

  createDelivered(data) {
    return new Promise((resolve, reject) => {
      const { supplier_id, pick_up_name, pick_up_number, purchase_returns_items_ids = [], attachment = [] } = data || {};
      this.db.query(
        `INSERT INTO purchase_returns_items_delivered (supplier_id, pick_up_name, pick_up_number) VALUES (?, ?, ?)`,
        [supplier_id != null ? supplier_id : null, pick_up_name || null, pick_up_number || null],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_RETURNS",
              code: "REPOSITORY.PURCHASE_RETURNS.DELIVERED.CREATE",
              description: err.toString(),
              category: "",
              ref: { data },
            });
            reject(err);
            return;
          }
          const deliveredId = result.insertId;
          const itemIds = Array.isArray(purchase_returns_items_ids)
            ? purchase_returns_items_ids.filter((id) => id != null && id !== "")
            : [];
          const insertItems = (cb) => {
            if (itemIds.length === 0) return cb();
            const rows = itemIds.map((id) => [deliveredId, id]);
            this.db.query(
              `INSERT INTO purchase_returns_items_delivered_items (purchase_returns_items_delivered_id, purchase_returns_items_id) VALUES ?`,
              [rows],
              (err2) => {
                if (err2) {
                  logger.Log({
                    level: logger.LEVEL.ERROR,
                    component: "REPOSITORY.PURCHASE_RETURNS",
                    code: "REPOSITORY.PURCHASE_RETURNS.DELIVERED.ITEMS.CREATE",
                    description: err2.toString(),
                    category: "",
                    ref: {},
                  });
                  reject(err2);
                  return;
                }
                cb();
              }
            );
          };
          const insertAttachments = (cb) => {
            const urls = Array.isArray(attachment) ? attachment.filter((u) => u != null && String(u).trim() !== "") : [];
            if (urls.length === 0) return cb();
            const rows = urls.map((url) => [deliveredId, String(url).trim()]);
            this.db.query(
              `INSERT INTO purchase_returns_items_delivered_attachments (purchase_returns_items_delivered_id, file_url) VALUES ?`,
              [rows],
              (err3) => {
                if (err3) {
                  logger.Log({
                    level: logger.LEVEL.ERROR,
                    component: "REPOSITORY.PURCHASE_RETURNS",
                    code: "REPOSITORY.PURCHASE_RETURNS.DELIVERED.ATTACHMENTS.CREATE",
                    description: err3.toString(),
                    category: "",
                    ref: {},
                  });
                  reject(err3);
                  return;
                }
                cb();
              }
            );
          };
          insertItems(() => insertAttachments(() => resolve(deliveredId)));
        }
      );
    });
  }

  getDeliveredById(purchase_returns_items_delivered_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT * FROM purchase_returns_items_delivered WHERE purchase_returns_items_delivered_id = ?`,
        [purchase_returns_items_delivered_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_RETURNS",
              code: "REPOSITORY.PURCHASE_RETURNS.DELIVERED.GET-BY-ID",
              description: err.toString(),
              category: "",
              ref: { purchase_returns_items_delivered_id },
            });
            reject(err);
            return;
          }
          if (!rows || rows.length === 0) return resolve(null);
          const delivered = rows[0];
          this.db.query(
            `SELECT purchase_returns_items_id FROM purchase_returns_items_delivered_items WHERE purchase_returns_items_delivered_id = ?`,
            [purchase_returns_items_delivered_id],
            (err2, itemRows) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PURCHASE_RETURNS",
                  code: "REPOSITORY.PURCHASE_RETURNS.DELIVERED.ITEMS.GET",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }
              const purchase_returns_items_ids = (itemRows || []).map((r) => r.purchase_returns_items_id);
              const payload = {
                purchase_returns_items_delivered_id: delivered.purchase_returns_items_delivered_id,
                supplier_id: delivered.supplier_id,
                pick_up_name: delivered.pick_up_name,
                pick_up_number: delivered.pick_up_number,
                created_at: delivered.created_at,
                updated_at: delivered.updated_at,
                purchase_returns_items_ids,
                attachment: [],
              };
              this.db.query(
                `SELECT file_url FROM purchase_returns_items_delivered_attachments WHERE purchase_returns_items_delivered_id = ? ORDER BY purchase_returns_items_delivered_attachment_id`,
                [purchase_returns_items_delivered_id],
                (errAtt, attRows) => {
                  if (!errAtt && attRows && attRows.length) payload.attachment = attRows.map((a) => a.file_url);
                  if (delivered.supplier_id == null) return resolve(payload);
                  this.db.query(
                    `SELECT * FROM master_list WHERE master_id = ?`,
                    [delivered.supplier_id],
                    (err3, supRows) => {
                      if (!err3 && supRows && supRows[0]) payload.supplier = supRows[0];
                      resolve(payload);
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  }

  getDeliveredByItemId(purchase_returns_items_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT prid.purchase_returns_items_delivered_id, prid.supplier_id, prid.pick_up_name, prid.pick_up_number, prid.created_at, prid.updated_at
         FROM purchase_returns_items_delivered_items pridi
         INNER JOIN purchase_returns_items_delivered prid ON pridi.purchase_returns_items_delivered_id = prid.purchase_returns_items_delivered_id
         WHERE pridi.purchase_returns_items_id = ?`,
        [purchase_returns_items_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_RETURNS",
              code: "REPOSITORY.PURCHASE_RETURNS.DELIVERED.GET-BY-ITEM",
              description: err.toString(),
              category: "",
              ref: { purchase_returns_items_id },
            });
            reject(err);
            return;
          }
          const list = (rows || []).map((r) => ({
            purchase_returns_items_delivered_id: r.purchase_returns_items_delivered_id,
            supplier_id: r.supplier_id,
            pick_up_name: r.pick_up_name,
            pick_up_number: r.pick_up_number,
            created_at: r.created_at,
            updated_at: r.updated_at,
            attachment: [],
          }));
          const deliveredIdsUniq = [...new Set(list.map((d) => d.purchase_returns_items_delivered_id))];
          const fetchAttachments = (cb) => {
            if (deliveredIdsUniq.length === 0) return cb();
            const ph = deliveredIdsUniq.map(() => "?").join(", ");
            this.db.query(
              `SELECT purchase_returns_items_delivered_id, file_url FROM purchase_returns_items_delivered_attachments WHERE purchase_returns_items_delivered_id IN (${ph}) ORDER BY purchase_returns_items_delivered_attachment_id`,
              deliveredIdsUniq,
              (errAtt, attRows) => {
                if (!errAtt && attRows && attRows.length) {
                  const byId = {};
                  deliveredIdsUniq.forEach((id) => { byId[id] = []; });
                  attRows.forEach((a) => byId[a.purchase_returns_items_delivered_id].push(a.file_url));
                  list.forEach((d) => { d.attachment = byId[d.purchase_returns_items_delivered_id] || []; });
                }
                cb();
              }
            );
          };
          fetchAttachments(() => {
            const supplierIdsUniq = [...new Set(list.map((d) => d.supplier_id).filter((id) => id != null))];
            if (supplierIdsUniq.length === 0) return resolve(list);
            const ph = supplierIdsUniq.map(() => "?").join(", ");
            this.db.query(
              `SELECT * FROM master_list WHERE master_id IN (${ph})`,
              supplierIdsUniq,
              (err2, supRows) => {
                if (err2) return resolve(list);
                const suppliersMap = {};
                (supRows || []).forEach((s) => { suppliersMap[s.master_id] = s; });
                const enriched = list.map((d) => ({
                  ...d,
                  supplier: d.supplier_id != null ? (suppliersMap[d.supplier_id] || null) : null,
                }));
                resolve(enriched);
              }
            );
          });
        }
      );
    });
  }

  updateDelivered(purchase_returns_items_delivered_id, data) {
    return new Promise((resolve, reject) => {
      const { supplier_id, pick_up_name, pick_up_number, purchase_returns_items_ids, attachment } = data || {};
      const updates = [];
      const values = [];
      if (supplier_id !== undefined) {
        updates.push("supplier_id = ?");
        values.push(supplier_id != null ? supplier_id : null);
      }
      if (pick_up_name !== undefined) {
        updates.push("pick_up_name = ?");
        values.push(pick_up_name || null);
      }
      if (pick_up_number !== undefined) {
        updates.push("pick_up_number = ?");
        values.push(pick_up_number || null);
      }
      let pending = 0;
      if (attachment !== undefined) pending++;
      if (purchase_returns_items_ids !== undefined) pending++;
      const maybeDone = () => {
        pending--;
        if (pending === 0) resolve({ affectedRows: 1 });
      };
      const runReplaceAttachments = (cb) => {
        if (attachment === undefined) return cb();
        this.db.query(
          `DELETE FROM purchase_returns_items_delivered_attachments WHERE purchase_returns_items_delivered_id = ?`,
          [purchase_returns_items_delivered_id],
          (delErr) => {
            if (delErr) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.PURCHASE_RETURNS",
                code: "REPOSITORY.PURCHASE_RETURNS.DELIVERED.ATTACHMENTS.DELETE",
                description: delErr.toString(),
                category: "",
                ref: {},
              });
              reject(delErr);
              return;
            }
            const urls = Array.isArray(attachment) ? attachment.filter((u) => u != null && String(u).trim() !== "") : [];
            if (urls.length === 0) return cb();
            const rows = urls.map((url) => [purchase_returns_items_delivered_id, String(url).trim()]);
            this.db.query(
              `INSERT INTO purchase_returns_items_delivered_attachments (purchase_returns_items_delivered_id, file_url) VALUES ?`,
              [rows],
              (insErr) => {
                if (insErr) {
                  logger.Log({
                    level: logger.LEVEL.ERROR,
                    component: "REPOSITORY.PURCHASE_RETURNS",
                    code: "REPOSITORY.PURCHASE_RETURNS.DELIVERED.ATTACHMENTS.CREATE",
                    description: insErr.toString(),
                    category: "",
                    ref: {},
                  });
                  reject(insErr);
                  return;
                }
                cb();
              }
            );
          }
        );
      };
      const runReplaceItems = (cb) => {
        if (purchase_returns_items_ids === undefined) return cb();
        this.db.query(
          `DELETE FROM purchase_returns_items_delivered_items WHERE purchase_returns_items_delivered_id = ?`,
          [purchase_returns_items_delivered_id],
          (delErr) => {
            if (delErr) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.PURCHASE_RETURNS",
                code: "REPOSITORY.PURCHASE_RETURNS.DELIVERED.ITEMS.DELETE",
                description: delErr.toString(),
                category: "",
                ref: {},
              });
              reject(delErr);
              return;
            }
            const itemIds = Array.isArray(purchase_returns_items_ids)
              ? purchase_returns_items_ids.filter((id) => id != null && id !== "")
              : [];
            if (itemIds.length === 0) return cb();
            const rows = itemIds.map((id) => [purchase_returns_items_delivered_id, id]);
            this.db.query(
              `INSERT INTO purchase_returns_items_delivered_items (purchase_returns_items_delivered_id, purchase_returns_items_id) VALUES ?`,
              [rows],
              (insErr) => {
                if (insErr) {
                  logger.Log({
                    level: logger.LEVEL.ERROR,
                    component: "REPOSITORY.PURCHASE_RETURNS",
                    code: "REPOSITORY.PURCHASE_RETURNS.DELIVERED.ITEMS.CREATE",
                    description: insErr.toString(),
                    category: "",
                    ref: {},
                  });
                  reject(insErr);
                  return;
                }
                cb();
              }
            );
          }
        );
      };
      const runAll = () => {
        if (pending === 0) return resolve({ affectedRows: 1 });
        if (attachment !== undefined) runReplaceAttachments(maybeDone);
        if (purchase_returns_items_ids !== undefined) runReplaceItems(maybeDone);
      };
      if (updates.length === 0) {
        return runAll();
      }
      values.push(purchase_returns_items_delivered_id);
      this.db.query(
        `UPDATE purchase_returns_items_delivered SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE purchase_returns_items_delivered_id = ?`,
        values,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_RETURNS",
              code: "REPOSITORY.PURCHASE_RETURNS.DELIVERED.UPDATE",
              description: err.toString(),
              category: "",
              ref: { purchase_returns_items_delivered_id, data },
            });
            reject(err);
            return;
          }
          runAll();
        }
      );
    });
  }

  deleteDelivered(purchase_returns_items_delivered_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `DELETE FROM purchase_returns_items_delivered WHERE purchase_returns_items_delivered_id = ?`,
        [purchase_returns_items_delivered_id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_RETURNS",
              code: "REPOSITORY.PURCHASE_RETURNS.DELIVERED.DELETE",
              description: err.toString(),
              category: "",
              ref: { purchase_returns_items_delivered_id },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }
}

module.exports = (db) => new PurchaseReturnsRepository(db);
