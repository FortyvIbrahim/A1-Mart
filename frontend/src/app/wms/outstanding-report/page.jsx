"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, Input, Text } from "@chakra-ui/react";
import toast from "react-hot-toast";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import CustomDialog from "@/components/CustomDialog";
import AgGrid from "@/components/AgGrid";
import CustomInputSelectEditor from "@/components/AgGrid/CustomInputSelectEditor";
import FileUploaderWithColumnMapping from "@/components/FileUploaderWithColumnMapping";
import { capitalizeWords } from "@/utils/string";
import useDeleteModal from "@/customHooks/useDeleteModal";
import usePermission from "@/customHooks/usePermission";
import useMasterList from "@/api/customHooks/useMasterList";
import useBranches from "@/api/customHooks/useBranches";
import useEmployee from "@/api/customHooks/useEmployee";
import {
  assignMasterListBuyersIfEmpty,
  bulkCreateMasterList,
} from "@/api/helpers/eb_master";
import {
  createOutstandingReportBatched,
  deleteOutstandingReport,
  getOutstandingReports,
} from "@/api/helpers/outstanding_report";
import { OUTSTANDING_REPORT_ROUTES } from "@/constants/routes/index";
import { resolveOutletId, resolveSupplierId } from "@/utils/purchaseReturns";

const OUTSTANDING_IMPORT_TARGET_COLUMNS = [
  {
    key: "supplier_name",
    label: "Supplier Name",
    type: "string",
    required: true,
    suggestedKey: "Supplier Name",
  },
  {
    key: "invoice_no",
    label: "Invoice No",
    type: "string",
    suggestedKey: "Invoice No",
  },
  {
    key: "ref_no",
    label: "Ref No",
    type: "string",
    required: true,
    suggestedKey: "Ref No",
  },
  {
    key: "invoice_date",
    label: "Invoice Date",
    type: "date",
    required: true,
    suggestedKey: "Invoice Date",
  },
  {
    key: "net_balance",
    label: "Net Balance",
    type: "number",
    required: true,
    suggestedKey: "Net Balance",
  },
  {
    key: "location_name",
    label: "Location Name",
    type: "string",
    required: true,
    suggestedKey: "Location Name",
  },
];

const formatToday = () => new Date().toISOString().slice(0, 10);

const formatDateDisplay = (value) => {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatDateForApi = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    const dt = new Date(trimmed);
    if (!Number.isNaN(dt.getTime())) return formatDateForApi(dt);
  }
  return null;
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

const hasSupplierName = (row) =>
  String(row?.supplier_name ?? "").trim() !== "";

const hasRefNo = (row) => String(row?.ref_no ?? "").trim() !== "";

const hasLocationName = (row) =>
  String(row?.location_name ?? "").trim() !== "";

const SUPPLIER_PERSON_TYPE = 1;

const isRowInvalid = (row) => row?.is_invalid_ref_no;

const isUnmappedOutletRow = (row) => row?.is_unmapped_outlet === true;

const isSkippedRow = (row) =>
  isRowInvalid(row) || isUnmappedOutletRow(row) || row?.is_missing_location;

const hasBuyer = (row) =>
  row?.buyer_id != null && String(row.buyer_id).trim() !== "";

const isUnmappedBuyerRow = (row) =>
  hasSupplierName(row) &&
  hasRefNo(row) &&
  hasLocationName(row) &&
  row?.branch_id != null &&
  !hasBuyer(row);

const isNewSupplierRow = (row) => row?.is_new_supplier === true;

const isSavableRow = (row) =>
  hasSupplierName(row) &&
  hasRefNo(row) &&
  hasLocationName(row) &&
  row?.branch_id != null &&
  hasBuyer(row);

const getBuyerId = (buyer) => buyer?.employee_id ?? buyer?.id ?? null;

const getBuyersForSupplier = (supplierId, masterList) => {
  if (supplierId == null || !Array.isArray(masterList)) return [];
  const master = masterList.find(
    (m) => Number(m.master_id) === Number(supplierId)
  );
  return Array.isArray(master?.buyers) ? master.buyers : [];
};

const getBuyerName = (buyerId, supplierBuyers, employees) => {
  if (!buyerId) return null;
  const match = supplierBuyers?.find((b) => getBuyerId(b) === buyerId);
  if (match?.employee_name) return match.employee_name;
  const employee = (employees || []).find((e) => e.employee_code === buyerId);
  return employee?.employee_name ?? null;
};

const supplierHasMappedBuyers = (row) =>
  (row?.supplier_buyers?.length ?? 0) > 0;

