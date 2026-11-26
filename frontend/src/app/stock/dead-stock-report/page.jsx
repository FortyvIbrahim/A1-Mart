"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, Input, Text } from "@chakra-ui/react";
import toast from "react-hot-toast";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import CustomDialog from "@/components/CustomDialog";
import AgGrid from "@/components/AgGrid";
import FileUploaderWithColumnMapping from "@/components/FileUploaderWithColumnMapping";
import useDeleteModal from "@/customHooks/useDeleteModal";
import usePermission from "@/customHooks/usePermission";
import useProducts from "@/api/customHooks/useProducts";
import useBranches from "@/api/customHooks/useBranches";
import {
  createDeadStockReport,
  deleteDeadStockReport,
  getDeadStockReports,
} from "@/api/helpers/dead_stock_report";
import { DEAD_STOCK_REPORT_ROUTES } from "@/constants/routes/index";

const DEAD_STOCK_IMPORT_TARGET_COLUMNS = [
  {
    key: "product_id",
    label: "Item Code",
    type: "id",
    required: true,
    suggestedKey: "Item Code",
  },
  {
    key: "30_days_stock",
    label: "30 Days Stock",
    type: "number",
    suggestedKey: "30 DAYS STOCK",
  },
  {
    key: "30_days_stock_value",
    label: "30 Days Stock Value",
    type: "number",
    suggestedKey: "30 DAYS STOCK VAL",
  },
  {
    key: "90_days_stock",
    label: "90 Days Stock",
    type: "number",
    suggestedKey: "90 DAYS STOCK",
  },
  {
    key: "90_days_stock_value",
    label: "90 Days Stock Value",
    type: "number",
    suggestedKey: "90 DAYS STOCK VAL",
  },
  {
    key: "120_days_stock",
    label: "120 Days Stock",
    type: "number",
    suggestedKey: "120 DAYS STOCK",
  },
  {
    key: "120_days_stock_value",
    label: "120 Days Stock Value",
    type: "number",
    suggestedKey: "120 DAYS STOCK VAL",
  },
  {
    key: "than_120_days_stock",
    label: "Than 120 Days Stock",
    type: "number",
    suggestedKey: "THAN 120 DAYS STOCK",
  },
  {
    key: "than_120_days_stock_value",
    label: "Than 120 Days Stock Value",
    type: "number",
    suggestedKey: "THAN 120 DAYS STOCK VAL",
  },
  {
    key: "outlet_name",
    label: "Outlet Name",
    type: "string",
    required: true,
    suggestedKey: "Outlet Name",
  },
];

const formatToday = () => new Date().toISOString().slice(0, 10);

const formatDateDisplay = (value) => {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString("en-GB");
};

const normalizeNumberOrZero = (value) => {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getNumberDisplayValue = (value) => {
  const parsed = Number(value ?? 0);
  if (Number.isNaN(parsed) || parsed === 0) return null;
  return parsed;
};

const getReportNameFromFile = (fileName) => {
  if (!fileName) return "";
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex <= 0) return fileName.trim();
  return fileName.slice(0, lastDotIndex).trim();
};

const normalizeLookupText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeOutletAlias = (value) => {
  const normalized = normalizeLookupText(value);
  if (normalized === "a1mart- distribution") {
    return "a1mart-distribution warehouse";
  }

  if (normalized === "a1mart-production") {
    return "a1mart-production warehouse";
  }
  return normalized;
};

const aggregateRowsByProductAndBranch = (rows, branchByName) => {
  const grouped = new Map();

  (rows || []).forEach((row) => {
    const productId = Number(row?.product_id);
    if (!Number.isFinite(productId) || productId <= 0) return;
    const outletName = row?.outlet_name.replace("A1 MART-", "A1MART-");
    const normalizedOutletName = normalizeOutletAlias(outletName);
    const branchId = branchByName[normalizedOutletName] ?? null;

    const key =
      branchId != null
        ? `${productId}__${branchId}`
        : `${productId}__unmapped__${normalizedOutletName || "unknown"}`;
    const existing = grouped.get(key) || {
      product_id: productId,
      branch_id: branchId,
      outlet_name: outletName,
      "30_days_stock": 0,
      "30_days_stock_value": 0,
      "90_days_stock": 0,
      "90_days_stock_value": 0,
      "120_days_stock": 0,
      "120_days_stock_value": 0,
      than_120_days_stock: 0,
      than_120_days_stock_value: 0,
    };

    existing["30_days_stock"] += normalizeNumberOrZero(row?.["30_days_stock"]);
    existing["30_days_stock_value"] += normalizeNumberOrZero(
      row?.["30_days_stock_value"]
    );
    existing["90_days_stock"] += normalizeNumberOrZero(row?.["90_days_stock"]);
    existing["90_days_stock_value"] += normalizeNumberOrZero(
      row?.["90_days_stock_value"]
    );
    existing["120_days_stock"] += normalizeNumberOrZero(
      row?.["120_days_stock"]
    );
    existing["120_days_stock_value"] += normalizeNumberOrZero(
      row?.["120_days_stock_value"]
    );
    existing.than_120_days_stock += normalizeNumberOrZero(
      row?.than_120_days_stock
    );
    existing.than_120_days_stock_value += normalizeNumberOrZero(
      row?.than_120_days_stock_value
    );

    grouped.set(key, existing);
  });

  return Array.from(grouped.values());
};

