"use client";

import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import AgGrid from "@/components/AgGrid";
import useEmployee from "@/api/customHooks/useEmployee";
import usePurchaseReturns from "@/api/customHooks/usePurchaseReturns";
import usePurchaseReturnById from "@/api/customHooks/usePurchaseReturnById";
import { updatePurchaseReturn } from "@/api/helpers/purchaseReturns";
import CustomImage from "@/components/CustomImage";

/** Build one row per (employee, supplier) for AgGrid: supplier_name, no_of_boxes, buyer (employee), hasDelivered. */
function getSupplierRowsFromPurchaseReturn(purchaseReturn) {
  if (!purchaseReturn?.employees?.length) return [];
  const rows = [];
  let index = 0;
  for (const emp of purchaseReturn.employees) {
    const buyerName =
      emp.employee?.employee_name ??
      emp.employee?.name ??
      emp.employee_name ??
      emp.employee_code ??
      "—";
    const buyerCode = emp.employee_code ?? "";
    for (const s of emp.suppliers || []) {
      const id = s.supplier_id ?? s.master_id;
      if (id == null) continue;
      const name =
        s.supplier?.name ??
        s.supplier?.supplier_name ??
        (id != null ? String(id) : "—");
      const hasDelivered = Array.isArray(s.delivered) && s.delivered.length > 0;
      rows.push({
        rowId: `receipt-${index}-${buyerCode}-${id}`,
        supplier_id: id,
        supplier_name: name,
        no_of_boxes: Number(s.no_of_boxes) ?? 0,
        buyer_name: buyerName,
        buyer_code: buyerCode,
        hasDelivered,
      });
      index += 1;
    }
  }
  return rows;
}

const SUPPLIER_GRID_COLUMNS = [
  { field: "supplier_name", headerName: "Supplier", flex: 1, minWidth: 160 },
  { field: "no_of_boxes", headerName: "No of boxes", width: 120 },
  { field: "buyer_name", headerName: "Buyer", flex: 1, minWidth: 140 },
  {
    field: "hasDelivered",
    headerName: "Status",
    width: 110,
    type: "badge-column",
    valueGetter: (params) => {
      const v = params.data?.hasDelivered;
      return {
        label: v ? "Returned" : "Pending",
        colorScheme: v ? "green" : "gray",
      };
    },
  },
];

const VALIDATION_SCHEMA = Yup.object({
  handled_by: Yup.mixed().required("Handled By is required"),
  purchase_return_id: Yup.mixed().required("Purchase return is required"),
});

