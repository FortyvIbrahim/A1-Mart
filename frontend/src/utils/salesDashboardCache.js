import {
  buildSalesDashboardCacheId,
  buildSalesDashboardFiltersFromContext,
  buildSalesDashboardStats,
  buildSalesFilterCacheKey,
  buildSalesStockFilterCacheKey,
  formatDateKey,
} from "@/utils/salesDashboard";
import {
  openA1StoreDb,
  runA1StoreRequest,
  SALES_DASHBOARD_STORE_NAME,
} from "@/utils/stockHoldingDashboardCache";

export { buildSalesDashboardCacheId };

function runSalesStoreRequest(mode, fn) {
  return runA1StoreRequest(SALES_DASHBOARD_STORE_NAME, mode, fn);
}

export function buildSalesDashboardCacheEntry({
  salesDate,
  dashboardFilters = {},
  bundle,
  items = [],
  displayItems = [],
}) {
  const dateKey = formatDateKey(salesDate);
  const salesFilters = buildSalesDashboardFiltersFromContext(dashboardFilters);
  const salesFilterKey = buildSalesFilterCacheKey(salesFilters);
  const stockFilterKey = buildSalesStockFilterCacheKey(dashboardFilters);
  const id = buildSalesDashboardCacheId(dateKey, dashboardFilters);

  return {
    id,
    salesDate: dateKey,
    salesFilterKey,
    stockFilterKey,
    fetchedAt: new Date().toISOString(),
    bundle: bundle ?? null,
    items: Array.isArray(items) ? items : [],
    displayItems: Array.isArray(displayItems) ? displayItems : [],
    stats: buildSalesDashboardStats(bundle, dateKey, displayItems),
  };
}

export async function readSalesDashboardCache(id) {
  if (!id) return null;

  try {
    const cached = await runSalesStoreRequest("readonly", (store) => store.get(id));
    if (cached?.id === id) return cached;
  } catch {
    // ignore
  }

  return null;
}

export async function writeSalesDashboardCache(entry) {
  if (!entry?.id) return false;

  try {
    await runSalesStoreRequest("readwrite", (store) => store.put(entry));
    return true;
  } catch {
    return false;
  }
}

async function deleteEntriesWhere(predicate) {
  try {
    const db = await openA1StoreDb();
    if (!db) return;

    await new Promise((resolve, reject) => {
      const tx = db.transaction(SALES_DASHBOARD_STORE_NAME, "readwrite");
      const store = tx.objectStore(SALES_DASHBOARD_STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) return;
        if (predicate(cursor.value)) {
          cursor.delete();
        }
        cursor.continue();
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      request.onerror = () => reject(request.error);
    });
  } catch {
    // ignore
  }
}

export async function purgeSalesDashboardCacheExceptDate(salesDate) {
  const dateKey = formatDateKey(salesDate);
  if (!dateKey) return;

  await deleteEntriesWhere((entry) => entry?.salesDate !== dateKey);
}

export async function clearSalesDashboardCacheForDate(salesDate) {
  const dateKey = formatDateKey(salesDate);
  if (!dateKey) return;

  await deleteEntriesWhere((entry) => entry?.salesDate === dateKey);
}

export async function clearSalesDashboardCacheEntry(id) {
  if (!id) return;

  try {
    await runSalesStoreRequest("readwrite", (store) => store.delete(id));
  } catch {
    // ignore
  }
}
