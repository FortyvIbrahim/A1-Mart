"use client";

import useBranchById from "@/api/customHooks/useBranchById";
import { createBranch, updateBranch } from "@/api/helpers/branches";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Box, Button, Flex, Grid, GridItem } from "@chakra-ui/react";
import { Formik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { use, useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import * as Yup from "yup";

const BRANCH_VALIDATION_SCHEMA = Yup.object().shape({
  branch_name: Yup.string()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .test(
      "optional-length",
      "Must be at least 2 characters",
      (value) => !value || value.trim().length >= 2
    )
    .test(
      "optional-max-length",
      "Must be less than 100 characters",
      (value) => !value || value.trim().length <= 100
    ),
  branch_nickname: Yup.string()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .test(
      "optional-length",
      "Must be at least 2 characters",
      (value) => !value || value.trim().length >= 2
    )
    .test(
      "optional-max-length",
      "Must be less than 50 characters",
      (value) => !value || value.trim().length <= 50
    ),
  branch_phone: Yup.string()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .test(
      "optional-phone-format",
      "Please enter a valid phone number",
      (value) => !value || /^[0-9+\-\s()]+$/.test(value)
    )
    .test(
      "optional-phone-length",
      "Must be at least 10 digits",
      (value) => !value || value.replace(/[^0-9]/g, "").length >= 10
    )
    .test(
      "optional-phone-max-length",
      "Must be less than 15 digits",
      (value) => !value || value.replace(/[^0-9]/g, "").length <= 15
    ),
  branch_address: Yup.string()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .test(
      "optional-length",
      "Must be at least 10 characters",
      (value) => !value || value.trim().length >= 10
    )
    .test(
      "optional-max-length",
      "Must be less than 200 characters",
      (value) => !value || value.trim().length <= 200
    ),
  phone: Yup.string()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .test(
      "optional-phone-format",
      "Must be valid phone numbers separated by commas",
      (value) => !value || /^[0-9,\-\s()]+$/.test(value)
    ),
  cluster_size: Yup.string()
    .oneOf(["small", "medium", "large"], "Invalid cluster size")
    .nullable(),
});

const INITIAL_VALUES = {
  branch_name: "",
  branch_nickname: "",
  branch_phone: "",
  branch_address: "",
  phone: "",
  cluster_size: null,
};

function BatchForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const branchId = mode[1];
  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  const { fetchData, branch } = useBranchById(branchId ?? 0);
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);

  useEffect(() => {
    if (isEditMode || isViewMode) {
      fetchData();
    }
  }, [isEditMode, isViewMode]);

  useEffect(() => {
    if (branch) {
      setInitialValues({
        branch_name: branch.branch_name,
        branch_nickname: branch.branch_nickname,
        branch_phone: branch.branch_phone,
        branch_address: branch.branch_address,
        phone: branch.phone,
        cluster_size: branch.cluster_size ?? null,
      });
    }
  }, [branch]);

  const handleSubmit = (values) => {
    toast.promise(
      isCreateMode ? createBranch(values) : updateBranch(branchId, values),
      {
        loading: "Creating Branch!",
        success: (data) => {
          if (data.code === 200) {
            router.push("/branches");
            return "Successfully Created Branch!";
          }

          throw data;
        },
        error: (err) => {
          console.log(err);
          return "Error Creating Branch!";
        },
      }
    );
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_branches";
    }

    return "view_branches";
  };

  const clusterSizeOptions = useMemo(
    () => [
      { value: "small", label: "Small" },
      { value: "medium", label: "Medium" },
      { value: "large", label: "Large" },
    ],
    []
  );

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer
        title={isViewMode ? "Branch Details" : isEditMode ? "Edit Branch" : "Add Branch"}
      >
        <Formik
          initialValues={initialValues}
          validationSchema={BRANCH_VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit, setFieldValue }) => (
            <Box>
              <Flex flexDirection="column" gap="22px">
                <Grid templateColumns="repeat(3, 1fr)" gap="22px">
                  <CustomInput
                    label="Name"
                    placeholder=""
                    name="branch_name"
                    method="text"
                    type="text"
                    viewOnly={true}
                  />

                  <CustomInput
                    label="Nickname"
                    placeholder=""
                    name="branch_nickname"
                    method="text"
                    type="text"
                    viewOnly={isViewMode}
                  />

                  <CustomInput
                    label="Primary Phone Number"
                    placeholder=""
                    name="branch_phone"
                    method="text"
                    type="tel"
                    viewOnly={isViewMode}
                  />
                </Grid>

                <Grid templateColumns="repeat(3, 1fr)" gap="22px">
                  <CustomInput
                    label="Address"
                    placeholder=""
                    name="branch_address"
                    method="text"
                    type="text"
                    viewOnly={isViewMode}
                  />

                  <CustomInput
                    label="Phone Numbers (Separated by ,)"
                    placeholder=""
                    name="phone"
                    method="text"
                    type="text"
                    viewOnly={isViewMode}
                  />

                  <CustomInput
                    label="Cluster Size"
                    placeholder="Select cluster size..."
                    name="cluster_size"
                    method="dropdown"
                    options={clusterSizeOptions}
                    viewOnly={isViewMode}
                  />
                </Grid>
              </Flex>
              <Flex gap="22px" justifyContent="flex-end" mt="22px">
                <Link href="/branches">
                  <Button variant="subtle">Back</Button>
                </Link>
                {(isCreateMode || isEditMode) && (
                  <Button onClick={handleSubmit}>
                    {isCreateMode ? "Create" : "Update"}
                  </Button>
                )}
              </Flex>
            </Box>
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default BatchForm;
