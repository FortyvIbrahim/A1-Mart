/**
 * Human-readable AgGrid filter/sort ↔ URL query string.
 * Example: ?invoice_no=INV-002&sort=created_at:desc
 */

export const AG_GRID_SORT_URL_PARAM = "sort";

/** 1-based page index in the query string (omit when on first page). */
export const AG_GRID_PAGE_URL_PARAM = "page";

/** Page size when different from the grid default (see useStoredFilters defaultPageSize). */
export const AG_GRID_PAGE_SIZE_URL_PARAM = "pageSize";

const TEXT_TYPES = new Set([
  "equals",
  "notEqual",
  "contains",
  "notContains",
  "startsWith",
  "endsWith",
  "blank",
  "notBlank",
]);

const NUMBER_TYPES = new Set([
  "equals",
  "notEqual",
  "lessThan",
  "lessThanOrEqual",
  "greaterThan",
  "greaterThanOrEqual",
  "inRange",
  "blank",
  "notBlank",
]);

function compactBase64Url(obj) {
  try {
    const s = JSON.stringify(obj);
    return btoa(unescape(encodeURIComponent(s)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return null;
  }
}

function expandBase64Url(encoded) {
  if (encoded == null || typeof encoded !== "string" || encoded === "") return null;
  try {
    const pad =
      encoded.length % 4 === 0 ? "" : "=".repeat(4 - (encoded.length % 4));
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const json = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function encodeTextFilter(model) {
  const t = model.type || "equals";
  if (t === "blank" || t === "notBlank") return t;
  const f = model.filter;
  if (f === undefined || f === null) return t === "equals" ? "" : `${t}::`;
  if (t === "equals") return String(f);
  return `${t}::${encodeURIComponent(String(f))}`;
}

function decodeTextFilter(raw) {
  if (raw === "blank" || raw === "notBlank") {
    return { filterType: "text", type: raw, filter: null };
  }
  const idx = raw.indexOf("::");
  if (idx === -1) {
    return { filterType: "text", type: "equals", filter: raw };
  }
  const type = raw.slice(0, idx);
  const rest = raw.slice(idx + 2);
  const decoded = decodeURIComponent(rest.replace(/\+/g, " "));
  if (TEXT_TYPES.has(type)) {
    return {
      filterType: "text",
      type,
      filter: type === "blank" || type === "notBlank" ? null : decoded,
    };
  }
  return { filterType: "text", type: "equals", filter: raw };
}

function encodeNumberFilter(model) {
  const t = model.type || "equals";
  if (t === "blank" || t === "notBlank") return t;
  if (t === "inRange") {
    return `inRange::${model.filter}..${model.filterTo}`;
  }
  const f = model.filter;
  if (t === "equals" && f !== undefined && f !== null && f !== "") {
    return String(f);
  }
  return `${t}::${f}`;
}

function decodeNumberFilter(raw) {
  if (raw === "blank" || raw === "notBlank") {
    return { filterType: "number", type: raw, filter: null };
  }
  if (raw.startsWith("inRange::")) {
    const inner = raw.slice("inRange::".length);
    const dot = inner.indexOf("..");
    if (dot === -1) return null;
    return {
      filterType: "number",
      type: "inRange",
      filter: Number(inner.slice(0, dot)),
      filterTo: Number(inner.slice(dot + 2)),
    };
  }
  const idx = raw.indexOf("::");
  if (idx === -1) {
    const n = Number(raw);
    return {
      filterType: "number",
      type: "equals",
      filter: Number.isNaN(n) ? raw : n,
    };
  }
  const type = raw.slice(0, idx);
  const rest = raw.slice(idx + 2);
  if (!NUMBER_TYPES.has(type)) {
    const n = Number(raw);
    return {
      filterType: "number",
      type: "equals",
      filter: Number.isNaN(n) ? raw : n,
    };
  }
  const num = Number(rest);
  return {
    filterType: "number",
    type,
    filter: Number.isNaN(num) ? rest : num,
  };
}

function encodeDateFilter(model) {
  const t = model.type || "equals";
  if (t === "blank" || t === "notBlank") return t;
  if (t === "inRange") {
    const from = model.dateFrom ?? "";
    const to = model.dateTo ?? "";
    return `${from}..${to}`;
  }
  const from = model.dateFrom ?? model.filter ?? "";
  if (t === "equals") return String(from);
  return `${t}::${encodeURIComponent(String(from))}`;
}

function decodeDateFilter(raw) {
  if (raw === "blank" || raw === "notBlank") {
    return { filterType: "date", type: raw, dateFrom: null, dateTo: null };
  }
  const range = raw.match(/^([^.]+)\.\.(.+)$/);
  if (range && !raw.includes("::")) {
    return {
      filterType: "date",
      type: "inRange",
      dateFrom: range[1],
      dateTo: range[2],
    };
  }
  const idx = raw.indexOf("::");
  if (idx === -1) {
    return { filterType: "date", type: "equals", dateFrom: raw, dateTo: null };
  }
  const type = raw.slice(0, idx);
  const rest = decodeURIComponent(raw.slice(idx + 2));
  return { filterType: "date", type, dateFrom: rest, dateTo: null };
}

function encodeBadgeFilter(model) {
  const vals = model.values;
  if (!Array.isArray(vals) || vals.length === 0) return null;
  return vals.map((v) => encodeURIComponent(String(v))).join("||");
}

function decodeBadgeFilter(raw) {
  if (!raw) return null;
  const values = raw
    .split("||")
    .map((s) => decodeURIComponent(s.trim()))
    .filter(Boolean);
  return { filterType: "badge", values };
}

function encodeSetFilter(model) {
  const vals = model.values;
  if (!Array.isArray(vals) || vals.length === 0) return null;
  return vals.map((v) => encodeURIComponent(String(v))).join("||");
}

function decodeSetFilter(raw) {
  if (!raw) return null;
  const values = raw
    .split("||")
    .map((s) => decodeURIComponent(s.trim()))
    .filter(Boolean);
  return { filterType: "set", values };
}

/** Serialize one column's filter model to a query param value (human-readable where possible). */
export function encodeFilterModelValue(colId, model) {
  if (model == null) return null;
  const ft = model.filterType;
  if (ft === "text") return encodeTextFilter(model);
  if (ft === "number") return encodeNumberFilter(model);
  if (ft === "date") return encodeDateFilter(model);
  if (ft === "badge") return encodeBadgeFilter(model);
  if (ft === "set") return encodeSetFilter(model);
  const token = compactBase64Url(model);
  if (!token) return null;
  return `__agj:${token}`;
}

function decodeComplexToken(raw) {
  if (!raw.startsWith("__agj:")) return null;
  const parsed = expandBase64Url(raw.slice(6));
  if (!parsed || typeof parsed !== "object") return null;
  return parsed;
}

/** Parse query param value into AG Grid filter model for a column (uses colDef.filter when ambiguous). */
export function decodeFilterModelValue(colId, raw, colDef) {
  if (raw == null || raw === "") return null;
  const complex = decodeComplexToken(raw);
  if (complex) return complex;

  const f = colDef?.filter;
  const filterStr = typeof f === "string" ? f : null;
  const isBadgeFilter =
    f && typeof f === "object" && f.handler === "badgeFilterHandler";

  if (isBadgeFilter) return decodeBadgeFilter(raw);
  if (filterStr === "agNumberColumnFilter" || colDef?.type === "number") {
    return decodeNumberFilter(raw);
  }
  if (
    filterStr === "agDateColumnFilter" ||
    colDef?.type === "date" ||
    colDef?.type === "datetime"
  ) {
    return decodeDateFilter(raw);
  }
  if (filterStr === "agSetColumnFilter") return decodeSetFilter(raw);

  return decodeTextFilter(raw);
}

/** @param {import('ag-grid-community').GridApi} api */
export function getGridColumnColIds(api) {
  const ids = new Set();
  try {
    api.getColumns()?.forEach((c) => {
      const id = c.getColId();
      if (id) ids.add(id);
    });
  } catch {
    // ignore
  }
  return ids;
}

/**
 * Build [paramKey, value][] for current filter + sort (readable keys = colIds / field names).
 * @param {Record<string, unknown>} filterModel
 * @param {Array<{ colId: string, sort?: string | null, sortIndex?: number | null }>} sortStates
 */
export function buildReadableGridUrlEntries(filterModel, sortStates) {
  /** @type {Array<[string, string]>} */
  const entries = [];
  if (filterModel && typeof filterModel === "object") {
    for (const [colId, model] of Object.entries(filterModel)) {
      if (!colId || model == null) continue;
      const encoded = encodeFilterModelValue(colId, model);
      if (encoded != null && encoded !== "") entries.push([colId, encoded]);
    }
  }
  const sortStr = serializeSortParam(sortStates);
  if (sortStr) entries.push([AG_GRID_SORT_URL_PARAM, sortStr]);
  return entries;
}

export function serializeSortParam(sortStates) {
  if (!sortStates?.length) return "";
  return sortStates
    .filter((s) => s.colId && s.sort)
    .map((s) => `${s.colId}:${s.sort}`)
    .join(",");
}

/**
 * @param {string} sortStr
 * @param {Set<string>} validColIds
 */
export function parseSortParam(sortStr, validColIds) {
  if (!sortStr || typeof sortStr !== "string") return [];
  const parts = sortStr.split(",").map((p) => p.trim()).filter(Boolean);
  /** @type {Array<{ colId: string, sort: string, sortIndex: number }>} */
  const state = [];
  let idx = 0;
  for (const part of parts) {
    const colon = part.lastIndexOf(":");
    if (colon <= 0) continue;
    const colId = part.slice(0, colon);
    const sort = part.slice(colon + 1);
    if (!colId || !sort) continue;
    if (validColIds.size && !validColIds.has(colId)) continue;
    if (sort !== "asc" && sort !== "desc") continue;
    state.push({ colId, sort, sortIndex: idx++ });
  }
  return state;
}

/**
 * @param {URLSearchParams | ReadonlyURLSearchParams} searchParams
 * @param {import('ag-grid-community').GridApi} api
 */
export function parseReadableGridUrlState(searchParams, api) {
  const colIds = getGridColumnColIds(api);
  const filterModel = {};
  for (const key of searchParams.keys()) {
    if (key === AG_GRID_SORT_URL_PARAM) continue;
    if (!colIds.has(key)) continue;
    const col = api.getColumn(key);
    const colDef = col?.getColDef?.() ?? {};
    const raw = searchParams.get(key);
    const model = decodeFilterModelValue(key, raw, colDef);
    if (model) filterModel[key] = model;
  }
  const sortStr = searchParams.get(AG_GRID_SORT_URL_PARAM) ?? "";
  const sortStates = parseSortParam(sortStr, colIds);
  return { filterModel, sortStates };
}

export function stablePackEntries(entries) {
  return JSON.stringify(
    [...entries].sort((a, b) => a[0].localeCompare(b[0]))
  );
}

/**
 * @param {import('ag-grid-community').GridApi} api
 * @param {number} defaultPageSize
 * @param {boolean} paginationEnabled
 * @returns {Array<[string, string]>}
 */
export function buildPaginationUrlEntries(
  api,
  defaultPageSize,
  paginationEnabled
) {
  if (!paginationEnabled || !api?.paginationGetPageSize) return [];
  const size = api.paginationGetPageSize();
  const pageIdx =
    typeof api.paginationGetCurrentPage === "function"
      ? api.paginationGetCurrentPage()
      : 0;
  /** @type {Array<[string, string]>} */
  const out = [];
  if (
    Number.isFinite(defaultPageSize) &&
    defaultPageSize > 0 &&
    Number.isFinite(size) &&
    size > 0 &&
    size !== defaultPageSize
  ) {
    out.push([AG_GRID_PAGE_SIZE_URL_PARAM, String(size)]);
  }
  if (Number.isFinite(pageIdx) && pageIdx > 0) {
    out.push([AG_GRID_PAGE_URL_PARAM, String(pageIdx + 1)]);
  }
  return out;
}

/**
 * @param {URLSearchParams | ReadonlyURLSearchParams} searchParams
 * @returns {{ pageSize: number | null, pageIndex: number | null }}
 * pageIndex is 0-based; null means leave current / first page.
 */
export function parsePaginationFromUrl(searchParams) {
  const rawSize = searchParams.get(AG_GRID_PAGE_SIZE_URL_PARAM);
  const rawPage = searchParams.get(AG_GRID_PAGE_URL_PARAM);
  let pageSize = null;
  if (rawSize != null && rawSize !== "") {
    const n = parseInt(rawSize, 10);
    if (Number.isFinite(n) && n > 0) pageSize = n;
  }
  let pageIndex = null;
  if (rawPage != null && rawPage !== "") {
    const p = parseInt(rawPage, 10);
    if (Number.isFinite(p) && p >= 1) pageIndex = p - 1;
  }
  return { pageSize, pageIndex };
}

/**
 * Apply pagination from URL after filters/sort (page size first, then go to page; double rAF so row counts match).
 * @param {import('ag-grid-community').GridApi} api
 * @param {URLSearchParams | ReadonlyURLSearchParams} searchParams
 * @param {boolean} paginationEnabled
 */
export function applyPaginationFromUrl(api, searchParams, paginationEnabled) {
  if (!paginationEnabled || !api) return;
  const { pageSize, pageIndex } = parsePaginationFromUrl(searchParams);
  if (pageSize != null && typeof api.setGridOption === "function") {
    api.setGridOption("paginationPageSize", pageSize);
  }
  if (pageIndex == null || typeof api.paginationGoToPage !== "function") return;
  const go = () => {
    try {
      const total =
        typeof api.paginationGetTotalPages === "function"
          ? api.paginationGetTotalPages()
          : 1;
      const maxIdx = Math.max(0, total - 1);
      api.paginationGoToPage(
        Math.min(Math.max(0, pageIndex), maxIdx)
      );
    } catch {
      // ignore
    }
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(go);
  });
}

/**
 * @param {URLSearchParams | ReadonlyURLSearchParams} searchParams
 * @returns {Array<[string, string]>}
 */
export function readPaginationEntriesFromUrl(searchParams) {
  /** @type {Array<[string, string]>} */
  const out = [];
  const ps = searchParams.get(AG_GRID_PAGE_SIZE_URL_PARAM);
  if (ps != null && ps !== "") out.push([AG_GRID_PAGE_SIZE_URL_PARAM, ps]);
  const p = searchParams.get(AG_GRID_PAGE_URL_PARAM);
  if (p != null && p !== "") out.push([AG_GRID_PAGE_URL_PARAM, p]);
  return out;
}

/**
 * Keys this grid owns in the query string (column colIds + sort param when present).
 * @param {URLSearchParams | ReadonlyURLSearchParams} searchParams
 * @param {import('ag-grid-community').GridApi} api
 */
export function collectManagedGridParamKeys(searchParams, api) {
  const colIds = getGridColumnColIds(api);
  const keys = new Set();
  const sortVal = searchParams.get(AG_GRID_SORT_URL_PARAM);
  if (sortVal) keys.add(AG_GRID_SORT_URL_PARAM);
  if (searchParams.get(AG_GRID_PAGE_URL_PARAM))
    keys.add(AG_GRID_PAGE_URL_PARAM);
  if (searchParams.get(AG_GRID_PAGE_SIZE_URL_PARAM))
    keys.add(AG_GRID_PAGE_SIZE_URL_PARAM);
  for (const key of searchParams.keys()) {
    if (colIds.has(key)) keys.add(key);
  }
  return keys;
}

/**
 * @param {URLSearchParams | ReadonlyURLSearchParams} searchParams
 * @param {import('ag-grid-community').GridApi} api
 * @returns {Array<[string, string]>}
 */
export function readManagedGridEntriesFromUrl(searchParams, api) {
  const colIds = getGridColumnColIds(api);
  /** @type {Array<[string, string]>} */
  const out = [];
  const sortVal = searchParams.get(AG_GRID_SORT_URL_PARAM);
  if (sortVal) out.push([AG_GRID_SORT_URL_PARAM, sortVal]);
  out.push(...readPaginationEntriesFromUrl(searchParams));
  for (const key of new Set(searchParams.keys())) {
    if (!colIds.has(key)) continue;
    const v = searchParams.get(key);
    if (v != null && v !== "") out.push([key, v]);
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * @param {URLSearchParams | ReadonlyURLSearchParams} searchParams
 * @param {import('ag-grid-community').GridApi} api
 */
export function urlHasReadableGridParams(searchParams, api) {
  const colIds = getGridColumnColIds(api);
  if (searchParams.get(AG_GRID_SORT_URL_PARAM)) return true;
  if (searchParams.get(AG_GRID_PAGE_URL_PARAM)) return true;
  if (searchParams.get(AG_GRID_PAGE_SIZE_URL_PARAM)) return true;
  for (const key of searchParams.keys()) {
    if (colIds.has(key)) return true;
  }
  return false;
}
