"use client";

import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import FormErrors from "@/components/FormErrors";
import GlobalWrapper from "@/components/GlobalWrapper";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Grid,
  HStack,
  IconButton,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FaTrash } from "react-icons/fa";
import { FieldArray, Formik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import usePurchaseOrders from "@/api/customHooks/usePurchaseOrders";
import usePurchaseEntryById from "@/api/customHooks/usePurchaseEntryById";
import useMasterList from "@/api/customHooks/useMasterList";
import useMaterials from "@/api/customHooks/useMaterials";
import {
  createPurchaseEntry,
  updatePurchaseEntry,
} from "@/api/helpers/purchase_entry";
import { uploadAsset } from "@/api/helpers/assets";
import { capitalizeWords } from "@/utils/string";
import toast from "react-hot-toast";
import Image from "next/image";
import EmptyImage from "@/components/EmptyImage";
import { renderPOOption } from "@/app/wms/grn/[...mode]/page";

const VALIDATION_SCHEMA = Yup.object({
  purchase_order_id: Yup.string().required("Required"),
  invoice_no: Yup.string().required("Required"),
  invoice_date: Yup.date()
    .nullable()
    .required("Required")
    .test("not-future", "Cannot be in the future", function (value) {
      if (!value) return true;
      const invoiceDate = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return invoiceDate <= today;
    }),
  invoice_file: Yup.mixed()
    .nullable()
    .test("fileType", "File must be an image or PDF", (value) => {
      if (!value) return true; // Optional field
      if (typeof value === "string") return true; // Already uploaded file
      const file = value;
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
      ];
      return validTypes.includes(file.type);
    }),
  accounts_file: Yup.mixed()
    .nullable()
    .test("fileType", "File must be an image or PDF", (value) => {
      if (!value) return true; // Optional field
      if (typeof value === "string") return true; // Already uploaded file
      const file = value;
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
      ];
      return validTypes.includes(file.type);
    }),
  items: Yup.array()
    .min(1, "At least one item is required")
    .of(
      Yup.object({
        purchase_order_item_id: Yup.number().nullable(),
        material_id: Yup.number().required("Required"),
        quantity: Yup.number()
          .required("Required")
          .typeError("Must be a number")
          .positive("Cannot be negative"),
        rate: Yup.number()
          .required("Required")
          .typeError("Must be a number")
          .positive("Cannot be negative"),
      })
    ),
  discount: Yup.number()
    .nullable()
    .typeError("Must be a number")
    .min(0, "Cannot be negative")
    .max(100, "Cannot exceed 100%"),
  tax: Yup.number().nullable(),
  adjustment: Yup.number().nullable().typeError("Must be a number"),
});

const INITIAL_VALUES = {
  vendor_id: "", // Display only - set from PO
  purchase_order_id: "",
  invoice_no: "",
  invoice_date: null,
  invoice_file: null,
  accounts_file: null,
  items: [],
  discount: "",
  tax: "",
  adjustment: "",
};

