import axiosInstance from "..";

export const REPORT_UPLOAD_BATCH_SIZE = 5000;
export const REPORT_FETCH_BATCH_SIZE = 15000;

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export const syncStockHoldingReport = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.post("/stock-holding-report/sync");
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

export const getStockHoldingReports = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.get("/stock-holding-report/");
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

export const createStockHoldingReport = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.post(
        "/stock-holding-report/",
        payload
      );
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

export const appendStockHoldingReportItems = (
  reportId,
  items,
  { finalize = false } = {}
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.post(
        `/stock-holding-report/${reportId}/items`,
        { items, finalize }
      );
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

export const createStockHoldingReportBatched = async (
  payload,
  { onProgress } = {}
) => {
  const { report_name, date, items = [] } = payload;

  if (!items.length) {
    return createStockHoldingReport({ report_name, date });
  }

  if (items.length <= REPORT_UPLOAD_BATCH_SIZE) {
    return createStockHoldingReport({ report_name, date, items });
  }

  const headerResponse = await createStockHoldingReport({ report_name, date });
  if (headerResponse?.code !== 200 && headerResponse?.code !== 201) {
    return headerResponse;
  }

  const reportId = headerResponse?.data?.stock_holding_report_id;
  if (!reportId) {
    throw new Error("Missing stock holding report id from create response");
  }

  const batches = chunkArray(items, REPORT_UPLOAD_BATCH_SIZE);
  for (let i = 0; i < batches.length; i++) {
    const isLastBatch = i === batches.length - 1;
    const batchResponse = await appendStockHoldingReportItems(
      reportId,
      batches[i],
      { finalize: isLastBatch }
    );
    if (batchResponse?.code !== 200) {
      throw batchResponse;
    }
    onProgress?.({
      batch: i + 1,
      totalBatches: batches.length,
      itemCount: batchResponse?.data?.item_count,
    });
  }

  return {
    ...headerResponse,
    data: {
      ...headerResponse.data,
      item_count: items.length,
    },
  };
};

export const deleteStockHoldingReport = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.delete(
        `/stock-holding-report/${id}`
      );
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

export const getStockHoldingReportStatus = (
  date,
  { report_id, report_created_at, client_fetched_at, signal } = {}
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const params = { date };
      if (report_id != null) params.report_id = report_id;
      if (report_created_at) params.report_created_at = report_created_at;
      if (client_fetched_at) params.client_fetched_at = client_fetched_at;

      const { data } = await axiosInstance.get(
        "/stock-holding-report/latest/status",
        { params, signal }
      );
      resolve(data);
    } catch (err) {
      if (
        signal?.aborted ||
        err?.code === "ERR_CANCELED" ||
        err?.name === "AbortError" ||
        err?.name === "CanceledError"
      ) {
        reject(err);
        return;
      }
      reject(err?.response?.data || err);
    }
  });
};

export const getLatestStockHoldingReportByDate = (
  date,
  { onProgress, signal } = {}
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const allItems = [];
      let offset = 0;
      let header = null;
      let reportId = null;
      let hasMore = true;

      while (hasMore) {
        if (signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }

        const params = {
          date,
          limit: REPORT_FETCH_BATCH_SIZE,
          offset,
        };
        if (reportId != null) {
          params.report_id = reportId;
        }

        const { data } = await axiosInstance.get(
          "/stock-holding-report/latest/items",
          {
            params,
            signal,
          }
        );

        if (data?.code === 404 && offset === 0) {
          resolve(data);
          return;
        }
        if (data?.code !== 200) {
          reject(data);
          return;
        }

        const page = data?.data || {};
        if (page.stock_holding_report_id != null) {
          reportId = page.stock_holding_report_id;
        }
        if (!header) {
          const {
            items: _items,
            total,
            limit,
            offset: _offset,
            has_more,
            ...rest
          } = page;
          header = { ...rest, total };
        }

        const items = Array.isArray(page.items) ? page.items : [];
        allItems.push(...items);

        onProgress?.({
          loaded: allItems.length,
          total: page.total ?? header?.total ?? null,
        });

        if (!items.length) {
          break;
        }

        hasMore =
          Boolean(page.has_more) && items.length >= REPORT_FETCH_BATCH_SIZE;
        offset += items.length;
      }

      resolve({
        code: 200,
        message: "Latest stock holding report fetched successfully",
        data: {
          ...header,
          items: allItems,
        },
      });
    } catch (err) {
      if (
        signal?.aborted ||
        err?.code === "ERR_CANCELED" ||
        err?.name === "AbortError" ||
        err?.name === "CanceledError"
      ) {
        reject(err);
        return;
      }
      reject(err?.response?.data || err);
    }
  });
};
