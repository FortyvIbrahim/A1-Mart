"use client";

import React, { useMemo, useState, useRef, useCallback } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import AgGrid from "@/components/AgGrid";
import CustomDrawer from "@/components/CustomDrawer";
import usePurchaseReturns from "@/api/customHooks/usePurchaseReturns";
import useDeliveredById from "@/api/customHooks/useDeliveredById";
import {
  createDelivered,
  updateDelivered,
} from "@/api/helpers/purchaseReturns";
import { uploadAsset } from "@/api/helpers/assets";

const CREATE_VALIDATION_SCHEMA = Yup.object({
  supplier_id: Yup.mixed().required("Required"),
  pick_up_name: Yup.string().trim().required("Required"),
  pick_up_number: Yup.string().trim(),
  attachments: Yup.array().nullable(),
});

const EDIT_VIEW_VALIDATION_SCHEMA = Yup.object({
  supplier_id: Yup.mixed().nullable(),
  pick_up_name: Yup.string().trim().required("Required"),
  pick_up_number: Yup.string().trim(),
  attachments: Yup.array().nullable(),
});

/** Normalize id for comparison */
function normId(val) {
  if (val == null || val === "") return null;
  return String(val);
}

/**
 * Build unique supplier list from all purchase returns (employees[].suppliers[]).
 * When onlyWithUndelivered is true, include only suppliers that have at least one row
 * where employees.suppliers.delivered is empty (so not all items are delivered).
 */
function getSuppliersFromPurchaseReturns(purchaseReturns, options = {}) {
  if (!Array.isArray(purchaseReturns)) return [];
  const { onlyWithUndelivered = false } = options;
  const seen = new Set();
  const list = [];

  let supplierIdsWithUndelivered = null;
  if (onlyWithUndelivered) {
    supplierIdsWithUndelivered = new Set();
    for (const pr of purchaseReturns) {
      for (const emp of pr.employees || []) {
        for (const s of emp.suppliers || []) {
          const delivered = s.delivered;
          if (Array.isArray(delivered) && delivered.length > 0) continue;
          const id = s.supplier_id ?? s.master_id;
          const key = id != null ? normId(id) : null;
          if (key) supplierIdsWithUndelivered.add(key);
        }
      }
    }
  }

  for (const pr of purchaseReturns) {
    for (const emp of pr.employees || []) {
      for (const s of emp.suppliers || []) {
        const id = s.supplier_id ?? s.master_id;
        if (id == null) continue;
        const key = normId(id);
        if (!key || seen.has(key)) continue;
        if (supplierIdsWithUndelivered && !supplierIdsWithUndelivered.has(key))
          continue;
        seen.add(key);
        const name =
          s.supplier?.name ??
          s.supplier?.supplier_name ??
          (id != null ? String(id) : "—");
        list.push({ supplier_id: id, supplier_name: name });
      }
    }
  }
  return list;
}

/** Filter purchase returns that contain the given supplier and do NOT already have delivered data for that supplier */
function getPurchaseReturnsForSupplier(purchaseReturns, supplierId) {
  if (
    supplierId == null ||
    supplierId === "" ||
    !Array.isArray(purchaseReturns)
  )
    return [];
  const matchId = normId(supplierId);
  if (!matchId) return [];
  return purchaseReturns.filter((pr) => {
    for (const emp of pr.employees || []) {
      for (const s of emp.suppliers || []) {
        const sid = s.supplier_id ?? s.master_id;
        if (normId(sid) !== matchId) continue;
        if (s.delivered?.length > 0) return false;
        return true;
      }
    }
    return false;
  });
}

/**
 * Build issue-entry-style rows for the grid: one row per (PR, employee, supplier) for the selected supplier.
 * Each row: reference_id (purchase_return_id), buyer (employee name/code), no_of_boxes, purchase_returns_items_id (supplier-level from API), pr (for drawer).
 */