/** Inner content that uses selected purchase_return_id from Formik to fetch PR details */
function ReceiptEntryFormContent({
  employeeOptions,
  purchaseReturnOptions,
  selectedPurchaseReturnId,
  values,
  handleSubmit: formikHandleSubmit,
  isViewMode,
  isEditMode,
  preCheckAllSuppliers,
  allSuppliersCheckedRef,
}) {
  const router = useRouter();
  const { purchaseReturn } = usePurchaseReturnById(selectedPurchaseReturnId);
  const gridApiRef = useRef(null);

  const supplierRows = useMemo(
    () => getSupplierRowsFromPurchaseReturn(purchaseReturn),
    [purchaseReturn]
  );

  const [selectedCount, setSelectedCount] = useState(0);
  const viewOnly = isViewMode;

  useEffect(() => {
    setSelectedCount(0);
  }, [selectedPurchaseReturnId]);

  const onSelectionChanged = useCallback((event) => {
    const api = event?.api;
    if (!api) return;
    const selected = api.getSelectedRows() ?? [];
    setSelectedCount(selected.length);
  }, []);

  const allSuppliersChecked =
    supplierRows.length > 0 && selectedCount === supplierRows.length;

  if (allSuppliersCheckedRef) {
    allSuppliersCheckedRef.current = {
      allSuppliersChecked,
      selectedPurchaseReturnId,
      values,
    };
  }

  // In view/edit, pre-select all rows when grid has data
  useEffect(() => {
    if (preCheckAllSuppliers && supplierRows.length > 0 && gridApiRef.current) {
      gridApiRef.current.selectAllFiltered?.();
      setSelectedCount(supplierRows.length);
    }
  }, [preCheckAllSuppliers, supplierRows.length]);

  return (
    <Box as="form" onSubmit={formikHandleSubmit}>
      <Grid
        templateColumns={{ base: "1fr", md: "1fr 1fr" }}
        gap={4}
        maxW="600px"
        mb={6}
      >
        <CustomInput
          name="purchase_return_id"
          label="Purchase Return"
          method="searchable-dropdown"
          placeholder="Select purchase return"
          options={purchaseReturnOptions}
          viewOnly={viewOnly}
        />
        <CustomInput
          name="handled_by"
          label="Handled By"
          method="searchable-dropdown"
          placeholder="Select employee"
          options={employeeOptions}
          viewOnly={viewOnly}
          customRender={(item) => {
            return (
              <Flex alignItems="center" gap={2}>
                <CustomImage
                  src={item?.image_url}
                  alt={item?.label}
                  width={20}
                  height={20}
                />
                <Flex direction="column" alignItems="flex-start">
                  <Text>{item?.label}</Text>
                  <Text fontSize="xs" color="gray.500">
                    {item?.value}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {item?.designation}
                  </Text>
                </Flex>
              </Flex>
            );
          }}
        />
      </Grid>

      {selectedPurchaseReturnId && (
        <Box mt={6}>
          <Text fontSize="sm" fontWeight="semibold" mb={3}>
            Suppliers
          </Text>
          {supplierRows.length === 0 ? (
            <Text color="gray.600" fontSize="sm">
              No suppliers in this purchase return.
            </Text>
          ) : (
            <Box mb={4}>
              <AgGrid
                rowData={supplierRows}
                columnDefs={SUPPLIER_GRID_COLUMNS}
                tableKey="receipt-entry-suppliers"
                defaultRows={Math.min(supplierRows.length, 10)}
                pagination={supplierRows.length > 10}
                showColumnSettings={false}
                gridOptions={{ domLayout: "normal" }}
                rowSelection={
                  viewOnly ? undefined : { mode: "multiRow", checkboxes: true }
                }
                getRowId={(params) =>
                  params.data?.rowId ?? params.node?.id ?? ""
                }
                selectionColumnDef={
                  viewOnly
                    ? undefined
                    : {
                        pinned: "left",
                        width: 50,
                        maxWidth: 50,
                        minWidth: 50,
                        resizable: false,
                        suppressHeaderMenuButton: true,
                        sortable: false,
                        suppressMovable: true,
                      }
                }
                onSelectionChanged={viewOnly ? undefined : onSelectionChanged}
                onGridReady={(params) => {
                  gridApiRef.current = params.api;
                }}
                onFirstDataRendered={
                  preCheckAllSuppliers && supplierRows.length > 0
                    ? (params) => {
                        params.api?.selectAllFiltered?.();
                        setSelectedCount(supplierRows.length);
                      }
                    : undefined
                }
              />
            </Box>
          )}
        </Box>
      )}

      <Flex gap={3} mt={8} flexWrap="wrap">
        {!viewOnly && (
          <Button type="submit" colorPalette="brand">
            Submit
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/purchase-return/receipt-entry")}
        >
          {viewOnly ? "Back to list" : "Cancel"}
        </Button>
      </Flex>
    </Box>
  );
}

function ReceiptEntryForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const isCreateMode = mode?.[0] === "create";
  const isEditMode = mode?.[0] === "edit";
  const isViewMode = mode?.[0] === "view";
  const recordId = mode?.[1] ?? null;

  const { employees } = useEmployee({
    allBranches: true,
    filterInactive: true,
  });
  const { purchaseReturns } = usePurchaseReturns();
  const { purchaseReturn, loading: loadingRecord } = usePurchaseReturnById(
    isEditMode || isViewMode ? recordId : null
  );

  const getTitle = () => {
    if (isCreateMode) return "Create Purchase Return Receipt Entry";
    if (isEditMode) return "Edit Purchase Return Receipt Entry";
    return "View Purchase Return Receipt Entry";
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) return "add_purchase_return_issue_entry";
    return "view_purchase_return_issue_entry";
  };

  const allSuppliersCheckedRef = useRef({});

  const handleFormSubmit = async () => {
    const { allSuppliersChecked, selectedPurchaseReturnId, values } =
      allSuppliersCheckedRef.current || {};
    if (!allSuppliersChecked) {
      toast.error("Please select all suppliers before submitting.");
      return;
    }
    if (!selectedPurchaseReturnId || !values?.handled_by) return;
    try {
      await toast.promise(
        updatePurchaseReturn(selectedPurchaseReturnId, {
          receipt_entry_handled_by: values.handled_by,
        }),
        {
          loading: "Saving receipt entry...",
          success: () => {
            router.push("/purchase-return/receipt-entry");
            return "Receipt entry saved.";
          },
          error: (err) => err?.message || "Failed to save receipt entry",
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  const purchaseReturnOptions = useMemo(
    () =>
      (purchaseReturns || [])
        .filter((pr) =>
          isCreateMode ? !pr.receipt_entry_handled_by_employee : true
        )
        .map((pr) => ({
          value: pr.purchase_return_id,
          label: `PR #${pr.purchase_return_id ?? "—"}`,
        })),
    [purchaseReturns]
  );

  const employeeOptions = useMemo(
    () =>
      (employees || []).map((e) => ({
        value: e.employee_code,
        label: e.employee_name ?? e.employee_code,
        image_url: e.profile_img_url ?? null,
        designation: e.designation_name ?? e.designation?.name ?? null,
      })),
    [employees]
  );

  const initialValues = useMemo(() => {
    if ((isEditMode || isViewMode) && purchaseReturn) {
      return {
        handled_by: purchaseReturn.receipt_entry_handled_by ?? null,
        purchase_return_id: purchaseReturn.purchase_return_id ?? recordId,
      };
    }
    return {
      handled_by: null,
      purchase_return_id: null,
    };
  }, [isEditMode, isViewMode, purchaseReturn, recordId]);

  if ((isEditMode || isViewMode) && loadingRecord) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer title={getTitle()} fullWidth>
          <Flex justifyContent="center" p={8}>
            <Text>Loading...</Text>
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if ((isEditMode || isViewMode) && !purchaseReturn && !loadingRecord) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer title={getTitle()} fullWidth>
          <Flex flexDirection="column" gap={4} alignItems="center" p={8}>
            <Text>Purchase return not found</Text>
            <Link href="/purchase-return/receipt-entry">
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
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer title={getTitle()} fullWidth>
        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={VALIDATION_SCHEMA}
          onSubmit={handleFormSubmit}
        >
          {({ values, handleSubmit }) => (
            <ReceiptEntryFormContent
              employeeOptions={employeeOptions}
              purchaseReturnOptions={purchaseReturnOptions}
              selectedPurchaseReturnId={
                isEditMode || isViewMode ? recordId : values.purchase_return_id
              }
              values={values}
              handleSubmit={handleSubmit}
              isViewMode={isViewMode}
              isEditMode={isEditMode}
              preCheckAllSuppliers={isEditMode || isViewMode}
              allSuppliersCheckedRef={allSuppliersCheckedRef}
            />
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default ReceiptEntryForm;