export default function DeadStockReportPage() {
  const canAdd = usePermission(DEAD_STOCK_REPORT_ROUTES.create.permissionKey);
  const canDelete = usePermission("delete_dead_stock_report");
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();
  const { products } = useProducts();
  const { branches } = useBranches();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [reportName, setReportName] = useState("");
  const [reportDate, setReportDate] = useState(formatToday());
  const [saving, setSaving] = useState(false);
  const [invalidRowsWarningOpen, setInvalidRowsWarningOpen] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getDeadStockReports();
      setRows(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      toast.error(err?.message || "Failed to load dead stock reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleCloseImport = useCallback(() => {
    setImportModalOpen(false);
    setPreviewRows([]);
    setReportName("");
    setReportDate(formatToday());
    setInvalidRowsWarningOpen(false);
  }, []);

  const branchByName = useMemo(() => {
    const map = {};
    (branches || []).forEach((branch) => {
      const id = Number(branch?.branch_id);
      if (!Number.isFinite(id) || id <= 0) return;
      const name = normalizeOutletAlias(branch?.branch_name);
      if (name) map[name] = id;
    });
    return map;
  }, [branches]);

  const branchById = useMemo(() => {
    const map = {};
    (branches || []).forEach((branch) => {
      const id = Number(branch?.branch_id);
      if (!Number.isNaN(id) && id > 0) map[id] = branch;
    });
    return map;
  }, [branches]);

  const groupedPreviewRows = useMemo(
    () => aggregateRowsByProductAndBranch(previewRows, branchByName),
    [previewRows, branchByName]
  );

  const productsById = useMemo(() => {
    const map = {};
    (products || []).forEach((product) => {
      const id = Number(product?.product_id);
      if (!Number.isNaN(id) && id > 0) map[id] = product;
    });
    return map;
  }, [products]);

  const previewRowsWithProduct = useMemo(() => {
    const mappedRows = (groupedPreviewRows || []).map((row) => {
      const productId = Number(row.product_id);
      const product = Number.isNaN(productId) ? null : productsById[productId];
      return {
        ...row,
        product_name:
          product?.product_name || product?.product_display_name || null,
        product_image: product?.image_url || null,
        branch_name:
          branchById[Number(row.branch_id)]?.branch_name ||
          row.outlet_name ||
          null,
        is_invalid_product: !product,
        is_invalid_branch: !row.branch_id,
      };
    });
    return mappedRows.sort((a, b) => {
      const aInvalid = a.is_invalid_product || a.is_invalid_branch;
      const bInvalid = b.is_invalid_product || b.is_invalid_branch;
      if (aInvalid === bInvalid) return 0;
      return aInvalid ? -1 : 1;
    });
  }, [groupedPreviewRows, productsById, branchById]);

  const validPayloadRows = useMemo(() => {
    return (previewRowsWithProduct || [])
      .filter((row) => !row.is_invalid_product)
      .filter((row) => !row.is_invalid_branch)
      .map((row) => ({
        product_id: row.product_id,
        branch_id: row.branch_id,
        "30_days_stock": normalizeNumberOrZero(row["30_days_stock"]),
        "30_days_stock_value": normalizeNumberOrZero(
          row["30_days_stock_value"]
        ),
        "90_days_stock": normalizeNumberOrZero(row["90_days_stock"]),
        "90_days_stock_value": normalizeNumberOrZero(
          row["90_days_stock_value"]
        ),
        "120_days_stock": normalizeNumberOrZero(row["120_days_stock"]),
        "120_days_stock_value": normalizeNumberOrZero(
          row["120_days_stock_value"]
        ),
        than_120_days_stock: normalizeNumberOrZero(row.than_120_days_stock),
        than_120_days_stock_value: normalizeNumberOrZero(
          row.than_120_days_stock_value
        ),
      }));
  }, [previewRowsWithProduct]);

  const invalidRowsCount = useMemo(() => {
    return (previewRowsWithProduct || []).filter(
      (row) => row.is_invalid_product || row.is_invalid_branch
    ).length;
  }, [previewRowsWithProduct]);

  const performSave = useCallback(async () => {
    setSaving(true);
    try {
      const response = await createDeadStockReport({
        report_name: reportName.trim(),
        date: reportDate,
        products: validPayloadRows,
      });
      if (response?.code === 200 || response?.code === 201) {
        toast.success("Dead stock report saved.");
        handleCloseImport();
        fetchReports();
      } else {
        toast.error(response?.message || "Failed to save dead stock report.");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to save dead stock report.");
    } finally {
      setSaving(false);
    }
  }, [
    fetchReports,
    handleCloseImport,
    reportDate,
    reportName,
    validPayloadRows,
  ]);

  const handleSave = useCallback(async () => {
    if (!reportName.trim()) {
      toast.error("Please upload file to set report name.");
      return;
    }
    if (!reportDate) {
      toast.error("Please select report date.");
      return;
    }
    if (!validPayloadRows.length) {
      toast.error("No valid rows found. Invalid products cannot be saved.");
      return;
    }

    if (invalidRowsCount > 0) {
      setInvalidRowsWarningOpen(true);
      return;
    }
    performSave();
  }, [invalidRowsCount, performSave, reportDate, reportName, validPayloadRows]);

  const handleDelete = useCallback(
    (id) => {
      if (!id) return;
      openDeleteModal({
        title: "Delete Dead Stock Report",
        message:
          "Are you sure you want to delete this dead stock report? This action cannot be undone.",
        onDelete: async () => {
          try {
            await deleteDeadStockReport(id);
            toast.success("Dead stock report deleted.");
            fetchReports();
          } catch (err) {
            toast.error(err?.message || "Failed to delete dead stock report.");
          }
        },
      });
    },
    [fetchReports, openDeleteModal]
  );

  const listColumnDefs = useMemo(() => {
    return [
      {
        field: "dead_stock_report_id",
        headerName: "ID",
        type: "id",
        sort: "desc",
      },
      { field: "report_name", headerName: "Report Name", flex: 1 },
      {
        field: "date",
        headerName: "Date",
        valueGetter: (params) => formatDateDisplay(params.data?.date),
      },
      {
        field: "created_by_name",
        headerName: "Created By",
        valueGetter: (params) => params.data?.created_by_name || "—",
      },
      {
        field: "created_at",
        headerName: "Created At",
        type: "datetime",
      },
      {
        field: "action",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => {
          const actions = [];
          if (canDelete) {
            actions.push({
              label: "Delete",
              value: "delete",
              type: "danger",
              onClick: () => handleDelete(params.data?.dead_stock_report_id),
            });
          }
          return actions;
        },
      },
    ];
  }, [canDelete, handleDelete]);

  const previewColumnDefs = useMemo(() => {
    return [
      {
        field: "product_id",
        type: "id",
      },
      {
        field: "branch_name",
        headerName: "Branch",
      },
      {
        field: "product_image",
        headerName: "Image",
        type: "image",
      },
      {
        field: "product_name",
        headerName: "Product",
        flex: 1,
        valueGetter: (params) => params.data?.product_name || "—",
      },
      {
        field: "30_days_stock",
        headerName: "30D Stock",
        type: "number",
        valueGetter: (params) =>
          getNumberDisplayValue(params.data?.["30_days_stock"]),
      },
      {
        field: "30_days_stock_value",
        headerName: "30D Value",
        type: "number",
        valueGetter: (params) =>
          getNumberDisplayValue(params.data?.["30_days_stock_value"]),
      },
      {
        field: "90_days_stock",
        headerName: "90D Stock",
        type: "number",
        valueGetter: (params) =>
          getNumberDisplayValue(params.data?.["90_days_stock"]),
      },
      {
        field: "90_days_stock_value",
        headerName: "90D Value",
        type: "number",
        valueGetter: (params) =>
          getNumberDisplayValue(params.data?.["90_days_stock_value"]),
      },
      {
        field: "120_days_stock",
        headerName: "120D Stock",
        type: "number",
        valueGetter: (params) =>
          getNumberDisplayValue(params.data?.["120_days_stock"]),
      },
      {
        field: "120_days_stock_value",
        headerName: "120D Value",
        type: "number",
        valueGetter: (params) =>
          getNumberDisplayValue(params.data?.["120_days_stock_value"]),
      },
      {
        field: "than_120_days_stock",
        headerName: ">120D Stock",
        type: "number",
        valueGetter: (params) =>
          getNumberDisplayValue(params.data?.than_120_days_stock),
      },
      {
        field: "than_120_days_stock_value",
        headerName: ">120D Value",
        type: "number",
        valueGetter: (params) =>
          getNumberDisplayValue(params.data?.than_120_days_stock_value),
      },
    ];
  }, []);

  return (
    <GlobalWrapper
      permissionKey={DEAD_STOCK_REPORT_ROUTES.listing.permissionKey}
    >
      <DeleteModalComponent />
      <CustomContainer
        title="Dead Stock Report"
        rightSection={
          canAdd ? (
            <Button
              size="sm"
              colorPalette="brand"
              onClick={() => setImportModalOpen(true)}
            >
              Import
            </Button>
          ) : null
        }
      >
        {loading ? (
          <Text color="gray.500">Loading...</Text>
        ) : (
          <AgGrid
            tableKey="dead-stock-report-list"
            rowData={rows}
            columnDefs={listColumnDefs}
          />
        )}
      </CustomContainer>

      <CustomDialog
        open={importModalOpen}
        onOpenChange={(e) => {
          if (!e.open) handleCloseImport();
        }}
        title="Import Dead Stock Report"
        maxW="90vw"
        maxH="90vh"
        footer={
          <>
            <Button variant="outline" onClick={handleCloseImport}>
              Cancel
            </Button>
            <Button
              colorPalette="brand"
              onClick={handleSave}
              loading={saving}
              disabled={groupedPreviewRows.length === 0}
            >
              Save
            </Button>
          </>
        }
      >
        <Flex direction="column" gap={4}>
          <Box w={{ base: "100%", md: "220px" }}>
            <Text fontSize="sm" mb={1} color="gray.600">
              Date
            </Text>
            <Input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </Box>

          {!previewRows.length ? (
            <Box>
              <Text fontSize="sm" color="gray.600" mb={3}>
                Upload Excel/CSV and map columns to preview rows before saving.
              </Text>
              <FileUploaderWithColumnMapping
                targetColumns={DEAD_STOCK_IMPORT_TARGET_COLUMNS}
                onDataMapped={(mappedData) =>
                  setPreviewRows(Array.isArray(mappedData) ? mappedData : [])
                }
                onFileSelected={(file) =>
                  setReportName(getReportNameFromFile(file?.name))
                }
                showToast={false}
              />
            </Box>
          ) : (
            <Box>
              <Text fontSize="sm" color="gray.600" mb={3}>
                Preview rows: {groupedPreviewRows.length}. Valid rows:{" "}
                {validPayloadRows.length}.
              </Text>
              <AgGrid
                tableKey="dead-stock-report-preview"
                rowData={previewRowsWithProduct}
                columnDefs={previewColumnDefs}
                gridOptions={{
                  getRowStyle: (params) =>
                    params?.data?.is_invalid_product ||
                    params?.data?.is_invalid_branch
                      ? { backgroundColor: "rgba(254, 178, 178, 0.35)" }
                      : null,
                }}
                pagination={true}
                paginationPageSize={10}
              />
            </Box>
          )}
        </Flex>
      </CustomDialog>

      <CustomDialog
        open={invalidRowsWarningOpen}
        onOpenChange={(e) => {
          if (!e.open) setInvalidRowsWarningOpen(false);
        }}
        title="Invalid Rows Found"
        maxW="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setInvalidRowsWarningOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              colorPalette="orange"
              onClick={() => {
                setInvalidRowsWarningOpen(false);
                performSave();
              }}
              loading={saving}
            >
              Continue Save
            </Button>
          </>
        }
      >
        <Text color="gray.700" fontSize="sm">
          {invalidRowsCount} invalid row(s) found. These rows will not be saved.
          Do you want to continue with the remaining valid rows?
        </Text>
      </CustomDialog>
    </GlobalWrapper>
  );
}