function getPurchaseReturnsRowsForSupplier(purchaseReturns, supplierId) {
  if (
    supplierId == null ||
    supplierId === "" ||
    !Array.isArray(purchaseReturns)
  )
    return [];
  const matchId = normId(supplierId);
  if (!matchId) return [];
  const rows = [];
  for (const pr of purchaseReturns) {
    const prId = pr.purchase_return_id ?? pr.id;
    if (prId == null) continue;
    for (const emp of pr.employees || []) {
      for (const s of emp.suppliers || []) {
        if (normId(s.supplier_id ?? s.master_id) !== matchId) continue;
        if (s.delivered?.length > 0) continue;
        const purchaseReturnsItemsId =
          s.purchase_returns_items_id ?? s.purchase_returns_item_id ?? s.id;
        if (purchaseReturnsItemsId == null) continue;
        const buyer =
          emp.employee?.employee_name ??
          emp.employee?.name ??
          emp.employee_name ??
          emp.employee_code ??
          "—";
        rows.push({
          purchase_return_id: prId,
          purchase_returns_items_id: purchaseReturnsItemsId,
          reference_id: prId,
          buyer,
          no_of_boxes: Number(s.no_of_boxes) || 0,
          pr,
        });
      }
    }
  }
  return rows;
}

/**
 * Build same issue-entry-style rows for edit/view: from purchase returns, keep only rows whose
 * purchase_returns_items_id is in the delivered record's purchase_returns_items_ids.
 */
function getPurchaseReturnsRowsByItemIds(purchaseReturns, itemIds) {
  if (!Array.isArray(purchaseReturns) || !Array.isArray(itemIds)) return [];
  const idSet = new Set(
    itemIds.map((id) => Number(id)).filter((n) => !Number.isNaN(n))
  );
  if (idSet.size === 0) return [];
  const rows = [];
  for (const pr of purchaseReturns) {
    const prId = pr.purchase_return_id ?? pr.id;
    if (prId == null) continue;
    for (const emp of pr.employees || []) {
      for (const s of emp.suppliers || []) {
        const purchaseReturnsItemsId =
          s.purchase_returns_items_id ?? s.purchase_returns_item_id ?? s.id;
        if (
          purchaseReturnsItemsId == null ||
          !idSet.has(Number(purchaseReturnsItemsId))
        )
          continue;
        const buyer =
          emp.employee?.employee_name ??
          emp.employee?.name ??
          emp.employee_name ??
          emp.employee_code ??
          "—";
        rows.push({
          purchase_return_id: prId,
          purchase_returns_items_id: purchaseReturnsItemsId,
          reference_id: prId,
          buyer,
          no_of_boxes: Number(s.no_of_boxes) || 0,
          pr,
        });
      }
    }
  }
  return rows;
}

/** Get products (items) for a single purchase return, optionally filtered by supplier */
function getProductsFromPurchaseReturn(purchaseReturn, supplierId) {
  if (!purchaseReturn) return [];
  const matchId =
    supplierId != null && supplierId !== "" ? normId(supplierId) : null;
  const rows = [];
  for (const emp of purchaseReturn.employees || []) {
    for (const s of emp.suppliers || []) {
      if (matchId && normId(s.supplier_id ?? s.master_id) !== matchId) continue;
      const supplierName = s.supplier?.name ?? s.supplier?.supplier_name ?? "—";
      for (const it of s.items || []) {
        const productName =
          it.product?.de_display_name ??
          it.product?.de_name ??
          it.product?.product_name ??
          it.item_name ??
          "—";

        rows.push({
          image_url: it.product?.image_url ?? null,
          supplier_name: supplierName,
          product_name: productName,
          qty: it.qty ?? "—",
          total_amount: it.total_amount != null ? it.total_amount : "—",
          pr_no: it.pr_no ?? "—",
          outlet_name: it.outlet_name ?? it.outlet?.branch_name ?? "—",
        });
      }
    }
  }
  return rows;
}

