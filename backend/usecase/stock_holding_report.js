const moment = require("moment");
const logger = require("../utils/logger");
const {
  fetchStockInfoItemsForStores,
} = require("../services/delium_stock_info");
const {
  buildEnrichmentLookups,
  enrichSyncItems,
} = require("../utils/stockHoldingSyncEnrichment");

const IMPORT_BATCH_SIZE = 5000;

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

class StockHoldingReportUsecase {
  constructor(
    stockHoldingReportRepo,
    branchesRepo,
    masterListRepo,
    employeesRepo,
    productRepo
  ) {
    this.stockHoldingReportRepo = stockHoldingReportRepo;
    this.branchesRepo = branchesRepo;
    this.masterListRepo = masterListRepo;
    this.employeesRepo = employeesRepo;
    this.productRepo = productRepo;
  }

  async enrichItemsForSync(items) {
    const productIds = Array.from(
      new Set((items || []).map((item) => Number(item.product_id)).filter((id) => Number.isFinite(id) && id > 0))
    );

    const [masterList, employees, products] = await Promise.all([
      this.masterListRepo.getAll(),
      this.employeesRepo.getAll(),
      this.productRepo.getByProductIds(productIds),
    ]);

    const productsById = {};
    (products || []).forEach((product) => {
      productsById[Number(product.product_id)] = product;
    });

    const lookups = buildEnrichmentLookups({
      productsById,
      masterList,
      employees,
    });

    return enrichSyncItems(items, lookups);
  }

  async finalizeUpload(stockHoldingReportId) {
    const cleanup = await this.stockHoldingReportRepo.deleteAllExceptReportId(
      stockHoldingReportId
    );
    return cleanup;
  }

