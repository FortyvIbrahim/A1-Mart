"use client";
import moment from "moment";

import usePurchaseAcknowledgmentById from "@/api/customHooks/usePurchaseAcknowledgmentById";
import usePurchaseReturns from "@/api/customHooks/usePurchaseReturns";
import {
  createPurchaseAcknowledgment,
  updatePurchaseAcknowledgment,
} from "@/api/helpers/purchaseAcknowledgment";
import useMasterList from "@/api/customHooks/useMasterList";

function normId(val) {
  if (val == null || val === "") return null;
  return String(val);
}

/** List of products (items) not yet delivered for the given supplier. Each item: { product_name, qty, pr_no, outlet_name }. */
function getUndeliveredProductsForSupplier(purchaseReturns, supplierId) {
  if (
    supplierId == null ||
    supplierId === "" ||
    !Array.isArray(purchaseReturns)
  )
    return [];
  const matchId = normId(supplierId);
  if (!matchId) return [];
  const list = [];
  for (const pr of purchaseReturns) {
    for (const emp of pr.employees || []) {
      for (const s of emp.suppliers || []) {
        if (normId(s.supplier_id ?? s.master_id) !== matchId) continue;
        const delivered = s.delivered;
        if (Array.isArray(delivered) && delivered.length > 0) continue;
        for (const it of s.items || []) {
          list.push({
            product_image_url:
              it.product?.image_url ??
              it.product?.product_image_url ??
              it.product_image_url ??
              null,
            product_name:
              it.product?.de_display_name ??
              it.product?.de_name ??
              it.product?.product_name ??
              it.item_name ??
              "—",
            qty: it.qty ?? "—",
            pr_no: it.pr_no ?? "—",
            outlet_name: it.outlet_name ?? it.outlet?.branch_name ?? "—",
          });
        }
      }
    }
  }
  return list;
}

/**
 * Build one entry per purchase return in list order (no grouping by pr_no).
 * Only PRs that have undelivered items for the given supplier are included.
 * Returns [ { pr_id, pr_no, boxesPending, items }, ... ] in purchaseReturns order.
 */