const getBuyerCellEditorSelector = (params, allEmployeeOptions) => {
  const data = params?.data;
  const supplierBuyers = data?.supplier_buyers;
  if (supplierHasMappedBuyers(data)) {
    return {
      component: CustomInputSelectEditor,
      params: {
        method: "dropdown",
        options: getBuyerOptionsFromList(supplierBuyers),
        placeholder: "Select buyer",
      },
    };
  }
  return {
    component: CustomInputSelectEditor,
    popup: true,
    params: {
      method: "searchable-dropdown",
      options: allEmployeeOptions,
      placeholder: "Search buyer...",
    },
  };
};
const getBuyerOptionsFromList = (supplierBuyers) =>
  (supplierBuyers || []).map((b) => {
    const id = getBuyerId(b);
    return {
      value: id,
      label: b.employee_name
        ? capitalizeWords(b.employee_name)
        : String(id ?? "—"),
    };
  });

const getBranchName = (branchId, branches) => {
  if (branchId == null || !Array.isArray(branches)) return null;
  const match = branches.find(
    (b) => Number(b.branch_id) === Number(branchId)
  );
  return match?.branch_name ?? null;
};

const enrichPreviewRow = (row, masterList, branches, employees, index) => {
  const supplierId = resolveSupplierId(
    row?.supplier_name,
    masterList,
    SUPPLIER_PERSON_TYPE
  );
  const supplierBuyers = getBuyersForSupplier(supplierId, masterList);
  const supplierHadBuyers =
    row.supplier_had_buyers ?? supplierBuyers.length > 0;
  const defaultBuyerId = getBuyerId(supplierBuyers[0]) ?? null;
  const buyerId = row.buyer_id ?? defaultBuyerId;
  const isNewSupplier = supplierId == null && hasSupplierName(row);
  const branchId =
    row.branch_id ?? resolveOutletId(row?.location_name, branches);

  return {
    ...row,
    _rowKey: row._rowKey ?? `outstanding-preview-${index}`,
    supplier_id: supplierId,
    supplier_buyers: supplierBuyers,
    supplier_had_buyers: supplierHadBuyers,
    buyer_id: buyerId,
    buyer_name: getBuyerName(buyerId, supplierBuyers, employees),
    branch_id: branchId,
    branch_name: getBranchName(branchId, branches),
    invoice_date_display: row?.invoice_date
      ? formatDateDisplay(row.invoice_date)
      : null,
    is_new_supplier: isNewSupplier,
    is_invalid_ref_no: !hasRefNo(row),
    is_missing_location: !hasLocationName(row),
    is_unmapped_outlet: hasLocationName(row) && branchId == null,
    is_unmapped_buyer:
      hasSupplierName(row) &&
      hasRefNo(row) &&
      hasLocationName(row) &&
      branchId != null &&
      !buyerId,
  };
};

const getUniqueNewSupplierNames = (rows, masterList) => {
  const seen = new Set();
  const names = [];
  (rows || []).forEach((row) => {
    if (!hasSupplierName(row)) return;
    if (
      resolveSupplierId(row.supplier_name, masterList, SUPPLIER_PERSON_TYPE) !=
      null
    ) {
      return;
    }
    const name = String(row.supplier_name).trim();
    const key = name.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    names.push(name);
  });
  return names;
};

const remapRowsWithMasterList = (rows, masterList, branches, employees) =>
  (rows || []).map((row, index) => {
    const enriched = enrichPreviewRow(
      row,
      masterList,
      branches,
      employees,
      index
    );
    const preservedBuyerId = row.buyer_id ?? enriched.buyer_id;
    return {
      ...enriched,
      supplier_had_buyers:
        row.supplier_had_buyers ?? enriched.supplier_had_buyers,
      buyer_id: preservedBuyerId,
      buyer_name:
        row.buyer_name ??
        getBuyerName(
          preservedBuyerId,
          enriched.supplier_buyers,
          employees
        ),
      is_unmapped_buyer:
        hasSupplierName(row) &&
        hasRefNo(row) &&
        hasLocationName(row) &&
        enriched.branch_id != null &&
        !preservedBuyerId,
    };
  });

const getMasterListBuyerAssignments = (rows) => {
  const bySupplier = new Map();
  (rows || []).forEach((row) => {
    if (row.supplier_had_buyers || !row.supplier_id || !row.buyer_id) return;
    const masterId = Number(row.supplier_id);
    if (!Number.isFinite(masterId) || masterId <= 0) return;
    if (!bySupplier.has(masterId)) bySupplier.set(masterId, new Set());
    bySupplier.get(masterId).add(String(row.buyer_id));
  });
  return Array.from(bySupplier.entries()).map(([master_id, buyerSet]) => ({
    master_id,
    buyer_ids: Array.from(buyerSet),
  }));
};

