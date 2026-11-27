"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as Yup from "yup";
import toast from "react-hot-toast";
import { Box, Button, Flex, Grid, Tabs, Text } from "@chakra-ui/react";
import { Formik } from "formik";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import useTransportById from "@/api/customHooks/useTransportById";
import useBranches from "@/api/customHooks/useBranches";
import { createTransport, updateTransport } from "@/api/helpers/transports";
import { uploadAsset } from "@/api/helpers/assets";

const DEPRECIATION_OPTIONS = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

const VALIDATION_SCHEMA = Yup.object().shape({
  asset_code: Yup.string().trim().max(255).required("Asset code is required"),
  asset_name: Yup.string().trim().max(255).required("Asset name is required"),
  acquisition_type: Yup.string()
    .trim()
    .max(50)
    .required("Acquisition type is required"),
  dependency_type: Yup.string()
    .trim()
    .max(50)
    .required("Dependency type is required"),
  working_status: Yup.string()
    .trim()
    .max(50)
    .required("Working status is required"),
  is_depreciation_applicable: Yup.string()
    .oneOf(["Yes", "No"])
    .required("Required"),
  vehicle_number: Yup.string().trim().max(100).nullable(),
  engine_number: Yup.string().trim().max(100).nullable(),
  chassis_number: Yup.string().trim().max(100).nullable(),
  asset_description: Yup.string().nullable(),
  customer_asset_no: Yup.string().trim().max(100).nullable(),
  sub_category: Yup.string().trim().max(100).nullable(),
  hsn_code: Yup.string().trim().max(50).nullable(),
  barcode_option: Yup.string().trim().max(50).nullable(),
  barcode_no: Yup.string().trim().max(100).nullable(),
  purchased_price: Yup.number().nullable(),
  purchased_date: Yup.string().nullable(),
  placed_in_service: Yup.string().nullable(),
  capitalization_date: Yup.string().nullable(),
  bill_no: Yup.string().trim().max(100).nullable(),
  bill_date: Yup.string().nullable(),
  received_date: Yup.string().nullable(),
  serial_number: Yup.string().trim().max(100).nullable(),
  model_number: Yup.string().trim().max(100).nullable(),
  seller: Yup.string().trim().max(255).nullable(),
  branch_id: Yup.number().nullable(),
  salvage_value: Yup.number().nullable(),
  exp_end_date: Yup.string().nullable(),
  asset_life_span: Yup.number().nullable().integer(),
  image_url: Yup.mixed().nullable(),
});

const INITIAL_VALUES = {
  asset_code: "",
  asset_name: "",
  vehicle_number: "",
  engine_number: "",
  chassis_number: "",
  acquisition_type: "",
  dependency_type: "",
  working_status: "",
  asset_description: "",
  customer_asset_no: "",
  sub_category: "",
  hsn_code: "",
  barcode_option: "",
  barcode_no: "",
  purchased_price: "",
  purchased_date: "",
  placed_in_service: "",
  capitalization_date: "",
  bill_no: "",
  bill_date: "",
  received_date: "",
  serial_number: "",
  model_number: "",
  seller: "",
  branch_id: "",
  is_depreciation_applicable: "No",
  salvage_value: "",
  exp_end_date: "",
  asset_life_span: "",
  image_url: null,
};