  create(payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.stockHoldingReportRepo.create(payload);
        if ((payload.items || []).length > 0) {
          await this.finalizeUpload(data.stock_holding_report_id);
        }
        resolve({
          code: 200,
          message: "Stock holding report created successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  createHeader(payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const stock_holding_report_id =
          await this.stockHoldingReportRepo.createReportHeader(payload);
        resolve({
          code: 200,
          message: "Stock holding report header created successfully",
          data: {
            stock_holding_report_id,
            report_name: payload.report_name,
            date: payload.date,
            created_by: payload.created_by,
            item_count: 0,
          },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  appendItems(stockHoldingReportId, items, options = {}) {
    const { finalize = false } = options;
    return new Promise(async (resolve, reject) => {
      try {
        const exists = await this.stockHoldingReportRepo.reportExists(
          stockHoldingReportId
        );
        if (!exists) {
          resolve({
            code: 404,
            message: "Stock holding report not found",
          });
          return;
        }
        const data = await this.stockHoldingReportRepo.appendItems(
          stockHoldingReportId,
          items
        );
        if (finalize) {
          await this.finalizeUpload(stockHoldingReportId);
        }
        resolve({
          code: 200,
          message: "Stock holding items appended successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAllReports() {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.stockHoldingReportRepo.getAllReports();
        resolve({
          code: 200,
          message: "Stock holding reports fetched successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(stockHoldingReportId, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.stockHoldingReportRepo.getById(
          stockHoldingReportId,
          options
        );
        if (!data) {
          resolve({
            code: 404,
            message: "Stock holding report not found",
          });
          return;
        }
        resolve({
          code: 200,
          message: "Stock holding report fetched successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getReportById(date, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const { exact } = this.getReportLookupOptions(date);
        const data = await this.stockHoldingReportRepo.getLatestReportByDate(
          date,
          { ...options, exact }
        );
        if (!data) {
          resolve({
            code: 404,
            message: "Stock holding report not found",
          });
          return;
        }
        resolve({
          code: 200,
          message:
            "Latest stock holding report on or before date fetched successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getReportLookupOptions(date) {
    const currentDate = moment().format("YYYY-MM-DD");
    const requestedDate = moment(date).format("YYYY-MM-DD");

    return {
      currentDate,
      requestedDate,
      exact: requestedDate === currentDate,
    };
  }

  normalizeReportTimestamp(value) {
    if (!value) return null;
    const m = moment(value);
    return m.isValid() ? m.toISOString() : null;
  }

  shouldRefreshByClientFetchTime(clientFetchedAt, now = moment()) {
    if (!clientFetchedAt) return true;
    const fetched = moment(clientFetchedAt);
    if (!fetched.isValid()) return true;
    if (fetched.isSame(now, "day")) return false;
    return now.hour() >= 6;
  }

  getLatestStatus(date, clientMeta = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const { currentDate, requestedDate, exact } =
          this.getReportLookupOptions(date);
        const clientReportId =
          clientMeta.report_id != null && clientMeta.report_id !== ""
            ? Number(clientMeta.report_id)
            : null;
        const clientCreatedAt = this.normalizeReportTimestamp(
          clientMeta.report_created_at
        );
        const clientFetchedAt = clientMeta.client_fetched_at ?? null;

        const reportId =
          await this.stockHoldingReportRepo.getLatestReportIdByDate(
            requestedDate,
            { exact }
          );

        if (!reportId) {
          resolve({
            code: 200,
            message: "Stock holding report status fetched successfully",
            data: {
              has_report: false,
              needs_refresh: this.shouldRefreshByClientFetchTime(clientFetchedAt),
              is_current_date: false,
              current_date: currentDate,
              requested_date: requestedDate,
              report: null,
            },
          });
          return;
        }

        const report =
          await this.stockHoldingReportRepo.getReportHeaderById(reportId);
        if (!report) {
          resolve({
            code: 200,
            message: "Stock holding report status fetched successfully",
            data: {
              has_report: false,
              needs_refresh: true,
              is_current_date: false,
              current_date: currentDate,
              requested_date: requestedDate,
              report: null,
            },
          });
          return;
        }

        const reportDate = moment(report.date).format("YYYY-MM-DD");
        const serverReportId = Number(report.stock_holding_report_id);
        const serverCreatedAt = this.normalizeReportTimestamp(report.created_at);
        const isCurrentDate = reportDate === currentDate;

        let needsRefresh = false;

        if (clientReportId == null || Number.isNaN(clientReportId)) {
          needsRefresh = true;
        } else if (clientReportId !== serverReportId) {
          needsRefresh = true;
        } else if (
          clientCreatedAt &&
          serverCreatedAt &&
          clientCreatedAt !== serverCreatedAt
        ) {
          needsRefresh = true;
        }

        if (requestedDate === currentDate && !isCurrentDate) {
          needsRefresh = true;
        }

        if (
          !needsRefresh &&
          this.shouldRefreshByClientFetchTime(clientFetchedAt)
        ) {
          needsRefresh = true;
        }

        resolve({
          code: 200,
          message: "Stock holding report status fetched successfully",
          data: {
            has_report: true,
            needs_refresh: needsRefresh,
            is_current_date: isCurrentDate,
            current_date: currentDate,
            requested_date: requestedDate,
            report: {
              stock_holding_report_id: serverReportId,
              report_name: report.report_name,
              date: reportDate,
              created_at: serverCreatedAt,
              item_count: report.item_count ?? null,
            },
          },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getLatestItemsPage(date, limit, offset, reportId = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const { exact } = this.getReportLookupOptions(date);
        const data = await this.stockHoldingReportRepo.getLatestItemsPageByDate(
          date,
          limit,
          offset,
          reportId,
          { exact }
        );
        if (!data) {
          resolve({
            code: 404,
            message: "Stock holding report not found",
          });
          return;
        }
        resolve({
          code: 200,
          message: "Stock holding report items fetched successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(stockHoldingReportId) {
    return new Promise(async (resolve, reject) => {
      try {
        const exists = await this.stockHoldingReportRepo.reportExists(
          stockHoldingReportId
        );
        if (!exists) {
          resolve({
            code: 404,
            message: "Stock holding report not found",
          });
          return;
        }

        const result = await this.stockHoldingReportRepo.delete(
          stockHoldingReportId
        );
        resolve({
          code: 200,
          message: "Stock holding report deleted successfully",
          data: result,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  async _importItemsBatched({
    report_name,
    date,
    created_by,
    items,
    is_system_sync = 0,
  }) {
    if (!items.length) {
      return {
        code: 400,
        message: "No valid stock holding rows to import",
      };
    }

    if (items.length <= IMPORT_BATCH_SIZE) {
      const data = await this.stockHoldingReportRepo.createSync({
        report_name,
        date,
        created_by,
        items,
        is_system_sync,
      });
      await this.finalizeUpload(data.stock_holding_report_id);
      return {
        code: 200,
        message: "Stock holding report synced successfully",
        data,
      };
    }

    const header = await this.stockHoldingReportRepo.createReportHeader({
      report_name,
      date,
      created_by,
      is_system_sync,
    });
    const batches = chunkArray(items, IMPORT_BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const isLastBatch = i === batches.length - 1;
      await this.stockHoldingReportRepo.appendSyncItems(header, batches[i]);
      if (isLastBatch) {
        await this.finalizeUpload(header);
      }
    }

    const item_count = await this.stockHoldingReportRepo.getItemCountByReportId(
      header
    );

    return {
      code: 200,
      message: "Stock holding report synced successfully",
      data: {
        stock_holding_report_id: header,
        report_name,
        date,
        created_by,
        item_count,
      },
    };
  }

  _logDeliumSync(step, description, ref = {}) {
    logger.Log({
      level: logger.LEVEL.INFO,
      component: "USECASE.STOCK_HOLDING_REPORT",
      code: `USECASE.STOCK_HOLDING_REPORT.SYNC_DELIUM.${step}`,
      description,
      category: "",
      ref,
    });
  }

  async syncFromDeliumApi(options = {}) {
    const date = options.date || moment().format("YYYY-MM-DD");
    const report_name =
      options.report_name || `Stock Holding ${moment(date).format("DD MMM YYYY")}`;
    const is_system_sync = Boolean(options.systemSync);
    const created_by = await this.stockHoldingReportRepo.resolveCreatedBy(
      is_system_sync ? null : options.created_by ?? null
    );

    this._logDeliumSync("START", "Delium stock holding sync started", {
      date,
      report_name,
      created_by,
      is_system_sync,
    });

    try {
      const branches = await this.branchesRepo.getAll();
      const branchStores = (branches || [])
        .filter(
          (b) =>
            b?.branch_id != null &&
            b.is_active !== 0 &&
            b.de_branch_id != null
        )
        .map((b) => ({
          branch_id: Number(b.branch_id),
          de_branch_id: Number(b.de_branch_id),
        }))
        .filter(
          (b) =>
            Number.isFinite(b.branch_id) &&
            b.branch_id > 0 &&
            Number.isFinite(b.de_branch_id) &&
            b.de_branch_id > 0
        );

      const storeIds = branchStores.map((b) => b.de_branch_id);
      const deBranchToBranchId = new Map(
        branchStores.map((b) => [b.de_branch_id, b.branch_id])
      );

      this._logDeliumSync("BRANCHES", "Resolved active branch Delium store ids", {
        branch_count: (branches || []).length,
        active_store_ids: storeIds,
        branch_store_map: branchStores,
      });

      if (!storeIds.length) {
        const result = {
          code: 400,
          message:
            "No active branches with de_branch_id found for Delium stock sync",
        };
        this._logDeliumSync("ABORT", result.message, result);
        return result;
      }

      const { items: fetchedItems, errors: fetchErrors } =
        await fetchStockInfoItemsForStores(storeIds);

      const rawItems = fetchedItems
        .map((item) => {
          const localBranchId = deBranchToBranchId.get(Number(item.branch_id));
          if (localBranchId == null) return null;
          return { ...item, branch_id: localBranchId };
        })
        .filter(Boolean);

      this._logDeliumSync("FETCH", "Delium API fetch completed", {
        raw_row_count: rawItems.length,
        fetch_error_count: fetchErrors.length,
        fetch_errors: fetchErrors.length ? fetchErrors : undefined,
      });

      if (!rawItems.length) {
        const result = {
          code: 400,
          message: "Delium API returned no stock rows",
          fetch_errors: fetchErrors,
        };
        this._logDeliumSync("ABORT", result.message, result);
        return result;
      }

      const productIds = new Set();
      const branchIds = new Set();
      for (const item of rawItems) {
        productIds.add(item.product_id);
        branchIds.add(item.branch_id);
      }

      const { validProductIds, validBranchIds } =
        await this.stockHoldingReportRepo.resolveValidProductAndBranchIds(
          [...productIds],
          [...branchIds]
        );

      const validItems = rawItems.filter(
        (item) =>
          validProductIds.has(item.product_id) &&
          validBranchIds.has(item.branch_id)
      );

      const skipped_invalid = rawItems.length - validItems.length;

      this._logDeliumSync("VALIDATE", "Filtered rows against local products/branches", {
        raw_row_count: rawItems.length,
        valid_row_count: validItems.length,
        skipped_invalid_rows: skipped_invalid,
        distinct_product_ids: productIds.size,
        distinct_branch_ids: branchIds.size,
        matched_product_ids: validProductIds.size,
        matched_branch_ids: validBranchIds.size,
      });

      if (!validItems.length) {
        const result = {
          code: 400,
          message: "No valid stock holding rows to import after validation",
          raw_row_count: rawItems.length,
          skipped_invalid_rows: skipped_invalid,
          fetch_errors: fetchErrors.length ? fetchErrors : undefined,
        };
        this._logDeliumSync("ABORT", result.message, result);
        return result;
      }

      const enrichedItems = await this.enrichItemsForSync(validItems);

      this._logDeliumSync("IMPORT", "Importing validated rows into stock holding report", {
        valid_row_count: enrichedItems.length,
        report_name,
        date,
      });

      const result = await this._importItemsBatched({
        report_name,
        date,
        created_by,
        items: enrichedItems,
        is_system_sync,
      });

      if (result.code === 200) {
        result.data = {
          ...result.data,
          imported_rows: validItems.length,
          skipped_invalid_rows: skipped_invalid,
          stores_synced: storeIds.length - fetchErrors.length,
          fetch_errors: fetchErrors.length ? fetchErrors : undefined,
        };
        this._logDeliumSync("SUCCESS", "Delium stock holding sync completed", result.data);
      } else {
        this._logDeliumSync("IMPORT_FAILED", result.message || "Import failed", result);
      }

      return result;
    } catch (err) {
      logger.Log({
        level: logger.LEVEL.ERROR,
        component: "USECASE.STOCK_HOLDING_REPORT",
        code: "USECASE.STOCK_HOLDING_REPORT.SYNC_DELIUM.ERROR",
        description: err.toString(),
        category: "",
        ref: {},
      });
      throw err;
    }
  }
}

module.exports = (
  stockHoldingReportRepo,
  branchesRepo,
  masterListRepo,
  employeesRepo,
  productRepo
) => {
  return new StockHoldingReportUsecase(
    stockHoldingReportRepo,
    branchesRepo,
    masterListRepo,
    employeesRepo,
    productRepo
  );
};
