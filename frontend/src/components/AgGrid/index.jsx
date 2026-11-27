"use client";

import { LuChevronDown, LuX } from "react-icons/lu";
import agGridTheme from "@/theme/aggrid";
import { useInsideCard, useInsideMainCard, useRegisterGrid } from "../CustomContainer";
import TableSkeleton from "../TableSkeleton";
import usePendingRequests from "@/customHooks/usePendingRequests";
import { capitalizeWordsLatest } from "@/utils/string";
import {
  badgeComparator,
  createCustomComparator,
  PRIORITY_LEVEL,
  STATUS_PRIORITY,
} from "@/utils/badge";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Popover,
  Text,
  useBreakpointValue,
  Portal,
} from "@chakra-ui/react";
import { AgGridReact } from "ag-grid-react";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import MobileVirtualizedList from "./MobileVirtualizedList";
import BadgeColumnFilter, { badgeFilterHandler } from "./BadgeColumnFilter";
import { downloadCsv, exportToExcel } from "@/utils/exportCSVFile";
import { generatePDFWithToast } from "@/utils/pdfGenerator";
import { transformDataForExport } from "@/utils/aggridExport";
import toast from "react-hot-toast";
import { FaCog } from "react-icons/fa";
import { arrayMove } from "@dnd-kit/sortable";

import {
  getColumnId,
  loadColumnState,
  saveColumnState,
  loadComputationState,
  saveComputationState,
} from "./utils";
import { useStoredFilters } from "./useStoredFilters";
import { getColumnTypes } from "./columnTypes";
import SettingsDrawerContent from "./SettingsDrawerContent";

/** Page-size options shown in the pagination dropdown for all AgGrid tables. */
export const AG_GRID_PAGE_SIZE_SELECTOR = [10, 15, 20, 50, 100, 250];

function resolvePaginationPageSizeSelector(selector, paginationEnabled) {
  if (!paginationEnabled) return false;
  if (selector === false) return false;
  if (Array.isArray(selector)) {
    return selector.includes(250)
      ? selector
      : [...selector, 250].sort((a, b) => a - b);
  }
  return AG_GRID_PAGE_SIZE_SELECTOR;
}

/** Compute totals row from an array of data rows for selected computation fields. Uses valueGetter when present so computed columns (e.g. from nested data) sum correctly. */
function computeTotalsFromRows(rows, selectedComputationIds, defsById) {
  if (!rows?.length || !selectedComputationIds?.length) return [];
  const totalsRow = {};
  selectedComputationIds.forEach((id) => {
    const colDef = defsById.get(id);
    const field = colDef?.field;
    if (!field) return;
    const valueGetter = colDef?.valueGetter;
    let sum;
    if (valueGetter && typeof valueGetter === "function") {
      sum = rows.reduce((acc, row) => {
        try {
          const v = valueGetter({ data: row });
          return acc + (Number(v) || 0);
        } catch {
          return acc;
        }
      }, 0);
    } else {
      sum = rows.reduce((acc, row) => acc + (Number(row[field]) || 0), 0);
    }
    totalsRow[field] = Math.round(sum * 100) / 100;
  });
  return [totalsRow];
}