function toFormDate(val) {
  if (val == null || val === "") return "";
  const d = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function TransportForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const action = mode?.[0];
  const transportId = mode?.[1];

  const isViewMode = action === "view";
  const isEditMode = action === "edit";
  const isAddMode = action === "create";

  const { transport, loading: transportLoading } = useTransportById(
    isEditMode || isViewMode ? transportId : null
  );
  const { branches } = useBranches();

  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const [activeTab, setActiveTab] = useState("basic");

  const branchOptions = useMemo(
    () =>
      (branches || []).map((b) => ({
        value: b.branch_id,
        label: b.branch_name,
      })),
    [branches]
  );

  useEffect(() => {
    if ((isEditMode || isViewMode) && transport) {
      setInitialValues({
        asset_code: transport.asset_code ?? "",
        asset_name: transport.asset_name ?? "",
        vehicle_number: transport.vehicle_number ?? "",
        engine_number: transport.engine_number ?? "",
        chassis_number: transport.chassis_number ?? "",
        acquisition_type: transport.acquisition_type ?? "",
        dependency_type: transport.dependency_type ?? "",
        working_status: transport.working_status ?? "",
        asset_description: transport.asset_description ?? "",
        customer_asset_no: transport.customer_asset_no ?? "",
        sub_category: transport.sub_category ?? "",
        hsn_code: transport.hsn_code ?? "",
        barcode_option: transport.barcode_option ?? "",
        barcode_no: transport.barcode_no ?? "",
        purchased_price: transport.purchased_price ?? "",
        purchased_date: toFormDate(transport.purchased_date),
        placed_in_service: toFormDate(transport.placed_in_service),
        capitalization_date: toFormDate(transport.capitalization_date),
        bill_no: transport.bill_no ?? "",
        bill_date: toFormDate(transport.bill_date),
        received_date: toFormDate(transport.received_date),
        serial_number: transport.serial_number ?? "",
        model_number: transport.model_number ?? "",
        seller: transport.seller ?? "",
        branch_id: transport.branch_id ?? "",
        is_depreciation_applicable:
          transport.is_depreciation_applicable ?? "No",
        salvage_value: transport.salvage_value ?? "",
        exp_end_date: toFormDate(transport.exp_end_date),
        asset_life_span: transport.asset_life_span ?? "",
        image_url: transport.image_url ?? null,
      });
    }
  }, [isEditMode, isViewMode, transport]);

  const getTitle = () => {
    if (isAddMode) return "New Transport";
    if (isEditMode) return "Edit Transport";
    return "Transport Details";
  };

  const getPermissionKey = () => {
    if (isAddMode || isEditMode) return "add_transport";
    return "view_transports";
  };

  const buildPayload = (values) => {
    const num = (v) =>
      v !== "" && v != null && !Number.isNaN(Number(v)) ? Number(v) : null;
    const str = (v) =>
      v != null && String(v).trim() !== "" ? String(v).trim() : null;
    return {
      asset_code: str(values.asset_code) ?? "",
      asset_name: str(values.asset_name) ?? "",
      vehicle_number: str(values.vehicle_number),
      engine_number: str(values.engine_number),
      chassis_number: str(values.chassis_number),
      acquisition_type: str(values.acquisition_type) ?? "",
      dependency_type: str(values.dependency_type) ?? "",
      working_status: str(values.working_status) ?? "",
      asset_description: str(values.asset_description),
      customer_asset_no: str(values.customer_asset_no),
      sub_category: str(values.sub_category),
      hsn_code: str(values.hsn_code),
      barcode_option: str(values.barcode_option),
      barcode_no: str(values.barcode_no),
      purchased_price: num(values.purchased_price),
      purchased_date: values.purchased_date || null,
      placed_in_service: values.placed_in_service || null,
      capitalization_date: values.capitalization_date || null,
      bill_no: str(values.bill_no),
      bill_date: values.bill_date || null,
      received_date: values.received_date || null,
      serial_number: str(values.serial_number),
      model_number: str(values.model_number),
      seller: str(values.seller),
      branch_id: values.branch_id === "" ? null : num(values.branch_id),
      is_depreciation_applicable: values.is_depreciation_applicable || "No",
      salvage_value: num(values.salvage_value),
      exp_end_date: values.exp_end_date || null,
      asset_life_span: num(values.asset_life_span),
      image_url: str(values.image_url),
    };
  };

  const resolveImageUrl = async (imageUrlValue, formValues) => {
    if (!imageUrlValue) return null;
    if (typeof imageUrlValue === "string") return imageUrlValue;
    if (imageUrlValue instanceof File) {
      const toastId = toast.loading("Uploading image...");
      try {
        const response = await uploadAsset(
          imageUrlValue,
          formValues?.asset_name || formValues?.asset_code || "transport",
          "transports",
          "image"
        );
        toast.dismiss(toastId);
        if (response?.code === 200 && response?.remoteUrl)
          return response.remoteUrl;
        throw new Error(response?.message || "Upload failed");
      } catch (err) {
        toast.dismiss(toastId);
        toast.error("Error uploading image");
        throw err;
      }
    }
    return null;
  };

  const handleSubmit = async (values) => {
    try {
      const resolvedImageUrl = await resolveImageUrl(values.image_url, values);
      const payload = {
        ...buildPayload(values),
        image_url:
          resolvedImageUrl ??
          (typeof values.image_url === "string" ? values.image_url : null),
      };
      if (isAddMode) {
        await toast.promise(createTransport(payload), {
          loading: "Creating transport...",
          success: (response) => {
            if (response.code === 200) {
              router.push("/tms/transports");
              return "Transport created successfully!";
            }
            throw new Error(response.message || "Error creating transport");
          },
          error: (err) => err.message || "Error creating transport",
        });
      } else if (isEditMode) {
        await toast.promise(updateTransport(transportId, payload), {
          loading: "Updating transport...",
          success: (response) => {
            if (response.code === 200) {
              router.push("/tms/transports");
              return "Transport updated successfully!";
            }
            throw new Error(response.message || "Error updating transport");
          },
          error: (err) => err.message || "Error updating transport",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if ((isEditMode || isViewMode) && transportLoading) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer pageForm backHref="/tms/transports" title={getTitle()}>
          <Flex justifyContent="center" p={8}>
            Loading...
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if ((isEditMode || isViewMode) && !transport && !transportLoading) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer pageForm backHref="/tms/transports" title={getTitle()}>
          <Flex flexDirection="column" gap="22px" alignItems="center" p={8}>
            <Text>Transport not found</Text>
            <Button
              variant="subtle"
              onClick={() => router.push("/tms/transports")}
            >
              Back to Transports
            </Button>
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer
        pageForm
        backHref="/tms/transports"
        title={getTitle()}
        rightSection={
          isViewMode && transportId ? (
            <Link href={`/tms/transports/edit/${transportId}`}>
              <Button size="sm">Edit</Button>
            </Link>
          ) : null
        }
      >
        <Formik
          initialValues={initialValues}
          validationSchema={VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit, validateForm, setTouched }) => {
            const onFormSubmit = async () => {
              const errs = await validateForm();
              if (Object.keys(errs).length > 0) {
                const touchedFields = Object.keys(errs).reduce(
                  (acc, key) => ({ ...acc, [key]: true }),
                  {}
                );
                setTouched(touchedFields, true);
                setActiveTab("basic");
                toast.error("Please fill all required fields in Basic Info");
                return;
              }
              handleSubmit();
            };

            return (
              <Flex flexDirection="column" gap="22px">
                <Tabs.Root
                  value={activeTab}
                  onValueChange={(e) => setActiveTab(e.value)}
                  variant="line"
                  colorPalette="brand"
                >
                  <Tabs.List
                    borderBottomWidth="1px"
                    borderColor="#E5E7EB"
                    gap="24px"
                    mb="20px"
                  >
                    <Tabs.Trigger
                      value="basic"
                      px="12px"
                      py="10px"
                      fontSize="13px"
                      fontWeight="500"
                      color="fg.muted"
                      _selected={{
                        color: "#C95C18",
                        borderBottomWidth: "2px",
                        borderColor: "#F47721",
                      }}
                    >
                      Basic Info
                    </Tabs.Trigger>
                    <Tabs.Trigger
                      value="additional"
                      px="12px"
                      py="10px"
                      fontSize="13px"
                      fontWeight="500"
                      color="fg.muted"
                      _selected={{
                        color: "#C95C18",
                        borderBottomWidth: "2px",
                        borderColor: "#F47721",
                      }}
                    >
                      Additional Details
                    </Tabs.Trigger>
                    <Tabs.Trigger
                      value="financial"
                      px="12px"
                      py="10px"
                      fontSize="13px"
                      fontWeight="500"
                      color="fg.muted"
                      _selected={{
                        color: "#C95C18",
                        borderBottomWidth: "2px",
                        borderColor: "#F47721",
                      }}
                    >
                      Financial & Dates
                    </Tabs.Trigger>
                    <Tabs.Trigger
                      value="images"
                      px="12px"
                      py="10px"
                      fontSize="13px"
                      fontWeight="500"
                      color="fg.muted"
                      _selected={{
                        color: "#C95C18",
                        borderBottomWidth: "2px",
                        borderColor: "#F47721",
                      }}
                    >
                      Images
                    </Tabs.Trigger>
                  </Tabs.List>

                  <Tabs.Content value="basic" pt={0}>
                    <Grid
                      templateColumns={{
                        base: "1fr",
                        md: "repeat(2, minmax(0, 1fr))",
                      }}
                      gap="22px"
                    >
                      <CustomInput
                        label="Asset Code"
                        name="asset_code"
                        method="text"
                        viewOnly={isViewMode}
                        isRequired
                      />
                      <CustomInput
                        label="Asset Name"
                        name="asset_name"
                        method="text"
                        viewOnly={isViewMode}
                        isRequired
                      />
                      <CustomInput
                        label="Vehicle Number"
                        name="vehicle_number"
                        method="text"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Engine Number"
                        name="engine_number"
                        method="text"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Chassis Number"
                        name="chassis_number"
                        method="text"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Acquisition Type"
                        name="acquisition_type"
                        method="text"
                        viewOnly={isViewMode}
                        isRequired
                      />
                      <CustomInput
                        label="Dependency Type"
                        name="dependency_type"
                        method="text"
                        viewOnly={isViewMode}
                        isRequired
                      />
                      <CustomInput
                        label="Working Status"
                        name="working_status"
                        method="text"
                        viewOnly={isViewMode}
                        isRequired
                      />
                      <CustomInput
                        label="Branch"
                        name="branch_id"
                        method="dropdown"
                        options={branchOptions}
                        placeholder="Select branch"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Is Depreciation Applicable"
                        name="is_depreciation_applicable"
                        method="dropdown"
                        options={DEPRECIATION_OPTIONS}
                        viewOnly={isViewMode}
                        isRequired
                      />
                      <CustomInput
                        label="Asset Description"
                        name="asset_description"
                        method="text"
                        viewOnly={isViewMode}
                      />
                    </Grid>
                  </Tabs.Content>

                  <Tabs.Content value="additional" pt={0}>
                    <Grid
                      templateColumns={{
                        base: "1fr",
                        md: "repeat(2, minmax(0, 1fr))",
                      }}
                      gap="22px"
                    >
                      <CustomInput
                        label="Customer Asset No"
                        name="customer_asset_no"
                        method="text"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Sub Category"
                        name="sub_category"
                        method="text"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="HSN Code"
                        name="hsn_code"
                        method="text"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Barcode Option"
                        name="barcode_option"
                        method="text"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Barcode No"
                        name="barcode_no"
                        method="text"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Serial Number"
                        name="serial_number"
                        method="text"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Model Number"
                        name="model_number"
                        method="text"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Seller"
                        name="seller"
                        method="text"
                        viewOnly={isViewMode}
                      />
                    </Grid>
                  </Tabs.Content>

                  <Tabs.Content value="financial" pt={0}>
                    <Grid
                      templateColumns={{
                        base: "1fr",
                        md: "repeat(2, minmax(0, 1fr))",
                      }}
                      gap="22px"
                    >
                      <CustomInput
                        label="Purchased Price"
                        name="purchased_price"
                        type="number"
                        method="text"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Salvage Value"
                        name="salvage_value"
                        type="number"
                        method="text"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Asset Life Span"
                        name="asset_life_span"
                        type="number"
                        method="text"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Purchased Date"
                        name="purchased_date"
                        method="date-picker"
                        type="date"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Placed in Service"
                        name="placed_in_service"
                        method="date-picker"
                        type="date"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Capitalization Date"
                        name="capitalization_date"
                        method="date-picker"
                        type="date"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Exp End Date"
                        name="exp_end_date"
                        method="date-picker"
                        type="date"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Bill No"
                        name="bill_no"
                        method="text"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Bill Date"
                        name="bill_date"
                        method="date-picker"
                        type="date"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Received Date"
                        name="received_date"
                        method="date-picker"
                        type="date"
                        viewOnly={isViewMode}
                      />
                    </Grid>
                  </Tabs.Content>

                  <Tabs.Content value="images" pt={0}>
                    <Box maxW="480px">
                      <CustomInput
                        label="Transport Image"
                        name="image_url"
                        method="image-upload"
                        placeholder="Upload transport image"
                        viewOnly={isViewMode}
                      />
                    </Box>
                  </Tabs.Content>
                </Tabs.Root>

                {!isViewMode && (
                  <Flex gap="12px" justifyContent="flex-end">
                    <Button
                      variant="subtle"
                      onClick={() => router.push("/tms/transports")}
                    >
                      Cancel
                    </Button>
                    <Button onClick={onFormSubmit}>
                      {isEditMode ? "Update" : "Create"}
                    </Button>
                  </Flex>
                )}
              </Flex>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default TransportForm;
