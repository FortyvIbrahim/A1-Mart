"use client";

import useEmployeeById from "@/api/customHooks/useEmployeeById";
import { updateEmployee } from "@/api/helpers/employee";
import { uploadAsset } from "@/api/helpers/assets";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Button, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import { Formik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { use, useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as Yup from "yup";
import { capitalizeWords } from "@/utils/string";
import { REST_DAY_DROPDOWN_OPTIONS } from "@/utils/restDay";
import useBranches from "@/api/customHooks/useBranches";
import useDesignations from "@/api/customHooks/useDesignations";
import useDepartments from "@/api/customHooks/useDepartments";
import useSections from "@/api/customHooks/useSections";
import { INCENTIVE_TYPES } from "@/constants/incentive_type";
import { DRIVER_DESIGNATION_ID } from "@/constants/designation";

const VEHICLE_CLASSES = [
  { value: "TRANS", label: "TRANS" },
  { value: "LMV", label: "LMV" },
  { value: "HTV", label: "HTV" },
  { value: "MCWG", label: "MCWG" },
];

const VALIDATION_SCHEMA = Yup.object({
  employee_name: Yup.string().nullable(),
  mobile_number: Yup.string()
    .nullable()
    .matches(/^[0-9]{10}$/, "Must be 10 digits"),
  email_id: Yup.string().nullable().email("Invalid email format"),
  account_no: Yup.string().nullable().max(50, "Must be at most 50 characters"),
  ifsc_code: Yup.string().nullable().max(20, "Must be at most 20 characters"),
  pf_uan: Yup.string().nullable().max(50, "Must be at most 50 characters"),
  buyer_alias: Yup.string().nullable().max(255, "Must be at most 255 characters"),
  religion: Yup.string()
    .oneOf(["hindu", "muslim", "christian", null], "Invalid religion")
    .nullable(),
  rest_day: Yup.mixed()
    .nullable()
    .test(
      "rest-day-range",
      "Rest day must be Sunday–Saturday (1–7) or unset",
      (v) =>
        v === "" ||
        v == null ||
        (Number.isFinite(Number(v)) && Number(v) >= 1 && Number(v) <= 7)
    ),
  driver_details: Yup.object()
    .nullable()
    .when("designation_id", {
      is: (id) => Number(id) === DRIVER_DESIGNATION_ID,
      then: (schema) =>
        schema
          .shape({
            dl_number: Yup.string().nullable(),
            dl_file: Yup.mixed().nullable(), // string (URL) or File
            vehicle_classes: Yup.array().nullable(),
            valid_till: Yup.date().nullable(),
          })
          .test("driver-full-required", function (value) {
            if (!value) return true;
            const dlFileFilled =
              value.dl_file &&
              (typeof value.dl_file === "string"
                ? String(value.dl_file).trim()
                : true);
            const hasAny =
              (value.dl_number && String(value.dl_number).trim()) ||
              dlFileFilled ||
              (Array.isArray(value.vehicle_classes) &&
                value.vehicle_classes.length > 0) ||
              value.valid_till;
            if (!hasAny) return true;
            if (!value.dl_number || !String(value.dl_number).trim())
              return this.createError({
                message: "DL number is required when driver details are filled",
              });
            const hasDlFile =
              value.dl_file &&
              (typeof value.dl_file === "string"
                ? String(value.dl_file).trim()
                : true);
            if (!hasDlFile)
              return this.createError({
                message: "DL file is required when driver details are filled",
              });
            if (
              !Array.isArray(value.vehicle_classes) ||
              value.vehicle_classes.length === 0
            )
              return this.createError({
                message:
                  "Select at least one vehicle class when driver details are filled",
              });
            if (!value.valid_till)
              return this.createError({
                message:
                  "Valid till is required when driver details are filled",
              });
            return true;
          }),
      otherwise: (schema) => schema.nullable().strip(),
    }),
});

const INITIAL_VALUES = {
  employee_code: "",
  employee_name: "",
  mobile_number: "",
  email_id: "",
  designation_id: null,
  branch_id: null,
  department_id: null,
  section_id: null,
  rest_day: "",
  profile_img_url: null,
  account_no: "",
  ifsc_code: "",
  pf_uan: "",
  buyer_alias: "",
  incentive_type: "",
  gender: "",
  religion: null,
  driver_details: {
    dl_number: "",
    dl_file: "",
    vehicle_classes: [],
    valid_till: null,
  },
};

const RELIGION_OPTIONS = [
  { value: "hindu", label: "Hindu" },
  { value: "muslim", label: "Muslim" },
  { value: "christian", label: "Christian" },
];

const GENDER_MAP = {
  M: "Male",
  F: "Female",
  O: "Other",
  null: "-",
};

export default function EmployeeForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const employeeCode = mode[1];
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const { employee, loading } = useEmployeeById(employeeCode);

  const { branches } = useBranches();
  const { designations } = useDesignations();
  const { departments } = useDepartments();
  const { sections } = useSections();

  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  useEffect(() => {
    if ((isEditMode || isViewMode) && employee) {
      const dd = employee.driver_details;
      setInitialValues({
        employee_code: employee.employee_code || "",
        employee_name: employee.employee_name || "",
        mobile_number: employee.mobile_number || "",
        email_id: employee.email_id || "",
        designation_id: employee.designation_id || null,
        branch_id: employee.branch_id || null,
        department_id: employee.department_id || null,
        rest_day: (() => {
          const r = Number(employee.rest_day);
          return Number.isFinite(r) && r >= 1 && r <= 7 ? r : "";
        })(),
        section_id: employee.section_id || null,
        profile_img_url: employee.profile_img_url || null,
        account_no: employee.account_no || "",
        ifsc_code: employee.ifsc_code || "",
        pf_uan: employee.pf_uan ?? "",
        buyer_alias: employee.buyer_alias ?? "",
        incentive_type: employee.incentive_type || "",
        gender: GENDER_MAP[employee.gender] ?? "-",
        religion: employee.religion ?? null,
        driver_details: {
          dl_number: dd?.dl_number ?? "",
          dl_file: dd?.dl_file ?? "",
          vehicle_classes: Array.isArray(dd?.vehicle_classes)
            ? dd.vehicle_classes
            : [],
          valid_till: dd?.valid_till ? new Date(dd.valid_till) : null,
        },
      });
    }
  }, [isEditMode, isViewMode, employee]);

  const getTitle = () => {
    if (isEditMode) {
      return `Edit Employee : ${employee?.employee_name || employeeCode}`;
    }

    return `Employee : ${employee?.employee_name || employeeCode}`;
  };

  const handleSubmit = async (values) => {
    try {
      const { profile_img_url } = values;
      let image_url = null;

      if (!profile_img_url) {
        image_url = null;
      } else if (typeof profile_img_url === "string") {
        // Already a URL, use it directly
        image_url = profile_img_url;
      } else {
        // It's a File object, need to upload
        const toastId = toast.loading("Uploading image...");
        let response = null;

        try {
          response = await uploadAsset(
            profile_img_url,
            values.employee_name || employeeCode,
            "employees",
            "image"
          );
        } catch (err) {
          console.error(err);
          toast.dismiss(toastId);
          toast.error("Error uploading image!");
          throw err;
        }

        toast.dismiss(toastId);
        if (response.code === 200) {
          image_url = response.remoteUrl;
        } else {
          throw new Error(response.message);
        }
      }

      const toNullableId = (v) => {
        if (v === null || v === undefined || v === "") return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      const data = {
        profile_img_url: image_url,
        designation_id: toNullableId(values.designation_id),
        branch_id: toNullableId(values.branch_id),
        department_id: toNullableId(values.department_id),
        rest_day:
          values.rest_day === "" || values.rest_day == null
            ? null
            : Number(values.rest_day),
        account_no: values.account_no || null,
        ifsc_code: values.ifsc_code || null,
        pf_uan: values.pf_uan || null,
        buyer_alias: values.buyer_alias || null,
        incentive_type: values.incentive_type || null,
        religion: values.religion || null,
      };

      const isDriver =
        values.designation_id != null &&
        Number(values.designation_id) === DRIVER_DESIGNATION_ID;
      const dd = values.driver_details;
      const hasAnyDriverField =
        (dd?.dl_number && String(dd.dl_number).trim()) ||
        (dd?.dl_file &&
          (typeof dd.dl_file === "string"
            ? String(dd.dl_file).trim()
            : true)) ||
        (Array.isArray(dd?.vehicle_classes) && dd.vehicle_classes.length > 0) ||
        dd?.valid_till;

      let dl_file_url = null;
      if (dd?.dl_file) {
        if (typeof dd.dl_file === "string") {
          dl_file_url = dd.dl_file.trim() || null;
        } else {
          const toastId = toast.loading("Uploading DL file...");
          try {
            const response = await uploadAsset(
              dd.dl_file,
              `${values.employee_name || employeeCode}-dl`,
              "employees",
              "document"
            );
            toast.dismiss(toastId);
            if (response?.code === 200 && response?.remoteUrl) {
              dl_file_url = response.remoteUrl;
            } else {
              throw new Error(response?.message || "Failed to upload DL file");
            }
          } catch (err) {
            console.error(err);
            toast.dismiss(toastId);
            toast.error("Error uploading DL file!");
            throw err;
          }
        }
      }

      if (isDriver && hasAnyDriverField) {
        data.driver_details = {
          dl_number: dd.dl_number?.trim() || null,
          dl_file: dl_file_url,
          vehicle_classes: Array.isArray(dd.vehicle_classes)
            ? dd.vehicle_classes
            : [],
          valid_till: dd.valid_till
            ? typeof dd.valid_till === "string"
              ? dd.valid_till
              : new Date(dd.valid_till).toISOString().slice(0, 10)
            : null,
        };
      } else if (isDriver && dd) {
        data.driver_details = null;
      }

      toast.promise(updateEmployee(employeeCode, data), {
        loading: "Updating employee...",
        success: (response) => {
          if (response.code === 200) {
            router.push("/employees");
            return "Employee Updated!";
          } else {
            throw new Error(response.message);
          }
        },
        error: (err) => {
          console.error(err);
          return err.message || "Error updating employee!";
        },
      });
    } catch (err) {
      console.error(err);
      toast.error("Error updating employee!");
    }
  };

  const getPermissionKey = () => {
    if (isEditMode) {
      return "add_employees";
    }

    return "view_employees";
  };

  if (loading) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer pageForm title={getTitle()}>
          <Flex justifyContent="center" p={8}>
            Loading...
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (!employee && !loading) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer pageForm title={getTitle()}>
          <Flex flexDirection="column" gap="22px" alignItems="center" p={8}>
            <p>Employee not found</p>
            <Link href="/employees">
              <Button variant="subtle">Back</Button>
            </Link>
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer pageForm title={getTitle()}>
        <Formik
          initialValues={initialValues}
          validationSchema={VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit, values, setFieldValue, errors }) => {
            const isDriverDesignation =
              values.designation_id != null &&
              Number(values.designation_id) === DRIVER_DESIGNATION_ID;
            const branchOptions = branches?.map((branch) => ({
              value: branch.branch_id,
              label: branch.branch_name,
            }));

            const designationOptions = designations?.map((designation) => ({
              value: designation.designation_id,
              label: designation.designation_name,
            }));

            const departmentOptions = departments?.map((department) => ({
              value: department.department_id,
              label: department.department_name,
            }));

            const sectionOptions = sections?.map((section) => ({
              value: section.section_id,
              label: section.section_name || section.section_code,
            }));

            return (
              <Flex flexDirection="column" gap="22px">
                <Grid
                  templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                  gap="22px"
                >
                  <>
                    <CustomInput
                      label="Employee Code"
                      name="employee_code"
                      type="text"
                      viewOnly={true}
                    />

                    <CustomInput
                      label="Employee Name"
                      name="employee_name"
                      type="text"
                      viewOnly
                    />

                    <CustomInput
                      label="Buyer Alias"
                      name="buyer_alias"
                      type="text"
                      placeholder="Alternate name used in stock reports"
                      viewOnly={isViewMode}
                    />

                    <CustomInput
                      label="Mobile Number"
                      name="mobile_number"
                      type="text"
                      viewOnly
                    />

                    <CustomInput
                      label="Email"
                      name="email_id"
                      type="email"
                      viewOnly
                    />

                    <CustomInput
                      label="Designation"
                      name="designation_id"
                      method="dropdown"
                      placeholder="Select designation"
                      options={designationOptions}
                      viewOnly={isViewMode}
                    />

                    <CustomInput
                      label="Branch"
                      name="branch_id"
                      method="dropdown"
                      placeholder="Select branch"
                      options={branchOptions}
                      viewOnly={isViewMode}
                    />

                    <CustomInput
                      label="Department"
                      name="department_id"
                      method="dropdown"
                      placeholder="Select department"
                      options={departmentOptions}
                      viewOnly={isViewMode}
                    />

                    <CustomInput
                      label="Rest day"
                      name="rest_day"
                      method="dropdown"
                      placeholder="Select rest day"
                      options={REST_DAY_DROPDOWN_OPTIONS}
                      viewOnly={isViewMode}
                    />

                    <CustomInput
                      label="Section"
                      name="section_id"
                      method="dropdown"
                      placeholder="Select section"
                      options={sectionOptions}
                      viewOnly
                    />

                    <CustomInput label="Gender" name="gender" viewOnly />

                    <CustomInput
                      label="Religion"
                      name="religion"
                      method="dropdown"
                      options={RELIGION_OPTIONS}
                      placeholder="-"
                      viewOnly={isViewMode}
                    />

                    <CustomInput
                      label="Account Number"
                      name="account_no"
                      type="text"
                      placeholder="Bank account number"
                      viewOnly={isViewMode}
                    />

                    <CustomInput
                      label="IFSC Code"
                      name="ifsc_code"
                      type="text"
                      placeholder="IFSC code"
                      viewOnly={isViewMode}
                    />

                    <CustomInput
                      label="PF UAN"
                      name="pf_uan"
                      type="text"
                      placeholder="Provident Fund UAN"
                      viewOnly={isViewMode}
                    />

                    <CustomInput
                      label="Incentive Type"
                      name="incentive_type"
                      method="dropdown"
                      options={Object.values(INCENTIVE_TYPES).map((item) => ({
                        value: item.key,
                        label: item.label,
                      }))}
                      placeholder="Select incentive type"
                      viewOnly={isViewMode}
                    />

                    <GridItem colSpan={2}>
                      <CustomInput
                        label="Profile Image"
                        name="profile_img_url"
                        method="image-upload"
                        placeholder="Upload profile image"
                        viewOnly={isViewMode}
                      />
                    </GridItem>
                  </>
                </Grid>

                {isDriverDesignation && (
                  <CustomContainer pageForm title="Driver Details" size="sm">
                    <Grid
                      templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                      gap="22px"
                    >
                      <CustomInput
                        label="DL Number"
                        name="driver_details.dl_number"
                        type="text"
                        placeholder="Driver license number"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="Valid Till"
                        name="driver_details.valid_till"
                        method="date-picker"
                        placeholder="License validity end date"
                        viewOnly={isViewMode}
                      />
                      <CustomInput
                        label="DL File"
                        name="driver_details.dl_file"
                        method="file"
                        accept="image/*,.pdf"
                        viewOnly={isViewMode}
                      />
                      <GridItem colSpan={{ base: 1, md: 2 }}>
                        <CustomInput
                          label="Vehicle classes"
                          name="driver_details.vehicle_classes"
                          method="checkbox-group"
                          options={VEHICLE_CLASSES}
                          viewOnly={isViewMode}
                        />
                      </GridItem>
                      {typeof errors.driver_details === "string" && (
                        <GridItem colSpan={2}>
                          <Text fontSize="sm" color="red.500">
                            {errors.driver_details}
                          </Text>
                        </GridItem>
                      )}
                    </Grid>
                  </CustomContainer>
                )}

                <Flex gap="22px" justifyContent="flex-end">
                  <Link href="/employees">
                    <Button variant="subtle">Back</Button>
                  </Link>
                  {isEditMode && <Button onClick={handleSubmit}>Update</Button>}
                </Flex>
              </Flex>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}
