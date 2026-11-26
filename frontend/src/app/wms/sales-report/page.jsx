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
  createSalesReport,
  deleteSalesReport,
  getSalesReports,
} from "@/api/helpers/sales_report";
import { SALES_REPORT_ROUTES } from "@/constants/routes/index";
import { resolveOutletId } from "@/utils/purchaseReturns";

const SALES_IMPORT_TARGET_COLUMNS = [
  {
    key: "outlet_name",
    label: "Outlet Name",
    type: "string",
    required: true,
    suggestedKey: "Outlet Name",
  },
  {
    key: "product_id",
    label: "Item Code",
    type: "id",
    required: true,
    suggestedKey: "Item Code",
  },
  {
    key: "sold_qty",
    label: "Net Sales Qty",
    type: "number",
    required: true,
    suggestedKey: "Net Sales Qty",
  },
  {
    key: "sold_value",
    label: "Net Sales Amt",
    type: "number",
    required: true,
    suggestedKey: "Net Sales Amt",
  },
];

const formatToday = () => new Date().toISOString().slice(0, 10);

const formatDateDisplay = (value) => {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString("en-GB");
};

const normalizeDateForCompare = (value) => {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const dt = new Date(trimmed);
    if (!Number.isNaN(dt.getTime())) return normalizeDateForCompare(dt);
  }
  return "";
};

const normalizeNumberOrZero = (value) => {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getReportNameFromFile = (fileName) => {
  if (!fileName) return "";
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex <= 0) return fileName.trim();
  return fileName.slice(0, lastDotIndex).trim();
};

const aggregateRowsByProductAndBranch = (rows, branches) => {
  const grouped = new Map();

  (rows || []).forEach((row) => {
    const productId = Number(row?.product_id);
    if (!Number.isFinite(productId) || productId <= 0) return;

    const outletName = String(row?.outlet_name ?? "").trim();
    const branchId = resolveOutletId(outletName, branches);
    const key =
      branchId != null
        ? `${productId}__${branchId}`
        : `${productId}__unmapped__${outletName.toLowerCase()}`;

    const existing = grouped.get(key) || {
      product_id: productId,
      branch_id: branchId,
      outlet_name: outletName,
      sold_qty: 0,
      sold_value: 0,
    };

    existing.sold_qty += normalizeNumberOrZero(row?.sold_qty);
    existing.sold_value += normalizeNumberOrZero(row?.sold_value);
    grouped.set(key, existing);
  });

  return Array.from(grouped.values());
};

