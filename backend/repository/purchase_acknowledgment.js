const logger = require("../utils/logger");

class PurchaseAcknowledgmentRepository {
  constructor(db) {
    this.db = db;
  }

  create(purchaseAcknowledgmentData) {
    return new Promise((resolve, reject) => {
      try {
        const { supplier_id, invoice_no, invoice_date, amount, branch_id } =
          purchaseAcknowledgmentData;

        const sql = `INSERT INTO purchase_acknowledgment 
          (supplier_id, invoice_no, invoice_date, amount, branch_id) 
          VALUES (?, ?, ?, ?, ?)`;

        this.db.query(
          sql,
          [supplier_id, invoice_no, invoice_date, amount, branch_id],
          (err, result) => {
            if (err) {
              logger.Log({
                level: logger.LEVEL.ERROR,
                component: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
                code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.CREATE",
                description: err.toString(),
                category: "",
                ref: { purchaseAcknowledgmentData },
              });
              reject(err);
              return;
            }

            resolve(result.insertId);
          }
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT pa.*, ml.name as supplier_name, ml.phone as supplier_phone, b.branch_name as branch_name,
         (SELECT g.purchase_order_id 
          FROM grn g 
          WHERE g.purchase_acknowledgment_id = pa.purchase_acknowledgment_id 
          LIMIT 1) as purchase_order_id,
         (SELECT g.created_at 
          FROM grn g 
          WHERE g.purchase_acknowledgment_id = pa.purchase_acknowledgment_id 
          ORDER BY g.created_at DESC
          LIMIT 1) as grn_created_at,
         (SELECT wpe.created_at 
          FROM wms_purchase_entry wpe 
          WHERE wpe.purchase_acknowledgment_id = pa.purchase_acknowledgment_id 
          ORDER BY wpe.created_at DESC
          LIMIT 1) as wms_purchase_entry_created_at
         FROM purchase_acknowledgment pa
         LEFT JOIN master_list ml ON pa.supplier_id = ml.master_id
         LEFT JOIN branches b ON pa.branch_id = b.branch_id
         WHERE pa.purchase_acknowledgment_id = ?`,
        [id],
        (err, results) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
              code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.GET-BY-ID",
              description: err.toString(),
              category: "",
              ref: { id },
            });
            reject(err);
            return;
          }

          if (!results.length) return resolve(undefined);

          const row = results[0];

          // Base (existing) response structure
          const base = {
            purchase_acknowledgment_id: row.purchase_acknowledgment_id,
            supplier_id: row.supplier_id,
            invoice_no: row.invoice_no,
            invoice_date: row.invoice_date,
            amount: row.amount,
            branch_id: row.branch_id || null,
            branch_name: row.branch_name || null,
            purchase_order_id: row.purchase_order_id || null,
            created_at: row.created_at,
            updated_at: row.updated_at,
            grn_created_at: row.grn_created_at || null,
            wms_purchase_entry_created_at:
              row.wms_purchase_entry_created_at || null,
            supplier: row.supplier_id
              ? {
                master_id: row.supplier_id,
                name: row.supplier_name,
                phone: row.supplier_phone,
              }
              : null,
          };

          // Fetch related GRN, stickering and purchase entry records mapped by purchase_acknowledgment_id
          const grnPromise = new Promise((resolveGrn, rejectGrn) => {
            this.db.query(
              `SELECT g.*, e.employee_name, e.profile_img_url AS employee_profile_img_url
               FROM grn g
               LEFT JOIN employees e ON g.employee_id = e.employee_code
               WHERE g.purchase_acknowledgment_id = ?
               ORDER BY g.created_at ASC`,
              [id],
              (errGrn, grnRows) => {
                if (errGrn) {
                  logger.Log({
                    level: logger.LEVEL.ERROR,
                    component: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
                    code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.GET-BY-ID.GRN",
                    description: errGrn.toString(),
                    category: "",
                    ref: { id },
                  });
                  rejectGrn(errGrn);
                  return;
                }
                const mappedGrn = (grnRows || []).map((row) => {
                  const { employee_name, employee_profile_img_url, ...rest } =
                    row;
                  return {
                    ...rest,
                    // mapped employee object (from employee_id)
                    employee:
                      row.employee_id != null
                        ? {
                          employee_code: row.employee_id,
                          employee_name,
                          profile_img_url: employee_profile_img_url || null,
                        }
                        : null,
                  };
                });
                resolveGrn(mappedGrn);
              }
            );
          });

          const stickeringPromise = new Promise(
            (resolveStick, rejectStick) => {
              this.db.query(
                `SELECT 
                   s.*,
                   e.employee_name,
                   e.profile_img_url AS employee_profile_img_url,
                   sup.employee_name AS supervisor_name,
                   sup.profile_img_url AS supervisor_profile_img_url,
                   repack_sup.employee_name AS repack_supervisor_name,
                   repack_sup.profile_img_url AS repack_supervisor_profile_img_url
                 FROM stickering s
                 LEFT JOIN employees e ON s.employee_code = e.employee_code
                 LEFT JOIN employees sup ON s.supervisor_id = sup.employee_code
                 LEFT JOIN employees repack_sup ON s.repack_supervisor_id = repack_sup.employee_code
                 WHERE s.purchase_acknowledgment_id = ?
                 ORDER BY s.created_at ASC`,
                [id],
                (errStick, stickRows) => {
                  if (errStick) {
                    logger.Log({
                      level: logger.LEVEL.ERROR,
                      component: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
                      code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.GET-BY-ID.STICKERING",
                      description: errStick.toString(),
                      category: "",
                      ref: { id },
                    });
                    rejectStick(errStick);
                    return;
                  }
                  const mappedStick = (stickRows || []).map((row) => {
                    const {
                      employee_name,
                      employee_profile_img_url,
                      supervisor_name,
                      supervisor_profile_img_url,
                      repack_supervisor_name,
                      repack_supervisor_profile_img_url,
                      ...rest
                    } = row;

                    return {
                      ...rest,
                      // mapped employee (worker) object
                      employee:
                        row.employee_code != null
                          ? {
                            employee_code: row.employee_code,
                            employee_name,
                            profile_img_url: employee_profile_img_url || null,
                          }
                          : null,
                      // mapped supervisor object
                      supervisor:
                        row.supervisor_id != null
                          ? {
                            employee_code: row.supervisor_id,
                            employee_name: supervisor_name,
                            profile_img_url:
                              supervisor_profile_img_url || null,
                          }
                          : null,
                      // mapped repacking supervisor object
                      repack_supervisor:
                        row.repack_supervisor_id != null
                          ? {
                            employee_code: row.repack_supervisor_id,
                            employee_name: repack_supervisor_name,
                            profile_img_url:
                              repack_supervisor_profile_img_url || null,
                          }
                          : null,
                    };
                  });

                  resolveStick(mappedStick);
                }
              );
            }
          );

          const purchaseEntryPromise = new Promise(
            (resolvePe, rejectPe) => {
              this.db.query(
                `SELECT pe.*, e.employee_name, e.profile_img_url AS employee_profile_img_url
                 FROM wms_purchase_entry pe
                 LEFT JOIN employees e ON pe.handled_by = e.employee_code
                 WHERE pe.purchase_acknowledgment_id = ?
                 ORDER BY pe.created_at ASC`,
                [id],
                (errPe, peRows) => {
                  if (errPe) {
                    logger.Log({
                      level: logger.LEVEL.ERROR,
                      component: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
                      code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.GET-BY-ID.PURCHASE-ENTRY",
                      description: errPe.toString(),
                      category: "",
                      ref: { id },
                    });
                    rejectPe(errPe);
                    return;
                  }
                  const mappedPe = (peRows || []).map((row) => {
                    const { employee_name, employee_profile_img_url, ...rest } =
                      row;
                    return {
                      ...rest,
                      handled_by_employee:
                        row.handled_by != null
                          ? {
                            employee_code: row.handled_by,
                            employee_name,
                            profile_img_url: employee_profile_img_url || null,
                          }
                          : null,
                    };
                  });

                  resolvePe(mappedPe);
                }
              );
            }
          );

          Promise.all([grnPromise, stickeringPromise, purchaseEntryPromise])
            .then(([grns, stickering, purchase_entries]) => {
              resolve({
                ...base,
                grns,
                stickering,
                purchase_entries,
              });
            })
            .catch(reject);
        }
      );
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

      // Get all purchase acknowledgments
      this.db.query(
        `SELECT pa.*, ml.name as supplier_name, ml.phone as supplier_phone, b.branch_name as branch_name,
         (SELECT wpe.purchase_entry_id 
          FROM wms_purchase_entry wpe 
          WHERE wpe.purchase_acknowledgment_id = pa.purchase_acknowledgment_id 
          LIMIT 1) as purchase_entry_id,
         (SELECT wpe.is_job_entry_needed 
          FROM wms_purchase_entry wpe 
          WHERE wpe.purchase_acknowledgment_id = pa.purchase_acknowledgment_id 
          LIMIT 1) as is_job_entry_needed,
         (SELECT wpe.created_at 
          FROM wms_purchase_entry wpe 
          WHERE wpe.purchase_acknowledgment_id = pa.purchase_acknowledgment_id 
          ORDER BY wpe.created_at DESC
          LIMIT 1) as wms_purchase_entry_created_at,
         (SELECT g.purchase_order_id 
          FROM grn g 
          WHERE g.purchase_acknowledgment_id = pa.purchase_acknowledgment_id 
          LIMIT 1) as purchase_order_id
         FROM purchase_acknowledgment pa
         LEFT JOIN master_list ml ON pa.supplier_id = ml.master_id
         LEFT JOIN branches b ON pa.branch_id = b.branch_id
         ${dateWhereSql}
         ORDER BY pa.created_at DESC`,
        dateParams,
        (err, results) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
              code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.GET-ALL",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }

          // Get total count
          const totalCount = results.length;

          if (results.length === 0) {
            resolve({
              data: [],
              total_count: 0,
            });
            return;
          }

          // Get purchase acknowledgment IDs
          const purchaseAckIds = results.map(
            (r) => r.purchase_acknowledgment_id
          );

          // Get count of stickering items grouped by purchase_acknowledgment_id and status
          const placeholders = purchaseAckIds.map(() => "?").join(",");
          this.db.query(
            `SELECT purchase_acknowledgment_id, status, COUNT(*) as count
             FROM stickering
             WHERE purchase_acknowledgment_id IS NOT NULL
               AND purchase_acknowledgment_id IN (${placeholders})
             GROUP BY purchase_acknowledgment_id, status`,
            purchaseAckIds,
            (err2, statusCounts) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
                  code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.GET-ALL.STATUS-COUNT",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }

              // Create a map of purchase_acknowledgment_id to status counts
              const statusMap = {};
              results.forEach((result) => {
                statusMap[result.purchase_acknowledgment_id] = {
                  open: 0,
                  in_progress: 0,
                  done: 0,
                  cancelled: 0,
                };
              });

              statusCounts.forEach((item) => {
                if (statusMap[item.purchase_acknowledgment_id]) {
                  statusMap[item.purchase_acknowledgment_id][item.status] =
                    parseInt(item.count, 10);
                }
              });

              // Get repacking entry count (rows having any of packing / loose / pur_ret / wastage)
              this.db.query(
                `SELECT purchase_acknowledgment_id, COUNT(*) as repacking_entry_count
                 FROM stickering
                 WHERE purchase_acknowledgment_id IS NOT NULL
                   AND purchase_acknowledgment_id IN (${placeholders})
                   AND (
                     packing IS NOT NULL OR
                     loose IS NOT NULL OR
                     pur_ret IS NOT NULL OR
                     wastage IS NOT NULL
                   )
                 GROUP BY purchase_acknowledgment_id`,
                purchaseAckIds,
                (err3, repackCounts) => {
                  if (err3) {
                    logger.Log({
                      level: logger.LEVEL.ERROR,
                      component: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
                      code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.GET-ALL.REPACK-COUNT",
                      description: err3.toString(),
                      category: "",
                      ref: {},
                    });
                    reject(err3);
                    return;
                  }

                  const repackMap = {};
                  repackCounts.forEach((row) => {
                    repackMap[row.purchase_acknowledgment_id] = parseInt(
                      row.repacking_entry_count,
                      10
                    );
                  });

                  // Get count of stickering items with repack_supervisor_id set
                  this.db.query(
                    `SELECT purchase_acknowledgment_id, COUNT(*) as repack_supervisor_entry_count
                     FROM stickering
                     WHERE purchase_acknowledgment_id IS NOT NULL
                       AND purchase_acknowledgment_id IN (${placeholders})
                       AND repack_supervisor_id IS NOT NULL
                     GROUP BY purchase_acknowledgment_id`,
                    purchaseAckIds,
                    (errSup, repackSupCounts) => {
                      if (errSup) {
                        logger.Log({
                          level: logger.LEVEL.ERROR,
                          component: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
                          code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.GET-ALL.REPACK-SUPERVISOR-COUNT",
                          description: errSup.toString(),
                          category: "",
                          ref: {},
                        });
                        reject(errSup);
                        return;
                      }

                      const repackSupervisorMap = {};
                      repackSupCounts.forEach((row) => {
                        repackSupervisorMap[row.purchase_acknowledgment_id] =
                          parseInt(row.repack_supervisor_entry_count, 10);
                      });

                      // Get has_grn status, grn employee code, and latest created_at for each purchase acknowledgment
                      this.db.query(
                        `SELECT purchase_acknowledgment_id, employee_id, grn_id, created_at
                         FROM grn
                         WHERE purchase_acknowledgment_id IN (${placeholders})
                         ORDER BY purchase_acknowledgment_id, created_at DESC`,
                        purchaseAckIds,
                        (err4, grnEntries) => {
                          if (err4) {
                            logger.Log({
                              level: logger.LEVEL.ERROR,
                              component: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
                              code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.GET-ALL.HAS-GRN",
                              description: err4.toString(),
                              category: "",
                              ref: {},
                            });
                            reject(err4);
                            return;
                          }

                          // Create a set of purchase acknowledgment IDs that have GRN entries
                          const hasGrnSet = new Set(
                            grnEntries.map(
                              (entry) => entry.purchase_acknowledgment_id
                            )
                          );

                          // Map of purchase_acknowledgment_id to first non-null employee_id (if any)
                          const grnEmployeeMap = {};
                          // Map of purchase_acknowledgment_id to first grn_id (if any)
                          const grnIdMap = {};
                          // Map of purchase_acknowledgment_id to latest created_at (if any)
                          const grnCreatedAtMap = {};
                          grnEntries.forEach((entry) => {
                            if (
                              entry.purchase_acknowledgment_id &&
                              grnEmployeeMap[entry.purchase_acknowledgment_id] ===
                              undefined
                            ) {
                              grnEmployeeMap[entry.purchase_acknowledgment_id] =
                                entry.employee_id || null;
                              grnIdMap[entry.purchase_acknowledgment_id] =
                                entry.grn_id || null;
                              grnCreatedAtMap[entry.purchase_acknowledgment_id] =
                                entry.created_at || null;
                            }
                          });

                          // Get repln_mode counts from wms_purchase_entry_items via products
                          // First, get purchase_entry_ids for purchase acknowledgments that have wms_purchase_entry
                          const purchaseEntryIds = results
                            .filter((r) => r.purchase_entry_id !== null)
                            .map((r) => r.purchase_entry_id);

                          if (purchaseEntryIds.length === 0) {
                            // No purchase entries, return empty repln_mode stats and empty products
                            const replnModeMap = {};
                            results.forEach((result) => {
                              replnModeMap[result.purchase_acknowledgment_id] =
                                {};
                            });

                            // Map results with status counts, repacking_entry_count, repack_supervisor_entry_count, has_grn, purchase_entry_id, purchase_order_id, products
                            const data = results.map((result) => ({
                              purchase_acknowledgment_id:
                                result.purchase_acknowledgment_id,
                              supplier_id: result.supplier_id,
                              invoice_no: result.invoice_no,
                              invoice_date: result.invoice_date,
                              amount: result.amount,
                              branch_id: result.branch_id || null,
                              branch_name: result.branch_name || null,
                              purchase_order_id:
                                result.purchase_order_id || null,
                              created_at: result.created_at,
                              updated_at: result.updated_at,
                              purchase_entry_id:
                                result.purchase_entry_id || null,
                              is_job_entry_needed:
                                result.is_job_entry_needed !== null
                                  ? Boolean(result.is_job_entry_needed)
                                  : null,
                              supplier: result.supplier_id
                                ? {
                                  master_id: result.supplier_id,
                                  name: result.supplier_name,
                                  phone: result.supplier_phone,
                                }
                                : null,
                              status_counts: statusMap[
                                result.purchase_acknowledgment_id
                              ] || {
                                open: 0,
                                in_progress: 0,
                                done: 0,
                                cancelled: 0,
                              },
                              repacking_entry_count:
                                repackMap[result.purchase_acknowledgment_id] ||
                                0,
                              repack_supervisor_entry_count:
                                repackSupervisorMap[
                                result.purchase_acknowledgment_id
                                ] || 0,
                              has_grn: hasGrnSet.has(
                                result.purchase_acknowledgment_id
                              ),
                              grn_id: hasGrnSet.has(
                                result.purchase_acknowledgment_id
                              )
                                ? grnIdMap[result.purchase_acknowledgment_id] ||
                                null
                                : null,
                              grn_employee_code:
                                grnEmployeeMap[
                                result.purchase_acknowledgment_id
                                ] || null,
                              grn_created_at:
                                grnCreatedAtMap[
                                result.purchase_acknowledgment_id
                                ] || null,
                              wms_purchase_entry_created_at:
                                result.wms_purchase_entry_created_at || null,
                              repln_mode_counts:
                                replnModeMap[
                                result.purchase_acknowledgment_id
                                ] || {},
                              products: [],
                            }));

                            resolve({
                              data,
                              total_count: totalCount,
                            });
                            return;
                          }

                          // Get purchase_acknowledgment_id for each purchase_entry_id
                          const entryIdPlaceholders = purchaseEntryIds
                            .map(() => "?")
                            .join(",");
                          this.db.query(
                            `SELECT wpe.purchase_entry_id, wpe.purchase_acknowledgment_id
                             FROM wms_purchase_entry wpe
                             WHERE wpe.purchase_entry_id IN (${entryIdPlaceholders})`,
                            purchaseEntryIds,
                            (err5, entryMappings) => {
                              if (err5) {
                                logger.Log({
                                  level: logger.LEVEL.ERROR,
                                  component:
                                    "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
                                  code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.GET-ALL.ENTRY-MAPPING",
                                  description: err5.toString(),
                                  category: "",
                                  ref: {},
                                });
                                reject(err5);
                                return;
                              }

                              // Create map of purchase_entry_id to purchase_acknowledgment_id
                              const entryToAckMap = {};
                              entryMappings.forEach((mapping) => {
                                entryToAckMap[mapping.purchase_entry_id] =
                                  mapping.purchase_acknowledgment_id;
                              });

                              // Get repln_mode counts grouped by purchase_entry_id
                              this.db.query(
                                `SELECT pei.purchase_entry_id, 
                                        COALESCE(p.repln_mode, 'NULL') as repln_mode, 
                                        COUNT(*) as count
                                 FROM wms_purchase_entry_items pei
                                 INNER JOIN products p ON pei.product_id = p.product_id
                                 WHERE pei.purchase_entry_id IN (${entryIdPlaceholders})
                                 GROUP BY pei.purchase_entry_id, p.repln_mode`,
                                purchaseEntryIds,
                                (err6, replnModeCounts) => {
                                  if (err6) {
                                    logger.Log({
                                      level: logger.LEVEL.ERROR,
                                      component:
                                        "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
                                      code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.GET-ALL.REPLN-MODE-COUNT",
                                      description: err6.toString(),
                                      category: "",
                                      ref: {},
                                    });
                                    reject(err6);
                                    return;
                                  }

                                  // Create a map of purchase_acknowledgment_id to repln_mode counts
                                  const replnModeMap = {};
                                  results.forEach((result) => {
                                    replnModeMap[
                                      result.purchase_acknowledgment_id
                                    ] = {};
                                  });

                                  replnModeCounts.forEach((row) => {
                                    const ackId =
                                      entryToAckMap[row.purchase_entry_id];
                                    if (ackId && replnModeMap[ackId]) {
                                      const mode =
                                        row.repln_mode === "NULL"
                                          ? null
                                          : row.repln_mode;
                                      replnModeMap[ackId][mode] = parseInt(
                                        row.count,
                                        10
                                      );
                                    }
                                  });

                                  // Get products list (wms_purchase_entry_items + product) per purchase_acknowledgment_id
                                  this.db.query(
                                    `SELECT pei.purchase_entry_id, pei.wms_purchase_entry_item_id, pei.product_id, pei.quantity, pei.rate, p.de_name as product_name
                                     FROM wms_purchase_entry_items pei
                                     LEFT JOIN products p ON pei.product_id = p.product_id
                                     WHERE pei.purchase_entry_id IN (${entryIdPlaceholders})`,
                                    purchaseEntryIds,
                                    (errProducts, productRows) => {
                                      if (errProducts) {
                                        logger.Log({
                                          level: logger.LEVEL.ERROR,
                                          component:
                                            "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
                                          code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.GET-ALL.PRODUCTS",
                                          description: errProducts.toString(),
                                          category: "",
                                          ref: {},
                                        });
                                        reject(errProducts);
                                        return;
                                      }

                                      const productsByAckId = {};
                                      results.forEach((result) => {
                                        productsByAckId[
                                          result.purchase_acknowledgment_id
                                        ] = [];
                                      });
                                      (productRows || []).forEach((row) => {
                                        const ackId =
                                          entryToAckMap[row.purchase_entry_id];
                                        if (ackId && productsByAckId[ackId]) {
                                          productsByAckId[ackId].push({
                                            wms_purchase_entry_item_id:
                                              row.wms_purchase_entry_item_id,
                                            product_id: row.product_id,
                                            quantity: row.quantity,
                                            rate: row.rate,
                                            product:
                                              row.product_id != null
                                                ? {
                                                  product_id: row.product_id,
                                                  product_name:
                                                    row.product_name || null,
                                                }
                                                : null,
                                          });
                                        }
                                      });

                                      // Map results with status counts, repacking_entry_count, repack_supervisor_entry_count, has_grn, purchase_entry_id, purchase_order_id, products
                                      const data = results.map((result) => ({
                                        purchase_acknowledgment_id:
                                          result.purchase_acknowledgment_id,
                                        supplier_id: result.supplier_id,
                                        invoice_no: result.invoice_no,
                                        invoice_date: result.invoice_date,
                                        amount: result.amount,
                                        branch_id: result.branch_id || null,
                                        branch_name: result.branch_name || null,
                                        purchase_order_id:
                                          result.purchase_order_id || null,
                                        created_at: result.created_at,
                                        updated_at: result.updated_at,
                                        purchase_entry_id:
                                          result.purchase_entry_id || null,
                                        is_job_entry_needed:
                                          result.is_job_entry_needed !== null
                                            ? Boolean(
                                              result.is_job_entry_needed
                                            )
                                            : null,
                                        supplier: result.supplier_id
                                          ? {
                                            master_id: result.supplier_id,
                                            name: result.supplier_name,
                                            phone: result.supplier_phone,
                                          }
                                          : null,
                                        status_counts: statusMap[
                                          result.purchase_acknowledgment_id
                                        ] || {
                                          open: 0,
                                          in_progress: 0,
                                          done: 0,
                                          cancelled: 0,
                                        },
                                        repacking_entry_count:
                                          repackMap[
                                          result.purchase_acknowledgment_id
                                          ] || 0,
                                        repack_supervisor_entry_count:
                                          repackSupervisorMap[
                                          result.purchase_acknowledgment_id
                                          ] || 0,
                                        has_grn: hasGrnSet.has(
                                          result.purchase_acknowledgment_id
                                        ),
                                        grn_id: hasGrnSet.has(
                                          result.purchase_acknowledgment_id
                                        )
                                          ? grnIdMap[
                                          result.purchase_acknowledgment_id
                                          ] || null
                                          : null,
                                        grn_employee_code:
                                          grnEmployeeMap[
                                          result.purchase_acknowledgment_id
                                          ] || null,
                                        grn_created_at:
                                          grnCreatedAtMap[
                                          result.purchase_acknowledgment_id
                                          ] || null,
                                        wms_purchase_entry_created_at:
                                          result.wms_purchase_entry_created_at ||
                                          null,
                                        repln_mode_counts:
                                          replnModeMap[
                                          result.purchase_acknowledgment_id
                                          ] || {},
                                        products:
                                          productsByAckId[
                                          result.purchase_acknowledgment_id
                                          ] || [],
                                      }));

                                      resolve({
                                        data,
                                        total_count: totalCount,
                                      });
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
                }
              );
            }
          );
        }
      );
    });
  }

  update(id, purchaseAcknowledgmentData) {
    return new Promise((resolve, reject) => {
      const { supplier_id, invoice_no, invoice_date, amount } =
        purchaseAcknowledgmentData;

      const updateFields = [];
      const updateValues = [];

      if (supplier_id !== undefined) {
        updateFields.push("supplier_id = ?");
        updateValues.push(supplier_id);
      }
      if (invoice_no !== undefined) {
        updateFields.push("invoice_no = ?");
        updateValues.push(invoice_no);
      }
      if (invoice_date !== undefined) {
        updateFields.push("invoice_date = ?");
        updateValues.push(invoice_date);
      }
      if (amount !== undefined) {
        updateFields.push("amount = ?");
        updateValues.push(amount);
      }

      if (updateFields.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(id);

      const sql = `UPDATE purchase_acknowledgment SET ${updateFields.join(
        ", "
      )} WHERE purchase_acknowledgment_id = ?`;

      this.db.query(sql, updateValues, (err, result) => {
        if (err) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
            code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.UPDATE",
            description: err.toString(),
            category: "",
            ref: { id, purchaseAcknowledgmentData },
          });
          reject(err);
          return;
        }
        resolve({ affectedRows: result.affectedRows });
      });
    });
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      // 1) Delete related stickering rows
      this.db.query(
        "DELETE FROM stickering WHERE purchase_acknowledgment_id = ?",
        [id],
        (errStickering) => {
          if (errStickering) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
              code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.DELETE.STICKERING",
              description: errStickering.toString(),
              category: "",
              ref: { id },
            });
            reject(errStickering);
            return;
          }

          // 2) Delete related GRN rows
          this.db.query(
            "DELETE FROM grn WHERE purchase_acknowledgment_id = ?",
            [id],
            (errGrn) => {
              if (errGrn) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
                  code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.DELETE.GRN",
                  description: errGrn.toString(),
                  category: "",
                  ref: { id },
                });
                reject(errGrn);
                return;
              }

              // 3) Delete related purchase entry rows
              this.db.query(
                "DELETE FROM wms_purchase_entry WHERE purchase_acknowledgment_id = ?",
                [id],
                (errPe) => {
                  if (errPe) {
                    logger.Log({
                      level: logger.LEVEL.ERROR,
                      component: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
                      code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.DELETE.PURCHASE-ENTRY",
                      description: errPe.toString(),
                      category: "",
                      ref: { id },
                    });
                    reject(errPe);
                    return;
                  }

                  // 4) Finally delete the purchase acknowledgment itself
                  this.db.query(
                    "DELETE FROM purchase_acknowledgment WHERE purchase_acknowledgment_id = ?",
                    [id],
                    (errPa, result) => {
                      if (errPa) {
                        logger.Log({
                          level: logger.LEVEL.ERROR,
                          component:
                            "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
                          code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.DELETE",
                          description: errPa.toString(),
                          category: "",
                          ref: { id },
                        });
                        reject(errPa);
                        return;
                      }
                      resolve({ affectedRows: result.affectedRows, id });
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

  getEntriesByProductId(product_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           pei.wms_purchase_entry_item_id,
           pei.purchase_entry_id,
           pei.product_id,
           pei.quantity,
           pei.rate,
           p.de_name AS product_name,
           pa.purchase_acknowledgment_id,
           pa.invoice_no,
           pa.invoice_date,
           pa.supplier_id,
           ml.name AS supplier_name,
           ml.phone AS supplier_phone,
           ml.contact_person_name AS supplier_contact_person,
           pa.branch_id,
           b.branch_name
         FROM wms_purchase_entry_items pei
         INNER JOIN wms_purchase_entry wpe ON pei.purchase_entry_id = wpe.purchase_entry_id
         INNER JOIN purchase_acknowledgment pa ON wpe.purchase_acknowledgment_id = pa.purchase_acknowledgment_id
         LEFT JOIN products p ON pei.product_id = p.product_id
         LEFT JOIN master_list ml ON pa.supplier_id = ml.master_id
         LEFT JOIN branches b ON pa.branch_id = b.branch_id
         WHERE pei.product_id = ?
         ORDER BY pa.invoice_date DESC, pa.created_at DESC`,
        [product_id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT",
              code: "REPOSITORY.PURCHASE_ACKNOWLEDGMENT.GET_ENTRIES_BY_PRODUCT_ID.ERROR",
              description: err.toString(),
              category: "",
              ref: { product_id },
            });
            reject(err);
            return;
          }

          const mapped = (rows || []).map((row) => ({
            wms_purchase_entry_item_id: row.wms_purchase_entry_item_id,
            purchase_entry_id: row.purchase_entry_id,
            product_id: row.product_id,
            quantity: row.quantity,
            rate: row.rate,
            product: row.product_id != null
              ? { product_id: row.product_id, product_name: row.product_name || null }
              : null,
            purchase_acknowledgment_id: row.purchase_acknowledgment_id,
            invoice_no: row.invoice_no,
            invoice_date: row.invoice_date,
            branch_id: row.branch_id || null,
            branch_name: row.branch_name || null,
            supplier: row.supplier_id != null
              ? {
                  supplier_id: row.supplier_id,
                  name: row.supplier_name || null,
                  phone: row.supplier_phone || null,
                  contact_person_name: row.supplier_contact_person || null,
                }
              : null,
          }));

          resolve(mapped);
        }
      );
    });
  }
}

module.exports = (db) => {
  return new PurchaseAcknowledgmentRepository(db);
};
