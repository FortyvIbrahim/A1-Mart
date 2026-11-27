"use client";

import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import FileUploaderWithColumnMapping from "@/components/FileUploaderWithColumnMapping";
import AgGrid from "@/components/AgGrid";
import { Button, Flex, Box, Text, Badge, Grid } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { use, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import useWMSPurchaseEntryById from "@/api/customHooks/useWMSPurchaseEntryById";
import {
  createWMSPurchaseEntry,
  updateWMSPurchaseEntry,
} from "@/api/helpers/wms_purchase_entry";
import { uploadAsset } from "@/api/helpers/assets";
import usePurchaseAcknowledgments from "@/api/customHooks/usePurchaseAcknowledgments";
import useEmployee from "@/api/customHooks/useEmployee";
import useProducts from "@/api/customHooks/useProducts";
import {
  PurchaseAckGRNOptionRenderer,
  PurchaseAcknowledgmentOptionRenderer,
  createPurchaseAcknowledgmentOptions,
} from "@/components/PurchaseAcknowledgment";
import { capitalizeWords } from "@/utils/string";
import moment from "moment";
import { FormatNumber } from "@chakra-ui/react";
import useGRNs from "@/api/customHooks/useGRNs";
import GRNDetails from "@/components/PurchaseAcknowledgment/GRNDetails";
import { SKU_TYPES } from "@/constants/sku_mode";

const SummaryRow = ({ label, value }) => {
  return (
    <Flex justifyContent="space-between" alignItems="center" gap="32px">
      <Text fontSize="sm" color="gray.600">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="bold">
        {value}
      </Text>
    </Flex>
  );
};

const SummaryData = ({ items, totalAmount, totalQty }) => {
  const replnTotals = items.reduce((totals, item) => {
    if (totals[item.repln_mode]) {
      totals[item.repln_mode] += item.qty;
    } else {
      totals[item.repln_mode] = item.qty;
    }
    return totals;
  }, {});

  const replnCount = items.reduce((totals, item) => {
    if (totals[item.repln_mode]) {
      totals[item.repln_mode] += 1;
    } else {
      totals[item.repln_mode] = 1;
    }
    return totals;
  }, {});

  return (
    <Flex justifyContent="flex-end">
      <CustomContainer pageForm
        title="Summary"
        size="sm"
        color="secondary"
        containerStyle={{
          marginTop: "22px",
          width: { base: "100%", md: "400px" },
        }}
      >
        <Flex flexDirection="column" gap="22px">
          {Object.entries(replnTotals).map(([repln_mode, qty]) => (
            <SummaryRow
              key={repln_mode}
              label={`${SKU_TYPES[repln_mode]?.label} Quantity (${replnCount[repln_mode]})`}
              value={qty.toFixed(2)}
            />
          ))}

          <Box borderTop="1px solid #e0e0e0" />

          <SummaryRow label="Total Quantity" value={totalQty.toFixed(2)} />
          <SummaryRow
            label="Total Amount"
            value={
              <FormatNumber
                value={totalAmount}
                style="currency"
                currency="INR"
              />
            }
          />
        </Flex>
      </CustomContainer>
    </Flex>
  );
};

const VALIDATION_SCHEMA = Yup.object({
  purchase_acknowledgment_id: Yup.number()
    .transform((value, originalValue) => {
      if (
        originalValue === "" ||
        originalValue === null ||
        originalValue === undefined
      ) {
        return undefined;
      }
      return Number(originalValue);
    })
    .required("Required")
    .integer("Must be an integer")
    .positive("Must be positive"),
  handled_by: Yup.string().required("Required"),
  invoice_amount: Yup.number()
    .typeError("Must be a number")
    .min(0, "Must be at least 0")
    .required("Required"),
  is_job_entry_needed: Yup.boolean(),
  is_credit_need_available: Yup.boolean(),
  credit_note_link: Yup.mixed().when("is_credit_need_available", {
    is: true,
    then: (schema) =>
      schema.required(
        "Credit note file is required when credit need is available"
      ),
    otherwise: (schema) => schema.nullable(),
  }),
});

const INITIAL_VALUES = {
  purchase_acknowledgment_id: "",
  handled_by: "",
  invoice_amount: 0,
  fileItems: [],
  is_job_entry_needed: false,
  is_credit_need_available: false,
  credit_note_link: null,
};

export default function WMSPurchaseEntryForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const wmsPurchaseEntryId = mode[1];
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const [mappedFileData, setMappedFileData] = useState([]);
  const [productMap, setProductMap] = useState({});

  const { wmsPurchaseEntry, loading } =
    useWMSPurchaseEntryById(wmsPurchaseEntryId);
  const { purchaseAcknowledgments } = usePurchaseAcknowledgments();
  const { employees } = useEmployee({ allBranches: true });
  const { products } = useProducts();
  const { grns } = useGRNs();

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  // Create a map of products by product_id for quick lookup
  useEffect(() => {
    if (products && products.length > 0) {
      const map = {};
      products.forEach((product) => {
        // Map by product_id (assuming code in xlsx is product_id)
        const productId = product.product_id;
        map[productId] = product;
        map[String(productId)] = product;
        // Also map by product_code if it exists
        if (product.product_code) {
          map[product.product_code] = product;
          map[String(product.product_code)] = product;
        }
      });
      setProductMap(map);
    }
  }, [products]);

  // Update is_new_product flags when productMap changes (only if we have file data)
  useEffect(() => {
    if (mappedFileData.length > 0 && Object.keys(productMap).length > 0) {
      const updatedData = mappedFileData.map((item) => {
        const itemCode = item.item_code;
        const productId = parseInt(itemCode);
        const product =
          productMap[productId] ||
          productMap[String(productId)] ||
          productMap[itemCode];
        const is_new_product = !product;

        return {
          ...item,
          is_new_product: is_new_product,
          repln_mode: product?.repln_mode || null,
        };
      });
      // Only update if there's a change to avoid unnecessary re-renders
      const hasChange = updatedData.some(
        (item, idx) =>
          item.is_new_product !== mappedFileData[idx]?.is_new_product
      );
      if (hasChange) {
        setMappedFileData(updatedData);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productMap, mappedFileData]);

  // Load existing data for edit/view mode
  useEffect(() => {
    if ((isEditMode || isViewMode) && wmsPurchaseEntry) {
      // Transform items from API response to display format
      const itemsForDisplay = (wmsPurchaseEntry.items || []).map((item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        // Rate is stored as total amount, so use it directly
        const amount = rate;

        return {
          item_code: item.product_id?.toString() || "",
          item_name: item.product_name || item.product?.product_name || "",
          qty: quantity,
          amount: amount,
          is_new_product: item.is_new_product || false,
          repln_mode: item.repln_mode || null,
        };
      });

      setMappedFileData(itemsForDisplay);
      const hasCreditNote =
        wmsPurchaseEntry.credit_note_link != null &&
        wmsPurchaseEntry.credit_note_link !== "";
      setInitialValues({
        purchase_acknowledgment_id:
          wmsPurchaseEntry.purchase_acknowledgment_id || "",
        handled_by: wmsPurchaseEntry.handled_by || "",
        invoice_amount: wmsPurchaseEntry.invoice_amount || 0,
        fileItems: itemsForDisplay,
        is_job_entry_needed:
          wmsPurchaseEntry.is_job_entry_needed === 1 || false,
        is_credit_need_available: hasCreditNote,
        credit_note_link: wmsPurchaseEntry.credit_note_link || null,
      });
    }
  }, [isEditMode, isViewMode, wmsPurchaseEntry]);

  const getTitle = () => {
    if (isCreateMode) {
      return "Create WMS Purchase Entry";
    }
    if (isEditMode) {
      return "Edit WMS Purchase Entry";
    }
    return `WMS Purchase Entry : #${wmsPurchaseEntryId ?? ""}`;
  };

  // Calculate total from file items
  const calculateFileTotal = useMemo(() => {
    if (!mappedFileData || mappedFileData.length === 0) return 0;
    return mappedFileData.reduce((total, item) => {
      const amount = parseFloat(item.amount) || 0;
      return total + amount;
    }, 0);
  }, [mappedFileData]);

  // Calculate total quantity from file items
  const calculateFileTotalQty = useMemo(() => {
    if (!mappedFileData || mappedFileData.length === 0) return 0;
    return mappedFileData.reduce((total, item) => {
      const qty = parseFloat(item.qty) || 0;
      return total + qty;
    }, 0);
  }, [mappedFileData]);

  // Get selected purchase acknowledgment
  const selectedPurchaseAcknowledgment = useMemo(() => {
    if (!purchaseAcknowledgments || purchaseAcknowledgments.length === 0)
      return null;
    return purchaseAcknowledgments.find(
      (pa) =>
        pa.purchase_acknowledgment_id ===
        parseInt(initialValues.purchase_acknowledgment_id)
    );
  }, [purchaseAcknowledgments, initialValues.purchase_acknowledgment_id]);

  // Employee options
  const employeeOptions = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    return employees
      .filter((emp) => !emp.terminated)
      .map((emp) => ({
        value: emp.employee_code,
        label: `${emp.employee_name} (${emp.employee_code})`,
      }));
  }, [employees]);

  // Purchase acknowledgment options
  const purchaseAcknowledgmentOptions = useMemo(() => {
    return createPurchaseAcknowledgmentOptions(
      purchaseAcknowledgments.filter((item) => {
        return (
          (isCreateMode &&
            item.status_counts.done +
              item.status_counts.cancelled +
              item.status_counts.open +
              item.status_counts.in_progress ===
              0 &&
            item.has_grn &&
            item.purchase_entry_id === null &&
            item.purchase_order_id === null) ||
          isEditMode ||
          isViewMode
        );
      }),
      "purchase_entry"
    );
  }, [purchaseAcknowledgments]);

  // Clear file data
  const handleClearFileData = () => {
    setMappedFileData([]);
    setInitialValues((prev) => ({
      ...prev,
      fileItems: [],
      invoice_amount: 0,
    }));
  };

  const handleSubmit = async (values) => {
    try {
      // Transform mappedFileData to items array (for both create and update)
      const items = mappedFileData
        .filter((item) => item.item_code && item.qty && item.amount)
        .map((item) => {
          const qty = parseFloat(item.qty) || 0;
          const amount = parseFloat(item.amount) || 0;
          // Store amount directly as rate (no conversion)
          const productId = parseInt(item.item_code);

          const itemData = {
            product_id: productId,
            quantity: Math.round(qty),
            rate: parseFloat(amount.toFixed(2)),
          };

          // Add is_new_product if it exists
          if (item.is_new_product !== undefined) {
            itemData.is_new_product = item.is_new_product;
          }

          // Add product_name if is_new_product is true
          if (item.is_new_product && item.item_name) {
            itemData.product_name = item.item_name;
          }

          return itemData;
        })
        .filter((item) => item.product_id); // Remove items without product_id

      if (items.length === 0) {
        toast.error("No valid items found");
        return;
      }

      let credit_note_link = null;
      if (values.is_credit_need_available && values.credit_note_link) {
        if (typeof values.credit_note_link === "string") {
          credit_note_link = values.credit_note_link;
        } else {
          const toastId = toast.loading("Uploading credit note file...");
          try {
            const response = await uploadAsset(
              values.credit_note_link,
              `credit_note_${
                values.purchase_acknowledgment_id ||
                wmsPurchaseEntryId ||
                Date.now()
              }`,
              "wms-purchase-entry",
              "file"
            );
            toast.dismiss(toastId);
            if (response.code === 200) {
              credit_note_link = response.remoteUrl;
            } else {
              throw new Error(response.message || "Failed to upload file");
            }
          } catch (err) {
            toast.dismiss(toastId);
            toast.error("Error uploading credit note file!");
            throw err;
          }
        }
      }

      const data = {
        purchase_acknowledgment_id: parseInt(values.purchase_acknowledgment_id),
        invoice_amount: parseFloat(values.invoice_amount),
        handled_by: values.handled_by,
        is_job_entry_needed: values.is_job_entry_needed || false,
        credit_note_link: credit_note_link,
        items: items,
      };

      const promise = isCreateMode
        ? createWMSPurchaseEntry(data)
        : updateWMSPurchaseEntry(wmsPurchaseEntryId, data);

      toast.promise(promise, {
        loading: isCreateMode
          ? "Creating WMS purchase entry..."
          : "Updating WMS purchase entry...",
        success: (response) => {
          if (response.code === 200 || response.code === 201) {
            router.push("/wms/purchase-entry");
            return isCreateMode
              ? "WMS purchase entry created successfully!"
              : "WMS purchase entry updated successfully!";
          } else {
            throw new Error(response.message || "Failed to save");
          }
        },
        error: (err) => {
          console.error(err);
          return err.message || "Error saving WMS purchase entry!";
        },
      });
    } catch (err) {
      console.error(err);
      toast.error("Error saving WMS purchase entry!");
    }
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_wms_purchase_entry";
    }
    return "view_wms_purchase_entry";
  };

  // Target columns for file mapping - only the required ones
  const targetColumns = [
    {
      key: "item_code",
      label: "Item Code",
      required: true,
      suggestedKey: "item code",
    },
    {
      key: "item_name",
      label: "Item Name",
      required: true,
      suggestedKey: "item name",
    },
    { key: "qty", label: "Qty", required: true, suggestedKey: "qty" },
    { key: "amount", label: "Amount", required: true, suggestedKey: "amount" },
  ];

  // AgGrid column definitions for file items
  const fileItemsColDefs = useMemo(
    () => [
      {
        field: "item_code",
        headerName: "Item Code",
        type: "id",
      },
      {
        field: "item_name",
        headerName: "Item Name",
        cellRenderer: (props) => (
          <Flex gap="8px" alignItems="center">
            <Text>{capitalizeWords(props.value || "-")}</Text>
            {props.data?.is_new_product && (
              <Badge colorPalette="green" size="xs">
                New
              </Badge>
            )}
          </Flex>
        ),
      },
      {
        field: "repln_mode",
        headerName: "Repln Mode",
        type: "badge-column",
        valueGetter: (props) => {
          const replnMode = props.data.repln_mode || null;
          return {
            label: SKU_TYPES[replnMode]?.label || "UNSET",
            colorScheme: SKU_TYPES[replnMode].colorPalette || "gray",
          };
        },
      },
      {
        field: "qty",
        headerName: "Qty",
        cellRenderer: (props) => {
          const qty = parseFloat(props.value || 0);
          return qty.toFixed(2);
        },
        valueGetter: (props) => parseFloat(props.data.qty || 0),
      },
      {
        field: "amount",
        headerName: "Amount",
        cellRenderer: (props) => (
          <FormatNumber
            value={parseFloat(props.value || 0)}
            style="currency"
            currency="INR"
          />
        ),
        valueGetter: (props) => parseFloat(props.data.amount || 0),
      },
    ],
    []
  );

  if (loading && (isEditMode || isViewMode)) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer pageForm title={getTitle()}>
          <Text>Loading...</Text>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const dataParsed = mappedFileData.length > 0;

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer pageForm title={getTitle()}>
        <Formik
          initialValues={initialValues}
          validationSchema={VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit, values, setFieldValue }) => {
            const selectedGRN = grns.find(
              (grn) =>
                grn.purchase_acknowledgment_id ===
                values.purchase_acknowledgment_id
            );

            // Handle file data mapping
            const handleDataMapped = (mappedData) => {
              const filteredData = mappedData.filter((item) => item.item_code);
              setMappedFileData(filteredData);
              const totalAmount = filteredData.reduce((sum, item) => {
                return sum + (parseFloat(item.amount) || 0);
              }, 0);
              setFieldValue("fileItems", filteredData);
              setFieldValue("invoice_amount", totalAmount);
            };

            return (
              <Flex flexDirection="column" gap="22px">
                <Flex gap="22px" flexDirection="column">
                  <CustomInput
                    label="GRN"
                    placeholder="Select GRN Entry ID..."
                    name="purchase_acknowledgment_id"
                    method="searchable-dropdown"
                    options={purchaseAcknowledgmentOptions}
                    customRender={PurchaseAckGRNOptionRenderer}
                    isRequired
                    viewOnly={isViewMode}
                  />

                  <GRNDetails grn={selectedGRN} />

                  <CustomInput
                    label="Purchase Entry By"
                    placeholder="Select employee..."
                    name="handled_by"
                    method="searchable-dropdown"
                    options={employeeOptions}
                    isRequired
                    viewOnly={isViewMode}
                  />

                  <CustomInput
                    label="Is Job Entry Needed?"
                    name="is_job_entry_needed"
                    method="radio"
                    options={[
                      { value: true, label: "Yes" },
                      { value: false, label: "No" },
                    ]}
                    viewOnly={isViewMode}
                  />

                  <CustomInput
                    label="Is Credit Note Available?"
                    name="is_credit_need_available"
                    method="radio"
                    options={[
                      { value: true, label: "Yes" },
                      { value: false, label: "No" },
                    ]}
                    viewOnly={isViewMode}
                    onChange={(value) => {
                      if (!value) setFieldValue("credit_note_link", null);
                    }}
                  />

                  {values.is_credit_need_available && (
                    <CustomInput
                      label="Credit Note File"
                      name="credit_note_link"
                      method="file"
                      isRequired={
                        isCreateMode && values.is_credit_need_available
                      }
                      viewOnly={isViewMode}
                      accept="*/*"
                    />
                  )}
                </Flex>

                {/* File Items Display and Total Validation */}
                {(dataParsed || isViewMode || isEditMode) &&
                  mappedFileData.length > 0 && (
                    <>
                      <CustomContainer pageForm
                        title="Items"
                        size="sm"
                        color="secondary"
                        rightSection={
                          !isViewMode && (
                            <Button
                              colorPalette="red"
                              variant="subtle"
                              size="xs"
                              onClick={handleClearFileData}
                            >
                              Clear Data
                            </Button>
                          )
                        }
                      >
                        <AgGrid
                          rowData={mappedFileData}
                          columnDefs={fileItemsColDefs}
                          defaultRows={10}
                          tableKey="wms-purchase-entry-file-items"
                        />

                        <SummaryData
                          items={mappedFileData}
                          totalAmount={calculateFileTotal}
                          totalQty={calculateFileTotalQty}
                        />
                      </CustomContainer>
                    </>
                  )}

                {!dataParsed && (
                  <Box>
                    <Text mb="8px" fontSize="sm" fontWeight="semibold">
                      Upload Purchase Entry File (XLSX/CSV)
                    </Text>
                    <Text mb="16px" fontSize="xs" color="gray.600">
                      Upload a file with columns: Item Code, Item Name, Qty,
                      Amount
                    </Text>
                    <Flex gap={4} alignItems="flex-start">
                      <Box flex={1}>
                        <FileUploaderWithColumnMapping
                          targetColumns={targetColumns}
                          onDataMapped={handleDataMapped}
                          disabled={dataParsed}
                          fileUploaderProps={{
                            color: "brand",
                            size: "md",
                            showClipboardButton: false,
                          }}
                        />
                      </Box>
                    </Flex>
                  </Box>
                )}

                <Flex gap="12px" justifyContent="flex-end">
                  <Link href="/wms/purchase-entry">
                    <Button variant="outline">{isViewMode ? "Back" : "Cancel"}</Button>
                  </Link>
                  {!isViewMode && (
                    <Button onClick={handleSubmit}>
                      {isCreateMode ? "Create" : "Update"}
                    </Button>
                  )}
                </Flex>
              </Flex>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}
