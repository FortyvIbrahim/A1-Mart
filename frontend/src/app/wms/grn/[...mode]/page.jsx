"use client";

import useEmployee from "@/api/customHooks/useEmployee";
import usePurchaseAcknowledgments from "@/api/customHooks/usePurchaseAcknowledgments";
import usePurchaseOrders from "@/api/customHooks/usePurchaseOrders";
import useGRNById from "@/api/customHooks/useGRNById";
import { createGRN, updateGRN } from "@/api/helpers/grn";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import {
  PurchaseAcknowledgmentOptionRenderer,
  createPurchaseAcknowledgmentOptions,
} from "@/components/PurchaseAcknowledgment";
import { capitalizeWords } from "@/utils/string";
import { Badge, Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import { Formik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { use, useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import * as Yup from "yup";

export const renderPOOption = (item) => {
  return (
    <Flex direction="column" align="flex-start" w="100%">
      <Flex gap="8px">
        <Text fontSize="sm" fontWeight="medium">
          {item.purchase_order_ref || `PO-${item.purchase_order_id}`}
        </Text>

        {item.has_grn_entry && <Badge colorPalette="green">GRN Entry Done</Badge>}
      </Flex>

      <Flex w="100%" mt={1} gap="4px">
        <Text fontSize="xs" color="gray.500">
          Vendor: {item.vendor_name || "N/A"} •
        </Text>
        <Text fontSize="xs" color="gray.700" fontWeight="medium">
          No Of Items: {item.items?.length || 0} •
        </Text>
        <Text fontSize="xs" color="gray.700" fontWeight="medium">
          Total: ₹{item.total?.toFixed(2) || "0.00"}
        </Text>
      </Flex>
    </Flex>
  );
};

const getGRNValidationSchema = () => {
  return Yup.object().shape({
    purchase_acknowledgment_id: Yup.number()
      .required("Purchase Acknowledgment is required")
      .integer("Purchase Acknowledgment ID must be an integer")
      .positive("Purchase Acknowledgment ID must be positive"),
    employee_id: Yup.string().required("Employee is required"),
    is_product_stock_missing: Yup.boolean().required(
      "Product stock missing selection is required"
    ),
    missing_qty: Yup.number().when("is_product_stock_missing", {
      is: true,
      then: (schema) =>
        schema
          .required(
            "Missing quantity is required when product stock is missing"
          )
          .min(0, "Missing quantity must be greater than or equal to 0")
          .test(
            "decimal-places",
            "Missing quantity must have at most 2 decimal places",
            (value) => !value || /^\d+(\.\d{1,2})?$/.test(value.toString())
          ),
      otherwise: (schema) => schema.nullable(),
    }),
    missing_value: Yup.number().when("is_product_stock_missing", {
      is: true,
      then: (schema) =>
        schema
          .required("Missing value is required when product stock is missing")
          .min(0, "Missing value must be greater than or equal to 0")
          .test(
            "decimal-places",
            "Missing value must have at most 2 decimal places",
            (value) => !value || /^\d+(\.\d{1,2})?$/.test(value.toString())
          ),
      otherwise: (schema) => schema.nullable(),
    }),
    is_material: Yup.boolean().required("Material selection is required"),
    purchase_order_id: Yup.string().when("is_material", {
      is: true,
      then: (schema) =>
        schema.required("Purchase order is required when material is selected"),
      otherwise: (schema) => schema.nullable(),
    }),
    grn_method: Yup.string()
      .required("GRN Method is required")
      .oneOf(["manual", "device"], "GRN Method must be Manual or Device"),
  });
};

const INITIAL_VALUES = {
  purchase_acknowledgment_id: null,
  employee_id: null,
  grn_method: null,
  is_product_stock_missing: false,
  missing_qty: "",
  missing_value: "",
  is_material: false,
  purchase_order_id: null,
};

function GRNForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const grnId = mode[1];
  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  const { fetchData, grn, loading: grnLoading } = useGRNById(grnId ?? 0);
  const { employees } = useEmployee();
  const { purchaseAcknowledgments } = usePurchaseAcknowledgments();
  const { purchaseOrders } = usePurchaseOrders();
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);

  const purchaseAcknowledgmentOptions = useMemo(() => {
    return createPurchaseAcknowledgmentOptions(
      purchaseAcknowledgments.filter(
        (item) => !item.has_grn || isEditMode || isViewMode
      )
    );
  }, [purchaseAcknowledgments]);

  const employeeOptions = useMemo(() => {
    return employees
      .filter((item) => !item.terminated)
      .map((item) => ({
        value: item.employee_code,
        label: `${item.employee_code} - ${capitalizeWords(item.employee_name)}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [employees]);

  const purchaseOrderOptions = useMemo(() => {
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
        vendor_name: po.vendor?.name || "",
        items: po.items || [],
        total:
          po.items?.reduce(
            (sum, item) =>
              sum +
              (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0)),
            0
          ) || 0,
      }));
  }, [purchaseOrders, isCreateMode, isEditMode, isViewMode]);

  useEffect(() => {
    if (isEditMode || isViewMode) {
      fetchData();
    }
  }, [isEditMode, isViewMode]);

  useEffect(() => {
    if (grn) {
      setInitialValues({
        purchase_acknowledgment_id: grn.purchase_acknowledgment_id || null,
        employee_id: grn.employee_id || null,
        grn_method: grn.grn_method,
        is_product_stock_missing: grn.is_product_stock_missing || false,
        missing_qty: grn.missing_qty?.toString() || "",
        missing_value: grn.missing_value?.toString() || "",
        is_material: grn.is_material || false,
        purchase_order_id: grn.purchase_order_id
          ? String(grn.purchase_order_id)
          : null,
      });
    }
  }, [grn]);

  const handleSubmit = async (values) => {
    try {
      const submitData = {
        purchase_acknowledgment_id: values.purchase_acknowledgment_id,
        employee_id: values.employee_id,
        grn_method: values.grn_method,
        missing_qty: values.missing_qty ? parseFloat(values.missing_qty) : null,
        missing_value: values.missing_value
          ? parseFloat(values.missing_value)
          : null,
        purchase_order_id: values.purchase_order_id
          ? parseInt(values.purchase_order_id)
          : null,
      };

      if (isEditMode) {
        delete submitData.purchase_acknowledgment_id;
      }

      const promise = isEditMode
        ? updateGRN(grnId, submitData)
        : createGRN(submitData);

      toast.promise(promise, {
        loading: isEditMode ? "Updating GRN!" : "Creating GRN!",
        success: (data) => {
          if (data.code === 200) {
            router.push("/wms/grn");
            return isEditMode
              ? "Successfully Updated GRN!"
              : "Successfully Created GRN!";
          }
          throw data;
        },
        error: (err) => {
          console.log(err);
          return (
            err.message ||
            err.error ||
            err.response?.data?.message ||
            (isEditMode ? "Error Updating GRN!" : "Error Creating GRN!")
          );
        },
      });
    } catch (err) {
      console.error(err);
    }
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_grn"; // TODO: Update with correct permission key
    }
    return "view_grn"; // TODO: Update with correct permission key
  };

  const getTitle = () => {
    if (isCreateMode) {
      return "Create GRN";
    }
    if (isEditMode) {
      return "Edit GRN";
    }
    return "View GRN";
  };

  if (grnLoading && (isEditMode || isViewMode)) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer title={getTitle()}>
          <Text>Loading...</Text>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer title={getTitle()}>
        <Formik
          initialValues={initialValues}
          validationSchema={getGRNValidationSchema()}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit, values, setFieldValue }) => {
            const handleMaterialChange = (value) => {
              if (!value) {
                setFieldValue("purchase_order_id", null);
              }
            };

            return (
              <Box>
                <Flex flexDirection="column" gap="22px">
                  <Grid templateColumns="repeat(2, 1fr)" gap="22px">
                    <CustomInput
                      label="Purchase Acknowledgment"
                      placeholder="Select purchase acknowledgment..."
                      name="purchase_acknowledgment_id"
                      method="searchable-dropdown"
                      options={purchaseAcknowledgmentOptions}
                      customRender={PurchaseAcknowledgmentOptionRenderer}
                      isRequired={isCreateMode}
                      viewOnly={isEditMode || isViewMode}
                    />

                    <CustomInput
                      label="Employee"
                      placeholder="Select employee..."
                      name="employee_id"
                      method="searchable-dropdown"
                      options={employeeOptions}
                      isRequired={isCreateMode}
                      viewOnly={isViewMode}
                    />
                  </Grid>

                  <Grid templateColumns="repeat(2, 1fr)" gap="22px">
                    <CustomInput
                      label="GRN Method"
                      name="grn_method"
                      method="radio"
                      options={[
                        { value: "manual", label: "Manual" },
                        { value: "device", label: "Device" },
                      ]}
                      isRequired={isCreateMode}
                      viewOnly={isViewMode}
                    />
                    <Box />
                  </Grid>

                  <Grid templateColumns="repeat(2, 1fr)" gap="22px">
                    <CustomInput
                      label="Product Stock Missing"
                      name="is_product_stock_missing"
                      method="radio"
                      options={[
                        { value: true, label: "Yes" },
                        { value: false, label: "No" },
                      ]}
                      isRequired={isCreateMode}
                      viewOnly={isViewMode}
                    />
                    <Box />
                  </Grid>

                  {values.is_product_stock_missing && (
                    <Grid templateColumns="repeat(2, 1fr)" gap="22px">
                      <CustomInput
                        label="Missing Quantity"
                        placeholder="Enter missing quantity..."
                        name="missing_qty"
                        method="text"
                        type="number"
                        isRequired={isCreateMode && values.is_product_stock_missing}
                        viewOnly={isViewMode}
                      />

                      <CustomInput
                        label="Missing Value"
                        placeholder="Enter missing value..."
                        name="missing_value"
                        method="text"
                        type="number"
                        isRequired={isCreateMode && values.is_product_stock_missing}
                        viewOnly={isViewMode}
                      />
                    </Grid>
                  )}

                  <Grid templateColumns="repeat(2, 1fr)" gap="22px">
                    <CustomInput
                      label="Is Material"
                      name="is_material"
                      method="radio"
                      options={[
                        { value: true, label: "Yes" },
                        { value: false, label: "No" },
                      ]}
                      isRequired={isCreateMode}
                      viewOnly={isViewMode}
                      onChange={(value) => handleMaterialChange(value)}
                    />
                    <Box />
                  </Grid>

                  {values.is_material && (
                    <Grid templateColumns="repeat(2, 1fr)" gap="22px">
                      <CustomInput
                        label="Purchase Order"
                        placeholder="Select purchase order..."
                        name="purchase_order_id"
                        method="searchable-dropdown"
                        customRender={renderPOOption}
                        options={purchaseOrderOptions}
                        isRequired={isCreateMode && values.is_material}
                        viewOnly={isViewMode}
                      />
                      <Box />
                    </Grid>
                  )}
                </Flex>
                <Flex gap="22px" justifyContent="flex-end" mt="22px">
                  <Link href="/wms/grn">
                    <Button variant="subtle">Back</Button>
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

export default GRNForm;

/*
Example submitData:
{
  purchase_acknowledgment_id: 123,
  employee_id: "EMP001",
  grn_method: "manual" | "device",
  missing_qty: 10.5 | null,
  missing_value: 5000.00 | null,
  purchase_order_id: 456 | null,
}
*/
