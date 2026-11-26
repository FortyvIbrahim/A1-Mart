const logger = require("../utils/logger");

const JSON_COLUMNS = [
  "office_location",
  "warehouse_location_1",
  "warehouse_location_2",
];

function parseJsonColumns(row) {
  if (!row) return row;
  const out = { ...row };
  JSON_COLUMNS.forEach((col) => {
    const v = out[col];
    if (typeof v === "string") {
      try {
        out[col] = JSON.parse(v);
      } catch (_) {
        out[col] = v;
      }
    }
  });
  return out;
}

function mapBuyerRow(row) {
  return {
    employee_id: row.employee_id,
    id: row.employee_id,
    employee_name: row.employee_name ?? null,
    buyer_alias: row.buyer_alias ?? null,
    profile_img_url: row.profile_img_url ?? null,
    image: row.profile_img_url ?? null,
  };
}

function normalizeMasterName(name) {
  return String(name ?? "")
    .replace(/\u00A0/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

class MasterListRepository {
  constructor(db) {
    this.db = db;
  }

  getBuyersByMasterIds(masterIds) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(masterIds) || masterIds.length === 0) {
        resolve({});
        return;
      }

      this.db.query(
        `SELECT mlb.master_id,
                mlb.employee_id,
                e.employee_name,
                e.buyer_alias,
                e.profile_img_url
         FROM master_list_buyers mlb
         INNER JOIN employees e ON mlb.employee_id = e.employee_code
         WHERE mlb.master_id IN (?)
         ORDER BY e.employee_name ASC`,
        [masterIds],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MASTER_LIST",
              code: "REPOSITORY.MASTER_LIST.GET_BUYERS.ERROR",
              description: err.toString(),
              category: "",
              ref: { masterIds },
            });
            reject(err);
            return;
          }

          const grouped = {};
          (rows || []).forEach((row) => {
            const key = row.master_id;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(mapBuyerRow(row));
          });
          resolve(grouped);
        }
      );
    });
  }

  async attachBuyers(entries) {
    if (!entries) return entries;
    const list = Array.isArray(entries) ? entries : [entries];
    if (list.length === 0) return entries;

    const buyersByMasterId = await this.getBuyersByMasterIds(
      list.map((e) => e.master_id)
    );

    const withBuyers = list.map((entry) => ({
      ...entry,
      buyers: buyersByMasterId[entry.master_id] || [],
    }));

    return Array.isArray(entries) ? withBuyers : withBuyers[0];
  }

  assignBuyersIfEmpty(assignments) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(assignments) || assignments.length === 0) {
        resolve({ updatedMasterIds: [] });
        return;
      }

      this.db.getConnection((connErr, connection) => {
        if (connErr) {
          reject(connErr);
          return;
        }

        connection.beginTransaction(async (txErr) => {
          if (txErr) {
            connection.release();
            reject(txErr);
            return;
          }

          const updatedMasterIds = [];

          try {
            for (const item of assignments) {
              const master_id = Number(item?.master_id);
              const buyer_ids = Array.isArray(item?.buyer_ids)
                ? item.buyer_ids
                : [];
              if (!Number.isFinite(master_id) || master_id <= 0) continue;
              if (buyer_ids.length === 0) continue;

              const existingBuyers = await new Promise((res, rej) => {
                connection.query(
                  `SELECT COUNT(*) AS cnt FROM master_list_buyers WHERE master_id = ?`,
                  [master_id],
                  (err, rows) => {
                    if (err) rej(err);
                    else res(Number(rows?.[0]?.cnt ?? 0));
                  }
                );
              });

              if (existingBuyers > 0) continue;

              await this.syncBuyers(connection, master_id, buyer_ids);
              updatedMasterIds.push(master_id);
            }

            connection.commit((commitErr) => {
              if (commitErr) {
                return connection.rollback(() => {
                  connection.release();
                  reject(commitErr);
                });
              }
              connection.release();
              resolve({ updatedMasterIds });
            });
          } catch (err) {
            connection.rollback(() => {
              connection.release();
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.MASTER_LIST",
                code: "REPOSITORY.MASTER_LIST.ASSIGN_BUYERS_IF_EMPTY",
                description: err.toString(),
                category: "",
                ref: { assignments },
              });
              reject(err);
            });
          }
        });
      });
    });
  }

  assignBuyersAdd(assignments) {
    return new Promise((resolve, reject) => {
      const list = Array.isArray(assignments) ? assignments : [];
      if (list.length === 0) {
        resolve({ updatedMasterIds: [] });
        return;
      }

      this.db.getConnection((connErr, connection) => {
        if (connErr) {
          reject(connErr);
          return;
        }

        connection.beginTransaction(async (txErr) => {
          if (txErr) {
            connection.release();
            reject(txErr);
            return;
          }

          const updatedMasterIds = new Set();

          try {
            for (const item of list) {
              const master_id = Number(item?.master_id);
              const buyer_ids = Array.isArray(item?.buyer_ids)
                ? item.buyer_ids
                : [];
              if (!Number.isFinite(master_id) || master_id <= 0) continue;

              const uniqueBuyerIds = [
                ...new Set(
                  buyer_ids.map((id) => String(id).trim()).filter(Boolean)
                ),
              ];
              if (uniqueBuyerIds.length === 0) continue;

              for (const employee_id of uniqueBuyerIds) {
                await new Promise((res, rej) => {
                  connection.query(
                    `INSERT IGNORE INTO master_list_buyers (master_id, employee_id) VALUES (?, ?)`,
                    [master_id, employee_id],
                    (err) => {
                      if (err) rej(err);
                      else res();
                    }
                  );
                });
              }
              updatedMasterIds.add(master_id);
            }

            connection.commit((commitErr) => {
              if (commitErr) {
                return connection.rollback(() => {
                  connection.release();
                  reject(commitErr);
                });
              }
              connection.release();
              resolve({
                updatedMasterIds: Array.from(updatedMasterIds),
              });
            });
          } catch (err) {
            connection.rollback(() => {
              connection.release();
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.MASTER_LIST",
                code: "REPOSITORY.MASTER_LIST.ASSIGN_BUYERS_ADD",
                description: err.toString(),
                category: "",
                ref: { assignments: list },
              });
              reject(err);
            });
          }
        });
      });
    });
  }

  syncBuyers(connection, master_id, buyer_ids) {
    return new Promise((resolve, reject) => {
      const ids = Array.isArray(buyer_ids)
        ? [...new Set(buyer_ids.map((id) => String(id).trim()).filter(Boolean))]
        : [];

      connection.query(
        `DELETE FROM master_list_buyers WHERE master_id = ?`,
        [master_id],
        (deleteErr) => {
          if (deleteErr) {
            reject(deleteErr);
            return;
          }

          if (ids.length === 0) {
            resolve();
            return;
          }

          const rows = ids.map((employee_id) => [master_id, employee_id]);
          connection.query(
            `INSERT INTO master_list_buyers (master_id, employee_id) VALUES ?`,
            [rows],
            (insertErr) => {
              if (insertErr) reject(insertErr);
              else resolve();
            }
          );
        }
      );
    });
  }

  create(payload) {
    return new Promise((resolve, reject) => {
      const {
        name,
        phone,
        contact_person_name,
        person_type,
        status = true,
        office_location,
        warehouse_location_1,
        warehouse_location_2,
        buyer_ids,
      } = payload;

      const jsonVal = (v) =>
        v === null || v === undefined ? null : (typeof v === "string" ? v : JSON.stringify(v));

      this.db.getConnection((connErr, connection) => {
        if (connErr) {
          reject(connErr);
          return;
        }

        connection.beginTransaction((txErr) => {
          if (txErr) {
            connection.release();
            reject(txErr);
            return;
          }

          connection.query(
            `INSERT INTO master_list (name, phone, contact_person_name, person_type, status, office_location, warehouse_location_1, warehouse_location_2) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              name,
              phone,
              contact_person_name,
              person_type,
              status,
              jsonVal(office_location),
              jsonVal(warehouse_location_1),
              jsonVal(warehouse_location_2),
            ],
            async (err, result) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  logger.Log({
                    level: logger.LEVEL.ERROR,
                    component: "REPOSITORY.MASTER_LIST",
                    code: "REPOSITORY.MASTER_LIST.CREATE.ERROR",
                    description: err.toString(),
                    category: "",
                    ref: { payload },
                  });
                  reject(err);
                });
              }

              const master_id = result.insertId;
              try {
                if (buyer_ids !== undefined) {
                  await this.syncBuyers(connection, master_id, buyer_ids);
                }
                connection.commit((commitErr) => {
                  if (commitErr) {
                    return connection.rollback(() => {
                      connection.release();
                      reject(commitErr);
                    });
                  }
                  connection.release();
                  resolve({ id: master_id, master_id });
                });
              } catch (buyerErr) {
                connection.rollback(() => {
                  connection.release();
                  logger.Log({
                    level: logger.LEVEL.ERROR,
                    component: "REPOSITORY.MASTER_LIST",
                    code: "REPOSITORY.MASTER_LIST.CREATE.BUYERS.ERROR",
                    description: buyerErr.toString(),
                    category: "",
                    ref: { master_id },
                  });
                  reject(buyerErr);
                });
              }
            }
          );
        });
      });
    });
  }

  getByPersonType(person_type) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT master_id, name, person_type FROM master_list WHERE person_type = ?",
        [person_type],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MASTER_LIST",
              code: "REPOSITORY.MASTER_LIST.GET_BY_PERSON_TYPE.ERROR",
              description: err.toString(),
              category: "",
              ref: { person_type },
            });
            reject(err);
            return;
          }
          resolve(rows || []);
        }
      );
    });
  }

  /**
   * Match existing rows by name + person_type (case-insensitive), then bulk upsert.
   * New names insert without master_id; existing names update by their master_id.
   */
  bulkUpsertByName(rows, person_type) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(rows) || rows.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      this.getByPersonType(person_type)
        .then((existing) => {
          const byName = new Map();
          (existing || []).forEach((row) => {
            const key = normalizeMasterName(row.name);
            if (!key || byName.has(key)) return;
            byName.set(key, row.master_id);
          });

          const dedupedRows = new Map();
          rows.forEach((row) => {
            const key = normalizeMasterName(row.name);
            if (!key || dedupedRows.has(key)) return;
            dedupedRows.set(key, row);
          });

          const resolved = [...dedupedRows.values()].map((row) => {
            const key = normalizeMasterName(row.name);
            const master_id = key ? byName.get(key) : null;
            const payload = {
              name: row.name,
              person_type,
              phone: row.phone ?? null,
              contact_person_name: row.contact_person_name ?? null,
              status: row.status !== undefined ? row.status : true,
            };
            if (master_id != null) {
              return { ...payload, master_id };
            }
            return payload;
          });

          return this.bulkCreate(resolved);
        })
        .then(resolve)
        .catch(reject);
    });
  }

  bulkCreate(rows) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(rows) || rows.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      // Extract all unique columns from all rows
      const allColumns = new Set();
      rows.forEach((row) => {
        Object.keys(row).forEach((key) => allColumns.add(key));
      });

      // Build column array - put master_id first if it exists
      const columns = Array.from(allColumns);
      const hasMasterId = columns.includes("master_id");
      const finalColumns = hasMasterId
        ? ["master_id", ...columns.filter((c) => c !== "master_id")]
        : columns;

      const values = rows.map((r) =>
        finalColumns.map((c) => (r[c] === null || r[c] === "" ? null : r[c]))
      );

      const placeholders = values
        .map(() => `(${finalColumns.map(() => "?").join(",")})`)
        .join(",");

      const flat = [].concat(...values);

      // Build ON DUPLICATE KEY UPDATE clause
      // Update all columns except master_id (primary key) and created_at (immutable)
      const doNotUpdate = new Set(["master_id", "created_at"]);
      const updateColumns = finalColumns.filter((c) => !doNotUpdate.has(c));
      const updateAssignments = updateColumns
        .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
        .join(", ");

      // Also update updated_at timestamp
      const updateClause =
        updateAssignments.length > 0
          ? `ON DUPLICATE KEY UPDATE ${updateAssignments}, updated_at = CURRENT_TIMESTAMP`
          : "";

      const sql = `INSERT INTO master_list (${finalColumns
        .map((c) => `\`${c}\``)
        .join(", ")}) VALUES ${placeholders} ${updateClause}`;

      this.db.query(sql, flat, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.MASTER_LIST",
            code: "REPOSITORY.MASTER_LIST.BULKCREATE.ERROR",
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

  update(master_id, payload) {
    return new Promise((resolve, reject) => {
      const { buyer_ids, ...updatePayload } = payload;
      const updateFields = [];
      const updateValues = [];

      if (updatePayload.name !== undefined) {
        updateFields.push("name = ?");
        updateValues.push(updatePayload.name);
      }
      if (updatePayload.phone !== undefined) {
        updateFields.push("phone = ?");
        updateValues.push(updatePayload.phone);
      }
      if (updatePayload.contact_person_name !== undefined) {
        updateFields.push("contact_person_name = ?");
        updateValues.push(updatePayload.contact_person_name);
      }
      if (updatePayload.person_type !== undefined) {
        updateFields.push("person_type = ?");
        updateValues.push(updatePayload.person_type);
      }
      if (updatePayload.status !== undefined) {
        updateFields.push("status = ?");
        updateValues.push(updatePayload.status);
      }
      const jsonVal = (v) =>
        v === null || v === undefined ? null : (typeof v === "string" ? v : JSON.stringify(v));
      if (updatePayload.office_location !== undefined) {
        updateFields.push("office_location = ?");
        updateValues.push(jsonVal(updatePayload.office_location));
      }
      if (updatePayload.warehouse_location_1 !== undefined) {
        updateFields.push("warehouse_location_1 = ?");
        updateValues.push(jsonVal(updatePayload.warehouse_location_1));
      }
      if (updatePayload.warehouse_location_2 !== undefined) {
        updateFields.push("warehouse_location_2 = ?");
        updateValues.push(jsonVal(updatePayload.warehouse_location_2));
      }

      if (updateFields.length === 0 && buyer_ids === undefined) {
        resolve({ message: "No fields to update" });
        return;
      }

      this.db.getConnection((connErr, connection) => {
        if (connErr) {
          reject(connErr);
          return;
        }

        connection.beginTransaction((txErr) => {
          if (txErr) {
            connection.release();
            reject(txErr);
            return;
          }

          const runBuyerSync = async () => {
            if (buyer_ids !== undefined) {
              await this.syncBuyers(connection, master_id, buyer_ids);
            }
          };

          const finish = (result) => {
            connection.commit((commitErr) => {
              if (commitErr) {
                return connection.rollback(() => {
                  connection.release();
                  reject(commitErr);
                });
              }
              connection.release();
              resolve(result);
            });
          };

          const onError = (err) => {
            connection.rollback(() => {
              connection.release();
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.MASTER_LIST",
                code: "REPOSITORY.MASTER_LIST.UPDATE.ERROR",
                description: err.toString(),
                category: "",
                ref: { master_id, payload },
              });
              reject(err);
            });
          };

          if (updateFields.length === 0) {
            runBuyerSync()
              .then(() => finish({ affectedRows: 0 }))
              .catch(onError);
            return;
          }

          updateFields.push("updated_at = CURRENT_TIMESTAMP");
          updateValues.push(master_id);

          connection.query(
            `UPDATE master_list SET ${updateFields.join(", ")} WHERE master_id = ?`,
            updateValues,
            async (err, result) => {
              if (err) {
                onError(err);
                return;
              }
              try {
                await runBuyerSync();
                finish({ affectedRows: result.affectedRows });
              } catch (buyerErr) {
                onError(buyerErr);
              }
            }
          );
        });
      });
    });
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT * FROM master_list ORDER BY created_at DESC",
        [],
        async (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MASTER_LIST",
              code: "REPOSITORY.MASTER_LIST.GETALL.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          try {
            const parsed = rows.map(parseJsonColumns);
            const withBuyers = await this.attachBuyers(parsed);
            resolve(withBuyers);
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  }

  getById(master_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT * FROM master_list WHERE master_id = ?",
        [master_id],
        async (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MASTER_LIST",
              code: "REPOSITORY.MASTER_LIST.GETBYID.ERROR",
              description: err.toString(),
              category: "",
              ref: { master_id },
            });
            reject(err);
            return;
          }
          if (!rows[0]) {
            resolve(null);
            return;
          }
          try {
            const entry = parseJsonColumns(rows[0]);
            const withBuyers = await this.attachBuyers(entry);
            resolve(withBuyers);
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  }

  updateStatus(master_id, status) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "UPDATE master_list SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE master_id = ?",
        [status, master_id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.MASTER_LIST",
              code: "REPOSITORY.MASTER_LIST.UPDATESTATUS.ERROR",
              description: err.toString(),
              category: "",
              ref: { master_id, status },
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

module.exports = (db) => {
  return new MasterListRepository(db);
};
