import axiosInstance from "..";

export const REPORT_UPLOAD_BATCH_SIZE = 15000;
export const REPORT_FETCH_BATCH_SIZE = 15000;

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export const getOutstandingReports = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.get("/outstanding-report/");
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

export const createOutstandingReport = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.post(
        "/outstanding-report/",
        payload
      );
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

export const appendOutstandingReportInvoices = (reportId, invoices) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.post(
        `/outstanding-report/${reportId}/invoices`,
        { invoices }
      );
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

export const createOutstandingReportBatched = async (
  payload,
  { onProgress } = {}
) => {
  const { report_name, date, invoices = [] } = payload;

  if (!invoices.length) {
    return createOutstandingReport({ report_name, date });
  }

  if (invoices.length <= REPORT_UPLOAD_BATCH_SIZE) {
    return createOutstandingReport({ report_name, date, invoices });
  }

  const headerResponse = await createOutstandingReport({ report_name, date });
  if (headerResponse?.code !== 200 && headerResponse?.code !== 201) {
    return headerResponse;
  }

  const reportId = headerResponse?.data?.outstanding_report_id;
  if (!reportId) {
    throw new Error("Missing outstanding report id from create response");
  }

  const batches = chunkArray(invoices, REPORT_UPLOAD_BATCH_SIZE);
  for (let i = 0; i < batches.length; i++) {
    const batchResponse = await appendOutstandingReportInvoices(
      reportId,
      batches[i]
    );
    if (batchResponse?.code !== 200) {
      throw batchResponse;
    }
    onProgress?.({
      batch: i + 1,
      totalBatches: batches.length,
      invoiceCount: batchResponse?.data?.invoice_count,
    });
  }

  return {
    ...headerResponse,
    data: {
      ...headerResponse.data,
      invoice_count: invoices.length,
    },
  };
};

export const deleteOutstandingReport = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axiosInstance.delete(`/outstanding-report/${id}`);
      resolve(data);
    } catch (err) {
      reject(err?.response?.data || err);
    }
  });
};

export const getLatestOutstandingReportByDate = (date, { signal } = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const allInvoices = [];
      let offset = 0;
      let header = null;
      let hasMore = true;

      while (hasMore) {
        if (signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }

        const { data } = await axiosInstance.get(
          "/outstanding-report/latest/invoices",
          {
            params: {
              date,
              limit: REPORT_FETCH_BATCH_SIZE,
              offset,
            },
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
        if (!header) {
          const {
            invoices: _invoices,
            total,
            limit,
            offset: _offset,
            has_more,
            ...rest
          } = page;
          header = { ...rest, total };
        }

        const invoices = Array.isArray(page.invoices) ? page.invoices : [];
        allInvoices.push(...invoices);

        if (!invoices.length) {
          break;
        }

        hasMore =
          Boolean(page.has_more) &&
          invoices.length >= REPORT_FETCH_BATCH_SIZE;
        offset += invoices.length;
      }

      resolve({
        code: 200,
        message: "Latest outstanding report fetched successfully",
        data: {
          ...header,
          invoices: allInvoices,
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