export default function SalesReportPage() {
  const canAdd = usePermission(SALES_REPORT_ROUTES.create.permissionKey);
  const canDelete = usePermission("delete_sales_report");
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
  const [duplicateDateWarningOpen, setDuplicateDateWarningOpen] =
    useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getSalesReports();
      setRows(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      toast.error(err?.message || "Failed to load sales reports.");
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
    setDuplicateDateWarningOpen(false);
  }, []);

  const existingReportForDate = useMemo(() => {
    return (rows || []).find(
      (row) => normalizeDateForCompare(row?.date) === reportDate
    );
  }, [rows, reportDate]);

  const groupedPreviewRows = useMemo(
    () => aggregateRowsByProductAndBranch(previewRows, branches),
    [previewRows, branches]
  );

  const branchById = useMemo(() => {
    const map = {};
    (branches || []).forEach((branch) => {
      const id = Number(branch?.branch_id);
      if (!Number.isNaN(id) && id > 0) map[id] = branch;
    });
    return map;
  }, [branches]);

  const productsById = useMemo(() => {
    const map = {};
    (products || []).forEach((product) => {
      const id = Number(product?.product_id);
      if (!Number.isNaN(id) && id > 0) map[id] = product;
    });
    return map;
  }, [products]);

  const previewRowsWithMeta = useMemo(() => {
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
    return (previewRowsWithMeta || [])
      .filter((row) => !row.is_invalid_product && !row.is_invalid_branch)
      .map((row) => ({
        product_id: row.product_id,
        branch_id: row.branch_id,
        sold_qty: normalizeNumberOrZero(row.sold_qty),
        sold_value: normalizeNumberOrZero(row.sold_value),
      }));
  }, [previewRowsWithMeta]);

  const invalidRowsCount = useMemo(() => {
    return (previewRowsWithMeta || []).filter(
      (row) => row.is_invalid_product || row.is_invalid_branch
    ).length;
  }, [previewRowsWithMeta]);

  const performSave = useCallback(async () => {
    setSaving(true);
    try {
      const response = await createSalesReport({
        report_name: reportName.trim(),
        date: reportDate,
        items: validPayloadRows,
      });
      if (response?.code === 200 || response?.code === 201) {
        toast.success("Sales report saved.");
        handleCloseImport();
        fetchReports();
      } else {
        toast.error(response?.message || "Failed to save sales report.");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to save sales report.");
    } finally {
      setSaving(false);
      setDuplicateDateWarningOpen(false);
    }
  }, [
    fetchReports,
    handleCloseImport,
    reportDate,
    reportName,
    validPayloadRows,
  ]);

  const handleSave = useCallback(() => {
    if (!reportName.trim()) {
      toast.error("Please upload file to set report name.");
      return;
    }
    if (!reportDate) {
      toast.error("Please select report date.");
      return;
    }
    if (!validPayloadRows.length) {
      toast.error(
        "No valid rows found. Invalid products or outlets cannot be saved."
      );
      return;
    }

    if (existingReportForDate) {
      setDuplicateDateWarningOpen(true);
      return;
    }

    performSave();
  }, [
    existingReportForDate,
    performSave,
    reportDate,
    reportName,
    validPayloadRows,
  ]);

  const handleDelete = useCallback(
    (id) => {
      if (!id) return;
      openDeleteModal({
        title: "Delete Sales Report",
        message:
          "Are you sure you want to delete this sales report? This action cannot be undone.",
        onDelete: async () => {
          try {
            await deleteSalesReport(id);
            toast.success("Sales report deleted.");
            fetchReports();
          } catch (err) {
            toast.error(err?.message || "Failed to delete sales report.");
          }
        },
      });
    },
    [fetchReports, openDeleteModal]
  );

  const listColumnDefs = useMemo(() => {
    return [
      {
        field: "sales_report_id",
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
        field: "item_count",
        headerName: "Rows",
        type: "number",
        valueGetter: (params) => Number(params.data?.item_count ?? 0),
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
              onClick: () => handleDelete(params.data?.sales_report_id),
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
        headerName: "Item Code",
        type: "id",
      },
      {
        field: "branch_name",
        headerName: "Outlet",
        flex: 1,
      },
      {
        field: "product_name",
        headerName: "Product",
        flex: 1,
        valueGetter: (params) => params.data?.product_name || "—",
      },
      {
        field: "sold_qty",
        headerName: "Net Sales Qty",
        type: "number",
      },
      {
        field: "sold_value",
        headerName: "Net Sales Amt",
        type: "number",
      },
    ];
  }, []);

  return (
    <GlobalWrapper permissionKey={SALES_REPORT_ROUTES.listing.permissionKey}>
      <DeleteModalComponent />
      <CustomContainer
        title="Sales Report"
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
            tableKey="sales-report-list"
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
        title="Import Sales Report"
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
              disabled={!previewRows.length || validPayloadRows.length === 0}
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
            {existingReportForDate ? (
              <Text fontSize="xs" color="orange.600" mt={2}>
                A report already exists for this date. Uploading will replace
                the previous data.
              </Text>
            ) : null}
          </Box>

          {!previewRows.length ? (
            <Box>
              <Text fontSize="sm" color="gray.600" mb={3}>
                Upload Excel/CSV and map columns: Outlet Name, Item Code, Net
                Sales Qty, Net Sales Amt.
              </Text>
              <FileUploaderWithColumnMapping
                targetColumns={SALES_IMPORT_TARGET_COLUMNS}
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
                {invalidRowsCount > 0
                  ? ` ${invalidRowsCount} invalid row(s) will be skipped.`
                  : ""}
              </Text>
              <AgGrid
                tableKey="sales-report-preview"
                rowData={previewRowsWithMeta}
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
        open={duplicateDateWarningOpen}
        onOpenChange={(e) => {
          if (!e.open) setDuplicateDateWarningOpen(false);
        }}
        title="Replace Existing Report?"
        maxW="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDuplicateDateWarningOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              colorPalette="orange"
              onClick={performSave}
              loading={saving}
            >
              Replace Report
            </Button>
          </>
        }
      >
        <Text fontSize="sm" color="gray.700">
          A sales report already exists for{" "}
          {formatDateDisplay(existingReportForDate?.date || reportDate)}. Saving
          this upload will delete the previous data for that date. Do you want
          to continue?
        </Text>
      </CustomDialog>
    </GlobalWrapper>
  );
}