function getUndeliveredByPurchaseReturn(purchaseReturns, supplierId) {
  if (
    supplierId == null ||
    supplierId === "" ||
    !Array.isArray(purchaseReturns)
  )
    return [];
  const matchId = normId(supplierId);
  if (!matchId) return [];
  const result = [];
  for (const pr of purchaseReturns) {
    const items = [];
    let noOfBoxes = 0;
    for (const emp of pr.employees || []) {
      for (const s of emp.suppliers || []) {
        if (normId(s.supplier_id ?? s.master_id) !== matchId) continue;
        if (Array.isArray(s.delivered) && s.delivered.length > 0) continue;
        noOfBoxes += Number(s.no_of_boxes) || 0;
        for (const it of s.items || []) {
          items.push({
            product_image_url:
              it.product?.image_url ??
              it.product?.product_image_url ??
              it.product_image_url ??
              null,
            product_name:
              it.product?.de_display_name ??
              it.product?.de_name ??
              it.product?.product_name ??
              it.item_name ??
              "—",
            qty: it.qty ?? "—",
            pr_no: it.pr_no ?? "—",
            outlet_name: it.outlet_name ?? it.outlet?.branch_name ?? "—",
          });
        }
      }
    }
    if (items.length === 0) continue;
    const prId = pr.purchase_return_id ?? pr.id;
    const prNo = pr.pr_no ?? items[0]?.pr_no ?? "—";
    result.push({
      pr_id: prId,
      pr_no: prNo,
      boxesPending: noOfBoxes,
      items,
    });
  }
  return result;
}
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import AgGrid from "@/components/AgGrid";
import { Badge, Box, Button, Flex, Grid, Text, VStack } from "@chakra-ui/react";
import { Formik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { use, useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import * as Yup from "yup";

const PURCHASE_ACKNOWLEDGMENT_VALIDATION_SCHEMA = Yup.object().shape({
  supplier_id: Yup.number()
    .required("Supplier is required")
    .integer("Supplier ID must be an integer")
    .positive("Supplier ID must be positive"),
  invoice_no: Yup.string()
    .required("Invoice number is required")
    .max(255, "Invoice number must be less than 255 characters"),
  invoice_date: Yup.date()
    .required("Invoice date is required")
    .typeError("Please enter a valid date"),
  amount: Yup.number()
    .required("Amount is required")
    .min(0, "Amount must be greater than or equal to 0")
    .test(
      "decimal-places",
      "Amount must have at most 2 decimal places",
      (value) => !value || /^\d+(\.\d{1,2})?$/.test(value.toString())
    ),
});

const INITIAL_VALUES = {
  supplier_id: null,
  invoice_no: "",
  invoice_date: "",
  amount: "",
};

function PurchaseAcknowledgmentForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const purchaseAcknowledgmentId = mode[1];
  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  const { fetchData, purchaseAcknowledgment } = usePurchaseAcknowledgmentById(
    purchaseAcknowledgmentId ?? 0
  );
  const { masterList } = useMasterList();
  const { purchaseReturns } = usePurchaseReturns();
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);

  useEffect(() => {
    if (isEditMode || isViewMode) {
      fetchData();
    }
  }, [isEditMode, isViewMode]);

  useEffect(() => {
    if (purchaseAcknowledgment) {
      // Format invoice_date to YYYY-MM-DD for date input
      const formatDateForInput = (dateString) => {
        if (!dateString) return "";
        try {
          const date = new Date(dateString);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        } catch (error) {
          return dateString;
        }
      };

      setInitialValues({
        supplier_id: purchaseAcknowledgment.supplier_id || null,
        invoice_no: purchaseAcknowledgment.invoice_no || "",
        invoice_date: formatDateForInput(purchaseAcknowledgment.invoice_date),
        amount: purchaseAcknowledgment.amount?.toString() || "",
      });
    }
  }, [purchaseAcknowledgment]);

  const handleSubmit = (values) => {
    const submitData = {
      supplier_id: values.supplier_id,
      invoice_no: values.invoice_no.trim(),
      invoice_date: values.invoice_date,
      amount: parseFloat(values.amount),
    };

    // For update, only include fields that are not empty/null
    if (isEditMode) {
      const updateData = {};
      if (
        submitData.supplier_id !== null &&
        submitData.supplier_id !== undefined
      ) {
        updateData.supplier_id = submitData.supplier_id;
      }
      if (submitData.invoice_no) {
        updateData.invoice_no = submitData.invoice_no;
      }
      if (submitData.invoice_date) {
        updateData.invoice_date = submitData.invoice_date;
      }
      if (
        submitData.amount !== null &&
        submitData.amount !== undefined &&
        submitData.amount !== ""
      ) {
        updateData.amount = submitData.amount;
      }

      toast.promise(
        updatePurchaseAcknowledgment(purchaseAcknowledgmentId, updateData),
        {
          loading: "Updating Purchase Acknowledgment!",
          success: (data) => {
            if (data.code === 200) {
              router.push("/purchase-acknowledgment");
              return "Successfully Updated Purchase Acknowledgment!";
            } else if (data.code === 400) {
              throw new Error(data.message);
            }
            throw data;
          },
          error: (err) => {
            console.log(err);
            return (
              err.message ||
              err.error ||
              "Error Updating Purchase Acknowledgment!"
            );
          },
        }
      );
    } else {
      toast.promise(createPurchaseAcknowledgment(submitData), {
        loading: "Creating Purchase Acknowledgment!",
        success: (data) => {
          if (data.code === 200) {
            router.push("/purchase-acknowledgment");
            return "Successfully Created Purchase Acknowledgment!";
          } else if (data.code === 400) {
            throw new Error(data.message);
          }
          throw data;
        },
        error: (err) => {
          console.log(err);
          return (
            err.message ||
            err.error ||
            "Error Creating Purchase Acknowledgment!"
          );
        },
      });
    }
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_purchase_acknowledgment";
    }
    return "view_purchase_acknowledgment";
  };

  const getTitle = () => {
    if (isCreateMode) {
      return "Create Purchase Acknowledgment";
    }
    if (isEditMode) {
      return "Edit Purchase Acknowledgment";
    }
    return "View Purchase Acknowledgment";
  };

  const supplierOptions = useMemo(() => {
    return masterList
      .filter((item) => item.person_type === 1) // Filter out items without master_id
      .map((item) => ({
        value: item.master_id,
        label: item.name || `Supplier ${item.master_id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [masterList]);

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer
        pageForm
        backHref="/purchase-acknowledgment"
        title={getTitle()}
      >
        <Formik
          initialValues={initialValues}
          validationSchema={PURCHASE_ACKNOWLEDGMENT_VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit, values }) => {
            const undeliveredByPR = getUndeliveredByPurchaseReturn(
              purchaseReturns,
              values.supplier_id
            );
            return (
              <Box>
                <Flex flexDirection="column" gap="22px">
                  <Grid templateColumns="repeat(2, 1fr)" gap="22px">
                    <CustomInput
                      label="Supplier"
                      placeholder="Select supplier..."
                      name="supplier_id"
                      method="searchable-dropdown"
                      options={supplierOptions}
                      isRequired={isCreateMode}
                      viewOnly={isViewMode}
                    />

                    <CustomInput
                      label="Invoice Number"
                      placeholder="Enter invoice number..."
                      name="invoice_no"
                      method="text"
                      type="text"
                      isRequired={isCreateMode}
                      viewOnly={isViewMode}
                    />
                  </Grid>

                  <Grid templateColumns="repeat(2, 1fr)" gap="22px">
                    <CustomInput
                      label="Invoice Date"
                      placeholder="Select date"
                      name="invoice_date"
                      method="date-picker"
                      type="date"
                      isRequired={isCreateMode}
                      viewOnly={isViewMode}
                    />

                    <CustomInput
                      label="Amount"
                      placeholder="Enter amount..."
                      name="amount"
                      method="text"
                      type="number"
                      isRequired={isCreateMode}
                      viewOnly={isViewMode}
                      viewFormatter={(v) =>
                        v == null || v === ""
                          ? "-"
                          : `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      }
                    />
                  </Grid>

                  {isViewMode && purchaseAcknowledgment && (
                    <Grid templateColumns="repeat(2, 1fr)" gap="22px">
                      {[
                        ["Created At", purchaseAcknowledgment.created_at],
                        ["Updated At", purchaseAcknowledgment.updated_at],
                      ].map(([label, v]) => (
                        <VStack key={label} align="start" gap="4px">
                          <Text fontSize="11px" lineHeight="14px" color="#C95C18">
                            {label}
                          </Text>
                          <Text fontSize="13px" lineHeight="18px" fontWeight="500" color="fg">
                            {v ? moment(v).format("DD/MM/YYYY, h:mm:ss A") : "-"}
                          </Text>
                        </VStack>
                      ))}
                    </Grid>
                  )}
                </Flex>
                {!isViewMode &&
                  values.supplier_id != null &&
                  values.supplier_id !== "" &&
                  undeliveredByPR.length > 0 && (
                    <CustomContainer pageForm
                      title="Products still awaiting return for the selected supplier"
                      size="sm"
                      containerStyle={{ mt: "22px" }}
                      color="red"
                    >
                      <VStack align="stretch" gap="22px">
                        {undeliveredByPR.map((prGroup, index) => (
                          <Box
                            key={`pr-${prGroup.pr_id ?? index}`}
                            borderWidth="0.1px"
                            borderColor="red.100"
                            borderRadius="8px"
                            p="16px"
                            bg="red.50"
                            borderStyle="solid"
                          >
                            <Flex
                              align="center"
                              justify="space-between"
                              mb="12px"
                            >
                              <Text
                                fontSize="sm"
                                fontWeight="medium"
                                color="red.800"
                              >
                                Purchase Return: PR#{prGroup.pr_id}
                              </Text>
                              <Badge colorPalette="purple">
                                {prGroup.boxesPending} box
                                {prGroup.boxesPending !== 1 ? "es" : ""} pending
                              </Badge>
                            </Flex>
                            <AgGrid
                              colorPalette="red"
                              rowData={prGroup.items}
                              columnDefs={[
                                {
                                  field: "product_image_url",
                                  headerName: "Image",
                                  type: "image",
                                },
                                {
                                  field: "product_name",
                                  headerName: "Product",
                                  flex: 1,
                                  minWidth: 160,
                                },
                                { field: "qty", headerName: "Qty", width: 90 },
                                {
                                  field: "pr_no",
                                  headerName: "PR No",
                                  width: 100,
                                },
                                {
                                  field: "outlet_name",
                                  headerName: "Outlet",
                                  flex: 1,
                                  minWidth: 120,
                                },
                              ]}
                              tableKey={`purchase-ack-undelivered-pr-${
                                prGroup.pr_id ?? index
                              }`}
                              pagination={prGroup.items.length > 10}
                              gridOptions={{
                                domLayout: "normal",
                                headerHeight: 36,
                                rowHeight: 36,
                              }}
                            />
                          </Box>
                        ))}
                      </VStack>
                    </CustomContainer>
                  )}
                <Flex gap="12px" justifyContent="flex-end" mt="24px">
                  <Link href="/purchase-acknowledgment">
                    <Button variant="subtle">
                      {isViewMode ? "Back" : "Cancel"}
                    </Button>
                  </Link>
                  {(isCreateMode || isEditMode) && (
                    <Button onClick={handleSubmit}>
                      {isCreateMode ? "Create" : "Update"}
                    </Button>
                  )}
                </Flex>
              </Box>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseAcknowledgmentForm;