const AgGrid = React.forwardRef(function AgGrid(
  {
    rowData,
    colDefs,
    columnDefs,
    gridOptions,
    defaultRows = 20,
    className,
    noMobileVersion = false,
    showColumnSettings = true,
    tableKey,
    computationColumns,
    rowSelection,
    pagination = true,
    colorPalette = "secondary",
    saveFilters = false,
    paginationPageSize: paginationPageSizeProp,
    paginationPageSizeSelector: paginationPageSizeSelectorProp,
    loading: loadingProp,
    bare = false,
    ...props
  },
  ref
) {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const registerGrid = useRegisterGrid();
  // Figma list tables sit in their own white card (radius 12, 1px #F1E3D9,
  // 16px padding) unless the grid is already inside a card.
  const insideCard = useInsideCard();
  const insideMainCard = useInsideMainCard();
  const framed = !bare && !insideCard;
  useEffect(() => registerGrid?.(), [registerGrid]);

  // Skeleton while the page's first data load is in flight. Pages may pass
  // `loading` explicitly; otherwise we infer it from pending API requests.
  const pendingRequests = usePendingRequests();
  const hasRows = Array.isArray(rowData) && rowData.length > 0;
  const [initialLoadSettled, setInitialLoadSettled] = useState(false);
  useEffect(() => {
    if (initialLoadSettled) return;
    if (hasRows) {
      setInitialLoadSettled(true);
      return;
    }
    // Settle shortly after requests drain (lets chained requests start), or
    // after a hard cap so a slow/broken endpoint never leaves a skeleton.
    const t = setTimeout(
      () => setInitialLoadSettled(true),
      pendingRequests === 0 ? 350 : 20000
    );
    return () => clearTimeout(t);
  }, [hasRows, pendingRequests, initialLoadSettled]);
  const showSkeleton =
    loadingProp != null ? !!loadingProp && !hasRows : !hasRows && !initialLoadSettled;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [columnOrder, setColumnOrder] = useState([]);
  const [hiddenIds, setHiddenIds] = useState(() => new Set());
  const [selectedComputationIds, setSelectedComputationIds] = useState(
    () => []
  );
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const contextMenuRef = useRef(null);
  const gridRefInternal = useRef(null);
  const hasLoadedComputationRef = useRef(false);
  const loadedComputationTableKeyRef = useRef(null);
  const loadedColumnStateTableKeyRef = useRef(null);
  const computationColumnIdsRef = useRef([]);
  const [filteredPinnedRowData, setFilteredPinnedRowData] = useState(null);
  const updateFilteredPinnedRowRef = useRef(() => {});

  const { onGridReady: onStoredFiltersGridReady } = useStoredFilters({
    saveFilters,
    tableKey,
    gridRef: gridRefInternal,
    defaultPageSize:
      paginationPageSizeProp ?? gridOptions?.paginationPageSize ?? defaultRows,
    paginationEnabled:
      gridOptions?.pagination !== undefined
        ? Boolean(gridOptions.pagination)
        : Boolean(pagination),
  });

  const mergedGridOptions = React.useMemo(() => {
    const paginationEnabled =
      gridOptions?.pagination !== undefined
        ? Boolean(gridOptions.pagination)
        : Boolean(pagination);

    const defaultColDef = {
      resizable: true,
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 100,
      // Figma table headers are plain labels — no ≡ menu / filter buttons.
      suppressHeaderMenuButton: true,
      suppressHeaderFilterButton: true,
      // Long labels wrap onto two lines as in Figma ("Completion %").
      wrapHeaderText: true,
      autoHeaderHeight: true,
    };

    const baseOptions = {
      suppressColumnVirtualisation: false,
      suppressRowVirtualisation: false,
      animateRows: true,
      pagination: paginationEnabled,
      paginationPageSize:
        paginationPageSizeProp ?? gridOptions?.paginationPageSize ?? defaultRows,
      paginationPageSizeSelector: resolvePaginationPageSizeSelector(
        paginationPageSizeSelectorProp ?? gridOptions?.paginationPageSizeSelector,
        paginationEnabled
      ),
      enableFilterHandlers: true,
      filterHandlers: {
        badgeFilterHandler: badgeFilterHandler,
      },
      getRowStyle: (params) => {
        if (params.node?.rowPinned === "bottom") {
          const base = { fontWeight: "bold" };
          const parentStyle = gridOptions?.getRowStyle?.(params);
          return parentStyle ? { ...base, ...parentStyle } : base;
        }
        if (params.data?.row_status === "disabled") {
          return { "pointer-events": "none", opacity: "0.5" };
        }
        return gridOptions?.getRowStyle?.(params) ?? null;
      },
      columnTypes: getColumnTypes(),
    };

    return {
      ...baseOptions,
      ...(gridOptions || {}),
      defaultColDef: {
        ...defaultColDef,
        ...(gridOptions?.defaultColDef || {}),
      },
    };
  }, [
    gridOptions,
    pagination,
    defaultRows,
    paginationPageSizeProp,
    paginationPageSizeSelectorProp,
  ]);

  // Modify rowSelection to include selectAll: "filtered" when rowSelection is enabled
  const enhancedRowSelection = React.useMemo(() => {
    if (!rowSelection) return undefined;
    return {
      ...rowSelection,
      selectAll: "filtered",
    };
  }, [rowSelection]);

  const resolvedColumnDefs = React.useMemo(() => {
    // Support both prop names for convenience
    const defs = columnDefs ?? colDefs ?? [];

    // Process column definitions to add comparators for badge-column types
    return defs.map((colDef) => {
      // Skip if comparator is already explicitly defined
      if (colDef.comparator) {
        return colDef;
      }

      // Only process badge-column types
      if (colDef.type !== "badge-column") {
        return colDef;
      }

      // If column has customOrder defined, create comparator
      if (colDef.customOrder && Array.isArray(colDef.customOrder)) {
        return {
          ...colDef,
          comparator: createCustomComparator(colDef.customOrder),
        };
      }

      // If column type has customOrder in gridOptions, create comparator
      const columnType = colDef.type;
      if (columnType && gridOptions?.columnTypes?.[columnType]?.customOrder) {
        const customOrder = gridOptions.columnTypes[columnType].customOrder;
        return {
          ...colDef,
          comparator: createCustomComparator(customOrder),
        };
      }

      // Fallback: use priority map based on field name
      const priorityMap =
        colDef.badgePriorityMap ||
        (colDef.field === "priority" ? PRIORITY_LEVEL : STATUS_PRIORITY);

      return {
        ...colDef,
        comparator: (valueA, valueB) =>
          badgeComparator(valueA, valueB, priorityMap),
      };
    });
  }, [columnDefs, colDefs, gridOptions]);

  const defsById = useMemo(() => {
    const m = new Map();
    resolvedColumnDefs.forEach((c, i) => m.set(getColumnId(c, i), c));
    return m;
  }, [resolvedColumnDefs]);

  const computationColumnIds = useMemo(() => {
    const isNumericColumn = (c) =>
      (c.type === "currency" || c.type === "number") && c.field;

    const discoveredIds = resolvedColumnDefs
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => isNumericColumn(c))
      .map(({ c, i }) => getColumnId(c, i));

    const hasExplicitList =
      Array.isArray(computationColumns) && computationColumns.length > 0;

    if (!hasExplicitList) {
      return discoveredIds;
    }

    // Merge explicit fields with all number/currency columns so props like
    // computationColumns={["amount"]} do not hide other numeric columns.
    const fieldToId = new Map(
      resolvedColumnDefs.map((c, i) => [c.field, getColumnId(c, i)])
    );
    const explicitIds = computationColumns
      .map((f) => String(f).trim())
      .filter(Boolean)
      .map((field) => fieldToId.get(field))
      .filter(Boolean);

    const seen = new Set();
    const merged = [];
    for (const id of [...explicitIds, ...discoveredIds]) {
      if (id && !seen.has(id)) {
        seen.add(id);
        merged.push(id);
      }
    }
    return merged;
  }, [resolvedColumnDefs, computationColumns]);

  computationColumnIdsRef.current = computationColumnIds;

  const computedPinnedFromRowData = useMemo(() => {
    if (gridOptions?.pinnedBottomRowData?.length) return undefined;
    if (!rowData?.length || selectedComputationIds.length === 0) return [];
    return computeTotalsFromRows(rowData, selectedComputationIds, defsById);
  }, [
    gridOptions?.pinnedBottomRowData,
    rowData,
    selectedComputationIds,
    defsById,
  ]);

  const hasPinnedBottomRow = Boolean(
    (
      gridOptions?.pinnedBottomRowData ??
      filteredPinnedRowData ??
      computedPinnedFromRowData
    )?.length
  );
  const showComputationSection = computationColumnIds.length > 0;

  const updateFilteredPinnedRow = useCallback(() => {
    const api = gridRefInternal.current?.api;
    if (!api) return;
    if (!selectedComputationIds?.length) {
      setFilteredPinnedRowData([]);
      return;
    }
    const rows = [];
    api.forEachNodeAfterFilter((node) => {
      if (node.data && node.rowPinned !== "bottom") rows.push(node.data);
    });
    const pinned = computeTotalsFromRows(
      rows,
      selectedComputationIds,
      defsById
    );
    setFilteredPinnedRowData(pinned);
  }, [selectedComputationIds, defsById]);

  updateFilteredPinnedRowRef.current = updateFilteredPinnedRow;

  const handleGridReady = useCallback(
    (params) => {
      const runUpdate = () => {
        requestAnimationFrame(() => updateFilteredPinnedRowRef.current());
      };
      runUpdate();
      params.api?.addEventListener("filterChanged", runUpdate);
      params.api?.addEventListener("rowDataUpdated", runUpdate);
      params.api?.addEventListener("sortChanged", runUpdate);

      if (saveFilters) {
        onStoredFiltersGridReady(params);
      }
    },
    [saveFilters, onStoredFiltersGridReady]
  );

  useEffect(() => {
    const api = gridRefInternal.current?.api;
    if (api) updateFilteredPinnedRowRef.current();
  }, [selectedComputationIds, defsById]);

  useEffect(() => {
    if (resolvedColumnDefs.length === 0) return;
    const ids = resolvedColumnDefs.map((c, i) => getColumnId(c, i));
    const actionColumnIds = new Set(
      resolvedColumnDefs
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => c?.type === "action-column")
        .map(({ c, i }) => getColumnId(c, i))
    );
    const isInitialLoadForTable =
      Boolean(tableKey) && loadedColumnStateTableKeyRef.current !== tableKey;
    const saved =
      tableKey && isInitialLoadForTable ? loadColumnState(tableKey) : null;

    setColumnOrder((prev) => {
      if (isInitialLoadForTable && saved?.columnOrder?.length) {
        const validOrder = saved.columnOrder.filter((id) => ids.includes(id));
        const added = ids.filter((id) => !validOrder.includes(id));
        return [...validOrder, ...added];
      }
      if (prev.length === 0) return ids;
      const existing = new Set(prev);
      const added = ids.filter((id) => !existing.has(id));
      if (added.length === 0) return prev;
      return [...prev.filter((id) => ids.includes(id)), ...added];
    });

    if (!isInitialLoadForTable) return;

    loadedColumnStateTableKeyRef.current = tableKey;

    if (saved != null) {
      const validHidden = new Set(
        [...saved.hiddenIds].filter(
          (id) => ids.includes(id) && !actionColumnIds.has(id)
        )
      );
      setHiddenIds(validHidden);
      return;
    }

    // No saved state: apply hideByDefault flags from column defs
    const initialHidden = new Set();
    resolvedColumnDefs.forEach((colDef, index) => {
      if (colDef.hideByDefault && colDef.type !== "action-column") {
        initialHidden.add(getColumnId(colDef, index));
      }
    });
    setHiddenIds(initialHidden);
  }, [resolvedColumnDefs, tableKey]);

  useEffect(() => {
    if (tableKey && columnOrder.length > 0) {
      saveColumnState(tableKey, columnOrder, hiddenIds);
    }
  }, [tableKey, columnOrder, hiddenIds]);

  // Load computation selection once per tableKey; don't depend on computationColumnIds array ref
  // or we re-run every render and overwrite the user's selection before save can persist it.
  useEffect(() => {
    if (!tableKey || !showComputationSection) return;
    const ids = computationColumnIdsRef.current;
    if (ids.length === 0) return;
    if (loadedComputationTableKeyRef.current === tableKey) return;
    loadedComputationTableKeyRef.current = tableKey;
    const saved = loadComputationState(tableKey, []);
    const valid = saved.filter((id) => ids.includes(id));
    setSelectedComputationIds(valid.length > 0 ? valid : []);
    hasLoadedComputationRef.current = true;
  }, [tableKey, showComputationSection, computationColumnIds.length]);

  useEffect(() => {
    if (!tableKey || !hasLoadedComputationRef.current) return;
    saveComputationState(tableKey, selectedComputationIds);
  }, [tableKey, selectedComputationIds]);

  const displayedColumnDefs = useMemo(() => {
    if (columnOrder.length === 0) return resolvedColumnDefs;
    return columnOrder
      .filter((id) => !hiddenIds.has(id))
      .map((id) => defsById.get(id))
      .filter(Boolean);
  }, [resolvedColumnDefs, columnOrder, hiddenIds, defsById]);

  const displayedIds = useMemo(
    () => columnOrder.filter((id) => !hiddenIds.has(id)),
    [columnOrder, hiddenIds]
  );

  const displayedColumnDefsWithComputation = useMemo(() => {
    if (!hasPinnedBottomRow || computationColumnIds.length === 0) {
      return displayedColumnDefs;
    }
    const selectedSet = new Set(
      Array.isArray(selectedComputationIds) ? selectedComputationIds : []
    );
    const sanitize = (val) => {
      if (val == null || val === "") return null;
      if (typeof val === "number" && Number.isNaN(val)) return null;
      if (typeof val === "string" && val === "NaN") return null;
      return val;
    };
    const columnTypes = getColumnTypes();
    return displayedColumnDefs.map((def, displayIndex) => {
      const id = displayedIds[displayIndex];
      const isComputationCol = id && computationColumnIds.includes(id);
      const originalValueGetter = def.valueGetter;
      const originalCellRenderer =
        def.cellRenderer ?? columnTypes[def.type]?.cellRenderer;
      return {
        ...def,
        valueGetter: (params) => {
          if (!params) return null;
          if (params.node?.rowPinned === "bottom") {
            if (!isComputationCol || !selectedSet.has(id)) return null;
            // Pinned row data is the totals row; use the precomputed value, not valueGetter (which expects e.g. row.employees)
            return isComputationCol
              ? sanitize(params.data?.[def.field])
              : params.data?.[def.field];
          }
          let result;
          if (originalValueGetter) {
            result = originalValueGetter(params);
          } else if (def.type === "date" || def.type === "datetime") {
            const raw = params.data?.[def.field] ?? params.data?.created_at;
            if (raw == null) result = null;
            else {
              const date = new Date(raw);
              result = !Number.isNaN(date.getTime()) ? date : null;
              if (result && def.type === "date") result.setHours(0, 0, 0, 0);
            }
          } else {
            result = params.data?.[def.field];
          }
          return isComputationCol ? sanitize(result) : result;
        },
        // Use a dedicated renderer for pinned total rows so we don't rely on
        // per-column renderers that expect different shapes (badge, image, etc).
        cellRenderer: (params) => {
          if (!params) return null;
          if (params.node?.rowPinned === "bottom") {
            if (!isComputationCol || !selectedSet.has(id)) return null;
            const v = params.value;
            if (
              v == null ||
              v === "" ||
              (typeof v === "number" && Number.isNaN(v))
            ) {
              return null;
            }
            if (typeof v === "number") {
              return v.toLocaleString("en-IN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              });
            }
            return String(v);
          }
          if (typeof originalCellRenderer === "function") {
            return originalCellRenderer(params);
          }
          const v = params.value;
          // Don't render raw objects (e.g. badge-column { label, colorScheme })
          if (v != null && typeof v === "object") {
            if (typeof v.label === "string") return v.label;
            return "-";
          }
          return v;
        },
      };
    });
  }, [
    displayedColumnDefs,
    displayedIds,
    hasPinnedBottomRow,
    selectedComputationIds,
    computationColumnIds,
  ]);

  const handleToggleVisible = useCallback((id, visible) => {
    const colDef = defsById.get(id);
    if (colDef?.type === "action-column") return;
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (visible) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [defsById]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnOrder((prev) => {
        const idx = prev.indexOf(active.id);
        const overIdx = prev.indexOf(over.id);
        if (idx === -1 || overIdx === -1) return prev;
        return arrayMove(prev, idx, overIdx);
      });
    }
  }, []);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuOpen(true);
  }, []);

  useEffect(() => {
    if (!contextMenuOpen) return;
    const handleClose = (e) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target)
      ) {
        setContextMenuOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setContextMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClose);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClose);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenuOpen]);

  const defaultExportFileName = () =>
    tableKey ? `${tableKey}` : `table-export`;

  const effectivePinnedBottomRowData = useMemo(
    () =>
      gridOptions?.pinnedBottomRowData ??
      filteredPinnedRowData ??
      computedPinnedFromRowData ??
      [],
    [
      gridOptions?.pinnedBottomRowData,
      filteredPinnedRowData,
      computedPinnedFromRowData,
    ]
  );

  const effectiveMergedGridOptions = useMemo(() => {
    const { pinnedBottomRowData: _dropped, ...rest } = mergedGridOptions || {};
    return rest;
  }, [mergedGridOptions]);

  /** Get filtered rows (when grid API available) or all rowData; plus totals for those rows. Used for display and export. */
  /** If rows are selected, only return selected rows; otherwise return all filtered rows. */
  /** Row order matches the grid (filter + column sort) via forEachNodeAfterFilterAndSort. */
  const getFilteredRowsAndTotals = useCallback(() => {
    const api = gridRefInternal.current?.api;
    let rows = [];

    if (api) {
      const selectedRows = api.getSelectedRows();
      const exportSelectedOnly = selectedRows?.length > 0;

      api.forEachNodeAfterFilterAndSort((node) => {
        if (!node.data || node.rowPinned === "bottom") return;
        if (exportSelectedOnly && !node.isSelected?.()) return;
        rows.push(node.data);
      });
    } else {
      rows = [...(rowData ?? [])];
    }

    const pinnedRows = computeTotalsFromRows(
      rows,
      selectedComputationIds,
      defsById
    );
    return { rows, pinnedRows, dataRowCount: rows.length };
  }, [rowData, selectedComputationIds, defsById]);

  const handleExportCsv = useCallback(() => {
    try {
      const { rows, pinnedRows, dataRowCount } = getFilteredRowsAndTotals();
      const dataToExport = [...rows, ...(pinnedRows ?? [])];
      const data = transformDataForExport(dataToExport, displayedColumnDefs, {
        dataRowCount,
      });
      if (!data.length) {
        toast.error("No data to export");
        return;
      }
      downloadCsv(data, `${defaultExportFileName()}.csv`);
      toast.success("Exported as CSV");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export CSV");
    }
  }, [getFilteredRowsAndTotals, displayedColumnDefs, defaultExportFileName]);

  const handleExportXlsx = useCallback(() => {
    try {
      const { rows, pinnedRows, dataRowCount } = getFilteredRowsAndTotals();
      const dataToExport = [...rows, ...(pinnedRows ?? [])];
      const data = transformDataForExport(dataToExport, displayedColumnDefs, {
        dataRowCount,
      });
      if (!data.length) {
        toast.error("No data to export");
        return;
      }
      exportToExcel([data], ["Sheet1"], `${defaultExportFileName()}.xlsx`);
      toast.success("Exported as XLSX");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export XLSX");
    }
  }, [getFilteredRowsAndTotals, displayedColumnDefs, defaultExportFileName]);

  const handleExportPdf = useCallback(() => {
    try {
      const { rows, pinnedRows, dataRowCount } = getFilteredRowsAndTotals();
      const dataToExport = [...rows, ...(pinnedRows ?? [])];
      const data = transformDataForExport(dataToExport, displayedColumnDefs, {
        dataRowCount,
      });
      if (!data.length) {
        toast.error("No data to export");
        return;
      }
      const headers = Object.keys(data[0] || {}).reduce(
        (acc, key) => ({ ...acc, [key]: key }),
        {}
      );
      generatePDFWithToast({
        data,
        headers,
        pdf_name: defaultExportFileName(),
        title: tableKey
          ? capitalizeWordsLatest(tableKey?.replace("-", " "))
          : "Table Export",
        size: "md",
        orientation: "landscape",
        s3_folder: "ag-grid-tmp",
      }).then((response) => {
        const pdfData = response?.code === 200 ? response?.data : response;
        const pdfUrl = pdfData?.pdf_url;
        if (pdfUrl) window.open(pdfUrl, "_blank");
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PDF");
    }
  }, [
    getFilteredRowsAndTotals,
    displayedColumnDefs,
    defaultExportFileName,
    tableKey,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      ...(gridRefInternal.current ?? {}),
      exportCSV: handleExportCsv,
      exportExcel: handleExportXlsx,
      exportPDF: handleExportPdf,
    }),
    [handleExportCsv, handleExportXlsx, handleExportPdf]
  );

  const handleToggleComputation = useCallback((id, checked) => {
    if (id == null) return;
    hasLoadedComputationRef.current = true;
    setSelectedComputationIds((prev) => {
      const next = new Set(Array.isArray(prev) ? prev : []);
      if (checked) next.add(id);
      else next.delete(id);
      return Array.from(next);
    });
  }, []);

  // Mobile card view with virtualization
  const skeletonColumns = (columnDefs ?? colDefs ?? []).length || 6;

  if (!noMobileVersion && isMobile) {
    if (showSkeleton) return <TableSkeleton columns={3} rows={5} />;
    return (
      <MobileVirtualizedList rowData={rowData} colDefs={resolvedColumnDefs} />
    );
  }

  // Desktop grid view — pinnedBottomRowData must be a direct prop so ag-grid detects updates
  const gridContent = showSkeleton ? (
    <TableSkeleton columns={skeletonColumns} />
  ) : (
    <Box
      {...(framed && insideMainCard
        ? {
            // Master Data / Workspace "Table card": radius 8, 1px border, no padding.
            borderWidth: "1px",
            borderColor: "#E4E7EB",
            borderRadius: "8px",
            overflow: "hidden",
          }
        : framed
        ? {
            bg: "white",
            borderWidth: "1px",
            borderColor: "border",
            borderRadius: "12px",
            p: { base: "12px", md: "16px" },
          }
        : {})}
    >
      <AgGridReact
        ref={gridRefInternal}
        rowData={rowData}
        columnDefs={displayedColumnDefsWithComputation}
        gridOptions={effectiveMergedGridOptions}
        paginationPageSizeSelector={
          effectiveMergedGridOptions.paginationPageSizeSelector
        }
        domLayout="autoHeight"
        theme={agGridTheme(colorPalette, { bare })}
        className={className}
        {...props}
        rowSelection={enhancedRowSelection}
        onGridReady={(params) => {
          handleGridReady(params);
          props.onGridReady?.(params);
        }}
        pinnedBottomRowData={effectivePinnedBottomRowData}
      />
    </Box>
  );

  if (!showColumnSettings) {
    return gridContent;
  }

  return (
    <Box position="relative" w="100%" onContextMenu={handleContextMenu}>
      <Box position="relative">
        <Flex justifyContent="flex-end" mb="8px">
          <Popover.Root
            open={settingsOpen}
            onOpenChange={(e) => setSettingsOpen(e.open)}
            positioning={{ placement: "bottom-end", gutter: 8 }}
            lazyMount
            unmountOnExit
          >
            <Popover.Trigger asChild>
              <Button
                aria-label="Table settings"
                size="xs"
                h="34px"
                w="122px"
                px="0"
                variant="outline"
                colorPalette="brand"
                bg="app.tableHeader"
                borderColor={settingsOpen ? "brand.200" : "border"}
                color="#C95C18"
                fontSize="12px"
                fontWeight="500"
                borderRadius="8px"
                gap="8px"
                _hover={{ bg: "brand.100", borderColor: "brand.200" }}
              >
                <FaCog style={{ width: 16, height: 16 }} />
                Settings
                <LuChevronDown style={{ width: 12, height: 12 }} />
              </Button>
            </Popover.Trigger>
            <Portal>
              <Popover.Positioner>
                <Popover.Content
                  w={{ base: "calc(100vw - 32px)", sm: "380px" }}
                  maxW="380px"
                  bg="white"
                  borderRadius="14px"
                  borderWidth="1px"
                  borderColor="border"
                  boxShadow="0 20px 48px rgba(31, 41, 55, 0.16)"
                  overflow="hidden"
                  zIndex={1400}
                >
                  <Flex
                    alignItems="center"
                    justifyContent="space-between"
                    px="16px"
                    py="13px"
                    bg="brand.50"
                    borderBottomWidth="1px"
                    borderColor="border.muted"
                  >
                    <Text fontSize="16px" fontWeight="600" color="brand.600">
                      Table settings
                    </Text>
                    <Popover.CloseTrigger asChild>
                      <IconButton
                        variant="ghost"
                        size="2xs"
                        aria-label="Close table settings"
                        color="brand.500"
                        _hover={{ bg: "brand.100" }}
                      >
                        <LuX />
                      </IconButton>
                    </Popover.CloseTrigger>
                  </Flex>
                  <Box px="16px" py="16px" maxH="min(60vh, 520px)" overflowY="auto">
                    <SettingsDrawerContent
                      onExportCsv={handleExportCsv}
                      onExportXlsx={handleExportXlsx}
                      onExportPdf={handleExportPdf}
                      defsById={defsById}
                      columnOrder={columnOrder}
                      hiddenIds={hiddenIds}
                      onToggleVisible={handleToggleVisible}
                      onDragEnd={handleDragEnd}
                      showComputationSection={showComputationSection}
                      computationColumnIds={computationColumnIds}
                      selectedComputationIds={selectedComputationIds}
                      onToggleComputation={handleToggleComputation}
                    />
                  </Box>
                  <Flex
                    justifyContent="flex-end"
                    px="16px"
                    py="12px"
                    borderTopWidth="1px"
                    borderColor="border.muted"
                  >
                    <Button
                      size="sm"
                      h="36px"
                      px="20px"
                      bg="brand.500"
                      color="white"
                      _hover={{ bg: "brand.600" }}
                      onClick={() => setSettingsOpen(false)}
                    >
                      Done
                    </Button>
                  </Flex>
                </Popover.Content>
              </Popover.Positioner>
            </Portal>
          </Popover.Root>
        </Flex>

        {gridContent}
      </Box>

      {contextMenuOpen && (
        <Portal>
          <Box
            ref={contextMenuRef}
            position="fixed"
            left={contextMenuPosition.x}
            top={contextMenuPosition.y}
            zIndex={1500}
            minW="160px"
            py="1"
            bg="white"
            borderWidth="1px"
            borderRadius="md"
            borderColor="gray.200"
            boxShadow="md"
            _dark={{ bg: "gray.800", borderColor: "gray.600" }}
          >
            <Box
              as="button"
              type="button"
              w="100%"
              textAlign="left"
              px="3"
              py="2"
              fontSize="sm"
              color="gray.800"
              _dark={{ color: "gray.200" }}
              _hover={{ bg: "gray.50", _dark: { bg: "gray.700" } }}
              onClick={() => {
                setSettingsOpen(true);
                setContextMenuOpen(false);
              }}
            >
              <Flex alignItems="center" gap="2" cursor="pointer">
                <FaCog />
                <Text fontSize="xs">Open settings</Text>
              </Flex>
            </Box>
          </Box>
        </Portal>
      )}

    </Box>
  );
});

export default AgGrid;
