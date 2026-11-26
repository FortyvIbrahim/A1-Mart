const logger = require("../utils/logger");

class PoRepository {
  constructor(db, purchaseReordersRepo) {
    this.db = db;
    this.purchaseReordersRepo = purchaseReordersRepo;
  }

  create(header, items) {
    return new Promise((resolve, reject) => {
      const { po_id, raised_date, buyer_id, supplier_id } = header;
      const insertPoId = po_id != null && po_id !== "" ? po_id : null;
      const columns = ["raised_date", "buyer_id", "supplier_id"];
      const values = [raised_date || null, buyer_id, supplier_id];
      if (insertPoId != null) {
        columns.unshift("po_id");
        values.unshift(insertPoId);
      }
      const sql = `INSERT INTO po_header (${columns.join(", ")}) VALUES (${values.map(() => "?").join(", ")})`;
      this.db.query(sql, values, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PO",
            code: "REPOSITORY.PO.CREATE.ERROR",
            description: err.toString(),
            category: "",
            ref: { header },
          });
          if (err.code === "ER_DUP_ENTRY" && insertPoId != null) {
            reject({ code: "ER_DUP_ENTRY", po_id: insertPoId });
            return;
          }
          reject(err);
          return;
        }
        const id = insertPoId != null ? insertPoId : result.insertId;
        if (items && items.length > 0) {
          this._insertItemsAndStock(id, items, (err2) => {
            if (err2) {
              reject(err2);
              return;
            }
            const productIds = items.map((i) => i.product_id);
            this.purchaseReordersRepo
              .markAsPurchased(buyer_id, supplier_id, productIds)
              .then(() => resolve({ po_id: id }))
              .catch(reject);
          });
        } else {
          const productIds = [];
          this.purchaseReordersRepo
            .markAsPurchased(buyer_id, supplier_id, productIds)
            .then(() => resolve({ po_id: id }))
            .catch((e) => {
              if (productIds.length === 0) resolve({ po_id: id });
              else reject(e);
            });
        }
      });
    });
  }

  _insertItemsAndStock(po_id, items, cb) {
    const itemRows = items.map((i) => [
      po_id,
      i.product_id,
      i.qty ?? 0,
      i.mrp ?? null,
      i.net_cost ?? null,
    ]);
    this.db.query(
      `INSERT INTO po_items (po_id, product_id, qty, mrp, net_cost) VALUES ?`,
      [itemRows],
      (err) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PO",
            code: "REPOSITORY.PO.ITEMS.CREATE.ERROR",
            description: err.toString(),
            category: "",
            ref: { po_id, items },
          });
          return cb(err);
        }
        const stockRows = [];
        items.forEach((item) => {
          const stock_array = item.stock_array || [];
          stock_array.forEach((s) => {
            stockRows.push([
              po_id,
              item.product_id,
              s.branch_id,
              s.qty ?? 0,
            ]);
          });
        });
        if (stockRows.length === 0) return cb(null);
        this.db.query(
          `INSERT INTO po_items_stock (po_id, product_id, branch_id, qty) VALUES ?`,
          [stockRows],
          (err2) => {
            if (err2) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.PO",
                code: "REPOSITORY.PO.STOCK.CREATE.ERROR",
                description: err2.toString(),
                category: "",
                ref: { po_id },
              });
              return cb(err2);
            }
            cb(null);
          }
        );
      }
    );
  }

  getById(po_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT po.*, e.employee_name AS buyer_name, e.employee_code AS buyer_code,
          ml.name AS supplier_name, ml.phone AS supplier_phone
         FROM po_header po
         LEFT JOIN employees e ON po.buyer_id = e.employee_code
         LEFT JOIN master_list ml ON po.supplier_id = ml.master_id
         WHERE po.po_id = ?`,
        [po_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PO",
              code: "REPOSITORY.PO.GETBYID.ERROR",
              description: err.toString(),
              category: "",
              ref: { po_id },
            });
            reject(err);
            return;
          }
          const h = rows && rows[0];
          if (!h) return resolve(null);
          this.db.query(
            `SELECT poi.*, p.gf_item_name AS product_name, p.de_display_name AS product_display_name, p.image_url AS product_image_url
             FROM po_items poi
             LEFT JOIN products p ON poi.product_id = p.product_id
             WHERE poi.po_id = ?
             ORDER BY poi.product_id`,
            [po_id],
            (err2, itemRows) => {
              if (err2) {
                reject(err2);
                return;
              }
              const itemsWithStock = [];
              let done = 0;
              if (!itemRows || itemRows.length === 0) {
                return resolve(this._mapHeaderAndItems(h, []));
              }
              itemRows.forEach((it) => {
                this.db.query(
                  `SELECT pois.*, b.branch_name
                   FROM po_items_stock pois
                   LEFT JOIN branches b ON pois.branch_id = b.branch_id
                   WHERE pois.po_id = ? AND pois.product_id = ?`,
                  [po_id, it.product_id],
                  (err3, stockRows) => {
                    if (err3) {
                      reject(err3);
                      return;
                    }
                    itemsWithStock.push({
                      product_id: it.product_id,
                      qty: it.qty,
                      mrp: it.mrp,
                      net_cost: it.net_cost,
                      product_name: it.product_name,
                      product_display_name: it.product_display_name,
                      product_image_url: it.product_image_url || null,
                      stock_array: (stockRows || []).map((s) => ({
                        branch_id: s.branch_id,
                        branch_name: s.branch_name,
                        qty: s.qty,
                      })),
                    });
                    done++;
                    if (done === itemRows.length) {
                      resolve(this._mapHeaderAndItems(h, itemsWithStock));
                    }
                  }
                );
              });
            }
          );
        }
      );
    });
  }

  _mapHeaderAndItems(h, items) {
    return {
      po_id: h.po_id,
      raised_date: h.raised_date,
      buyer_id: h.buyer_id,
      supplier_id: h.supplier_id,
      created_at: h.created_at,
      updated_at: h.updated_at,
      buyer: h.buyer_id
        ? { employee_code: h.buyer_code, employee_name: h.buyer_name }
        : null,
      supplier: h.supplier_id
        ? {
            master_id: h.supplier_id,
            name: h.supplier_name,
            phone: h.supplier_phone,
          }
        : null,
      items,
    };
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT po.*, e.employee_name AS buyer_name, e.employee_code AS buyer_code,
          ml.name AS supplier_name, ml.phone AS supplier_phone
         FROM po_header po
         LEFT JOIN employees e ON po.buyer_id = e.employee_code
         LEFT JOIN master_list ml ON po.supplier_id = ml.master_id
         ORDER BY po.updated_at DESC`,
        [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PO",
              code: "REPOSITORY.PO.GETALL.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          if (!rows || rows.length === 0) return resolve([]);
          const results = [];
          let count = 0;
          rows.forEach((h) => {
            this.getById(h.po_id)
              .then((full) => {
                results.push(full);
                count++;
                if (count === rows.length) resolve(results);
              })
              .catch(reject);
          });
        }
      );
    });
  }

  update(po_id, header, items) {
    return new Promise((resolve, reject) => {
      this.getById(po_id).then((existing) => {
        if (!existing) {
          resolve(null);
          return;
        }
        const { raised_date, buyer_id, supplier_id } = header || {};
        const updates = [];
        const vals = [];
        if (raised_date !== undefined) {
          updates.push("raised_date = ?");
          vals.push(raised_date);
        }
        if (buyer_id !== undefined) {
          updates.push("buyer_id = ?");
          vals.push(buyer_id);
        }
        if (supplier_id !== undefined) {
          updates.push("supplier_id = ?");
          vals.push(supplier_id);
        }
        if (updates.length > 0) {
          vals.push(po_id);
          this.db.query(
            `UPDATE po_header SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE po_id = ?`,
            vals,
            (err) => {
              if (err) {
                reject(err);
                return;
              }
              if (items !== undefined) {
                this.db.query(
                  "DELETE FROM po_items_stock WHERE po_id = ?",
                  [po_id],
                  (err2) => {
                    if (err2) {
                      reject(err2);
                      return;
                    }
                    this.db.query(
                      "DELETE FROM po_items WHERE po_id = ?",
                      [po_id],
                      (err3) => {
                        if (err3) {
                          reject(err3);
                          return;
                        }
                        if (items.length > 0) {
                          this._insertItemsAndStock(po_id, items, (err4) => {
                            if (err4) reject(err4);
                            else this.getById(po_id).then(resolve).catch(reject);
                          });
                        } else {
                          this.getById(po_id).then(resolve).catch(reject);
                        }
                      }
                    );
                  }
                );
              } else {
                this.getById(po_id).then(resolve).catch(reject);
              }
            }
          );
        } else if (items !== undefined) {
          this.db.query(
            "DELETE FROM po_items_stock WHERE po_id = ?",
            [po_id],
            (err2) => {
              if (err2) {
                reject(err2);
                return;
              }
              this.db.query(
                "DELETE FROM po_items WHERE po_id = ?",
                [po_id],
                (err3) => {
                  if (err3) {
                    reject(err3);
                    return;
                  }
                  if (items.length > 0) {
                    this._insertItemsAndStock(po_id, items, (err4) => {
                      if (err4) reject(err4);
                      else this.getById(po_id).then(resolve).catch(reject);
                    });
                  } else {
                    this.getById(po_id).then(resolve).catch(reject);
                  }
                }
              );
            }
          );
        } else {
          this.getById(po_id).then(resolve).catch(reject);
        }
      }).catch(reject);
    });
  }

  delete(po_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT po.buyer_id, po.supplier_id, (SELECT GROUP_CONCAT(DISTINCT product_id) FROM po_items WHERE po_id = ?) AS product_ids
         FROM po_header po WHERE po.po_id = ?`,
        [po_id, po_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PO",
              code: "REPOSITORY.PO.DELETE.ERROR",
              description: err.toString(),
              category: "",
              ref: { po_id },
            });
            reject(err);
            return;
          }
          const h = rows && rows[0];
          const buyer_id = h && h.buyer_id;
          const supplier_id = h && h.supplier_id;
          const productIds = h && h.product_ids
            ? h.product_ids.split(",").map((id) => parseInt(id, 10)).filter((n) => !isNaN(n))
            : [];
          this.purchaseReordersRepo
            .markAsUnpurchased(buyer_id, supplier_id, productIds)
            .then(() => {
              this.db.query("DELETE FROM po_header WHERE po_id = ?", [po_id], (err2, result) => {
                if (err2) {
                  logger.Log({
                    level: logger.LEVEL.ERROR,
                    component: "REPOSITORY.PO",
                    code: "REPOSITORY.PO.DELETE.ERROR",
                    description: err2.toString(),
                    category: "",
                    ref: { po_id },
                  });
                  reject(err2);
                  return;
                }
                resolve({ affectedRows: result.affectedRows });
              });
            })
            .catch(reject);
        }
      );
    });
  }
}

module.exports = (db, purchaseReordersRepo) => {
  return new PoRepository(db, purchaseReordersRepo);
};