export default function OutstandingReportPage() {
  const canAdd = usePermission(OUTSTANDING_REPORT_ROUTES.create.permissionKey);
  const canDelete = usePermission("delete_outstanding_report");
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();
  const { masterList, refetchMasterList } = useMasterList();
  const { branches } = useBranches();
  const { employees } = useEmployee({ filterInactive: true });

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [gridRows, setGridRows] = useState([]);
  const [reportName, setReportName] = useState("");
  const [reportDate, setReportDate] = useState(formatToday());
  const [saving, setSaving] = useState(false);
  const [invalidRowsWarningOpen, setInvalidRowsWarningOpen] = useState(false);

  const allEmployeeBuyerOptions = useMemo(
    () =>
      (employees || [])
        .map((employee) => ({
          value: employee.employee_code,
          label: employee.employee_name
            ? capitalizeWords(employee.employee_name)
            : String(employee.employee_code ?? "—"),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [employees]
  );

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getOutstandingReports();
      setRows(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      toast.error(err?.message || "Failed to load outstanding reports.");
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
    setGridRows([]);
    setReportName("");
    setReportDate(formatToday());
    setInvalidRowsWarningOpen(false);
  }, []);

  useEffect(() => {
    if (!previewRows.length) {
      setGridRows([]);
      return;
    }
    const mapped = previewRows
      .filter(hasSupplierName)
      .map((row, index) =>
        enrichPreviewRow(row, masterList, branches, employees, index)
      );
    mapped.sort((a, b) => {
      const aRank =
        (isSkippedRow(a) ? 0 : a.is_unmapped_buyer ? 1 : 2);
      const bRank =
        (isSkippedRow(b) ? 0 : b.is_unmapped_buyer ? 1 : 2);
      if (aRank === bRank) return 0;
      return aRank < bRank ? -1 : 1;
    });
    setGridRows(mapped);
  }, [previewRows, masterList, branches, employees]);

  const handleBuyerCellChange = useCallback(
    (event) => {
      if (event.colDef?.field !== "buyer_id") return;
      const rowKey = event.data?._rowKey;
      const newBuyerId = event.newValue ?? null;
      setGridRows((prev) =>
        prev.map((row) => {
          if (row._rowKey !== rowKey) return row;
          const buyerName = getBuyerName(
            newBuyerId,
            row.supplier_buyers,
            employees
          );
          return {
            ...row,
            buyer_id: newBuyerId,
            buyer_name: buyerName,
            is_unmapped_buyer:
              hasSupplierName(row) &&
              hasRefNo(row) &&
              hasLocationName(row) &&
              row.branch_id != null &&
              !newBuyerId,
          };
        })
      );
    },
    [employees]
  );

  const newSupplierRowsCount = useMemo(() => {
    return (gridRows || []).filter(isNewSupplierRow).length;
  }, [gridRows]);

  const buildPayloadRows = useCallback((rows, list, branchList) => {
    return (rows || [])
      .filter(
        (row) =>
          hasSupplierName(row) &&
          hasRefNo(row) &&
          hasLocationName(row) &&
          row.branch_id != null
      )
      .map((row) => {
        const supplierId =
          row.supplier_id ??
          resolveSupplierId(row.supplier_name, list, SUPPLIER_PERSON_TYPE);
        if (supplierId == null) return null;
        const branchId =
          row.branch_id ?? resolveOutletId(row.location_name, branchList);
        if (branchId == null) return null;
        if (!row.buyer_id) return null;
        const invoiceNo = String(row.invoice_no ?? "").trim();
        return {
          supplier_id: Number(supplierId),
          buyer_id: row.buyer_id ?? null,
          branch_id: Number(branchId),
          invoice_no: invoiceNo || null,
          ref_no: String(row.ref_no).trim(),
          invoice_date: formatDateForApi(row.invoice_date),
          net_balance: normalizeNumberOrZero(row.net_balance),
        };
      })
      .filter(Boolean);
  }, []);

  const savableRowsCount = useMemo(() => {
    return (gridRows || []).filter(isSavableRow).length;
  }, [gridRows]);

  const invalidRefNoCount = useMemo(() => {
    return (gridRows || []).filter(isRowInvalid).length;
  }, [gridRows]);

  const unmappedOutletRowsCount = useMemo(() => {
    return (gridRows || []).filter(isUnmappedOutletRow).length;
  }, [gridRows]);

  const missingLocationRowsCount = useMemo(() => {
    return (gridRows || []).filter((row) => row?.is_missing_location).length;
  }, [gridRows]);

  const skippedRowsCount = useMemo(() => {
    return (gridRows || []).filter(isSkippedRow).length;
  }, [gridRows]);

  const unmappedBuyerRowsCount = useMemo(() => {
    return (gridRows || []).filter(isUnmappedBuyerRow).length;
  }, [gridRows]);

  const ensureSuppliersAndBuildPayload = useCallback(
    async (rows) => {
      let list = masterList;
      const newNames = getUniqueNewSupplierNames(rows, list);

      if (newNames.length > 0) {
        const bulkResponse = await bulkCreateMasterList(
          newNames.map((name) => ({
            name,
            person_type: SUPPLIER_PERSON_TYPE,
            status: true,
          }))
        );
        if (bulkResponse?.code !== 200) {
          throw new Error(
            bulkResponse?.message || "Failed to create new suppliers."
          );
        }
        const refreshed = await refetchMasterList({ silent: true });
        if (!Array.isArray(refreshed)) {
          throw new Error("Failed to refresh supplier list after creating suppliers.");
        }
        list = refreshed;
      }

      const remappedRows = remapRowsWithMasterList(
        rows,
        list,
        branches,
        employees
      );

      const buyerAssignments = getMasterListBuyerAssignments(remappedRows);
      if (buyerAssignments.length > 0) {
        const assignResponse = await assignMasterListBuyersIfEmpty(
          buyerAssignments
        );
        if (assignResponse?.code !== 200) {
          throw new Error(
            assignResponse?.message ||
              "Failed to assign buyers for suppliers without buyer mappings."
          );
        }
        const refreshedAfterBuyers = await refetchMasterList({ silent: true });
        if (Array.isArray(refreshedAfterBuyers)) {
          list = refreshedAfterBuyers;
        }
      }

      const finalRows = remapRowsWithMasterList(
        remappedRows,
        list,
        branches,
        employees
      );
      setGridRows(finalRows);
      return buildPayloadRows(finalRows, list, branches);
    },
    [branches, buildPayloadRows, employees, masterList, refetchMasterList]
  );

  const performSave = useCallback(async () => {
    setSaving(true);
    try {
      const invoices = await ensureSuppliersAndBuildPayload(gridRows);
      if (!invoices.length) {
        toast.error(
          "No valid rows to save. Rows must have a supplier name, ref no, and mapped outlet."
        );
        return;
      }

      const response = await createOutstandingReportBatched({
        report_name: reportName.trim(),
        date: reportDate,
        invoices,
      });
      if (response?.code === 200 || response?.code === 201) {
        toast.success("Outstanding report saved.");
        handleCloseImport();
        fetchReports();
      } else {
        toast.error(response?.message || "Failed to save outstanding report.");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to save outstanding report.");
    } finally {
      setSaving(false);
    }
  }, [
    ensureSuppliersAndBuildPayload,
    fetchReports,
    gridRows,
    handleCloseImport,
    reportDate,
    reportName,
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
    if (unmappedBuyerRowsCount > 0) {
      toast.error(
        `${unmappedBuyerRowsCount} row(s) need a buyer assigned before saving.`
      );
      return;
    }
    if (!savableRowsCount) {
      toast.error(
        "No valid rows found. Each row needs a supplier name, ref no, mapped outlet, and buyer."
      );
      return;
    }

    if (skippedRowsCount > 0) {
      setInvalidRowsWarningOpen(true);
      return;
    }
    performSave();
  }, [
    performSave,
    reportDate,
    reportName,
    savableRowsCount,
    skippedRowsCount,
    unmappedBuyerRowsCount,
  ]);

  const handleDelete = useCallback(
    (id) => {
      if (!id) return;
      openDeleteModal({
        title: "Delete Outstanding Report",
        message:
          "Are you sure you want to delete this outstanding report? This action cannot be undone.",
        onDelete: async () => {
          try {
            await deleteOutstandingReport(id);
            toast.success("Outstanding report deleted.");
            fetchReports();
          } catch (err) {
            toast.error(err?.message || "Failed to delete outstanding report.");
          }
        },
      });
    },
    [fetchReports, openDeleteModal]
  );

  const listColumnDefs = useMemo(() => {
    return [
      {
        field: "outstanding_report_id",
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
              onClick: () =>
                handleDelete(params.data?.outstanding_report_id),
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
        field: "supplier_name",
        headerName: "Supplier Name",
        flex: 1,
        valueGetter: (params) => params.data?.supplier_name || "—",
      },
      {
        field: "supplier_id",
        headerName: "Supplier ID",
        type: "id",
        valueGetter: (params) => params.data?.supplier_id ?? "—",
      },
      {
        field: "buyer_id",
        headerName: "Buyer",
        minWidth: 200,
        editable: (params) =>
          !isSkippedRow(params.data) && hasSupplierName(params.data),
        cellEditorSelector: (params) =>
          getBuyerCellEditorSelector(params, allEmployeeBuyerOptions),
        cellRenderer: (params) => {
          const name = params.data?.buyer_name;
          if (!name) return "—";
          return capitalizeWords(name);
        },
      },
      {
        field: "location_name",
        headerName: "Location Name",
        flex: 1,
        valueGetter: (params) => params.data?.location_name || "—",
      },
      {
        field: "branch_name",
        headerName: "Branch",
        flex: 1,
        valueGetter: (params) => params.data?.branch_name || "—",
      },
      {
        field: "invoice_no",
        headerName: "Invoice No",
      },
      {
        field: "ref_no",
        headerName: "Ref No",
        valueGetter: (params) => params.data?.ref_no || "—",
      },
      {
        field: "invoice_date_display",
        headerName: "Invoice Date",
        valueGetter: (params) =>
          params.data?.invoice_date_display ||
          formatDateDisplay(params.data?.invoice_date) ||
          "—",
      },
      {
        field: "net_balance",
        headerName: "Net Balance",
        type: "number",
      },
    ];
  }, [allEmployeeBuyerOptions]);

  return (
    <GlobalWrapper
      permissionKey={OUTSTANDING_REPORT_ROUTES.listing.permissionKey}
    >
      <DeleteModalComponent />
      <CustomContainer
        title="Outstanding Report"
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
            tableKey="outstanding-report-list"
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
        title="Import Outstanding Report"
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
              disabled={savableRowsCount === 0 || unmappedBuyerRowsCount > 0}
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
                Upload Excel/CSV and map columns. Suppliers not in the master
                list are created automatically when you save.
              </Text>
              <FileUploaderWithColumnMapping
                targetColumns={OUTSTANDING_IMPORT_TARGET_COLUMNS}
                onDataMapped={(mappedData) =>
                  setPreviewRows(
                    Array.isArray(mappedData)
                      ? mappedData.filter(hasSupplierName)
                      : []
                  )
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
                {gridRows.length} row(s), {savableRowsCount} ready to save.{" "}
                {newSupplierRowsCount > 0
                  ? `${newSupplierRowsCount} new supplier(s) (yellow) will be added to the master list on save. `
                  : ""}
                {invalidRefNoCount > 0
                  ? `${invalidRefNoCount} row(s) missing ref no (red) will be skipped. `
                  : ""}
                {unmappedOutletRowsCount > 0
                  ? `${unmappedOutletRowsCount} row(s) with outlet not mapped (red) will be skipped. `
                  : ""}
                {missingLocationRowsCount > 0
                  ? `${missingLocationRowsCount} row(s) missing location name (red) will be skipped. `
                  : ""}
                {unmappedBuyerRowsCount > 0
                  ? `${unmappedBuyerRowsCount} row(s) missing buyer (yellow) must be assigned before saving. `
                  : ""}
                Click Buyer to assign or change buyer for each row.
              </Text>
              <AgGrid
                tableKey="outstanding-report-preview"
                rowData={gridRows}
                columnDefs={previewColumnDefs}
                gridOptions={{
                  getRowStyle: (params) => {
                    if (isSkippedRow(params?.data)) {
                      return { backgroundColor: "rgba(254, 178, 178, 0.35)" };
                    }
                    if (
                      params?.data?.is_unmapped_buyer ||
                      isNewSupplierRow(params?.data)
                    ) {
                      return { backgroundColor: "rgba(254, 243, 199, 0.75)" };
                    }
                    return null;
                  },
                  onCellValueChanged: handleBuyerCellChange,
                  singleClickEdit: true,
                  stopEditingWhenCellsLoseFocus: true,
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
          {skippedRowsCount} invalid row(s) found and will not be saved.
          {invalidRefNoCount > 0
            ? ` ${invalidRefNoCount} row(s) are missing ref no.`
            : ""}
          {unmappedOutletRowsCount > 0
            ? ` ${unmappedOutletRowsCount} row(s) have outlet not mapped.`
            : ""}
          {missingLocationRowsCount > 0
            ? ` ${missingLocationRowsCount} row(s) are missing location name.`
            : ""}
          {newSupplierRowsCount > 0
            ? ` ${newSupplierRowsCount} new supplier(s) will be added to the master list before saving.`
            : ""}{" "}
          Continue with the remaining valid rows?
        </Text>
      </CustomDialog>
    </GlobalWrapper>
  );
}