/** Column defs for purchase returns grid (issue-entry style: Reference ID, Buyer, No of boxes, Action) */
function getPurchaseReturnsColumnDefs(onViewProducts) {
  return [
    {
      field: "reference_id",
      headerName: "Reference ID",
      width: 120,
      valueGetter: (params) =>
        params.data?.reference_id ?? params.data?.purchase_return_id ?? "—",
    },
    {
      field: "buyer",
      headerName: "Buyer",
      flex: 1,
      minWidth: 140,
    },
    {
      field: "no_of_boxes",
      headerName: "No of boxes",
      width: 120,
    },
    {
      headerName: "Action",
      type: "action-column",
      width: 140,
      valueGetter: (params) => [
        {
          label: "View products",
          value: "view-products",
          onClick: () => onViewProducts(params.data?.pr),
        },
      ],
    },
  ];
}

/** Column defs for products drawer grid */
const PRODUCTS_DRAWER_COLUMN_DEFS = [
  { field: "image_url", headerName: "Image", type: "image" },
  { field: "product_name", headerName: "Product" },
  { field: "qty", headerName: "Qty" },
  { field: "total_amount", headerName: "Amount", type: "currency" },
  { field: "pr_no", headerName: "PR No" },
  { field: "outlet_name", headerName: "Outlet" },
];

