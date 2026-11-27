"use client";

import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import FormErrors from "@/components/FormErrors";
import GlobalWrapper from "@/components/GlobalWrapper";
import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  IconButton,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FaTrash } from "react-icons/fa";
import { FieldArray, Formik, useFormikContext } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useMaterials from "@/api/customHooks/useMaterials";
import toast from "react-hot-toast";
import useMasterList from "@/api/customHooks/useMasterList";
import { capitalizeWords } from "@/utils/string";
import {
  createPurchaseOrder,
  updatePurchaseOrder,
} from "@/api/helpers/purchase_orders";
import usePurchaseOrderById from "@/api/customHooks/usePurchaseOrderById";
import usePurchaseOrders from "@/api/customHooks/usePurchaseOrders";
import Image from "next/image";
import EmptyImage from "@/components/EmptyImage";

const VALIDATION_SCHEMA = Yup.object({
  vendor_id: Yup.string().required("Required"),
  purchase_order_ref: Yup.string()
    .required("Required")
    .max(50, "Cannot exceed 50 characters"),
  date: Yup.date()
    .nullable()
    .test("not-future", "Cannot be in the future", function (value) {
      if (!value) return true; // Optional field
      const orderDate = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      return orderDate <= today;
    }),
  delivery_date: Yup.date()
    .nullable()
    .test(
      "after-order-date",
      "Cannot be before the order date",
      function (value) {
        if (!value) return true; // Optional field
        const { date } = this.parent;
        if (!date) return true; // If order date is not set, allow delivery date
        const deliveryDate = new Date(value);
        const orderDate = new Date(date);
        return deliveryDate >= orderDate;
      }
    ),
  items: Yup.array()
    .min(1, "Required")
    .of(
      Yup.object({
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

const EMPTY_ITEM = {
  material_id: null,
  quantity: "",
  rate: "",
  tax_percentage: 0,
};

const INITIAL_VALUES = {
  vendor_id: "",
  purchase_order_ref: "",
  date: null,
  delivery_date: null,
  items: [EMPTY_ITEM],
  discount: "",
  tax: "",
  adjustment: "",
};

export default function PurchaseOrderForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const purchaseOrderId = mode[1];
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);

  const { purchaseOrders } = usePurchaseOrders();

  const { materials: materialsUnfiltered } = useMaterials({ withRate: true });
  const { purchaseOrder } = usePurchaseOrderById(purchaseOrderId);

  const { masterList } = useMasterList();
  const filtersPeopleList = masterList
    // .filter((vendor) => vendor.person_type === 2 && vendor.status === 1)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => ({
      value: item.master_id,
      label: capitalizeWords(item.name),
    }));

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  const materials = materialsUnfiltered.filter(
    (material) => material.is_active || !isCreateMode
  );

  // Format materials for dropdown
  const materialOptions = useMemo(() => {
    return materials.map((material) => ({
      value: material.material_id,
      label: material.name || `Material ${material.material_id}`,
    }));
  }, [materials]);

  useEffect(() => {
    if (isCreateMode && purchaseOrders.length > 0) {
      const lastPurchaseOrder = purchaseOrders.sort(
        (a, b) => b.purchase_order_id - a.purchase_order_id
      )[0];
      setInitialValues({
        ...INITIAL_VALUES,
        date: new Date(),
        delivery_date: new Date(new Date().setDate(new Date().getDate() + 10)),
        purchase_order_ref:
          `PO-${parseInt(lastPurchaseOrder.purchase_order_id) + 1}` || "",
      });
    }
  }, [purchaseOrders, isCreateMode]);

  useEffect(() => {
    if (
      (isEditMode || isViewMode) &&
      purchaseOrder &&
      materialsUnfiltered.length > 0
    ) {
      setInitialValues({
        vendor_id: String(purchaseOrder.vendor_id || ""),
        purchase_order_ref: purchaseOrder.purchase_order_ref || "",
        date: purchaseOrder.date ? new Date(purchaseOrder.date) : null,
        delivery_date: purchaseOrder.delivery_date
          ? new Date(purchaseOrder.delivery_date)
          : null,
        items:
          purchaseOrder.items && purchaseOrder.items.length > 0
            ? purchaseOrder.items.map((item) => {
                const material = materialsUnfiltered.find(
                  (mat) => mat.material_id === item.material_id
                );
                return {
                  material_id: item.material_id,
                  image_url:
                    item.material?.image_url || material?.image_url || null,
                  quantity: String(item.quantity || ""),
                  rate: String(item.rate || ""),
                  tax_percentage:
                    material?.tax_percentage ||
                    item.material?.tax_percentage ||
                    0,
                };
              })
            : [EMPTY_ITEM],
        discount: String(purchaseOrder.discount || ""),
        tax: String(purchaseOrder.tax || ""),
        adjustment: String(purchaseOrder.adjustment || ""),
      });
    }
  }, [
    isEditMode,
    isViewMode,
    purchaseOrder?.purchase_order_id,
    materialsUnfiltered.length,
  ]);

  const getTitle = () => {
    if (isCreateMode) {
      return "Add Purchase Order";
    }
    if (isEditMode) {
      return "Edit Purchase Order";
    }
    return "Purchase Order";
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
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
        vendor_id: parseInt(values.vendor_id),
        purchase_order_ref: values.purchase_order_ref,
        date: values.date
          ? new Date(values.date).toISOString().split("T")[0]
          : null,
        delivery_date: values.delivery_date
          ? new Date(values.delivery_date).toISOString().split("T")[0]
          : null,
        discount: parseFloat(values.discount || 0),
        tax: calculateTaxFromItems(),
        adjustment: parseFloat(values.adjustment || 0),
        status: "raised",
        should_generate_pdf: true,
        items: values.items
          .filter((item) => item.material_id && item.quantity && item.rate)
          .map((item) => ({
            material_id: parseInt(item.material_id),
            quantity: parseInt(item.quantity),
            rate: parseFloat(item.rate),
          })),
      };

      const promise = isCreateMode
        ? createPurchaseOrder(postData)
        : updatePurchaseOrder(purchaseOrderId, postData);

      toast.promise(promise, {
        loading: isCreateMode
          ? "Creating purchase order..."
          : "Updating purchase order...",
        success: (response) => {
          if (response.code === 200 || response.success) {
            router.push("/purchase-order");
            return isCreateMode
              ? "Purchase order created successfully!"
              : "Purchase order updated successfully!";
          } else {
            throw new Error(response.message || "Error saving purchase order");
          }
        },
        error: (err) => {
          return err.message || "Error saving purchase order!";
        },
      });
    } catch (err) {
      console.error(err);
      toast.error("Error saving purchase order!");
      setSubmitting(false);
    }
  };

  const handleMaterialChange = (materialId, index, setFieldValue) => {
    if (materialId && index !== undefined) {
      const existingMaterial = materials.find(
        (material) => material.material_id == materialId
      );

      if (existingMaterial) {
        setFieldValue(`items.${index}.image_url`, existingMaterial.image_url);
        setFieldValue(
          `items.${index}.rate`,
          existingMaterial.latest_rate || ""
        );
        setFieldValue(
          `items.${index}.tax_percentage`,
          existingMaterial.tax_percentage || 0
        );
      }
    }
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_purchase_order";
    }
    return "view_purchase_order";
  };

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer pageForm headerBand title={getTitle()}>
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
            // Calculation functions
            const getSubTotal = () => {
              return values.items.reduce((total, item) => {
                const quantity = parseFloat(item.quantity) || 0;
                const rate = parseFloat(item.rate) || 0;
                return total + quantity * rate;
              }, 0);
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

            return (
              <Box>
                <Box>
                  <CustomInput
                    label="Vendor Name"
                    name="vendor_id"
                    method="searchable-dropdown"
                    options={filtersPeopleList}
                    placeholder="Select Vendor"
                    viewOnly={isViewMode}
                  />
                </Box>

                <hr style={{ margin: "22px 0" }} />

                <Box mt="32px">
                  <Grid
                    templateColumns={{
                      base: "repeat(1, 1fr)",
                      md: "repeat(3, 1fr)",
                    }}
                    gap={4}
                    mt={4}
                  >
                    <CustomInput
                      label="Purchase Order Reference #"
                      name="purchase_order_ref"
                      placeholder="PO-2025-001"
                      viewOnly={isViewMode}
                    />
                    <CustomInput
                      label="Date"
                      name="date"
                      placeholder="DD/MM/YYYY"
                      viewOnly={isViewMode}
                      method="date-picker"
                      onChange={(date) => {
                        setFieldValue(
                          "delivery_date",
                          new Date(date).setDate(new Date(date).getDate() + 10)
                        );
                      }}
                    />
                    <CustomInput
                      label="Delivery Date"
                      name="delivery_date"
                      placeholder="DD/MM/YYYY"
                      viewOnly={isViewMode}
                      method="date-picker"
                    />
                  </Grid>

                  <CustomContainer pageForm headerBand
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
                                  {!isViewMode && (
                                    <Table.ColumnHeader bg="#f7f7f7">
                                      Action
                                    </Table.ColumnHeader>
                                  )}
                                </Table.Row>
                              </Table.Header>
                              <Table.Body>
                                {values.items.map((item, idx) => (
                                  <Table.Row key={idx}>
                                    <Table.Cell>
                                      <Flex
                                        width={100}
                                        height={100}
                                        justifyContent="center"
                                        alignItems="center"
                                      >
                                        {item.image_url ? (
                                          <Image
                                            src={item.image_url}
                                            alt="Material Image"
                                            width={100}
                                            height={100}
                                          />
                                        ) : (
                                          <EmptyImage
                                            width={100}
                                            height={100}
                                          />
                                        )}
                                      </Flex>
                                    </Table.Cell>
                                    <Table.Cell
                                      style={{ minWidth: 220, maxWidth: 300 }}
                                    >
                                      <CustomInput
                                        name={`items.${idx}.material_id`}
                                        method="searchable-dropdown"
                                        options={materialOptions}
                                        placeholder="Select Item"
                                        viewOnly={isViewMode}
                                        errorPosition="bottom"
                                        onChange={(value) => {
                                          handleMaterialChange(
                                            value,
                                            idx,
                                            setFieldValue
                                          );
                                        }}
                                      />
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
                                        {item.quantity && item.rate
                                          ? (
                                              parseFloat(item.quantity) *
                                              parseFloat(item.rate)
                                            ).toFixed(2)
                                          : ""}
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
                                    <Table.Cell
                                      style={{
                                        minWidth: 60,
                                        textAlign: "center",
                                      }}
                                    >
                                      {!isViewMode && (
                                        <IconButton
                                          colorScheme="red"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() =>
                                            arrayHelpers.remove(idx)
                                          }
                                          aria-label="Delete item"
                                          disabled={values.items.length <= 1}
                                        >
                                          <FaTrash />
                                        </IconButton>
                                      )}
                                    </Table.Cell>
                                  </Table.Row>
                                ))}
                              </Table.Body>
                            </Table.Root>
                          </Box>

                          {/* Mobile Cards */}
                          <Box display={{ base: "block", md: "none" }}>
                            <VStack spacing={4} align="stretch">
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
                                      {item.image_url ? (
                                        <Flex
                                          width={100}
                                          height={100}
                                          justifyContent="center"
                                          alignItems="center"
                                        >
                                          <Image
                                            src={item.image_url}
                                            alt="Material Image"
                                            width={100}
                                            height={100}
                                          />
                                        </Flex>
                                      ) : (
                                        <EmptyImage width={100} height={100} />
                                      )}
                                    </Flex>

                                    <Box>
                                      <Text
                                        fontSize="sm"
                                        fontWeight="medium"
                                        mb={2}
                                      >
                                        Item
                                      </Text>
                                      <CustomInput
                                        name={`items.${idx}.material_id`}
                                        method="searchable-dropdown"
                                        options={materialOptions}
                                        placeholder="Select Item"
                                        viewOnly={isViewMode}
                                        onChange={(value) => {
                                          handleMaterialChange(
                                            value,
                                            idx,
                                            setFieldValue
                                          );
                                        }}
                                      />
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
                                          {item.quantity && item.rate
                                            ? (
                                                parseFloat(item.quantity) *
                                                parseFloat(item.rate)
                                              ).toFixed(2)
                                            : "-"}
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

                                    {!isViewMode && (
                                      <Flex justifyContent="flex-end">
                                        <IconButton
                                          colorScheme="red"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() =>
                                            arrayHelpers.remove(idx)
                                          }
                                          aria-label="Delete item"
                                          disabled={values.items.length <= 1}
                                        >
                                          <FaTrash />
                                        </IconButton>
                                      </Flex>
                                    )}
                                  </VStack>
                                </Box>
                              ))}
                            </VStack>
                          </Box>

                          {!isViewMode && (
                            <Flex justifyContent="flex-end">
                              <Button
                                onClick={() =>
                                  arrayHelpers.insert(
                                    values.items.length,
                                    EMPTY_ITEM
                                  )
                                }
                                mt="22px"
                              >
                                Add Row
                              </Button>
                            </Flex>
                          )}
                        </Box>
                      )}
                    />
                  </CustomContainer>

                  {/* Summary Section */}
                  <Flex justifyContent={{ base: "unset", md: "flex-end" }}>
                    <CustomContainer pageForm headerBand
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
                            {getSubTotal().toFixed(2)}
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
                            {getDiscountAmount().toFixed(2)}
                          </Text>
                        </Grid>

                        <Grid
                          templateColumns="1fr auto"
                          alignItems="center"
                          mb={4}
                        >
                          <Text>Tax</Text>
                          <Text fontWeight="600" fontSize="18">
                            {getTaxAmount().toFixed(2)}
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
                            placeholder=""
                            size="md"
                            viewOnly={isViewMode}
                            style={{ bg: "white" }}
                          />
                          <Text textAlign="right" minW="60px">
                            {getAdjustment().toFixed(2)}
                          </Text>
                        </Grid>

                        <hr style={{ margin: "32px 0 16px 0" }} />
                        <Grid templateColumns="1fr auto" alignItems="center">
                          <Text fontWeight="bold" fontSize="20">
                            Total
                          </Text>
                          <Text fontWeight="700" fontSize="22">
                            {getTotal().toFixed(2)}
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
                </Box>

                {/* Error Display */}
                {/* <FormErrors errors={errors} isViewMode={isViewMode} /> */}

                <Flex
                  justifyContent="flex-end"
                  mt="32px"
                  gap="16px"
                  direction={{ base: "column", md: "row" }}
                >
                  <Link href="/purchase-order" passHref>
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