export default function PurchaseEntryForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const purchaseEntryId = mode[1];
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);

  const { purchaseOrders } = usePurchaseOrders();
  const { purchaseEntry } = usePurchaseEntryById(purchaseEntryId);
  const { masterList } = useMasterList();
  const { materials: materialsUnfiltered } = useMaterials({ withRate: true });

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  const [accountEntryDone, setAccountEntryDone] = useState(isCreateMode ? false : true);

  // Format vendors for dropdown
  const vendorOptions = useMemo(() => {
    return masterList
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => ({
        value: item.master_id,
        label: capitalizeWords(item.name),
      }));
  }, [masterList]);

  // Helper function to calculate PO total
  const calculatePOTotal = (items) => {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      return sum + quantity * rate;
    }, 0);
  };

  // Format purchase orders for dropdown with total calculation
  const allPOOptions = useMemo(() => {
    return purchaseOrders
      .filter(
        (po) =>
          po.status === "approved" &&
          ((isCreateMode && !po.pe_created) || isEditMode || isViewMode)
      )
      .map((po) => ({
        value: String(po.purchase_order_id),
        label: po.purchase_order_ref || `PO-${po.purchase_order_id}`,
        purchase_order_ref: po.purchase_order_ref,
        purchase_order_id: po.purchase_order_id,
        vendor_id: String(po.vendor_id || ""),
        vendor_name: po.vendor?.name || "",
        tax: String(po.tax || ""),
        discount: String(po.discount || ""),
        adjustment: String(po.adjustment || ""),
        total: calculatePOTotal(po.items),
        items: po.items || [],
        has_grn_entry: po.has_grn_entry || false,
      }));
  }, [purchaseOrders]);

  // Filter PO options by selected vendor
  const poOptions = useMemo(() => {
    // This will be filtered in the form based on selected vendor_id
    return allPOOptions;
  }, [allPOOptions]);

  // Populate initial values from purchase entry (for edit/view mode)
  useEffect(() => {
    if (
      (isEditMode || isViewMode) &&
      purchaseEntry &&
      materialsUnfiltered.length > 0
    ) {
      setInitialValues({
        vendor_id: purchaseEntry.vendor?.master_id
          ? String(purchaseEntry.vendor.master_id)
          : "",
        purchase_order_id: purchaseEntry.purchase_order_id
          ? String(purchaseEntry.purchase_order_id)
          : "",
        invoice_no: purchaseEntry.invoice_no || "",
        invoice_date: purchaseEntry.invoice_date
          ? new Date(purchaseEntry.invoice_date)
          : null,
        invoice_file: purchaseEntry.invoice_file || null,
        accounts_file: purchaseEntry.accounts_file || null,
        items:
          purchaseEntry.items && purchaseEntry.items.length > 0
            ? purchaseEntry.items.map((item) => {
              const material = materialsUnfiltered.find(
                (mat) => mat.material_id === item.material_id
              );
              return {
                purchase_order_item_id: item.purchase_entry_item_id,
                material_id: item.material_id,
                quantity: String(item.quantity || ""),
                rate: String(item.rate || ""),
                image_url: item.material?.image_url || null,
                material_name: item.material?.name || "",
                tax_percentage:
                  material?.tax_percentage ||
                  item.material?.tax_percentage ||
                  0,
              };
            })
            : [],
        discount: String(purchaseEntry.discount || ""),
        tax: String(purchaseEntry.tax || ""),
        adjustment: String(purchaseEntry.adjustment || ""),
      });
    }
  }, [isEditMode, isViewMode, purchaseEntryId, materialsUnfiltered.length]);

  const getTitle = () => {
    if (isCreateMode) {
      return "Add Purchase Entry";
    }
    if (isEditMode) {
      return "Edit Purchase Entry";
    }
    return "Purchase Entry";
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      // Handle invoice_file upload
      let invoice_file = null;

      if (values.invoice_file) {
        if (typeof values.invoice_file === "string") {
          // Already uploaded file (URL string)
          invoice_file = values.invoice_file;
        } else {
          // New file to upload
          const toastId = toast.loading("Uploading invoice file...");
          try {
            const response = await uploadAsset(
              values.invoice_file,
              values.invoice_file.name,
              "purchase-entry",
              "file"
            );
            toast.dismiss(toastId);
            if (response.code === 200) {
              invoice_file = response.remoteUrl;
            } else {
              throw new Error(response.message || "Failed to upload file");
            }
          } catch (err) {
            toast.dismiss(toastId);
            toast.error("Error uploading invoice file!");
            setSubmitting(false);
            throw err;
          }
        }
      }

      // Handle accounts_file upload
      let accounts_file = null;

      if (values.accounts_file) {
        if (typeof values.accounts_file === "string") {
          // Already uploaded file (URL string)
          accounts_file = values.accounts_file;
        } else {
          // New file to upload
          const toastId = toast.loading("Uploading accounts file...");
          try {
            const response = await uploadAsset(
              values.accounts_file,
              values.accounts_file.name,
              "purchase-entry",
              "file"
            );
            toast.dismiss(toastId);
            if (response.code === 200) {
              accounts_file = response.remoteUrl;
            } else {
              throw new Error(response.message || "Failed to upload file");
            }
          } catch (err) {
            toast.dismiss(toastId);
            toast.error("Error uploading accounts file!");
            setSubmitting(false);
            throw err;
          }
        }
      }

      // Calculate tax from items
      const calculateTaxFromItems = () => {
        return values.items.reduce((total, item) => {
          const quantity = parseFloat(item.quantity) || 0;
          const rate = parseFloat(item.rate) || 0;
          const taxPercentage = parseFloat(item.tax_percentage) || 0;
          return total + (quantity * rate * taxPercentage) / 100;
        }, 0);
      };

      const postData = {
        purchase_order_id: values.purchase_order_id
          ? parseInt(values.purchase_order_id)
          : null,
        invoice_no: values.invoice_no || null,
        invoice_date: values.invoice_date
          ? new Date(values.invoice_date).toISOString().split("T")[0]
          : null,
        invoice_file: invoice_file,
        accounts_file: accounts_file,
        discount: parseFloat(values.discount || 0),
        tax: calculateTaxFromItems(),
        adjustment: parseFloat(values.adjustment || 0),
        items: values.items
          .filter((item) => item.material_id && item.quantity && item.rate)
          .map((item) => ({
            material_id: parseInt(item.material_id),
            quantity: parseInt(item.quantity),
            rate: parseFloat(item.rate),
          })),
      };

      const promise = isCreateMode
        ? createPurchaseEntry(postData)
        : updatePurchaseEntry(purchaseEntryId, postData);

      toast.promise(promise, {
        loading: isCreateMode
          ? "Creating purchase entry..."
          : "Updating purchase entry...",
        success: (response) => {
          if (response.code === 200 || response.code === 201) {
            router.push("/purchase-entry");
            return (
              response.message ||
              (isCreateMode
                ? "Purchase entry created successfully!"
                : "Purchase entry updated successfully!")
            );
          } else {
            throw new Error(
              response.msg || response.message || "Error saving purchase entry"
            );
          }
        },
        error: (err) => {
          return (
            err.response?.data?.msg ||
            err.msg ||
            err.message ||
            "Error saving purchase entry!"
          );
        },
      });
    } catch (err) {
      console.error(err);
      toast.error("Error saving purchase entry!");
      setSubmitting(false);
    }
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_purchase_entry";
    }
    return "view_purchase_entry";
  };

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer title={getTitle()}>
        <Formik
          initialValues={initialValues}
          validationSchema={VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({
            handleSubmit: formikHandleSubmit,
            values,
            errors,
            setFieldValue,
          }) => {
            // Helper functions
            const calculateItemAmount = (item) => {
              const quantity = parseFloat(item.quantity) || 0;
              const rate = parseFloat(item.rate) || 0;
              return quantity * rate;
            };

            const getSubTotal = () => {
              return values.items.reduce(
                (total, item) => total + calculateItemAmount(item),
                0
              );
            };

            const getDiscountAmount = () => {
              const subTotal = getSubTotal();
              const discount = parseFloat(values.discount) || 0;
              return (subTotal * discount) / 100;
            };

            const getItemTax = (item) => {
              const quantity = parseFloat(item.quantity) || 0;
              const rate = parseFloat(item.rate) || 0;
              const taxPercentage = parseFloat(item.tax_percentage) || 0;
              return (quantity * rate * taxPercentage) / 100;
            };

            const getTotalTaxAmount = () => {
              return values.items.reduce((total, item) => {
                return total + getItemTax(item);
              }, 0);
            };

            const getTaxAmount = () => {
              return getTotalTaxAmount();
            };

            const getAdjustment = () => {
              return parseFloat(values.adjustment) || 0;
            };

            const getTotal = () => {
              const subTotal = getSubTotal();
              const discountAmount = getDiscountAmount();
              const taxAmount = getTaxAmount();
              const adjustment = getAdjustment();
              return subTotal - discountAmount + taxAmount + adjustment;
            };

            // Filter PO options by selected vendor (if vendor is selected first)
            const filteredPOOptions = values.vendor_id
              ? poOptions.filter(
                (po) => po.vendor_id === String(values.vendor_id)
              )
              : poOptions;

            // Get selected PO data for material names
            const selectedPOData = filteredPOOptions.find(
              (po) => po.value === String(values.purchase_order_id)
            );

            // Get vendor_id from selected PO and update form value
            const vendorIdFromPO = selectedPOData?.vendor_id || "";

            // If PO is selected, sync vendor_id from PO (PO takes precedence)
            if (vendorIdFromPO && values.vendor_id !== vendorIdFromPO) {
              setFieldValue("vendor_id", vendorIdFromPO);
            }

            // Check if items are populated (PO is selected and items exist)
            const isVendorLocked = values.items && values.items.length > 0;

            // Format items from PO
            const formatPOItems = (poItems) => {
              if (!poItems || poItems.length === 0) return [];
              return poItems.map((item) => {
                const material = materialsUnfiltered.find(
                  (mat) => mat.material_id === item.material_id
                );
                return {
                  purchase_order_item_id: item.purchase_order_item_id,
                  material_id: item.material_id,
                  quantity: String(item.quantity || ""),
                  rate: String(item.rate || ""),
                  image_url: item.material?.image_url || null,
                  material_name: item.material?.name || "",
                  tax_percentage:
                    material?.tax_percentage ||
                    item.material?.tax_percentage ||
                    0,
                  tax: String(item.tax || ""),
                  discount: String(item.discount || ""),
                  adjustment: String(item.adjustment || ""),
                };
              });
            };

            // Get material name for display
            const getMaterialName = (item, idx) => {
              return (
                item.material_name ||
                selectedPOData?.items?.[idx]?.material?.name ||
                "Material"
              );
            };

            // Render material image
            const renderMaterialImage = (imageUrl) => {
              return (
                <Flex
                  width={100}
                  height={100}
                  justifyContent="center"
                  alignItems="center"
                >
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt="Material Image"
                      width={100}
                      height={100}
                    />
                  ) : (
                    <EmptyImage width={100} height={100} />
                  )}
                </Flex>
              );
            };

            return (
              <Box>
                <Box>
                  <Grid
                    templateColumns={{
                      base: "repeat(1, 1fr)",
                      md: "repeat(2, 1fr)",
                    }}
                    gap={4}
                    mt={4}
                  >
                    <CustomInput
                      label="PO Number"
                      name="purchase_order_id"
                      method="searchable-dropdown"
                      options={filteredPOOptions}
                      placeholder="Select PO Number"
                      viewOnly={isViewMode}
                      customRender={renderPOOption}
                      isRequired
                      onChange={(value) => {
                        setFieldValue("purchase_order_id", value);
                        const selectedPO = filteredPOOptions.find(
                          (po) => po.value === String(value)
                        );
                        if (selectedPO) {
                          // Set vendor from PO (PO takes precedence)
                          setFieldValue("vendor_id", selectedPO.vendor_id);
                          // Populate items
                          setFieldValue(
                            "items",
                            formatPOItems(selectedPO.items)
                          );
                          setFieldValue("discount", selectedPO.discount);
                          setFieldValue("adjustment", selectedPO.adjustment);
                        } else {
                          setFieldValue("vendor_id", null);
                          setFieldValue("items", []);
                          setFieldValue("discount", 0);
                          setFieldValue("adjustment", 0);
                        }
                      }}
                    />
                    <CustomInput
                      label="Vendor Name"
                      name="vendor_id"
                      method="searchable-dropdown"
                      options={vendorOptions}
                      placeholder="Select Vendor (optional)"
                      viewOnly={isViewMode}
                      disabled={isVendorLocked}
                      onChange={(value) => {
                        setFieldValue("vendor_id", value);
                        // Clear PO and items when vendor changes (if not locked)
                        if (!isVendorLocked) {
                          setFieldValue("purchase_order_id", "");
                          setFieldValue("items", []);
                        }
                      }}
                    />
                    <CustomInput
                      label="Invoice Number"
                      name="invoice_no"
                      placeholder="Enter invoice number"
                      viewOnly={isViewMode}
                      isRequired
                    />
                    <CustomInput
                      label="Invoice Date"
                      name="invoice_date"
                      placeholder="DD/MM/YYYY"
                      viewOnly={isViewMode}
                      method="date-picker"
                      isRequired
                    />
                    <CustomInput
                      label="Invoice File"
                      name="invoice_file"
                      method="file"
                      accept="image/*,.pdf"
                      viewOnly={isViewMode}
                    />
                    <CustomInput
                      label="Accounts File"
                      name="accounts_file"
                      method="file"
                      accept="image/*,.pdf"
                      viewOnly={isViewMode}
                    />
                  </Grid>
                </Box>

                {/* Items Section */}
                {values.items && values.items.length > 0 && (
                  <CustomContainer
                    containerStyle={{ marginTop: "22px" }}
                    title="Items"
                    size="sm"
                    color="secondary"
                  >
                    <FieldArray
                      name="items"
                      render={(arrayHelpers) => (
                        <Box>
                          {/* Desktop Table */}
                          <Box display={{ base: "none", md: "block" }}>
                            <Table.Root
                              variant="striped"
                              sx={{
                                "& thead tr": {
                                  background: "#f7f7f7",
                                },
                                "& thead th": {
                                  background: "#f7f7f7",
                                },
                                "& tbody tr:nth-of-type(odd) td": {
                                  background: "#f7f7f7",
                                },
                                "& tbody tr:nth-of-type(even) td": {
                                  background: "#ffffff",
                                },
                              }}
                            >
                              <Table.Header>
                                <Table.Row bg="#f7f7f7">
                                  <Table.ColumnHeader bg="#f7f7f7">
                                    Image
                                  </Table.ColumnHeader>
                                  <Table.ColumnHeader bg="#f7f7f7">
                                    Item
                                  </Table.ColumnHeader>
                                  <Table.ColumnHeader bg="#f7f7f7">
                                    Quantity
                                  </Table.ColumnHeader>
                                  <Table.ColumnHeader bg="#f7f7f7">
                                    Rate
                                  </Table.ColumnHeader>
                                  <Table.ColumnHeader bg="#f7f7f7">
                                    Amount
                                  </Table.ColumnHeader>
                                  <Table.ColumnHeader bg="#f7f7f7">
                                    Tax
                                  </Table.ColumnHeader>
                                </Table.Row>
                              </Table.Header>
                              <Table.Body>
                                {values.items.map((item, idx) => (
                                  <Table.Row key={idx}>
                                    <Table.Cell>
                                      {renderMaterialImage(item.image_url)}
                                    </Table.Cell>
                                    <Table.Cell
                                      style={{ minWidth: 220, maxWidth: 300 }}
                                    >
                                      <Text fontSize="sm" color="gray.700">
                                        {getMaterialName(item, idx)}
                                      </Text>
                                    </Table.Cell>
                                    <Table.Cell style={{ minWidth: 100 }}>
                                      <CustomInput
                                        name={`items.${idx}.quantity`}
                                        type="number"
                                        min={0}
                                        viewOnly={isViewMode}
                                        errorPosition="bottom"
                                      />
                                    </Table.Cell>
                                    <Table.Cell style={{ minWidth: 100 }}>
                                      <CustomInput
                                        name={`items.${idx}.rate`}
                                        type="number"
                                        min={0}
                                        viewOnly={isViewMode}
                                        errorPosition="bottom"
                                      />
                                    </Table.Cell>
                                    <Table.Cell
                                      style={{
                                        minWidth: 120,
                                        textAlign: "right",
                                      }}
                                    >
                                      <Text
                                        fontSize="sm"
                                        px={2}
                                        color="gray.700"
                                        textAlign="left"
                                      >
                                        {calculateItemAmount(item).toFixed(2)}
                                      </Text>
                                    </Table.Cell>
                                    <Table.Cell
                                      style={{
                                        minWidth: 120,
                                        textAlign: "right",
                                      }}
                                    >
                                      <Text
                                        fontSize="sm"
                                        px={2}
                                        color="gray.700"
                                        textAlign="left"
                                      >
                                        {getItemTax(item).toFixed(2)}
                                      </Text>
                                    </Table.Cell>
                                  </Table.Row>
                                ))}
                              </Table.Body>
                            </Table.Root>
                          </Box>

                          {/* Mobile Cards */}
                          <Box display={{ base: "block", md: "none" }}>
                            <VStack gap="22px" align="stretch">
                              {values.items.map((item, idx) => (
                                <Box
                                  key={idx}
                                  border="1px solid"
                                  borderColor="gray.200"
                                  borderRadius="md"
                                  p={4}
                                  bg="white"
                                >
                                  <VStack spacing={3} align="stretch">
                                    <Flex
                                      width="100%"
                                      justifyContent="center"
                                      alignItems="center"
                                    >
                                      {renderMaterialImage(item.image_url)}
                                    </Flex>

                                    <Box>
                                      <Text
                                        fontSize="sm"
                                        fontWeight="medium"
                                        mb={2}
                                      >
                                        Item
                                      </Text>
                                      <Text fontSize="sm" color="gray.700">
                                        {getMaterialName(item, idx)}
                                      </Text>
                                    </Box>

                                    <HStack spacing={3}>
                                      <Box flex={1}>
                                        <CustomInput
                                          label="Quantity"
                                          name={`items.${idx}.quantity`}
                                          type="number"
                                          min={0}
                                          viewOnly={isViewMode}
                                          size="sm"
                                        />
                                      </Box>
                                    </HStack>

                                    <HStack spacing={3}>
                                      <Box flex={1}>
                                        <CustomInput
                                          label="Rate"
                                          name={`items.${idx}.rate`}
                                          type="number"
                                          min={0}
                                          viewOnly={isViewMode}
                                          size="sm"
                                        />
                                      </Box>
                                      <Box flex={1}>
                                        <Text
                                          fontSize="sm"
                                          fontWeight="medium"
                                          mb={2}
                                        >
                                          Amount
                                        </Text>
                                        <Box
                                          p={2}
                                          borderRadius="md"
                                          bg="gray.50"
                                          fontSize="sm"
                                          color="gray.700"
                                        >
                                          {calculateItemAmount(item).toFixed(
                                            2
                                          ) || "-"}
                                        </Box>
                                      </Box>
                                    </HStack>

                                    <Box>
                                      <Text
                                        fontSize="sm"
                                        fontWeight="medium"
                                        mb={2}
                                      >
                                        Tax
                                      </Text>
                                      <Box
                                        p={2}
                                        borderRadius="md"
                                        bg="gray.50"
                                        fontSize="sm"
                                        color="gray.700"
                                      >
                                        {getItemTax(item).toFixed(2)}
                                      </Box>
                                    </Box>
                                  </VStack>
                                </Box>
                              ))}
                            </VStack>
                          </Box>
                        </Box>
                      )}
                    />
                  </CustomContainer>
                )}

                {/* Summary Section */}
                <Flex justifyContent={{ base: "unset", md: "flex-end" }}>
                  <CustomContainer
                    containerStyle={{
                      marginTop: "22px",
                      width: { base: "100%", md: "auto" },
                    }}
                  >
                    {/* Desktop Summary Layout */}
                    <Box display={{ base: "none", md: "block" }}>
                      <Grid
                        templateColumns="1fr auto"
                        alignItems="center"
                        mb={4}
                      >
                        <Text fontWeight="bold">Sub Total</Text>
                        <Text fontWeight="600" fontSize="18">
                          ₹{getSubTotal().toFixed(2)}
                        </Text>
                      </Grid>

                      <Grid
                        templateColumns="1fr 160px auto"
                        alignItems="center"
                        mb={4}
                        gap={4}
                      >
                        <Text>Discount</Text>
                        <CustomInput
                          name="discount"
                          type="number"
                          min={0}
                          max={100}
                          placeholder="0"
                          size="md"
                          viewOnly={isViewMode}
                          rightAddon="%"
                          style={{ bg: "white" }}
                        />
                        <Text textAlign="right" minW="60px">
                          -₹{getDiscountAmount().toFixed(2)}
                        </Text>
                      </Grid>

                      <Grid
                        templateColumns="1fr auto"
                        alignItems="center"
                        mb={4}
                      >
                        <Text>Tax</Text>
                        <Text fontWeight="600" fontSize="18">
                          ₹{getTaxAmount().toFixed(2)}
                        </Text>
                      </Grid>

                      <Grid
                        templateColumns="1fr 160px auto"
                        alignItems="center"
                        mb={4}
                        gap={4}
                      >
                        <Text>Adjustment</Text>
                        <CustomInput
                          name="adjustment"
                          type="number"
                          placeholder="0"
                          size="md"
                          viewOnly={isViewMode}
                          style={{ bg: "white" }}
                        />
                        <Text textAlign="right" minW="60px">
                          {getAdjustment() >= 0 ? "+" : ""}₹
                          {getAdjustment().toFixed(2)}
                        </Text>
                      </Grid>

                      <hr style={{ margin: "32px 0 16px 0" }} />
                      <Grid templateColumns="1fr auto" alignItems="center">
                        <Text fontWeight="bold" fontSize="20">
                          Total
                        </Text>
                        <Text fontWeight="700" fontSize="22">
                          ₹{getTotal().toFixed(2)}
                        </Text>
                      </Grid>
                    </Box>

                    {/* Mobile Summary Layout */}
                    <Box display={{ base: "block", md: "none" }}>
                      <VStack spacing={6} align="stretch">
                        {/* Sub Total */}
                        <Box bg="white" p={4}>
                          <Flex
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Text fontWeight="600" fontSize="16">
                              Sub Total
                            </Text>
                            <Text
                              fontWeight="700"
                              fontSize="18"
                              color="brand500"
                            >
                              ₹{getSubTotal().toFixed(2)}
                            </Text>
                          </Flex>
                        </Box>

                        {/* Discount */}
                        <Box
                          bg="white"
                          p={4}
                          pb={8}
                          borderBottom="1px solid"
                          borderColor="gray.200"
                        >
                          <VStack spacing={3} align="stretch">
                            <Flex
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Text fontWeight="500" fontSize="15">
                                Discount
                              </Text>
                              <Text
                                fontWeight="600"
                                fontSize="16"
                                color="brand500"
                              >
                                -₹{getDiscountAmount().toFixed(2)}
                              </Text>
                            </Flex>
                            <CustomInput
                              name="discount"
                              type="number"
                              min={0}
                              max={100}
                              placeholder="0"
                              size="md"
                              borderRadius="8px"
                              viewOnly={isViewMode}
                              rightAddon="%"
                              style={{ bg: "gray.50" }}
                            />
                          </VStack>
                        </Box>

                        {/* Tax */}
                        <Box
                          bg="white"
                          p={4}
                          borderBottom="1px solid"
                          borderColor="gray.200"
                        >
                          <Flex
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Text fontWeight="500" fontSize="15">
                              Tax
                            </Text>
                            <Text
                              fontWeight="600"
                              fontSize="16"
                              color="brand500"
                            >
                              +₹{getTaxAmount().toFixed(2)}
                            </Text>
                          </Flex>
                        </Box>

                        {/* Adjustment */}
                        <Box bg="white" p={4}>
                          <VStack spacing={3} align="stretch">
                            <Flex
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Text fontWeight="500" fontSize="15">
                                Adjustment
                              </Text>
                              <Text
                                fontWeight="600"
                                fontSize="16"
                                color="brand500"
                              >
                                {getAdjustment() >= 0 ? "+" : ""}₹
                                {getAdjustment().toFixed(2)}
                              </Text>
                            </Flex>
                            <CustomInput
                              name="adjustment"
                              type="number"
                              placeholder="0"
                              size="md"
                              borderRadius="8px"
                              viewOnly={isViewMode}
                              style={{ bg: "gray.50" }}
                            />
                          </VStack>
                        </Box>

                        {/* Total */}
                        <Box
                          bg="brand50"
                          p={5}
                          borderRadius="8px"
                          border="2px solid"
                          borderColor="brand200"
                        >
                          <Flex
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Text
                              fontWeight="700"
                              fontSize="18"
                              color="brand700"
                            >
                              Total
                            </Text>
                            <Text
                              fontWeight="800"
                              fontSize="22"
                              color="brand700"
                            >
                              ₹{getTotal().toFixed(2)}
                            </Text>
                          </Flex>
                        </Box>
                      </VStack>
                    </Box>
                  </CustomContainer>
                </Flex>

                {/* <FormErrors errors={errors} isViewMode={isViewMode} /> */}

                <Flex mt="32px" justifyContent="flex-end">
                  <Checkbox.Root colorPalette="brand" variant="subtle" checked={accountEntryDone} onChange={(e) => setAccountEntryDone(e.target.checked)}>
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>Account Entry Done</Checkbox.Label>
                  </Checkbox.Root>
                </Flex>

                <Flex
                  justifyContent="flex-end"
                  mt="32px"
                  gap="16px"
                  direction={{ base: "column", md: "row" }}
                >
                  <Link href="/purchase-entry" passHref>
                    <Button
                      colorScheme="red"
                      variant="outline"
                      w={{ base: "100%", md: "auto" }}
                    >
                      {isViewMode ? "Back" : "Cancel"}
                    </Button>
                  </Link>
                  {!isViewMode && (
                    <Button
                      colorScheme="purple"
                      onClick={formikHandleSubmit}
                      w={{ base: "100%", md: "auto" }}
                      disabled={!accountEntryDone}
                    >
                      {isEditMode ? "Update" : "Save"}
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