/** Inner content: supplier dropdown, AgGrid purchase returns, drawer, pick-up inputs */
function DistributorIssueFormContent({
  supplierId,
  purchaseReturns,
  supplierOptions,
  setFieldValue,
  handleSubmit,
  selectedIdsRef,
  gridApiRef: gridApiRefProp,
  delivered,
  isViewMode,
  isEditMode,
}) {
  const router = useRouter();
  const gridApiRefLocal = useRef(null);
  const gridApiRef = gridApiRefProp ?? gridApiRefLocal;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerProducts, setDrawerProducts] = useState([]);
  const [drawerTitle, setDrawerTitle] = useState("Products");

  const list = Array.isArray(purchaseReturns) ? purchaseReturns : [];
  const gridRows = useMemo(() => {
    if (
      (isEditMode || isViewMode) &&
      delivered?.purchase_returns_items_ids?.length
    ) {
      return getPurchaseReturnsRowsByItemIds(
        list,
        delivered.purchase_returns_items_ids
      );
    }
    return getPurchaseReturnsRowsForSupplier(list, supplierId);
  }, [
    list,
    supplierId,
    isEditMode,
    isViewMode,
    delivered?.purchase_returns_items_ids,
  ]);

  const totalBoxesForSupplier = useMemo(
    () => gridRows.reduce((sum, r) => sum + (Number(r.no_of_boxes) || 0), 0),
    [gridRows]
  );

  const onSelectionChanged = useCallback(
    (event) => {
      if (!selectedIdsRef || !event?.api) return;
      const rows = event.api.getSelectedRows() ?? [];
      selectedIdsRef.current = new Set(
        rows
          .map((r) => String(r?.purchase_returns_items_id ?? ""))
          .filter(Boolean)
      );
    },
    [selectedIdsRef]
  );

  const selectAll = useCallback(() => {
    gridApiRef.current?.selectAllFiltered?.();
  }, []);

  const clearAll = useCallback(() => {
    gridApiRef.current?.deselectAll?.();
  }, []);

  const onViewProducts = useCallback(
    (pr) => {
      if (!pr) return;
      setDrawerProducts(getProductsFromPurchaseReturn(pr, supplierId));
      setDrawerTitle(`Products - PR #${pr.purchase_return_id ?? pr.id ?? "—"}`);
      setDrawerOpen(true);
    },
    [supplierId]
  );

  const onSupplierChange = (value) => {
    setFieldValue(
      "supplier_id",
      value === undefined || value === "" ? null : value
    );
    gridApiRef.current?.deselectAll?.();
    if (selectedIdsRef) selectedIdsRef.current = new Set();
  };

  const columnDefs = useMemo(
    () => getPurchaseReturnsColumnDefs(onViewProducts),
    [onViewProducts]
  );

  const viewOnly = isViewMode;
  const showSupplierAndGrid = !isViewMode && !isEditMode;
  const showTableInEditView = (isEditMode || isViewMode) && delivered != null;
  const showTableSection =
    (showSupplierAndGrid && supplierId) || showTableInEditView;
  const noDataForSupplier =
    showSupplierAndGrid && supplierId && gridRows.length === 0;

  return (
    <Box as="form" onSubmit={handleSubmit}>
      {(showSupplierAndGrid || isEditMode || isViewMode) && (
        <Flex maxW="500px" mb={6} flexDirection="column" gap={4}>
          <CustomInput
            name="supplier_id"
            label="Supplier"
            method="searchable-dropdown"
            placeholder="Select supplier"
            options={supplierOptions}
            onChange={showSupplierAndGrid ? onSupplierChange : undefined}
            viewOnly={isEditMode || isViewMode}
          />
        </Flex>
      )}

      {showTableSection && (
        <>
          <Flex justifyContent="space-between" alignItems="center">
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                {showTableInEditView
                  ? "Purchase returns (returned items)"
                  : "Purchase returns for this supplier"}
              </Text>
              {gridRows.length > 0 && (
                <Text fontSize="sm" color="gray.600" mb={2}>
                  Total no. of boxes: {totalBoxesForSupplier}
                </Text>
              )}
            </Box>

            {showSupplierAndGrid && (
              <Flex gap={2} mb={2}>
                <Button size="xs" variant="outline" onClick={selectAll}>
                  Select all
                </Button>
                <Button size="xs" variant="outline" onClick={clearAll}>
                  Clear all
                </Button>
              </Flex>
            )}
          </Flex>

          {gridRows.length === 0 ? (
            <Text color="gray.600" fontSize="sm" mb={4}>
              {showTableInEditView
                ? "No rows found for this returned record."
                : "No purchase returns found for this supplier."}
            </Text>
          ) : (
            <Box mb={6}>
              <AgGrid
                rowData={gridRows}
                columnDefs={columnDefs}
                tableKey={
                  showTableInEditView
                    ? "distributor-issue-purchase-returns-edit-view"
                    : "distributor-issue-purchase-returns"
                }
                defaultRows={10}
                pagination={true}
                gridOptions={{ domLayout: "normal" }}
                rowSelection={
                  showSupplierAndGrid
                    ? { mode: "multiRow", checkboxes: true }
                    : undefined
                }
                getRowId={(params) =>
                  String(
                    params.data?.purchase_returns_items_id ??
                      params.node?.id ??
                      ""
                  )
                }
                selectionColumnDef={
                  showSupplierAndGrid
                    ? {
                        pinned: "left",
                        width: 50,
                        maxWidth: 50,
                        minWidth: 50,
                        resizable: false,
                        suppressHeaderMenuButton: true,
                        sortable: false,
                        suppressMovable: true,
                      }
                    : undefined
                }
                onSelectionChanged={
                  showSupplierAndGrid ? onSelectionChanged : undefined
                }
                onGridReady={(params) => {
                  gridApiRef.current = params.api;
                }}
              />
            </Box>
          )}

          {showTableSection && !noDataForSupplier && (
            <CustomContainer pageForm headerBand title="Pick up details" size="sm">
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <CustomInput
                  name="pick_up_name"
                  label="Pick up name"
                  method="input"
                  placeholder="Pick up name"
                  viewOnly={viewOnly}
                />
                <CustomInput
                  name="pick_up_number"
                  label="Pick up Phone Number"
                  method="input"
                  placeholder="Pick up Phone Number"
                  viewOnly={viewOnly}
                />
              </Grid>
              <Box mt={4}>
                <CustomInput
                  name="attachments"
                  label="Attachments"
                  method="multiple-files"
                  accept="*/*"
                  viewOnly={viewOnly}
                />
              </Box>
            </CustomContainer>
          )}
        </>
      )}

      <CustomDrawer
        title={drawerTitle}
        isOpen={drawerOpen}
        setIsOpen={setDrawerOpen}
        size="full"
        content={
          drawerProducts.length === 0 ? (
            <Text color="gray.600">
              No products for this supplier in this purchase return.
            </Text>
          ) : (
            <AgGrid
              rowData={drawerProducts}
              columnDefs={PRODUCTS_DRAWER_COLUMN_DEFS}
              tableKey="distributor-issue-products-drawer"
              gridOptions={{ domLayout: "autoHeight" }}
            />
          )
        }
        footer={null}
      />

      {!noDataForSupplier && (
        <Flex gap={3} mt={6} justifyContent="flex-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/purchase-return/distibutor-issue")}
          >
            {viewOnly ? "Back to list" : "Cancel"}
          </Button>

          {!viewOnly && (
            <Button type="submit" colorPalette="brand">
              Submit
            </Button>
          )}
        </Flex>
      )}
    </Box>
  );
}

