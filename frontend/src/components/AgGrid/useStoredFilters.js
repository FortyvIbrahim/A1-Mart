"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  gridStateUrlParamKey,
  decodeGridUrlStateLegacy,
  GRID_URL_STATE_LEGACY_VERSION,
} from "./utils";
import {
  AG_GRID_PAGE_SIZE_URL_PARAM,
  AG_GRID_PAGE_URL_PARAM,
  AG_GRID_SORT_URL_PARAM,
  applyPaginationFromUrl,
  buildPaginationUrlEntries,
  buildReadableGridUrlEntries,
  getGridColumnColIds,
  parseReadableGridUrlState,
  readManagedGridEntriesFromUrl,
  stablePackEntries,
  urlHasReadableGridParams,
} from "./urlState";

function getSortStatesFromApi(api) {
  const columnState = api.getColumnState() || [];
  return columnState
    .filter((c) => c.sort != null && c.colId)
    .map(({ colId, sort, sortIndex }) => ({ colId, sort, sortIndex }))
    .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
}

function getGridUrlPack(api, defaultPageSize, paginationEnabled) {
  const filterModel = api.getFilterModel() || {};
  const sortStates = getSortStatesFromApi(api);
  const entries = buildReadableGridUrlEntries(filterModel, sortStates);
  entries.push(
    ...buildPaginationUrlEntries(api, defaultPageSize, paginationEnabled)
  );
  return { entries, filterModel, sortStates };
}

/** Prefer the real address bar query so we are not one navigation behind React's useSearchParams. */
function getLiveSearchParams(fallbackSearchParams, pathname) {
  if (
    typeof window !== "undefined" &&
    window.location.pathname === pathname
  ) {
    return new URLSearchParams(window.location.search.replace(/^\?/, ""));
  }
  return fallbackSearchParams;
}

/**
 * Sync AgGrid filter/sort/pagination ↔ URL (human-readable query params). Instant updates; skips re-apply when URL already matches grid.
 *
 * @param {{ saveFilters: boolean, tableKey?: string, gridRef: React.RefObject<{ api?: import('ag-grid-community').GridApi } | null>, defaultPageSize?: number, paginationEnabled?: boolean }} opts
 */
export function useStoredFilters({
  saveFilters,
  tableKey,
  gridRef,
  defaultPageSize = 20,
  paginationEnabled = true,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlSyncSkipRef = useRef(false);
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const legacyBlobParamKey = useMemo(() => {
    if (!saveFilters || !tableKey) return null;
    return gridStateUrlParamKey(tableKey);
  }, [saveFilters, tableKey]);

  const searchParamsSignature = searchParams.toString();

  const applyFromUrl = useCallback(
    (api, searchParamsSnapshot) => {
      if (!api || !searchParamsSnapshot) return;

      const legacyKey = tableKey ? gridStateUrlParamKey(tableKey) : null;
      const legacyRaw = legacyKey
        ? searchParamsSnapshot.get(legacyKey)
        : null;
      const hasReadable = urlHasReadableGridParams(
        searchParamsSnapshot,
        api
      );

      if (!(legacyRaw && !hasReadable)) {
        const urlEntries = readManagedGridEntriesFromUrl(
          searchParamsSnapshot,
          api
        );
        const gridPack = getGridUrlPack(
          api,
          defaultPageSize,
          paginationEnabled
        );
        if (
          stablePackEntries(urlEntries) === stablePackEntries(gridPack.entries)
        ) {
          return;
        }
      }

      urlSyncSkipRef.current = true;
      try {
        if (legacyRaw && !hasReadable) {
          const parsed = decodeGridUrlStateLegacy(legacyRaw);
          if (
            parsed &&
            parsed.v === GRID_URL_STATE_LEGACY_VERSION &&
            (parsed.f || parsed.s)
          ) {
            api.setFilterModel(
              parsed.f &&
                typeof parsed.f === "object" &&
                Object.keys(parsed.f).length
                ? parsed.f
                : null
            );
            api.applyColumnState({
              defaultState: { sort: null },
              state: Array.isArray(parsed.s) ? parsed.s : [],
            });
            applyPaginationFromUrl(
              api,
              searchParamsSnapshot,
              paginationEnabled
            );
            return;
          }
        }

        const { filterModel, sortStates } = parseReadableGridUrlState(
          searchParamsSnapshot,
          api
        );
        api.setFilterModel(
          filterModel && Object.keys(filterModel).length ? filterModel : null
        );
        api.applyColumnState({
          defaultState: { sort: null },
          state: sortStates,
        });
        applyPaginationFromUrl(
          api,
          searchParamsSnapshot,
          paginationEnabled
        );
      } finally {
        queueMicrotask(() => {
          urlSyncSkipRef.current = false;
        });
      }

    },
    [tableKey, defaultPageSize, paginationEnabled]
  );

  const pushGridStateToUrl = useCallback(() => {
    if (!saveFilters || urlSyncSkipRef.current) return;
    const api = gridRef.current?.api;
    if (!api) return;

    const filterModel = api.getFilterModel() || {};
    const sortStates = getSortStatesFromApi(api);
    const nextEntries = buildReadableGridUrlEntries(filterModel, sortStates);
    nextEntries.push(
      ...buildPaginationUrlEntries(api, defaultPageSize, paginationEnabled)
    );

    const live = getLiveSearchParams(searchParams, pathname);
    const currentEntries = readManagedGridEntriesFromUrl(live, api);
    if (stablePackEntries(nextEntries) === stablePackEntries(currentEntries)) {
      return;
    }

    const params = new URLSearchParams(live.toString());
    params.delete(AG_GRID_SORT_URL_PARAM);
    params.delete(AG_GRID_PAGE_URL_PARAM);
    params.delete(AG_GRID_PAGE_SIZE_URL_PARAM);
    for (const colId of getGridColumnColIds(api)) {
      params.delete(colId);
    }
    if (legacyBlobParamKey) params.delete(legacyBlobParamKey);
    for (const [k, v] of nextEntries) {
      params.set(k, v);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [
    saveFilters,
    searchParams,
    pathname,
    router,
    legacyBlobParamKey,
    gridRef,
    defaultPageSize,
    paginationEnabled,
  ]);

  useEffect(() => {
    if (!saveFilters) return;
    const api = gridRef.current?.api;
    if (!api) return;
    applyFromUrl(api, getLiveSearchParams(searchParams, pathname));
  }, [
    saveFilters,
    searchParamsSignature,
    searchParams,
    pathname,
    applyFromUrl,
    gridRef,
  ]);

  const onGridReady = useCallback(
    (params) => {
      if (!saveFilters) return;
      const api = params.api;
      if (!api) return;

      const syncUrl = () => pushGridStateToUrl();
      api.addEventListener("filterChanged", syncUrl);
      api.addEventListener("sortChanged", syncUrl);
      if (paginationEnabled) {
        api.addEventListener("paginationChanged", syncUrl);
      }

      requestAnimationFrame(() => {
        applyFromUrl(
          api,
          getLiveSearchParams(searchParamsRef.current, pathname)
        );
      });
    },
    [
      saveFilters,
      pathname,
      paginationEnabled,
      pushGridStateToUrl,
      applyFromUrl,
    ]
  );

  return { onGridReady };
}
