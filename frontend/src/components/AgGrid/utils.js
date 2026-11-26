/**
 * AgGrid utilities: column id helpers and localStorage state for columns/computation.
 */

export const STORAGE_PREFIX = "ag-grid-columns";
export const COMPUTATION_STORAGE_PREFIX = "ag-grid-computation";

export function getColumnId(colDef, index) {
  // Column ids are based on the original index in resolvedColumnDefs.
  // This keeps ids stable across different filtered views (e.g. computation columns)
  // and guarantees uniqueness within a grid.
  return `col-${index}`;
}

export function loadColumnState(tableKey) {
  if (!tableKey || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}-${tableKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      Array.isArray(parsed.columnOrder) &&
      Array.isArray(parsed.hiddenIds)
    ) {
      return {
        columnOrder: parsed.columnOrder,
        hiddenIds: new Set(parsed.hiddenIds),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveColumnState(tableKey, columnOrder, hiddenIds) {
  if (!tableKey || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}-${tableKey}`,
      JSON.stringify({
        columnOrder,
        hiddenIds: Array.from(hiddenIds),
      })
    );
  } catch {
    // ignore
  }
}

export function loadComputationState(tableKey, defaultIds = []) {
  if (!tableKey || typeof window === "undefined") return defaultIds;
  try {
    const raw = window.localStorage.getItem(
      `${COMPUTATION_STORAGE_PREFIX}-${tableKey}`
    );
    if (!raw) return defaultIds;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : defaultIds;
  } catch {
    return defaultIds;
  }
}

export function saveComputationState(tableKey, selectedIds) {
  if (!tableKey || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${COMPUTATION_STORAGE_PREFIX}-${tableKey}`,
      JSON.stringify(selectedIds)
    );
  } catch {
    // ignore
  }
}

/** Legacy single-param key (base64 blob); removed from URL on next sync. */
export function gridStateUrlParamKey(tableKey) {
  const key = tableKey != null && String(tableKey) !== "" ? String(tableKey) : "grid";
  return `ag_${key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export const GRID_URL_STATE_LEGACY_VERSION = 1;

export function decodeGridUrlStateLegacy(encoded) {
  if (encoded == null || typeof encoded !== "string" || encoded === "") return null;
  try {
    const pad =
      encoded.length % 4 === 0 ? "" : "=".repeat(4 - (encoded.length % 4));
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const json = decodeURIComponent(escape(atob(base64)));
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}