function DistributorIssueFormPage({ params }) {
  const router = useRouter();
  const { mode } = use(params ?? {});
  const isCreateMode = mode?.[0] === "create";
  const isEditMode = mode?.[0] === "edit";
  const isViewMode = mode?.[0] === "view";
  const recordId = mode?.[1] ?? null;

  const { purchaseReturns, refresh: refreshPurchaseReturns } =
    usePurchaseReturns();

  /** Only purchase returns that have receipt entry handled_by set (so they can appear in distributor issue form). */
  const purchaseReturnsWithHandledBy = useMemo(
    () =>
      (purchaseReturns || []).filter(
        (pr) =>
          pr.receipt_entry_handled_by != null ||
          pr.receipt_entry_handled_by_employee != null
      ),
    [purchaseReturns]
  );

  const { delivered, loading: loadingDelivered } = useDeliveredById(
    isEditMode || isViewMode ? recordId : null
  );
  const selectedIdsRef = useRef(new Set());
  const gridApiRef = useRef(null);

  const getTitle = () => {
    if (isCreateMode) return "Create Distributor Issue";
    if (isEditMode) return "Edit Distributor Issue";
    return "View Distributor Issue";
  };

  const supplierOptions = useMemo(() => {
    const suppliers = getSuppliersFromPurchaseReturns(
      purchaseReturnsWithHandledBy,
      { onlyWithUndelivered: isCreateMode }
    );
    return suppliers.map((s) => ({
      value: s.supplier_id,
      label: s.supplier_name,
    }));
  }, [purchaseReturnsWithHandledBy, isCreateMode]);

  const initialValues = useMemo(() => {
    if ((isEditMode || isViewMode) && delivered) {
      return {
        supplier_id: delivered.supplier_id ?? null,
        pick_up_name: delivered.pick_up_name ?? "",
        pick_up_number: delivered.pick_up_number ?? "",
        attachments: Array.isArray(delivered.attachments)
          ? delivered.attachments
          : Array.isArray(delivered.attachment)
          ? delivered.attachment
          : [],
      };
    }
    return {
      supplier_id: null,
      pick_up_name: "",
      pick_up_number: "",
      attachments: [],
    };
  }, [isEditMode, isViewMode, delivered]);

  const resolveAttachments = useCallback(async (rawAttachments) => {
    if (!Array.isArray(rawAttachments) || rawAttachments.length === 0)
      return [];
    const urls = [];
    const hasNewFiles = rawAttachments.some(
      (item) =>
        item?.file instanceof File ||
        (item && typeof item !== "string" && !item?.uri && !item?.file_url)
    );
    const toastId = hasNewFiles
      ? toast.loading("Uploading attachments...")
      : null;
    try {
      for (let i = 0; i < rawAttachments.length; i++) {
        const item = rawAttachments[i];
        if (typeof item === "string") {
          urls.push(item);
          continue;
        }
        if (item?.uri) {
          urls.push(item.uri);
          continue;
        }
        if (item?.file_url) {
          urls.push(item.file_url);
          continue;
        }
        const file = item?.file;
        if (file instanceof File) {
          const response = await uploadAsset(
            file,
            file.name ?? `attachment_${i + 1}`,
            "purchase-returns",
            "file"
          );
          if (response?.code === 200 && response?.remoteUrl) {
            urls.push(response.remoteUrl);
          } else {
            throw new Error(response?.message || "Upload failed");
          }
        }
      }
      if (toastId) toast.dismiss(toastId);
      return urls;
    } catch (err) {
      if (toastId) toast.dismiss(toastId);
      toast.error(`Failed to upload: ${err?.message || err}`);
      throw err;
    }
  }, []);

  const handleSubmit = useCallback(
    async (values) => {
      let itemIds = [];
      if (isCreateMode) {
        const api = gridApiRef.current;
        const selectedRows = api?.getSelectedRows?.() ?? [];
        itemIds = selectedRows
          .map((r) => r?.purchase_returns_items_id)
          .filter((id) => id != null && id !== "")
          .map((id) => Number(id));
        if (itemIds.length === 0) {
          toast.error("Select at least one row (purchase return line).");
          return;
        }
      }

      let attachments = [];
      try {
        attachments = await resolveAttachments(values.attachments ?? []);
      } catch (err) {
        return;
      }

      if (isCreateMode) {
        try {
          const res = await createDelivered({
            supplier_id: values.supplier_id ?? undefined,
            pick_up_name: values.pick_up_name || undefined,
            pick_up_number: values.pick_up_number || undefined,
            purchase_returns_items_ids: itemIds,
            attachment: attachments.length > 0 ? attachments : undefined,
          });
          const id = res?.purchase_returns_items_delivered_id;
          if (id != null) {
            toast.success("Distributor issue created.");
            refreshPurchaseReturns();
            router.push("/purchase-return/distibutor-issue");
          } else {
            throw new Error(res?.message || "Create failed");
          }
        } catch (err) {
          toast.error(err?.message || "Failed to create");
          throw err;
        }
      } else if (isEditMode && recordId) {
        try {
          await updateDelivered(recordId, {
            supplier_id:
              values.supplier_id ?? delivered?.supplier_id ?? undefined,
            pick_up_name: values.pick_up_name ?? undefined,
            pick_up_number: values.pick_up_number ?? undefined,
            purchase_returns_items_ids: delivered?.purchase_returns_items_ids,
            attachment: attachments.length > 0 ? attachments : undefined,
          });
          toast.success("Distributor issue updated.");
          refreshPurchaseReturns();
          router.push("/purchase-return/distibutor-issue");
        } catch (err) {
          toast.error(err?.message || "Failed to update");
          throw err;
        }
      }
    },
    [
      isCreateMode,
      isEditMode,
      recordId,
      delivered?.purchase_returns_items_ids,
      delivered?.supplier_id,
      refreshPurchaseReturns,
      router,
      gridApiRef,
      resolveAttachments,
    ]
  );

  if ((isEditMode || isViewMode) && loadingDelivered) {
    return (
      <GlobalWrapper permissionKey="view_purchase_return_distibutor_issue">
        <CustomContainer pageForm headerBand title={getTitle()} fullWidth>
          <Flex justifyContent="center" p={8}>
            <Text>Loading...</Text>
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if ((isEditMode || isViewMode) && !delivered && !loadingDelivered) {
    return (
      <GlobalWrapper permissionKey="view_purchase_return_distibutor_issue">
        <CustomContainer pageForm headerBand title={getTitle()} fullWidth>
          <Flex flexDirection="column" gap={4} alignItems="center" p={8}>
            <Text>Returned record not found</Text>
            <Link href="/purchase-return/distibutor-issue">
              <Button variant="subtle" colorPalette="gray">
                Back to list
              </Button>
            </Link>
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey="view_purchase_return_distibutor_issue">
      <CustomContainer pageForm headerBand title={getTitle()} fullWidth>
        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={
            isCreateMode
              ? CREATE_VALIDATION_SCHEMA
              : EDIT_VIEW_VALIDATION_SCHEMA
          }
          onSubmit={handleSubmit}
        >
          {({ values, setFieldValue, handleSubmit: formikHandleSubmit }) => (
            <DistributorIssueFormContent
              supplierId={values.supplier_id}
              purchaseReturns={purchaseReturnsWithHandledBy}
              supplierOptions={supplierOptions}
              setFieldValue={setFieldValue}
              handleSubmit={formikHandleSubmit}
              selectedIdsRef={selectedIdsRef}
              gridApiRef={gridApiRef}
              delivered={delivered}
              isViewMode={isViewMode}
              isEditMode={isEditMode}
            />
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default DistributorIssueFormPage;
