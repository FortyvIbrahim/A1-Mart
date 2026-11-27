"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Yup from "yup";
import toast from "react-hot-toast";
import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import { Formik } from "formik";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import useBranches from "@/api/customHooks/useBranches";
import useDesignations from "@/api/customHooks/useDesignations";
import useEmployeeAllocationById from "@/api/customHooks/useEmployeeAllocationById";
import { useUser } from "@/contexts/UserContext";
import usePermission from "@/customHooks/usePermission";
import {
  createEmployeeAllocation,
  updateEmployeeAllocation,
} from "@/api/helpers/employee_allocation";

const VALIDATION_SCHEMA = Yup.object({
  branch_id: Yup.number().required("Branch is required"),
  designation_id: Yup.number().required("Designation is required"),
  required_count: Yup.number()
    .typeError("Required headcount must be a number")
    .integer("Required headcount must be an integer")
    .min(0, "Required headcount cannot be negative")
    .required("Required headcount is required"),
});

const INITIAL_VALUES = {
  branch_id: null,
  designation_id: null,
  required_count: "",
};

function EmployeeAllocationForm({ params }) {
  const router = useRouter();
  const { mode } = params;
  const action = mode?.[0];
  const allocationId = mode?.[1];

  const isViewMode = action === "view";
  const isEditMode = action === "edit";
  const isAddMode = action === "create";

  const { branches } = useBranches();
  const { designations } = useDesignations();
  const { allocation, loading } = useEmployeeAllocationById(
    isEditMode || isViewMode ? allocationId : null
  );

  const { employeeData } = useUser();
  const canAccessAllBranches = usePermission("access_all_branches");

  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const [isBranchLocked, setIsBranchLocked] = useState(false);

  useEffect(() => {
    if ((isEditMode || isViewMode) && allocation) {
      setInitialValues({
        branch_id: allocation.branch_id ?? null,
        designation_id: allocation.designation_id ?? null,
        required_count:
          allocation.required_count !== undefined &&
          allocation.required_count !== null
            ? allocation.required_count
            : "",
      });
    }
  }, [allocation, isEditMode, isViewMode]);

  // Pre-select branch based on user's branch; lock only if user cannot access all branches
  useEffect(() => {
    if (isAddMode && employeeData) {
      setInitialValues((prev) => ({
        ...prev,
        branch_id: employeeData.branch_id ?? prev.branch_id,
      }));
      setIsBranchLocked(!canAccessAllBranches);
    } else {
      setIsBranchLocked(false);
    }
  }, [employeeData, isAddMode, canAccessAllBranches]);

  const branchOptions = useMemo(
    () =>
      (branches || []).map((branch) => ({
        value: branch.branch_id,
        label: branch.branch_name,
      })),
    [branches]
  );

  const designationOptions = useMemo(
    () =>
      (designations || []).map((designation) => ({
        value: designation.designation_id,
        label: designation.designation_name ?? designation.label,
      })),
    [designations]
  );

  const getTitle = () => {
    if (isAddMode) return "New Employee Allocation";
    if (isEditMode) return `Edit Employee Allocation #${allocationId}`;
    return `Employee Allocation #${allocationId}`;
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        branch_id: values.branch_id,
        designation_id: values.designation_id,
        required_count: Number(values.required_count) || 0,
      };

      if (isAddMode) {
        await toast.promise(createEmployeeAllocation(payload), {
          loading: "Creating employee allocation...",
          success: (response) => {
            if (response.code === 200) {
              router.push("/employee-allocation");
              return "Employee allocation created successfully!";
            } else if (response.app_code === "EMPLOYEE_ALLOCATION_DUPLICATE") {
              throw new Error("Employee allocation already exists");
            }
            throw new Error(
              response.message || "Error creating employee allocation"
            );
          },
          error: (err) => err.message || "Error creating employee allocation",
        });
      } else if (isEditMode) {
        await toast.promise(updateEmployeeAllocation(allocationId, payload), {
          loading: "Updating employee allocation...",
          success: (response) => {
            if (response.code === 200) {
              router.push("/employee-allocation");
              return "Employee allocation updated successfully!";
            } else if (response.app_code === "EMPLOYEE_ALLOCATION_DUPLICATE") {
              throw new Error("Employee allocation already exists");
            }
            throw new Error(
              response.message || "Error updating employee allocation"
            );
          },
          error: (err) => err.message || "Error updating employee allocation",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPermissionKey = () => {
    if (isAddMode || isEditMode) {
      return "add_employee_allocation";
    }

    return "view_employee_allocation";
  };

  if ((isEditMode || isViewMode) && loading) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer pageForm headerBand title={getTitle()}>
          <Flex justifyContent="center" p={8}>
            Loading...
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if ((isEditMode || isViewMode) && !allocation && !loading) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer pageForm headerBand title={getTitle()}>
          <Flex flexDirection="column" gap="22px" alignItems="center" p={8}>
            <Text>Employee allocation not found</Text>
            <Button
              variant="subtle"
              onClick={() => router.push("/employee-allocation")}
            >
              Back to Employee Allocation
            </Button>
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer pageForm headerBand title={getTitle()}>
        <Formik
          initialValues={initialValues}
          validationSchema={VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit }) => (
            <Flex flexDirection="column" gap="22px">
              <Grid
                templateColumns={{
                  base: "1fr",
                  md: "repeat(2, minmax(0, 1fr))",
                }}
                gap="22px"
              >
                <CustomInput
                  label="Branch"
                  name="branch_id"
                  method="dropdown"
                  placeholder="Select branch"
                  options={branchOptions}
                  viewOnly={isViewMode}
                  disabled={isBranchLocked}
                />
                <CustomInput
                  label="Designation"
                  name="designation_id"
                  method="searchable-dropdown"
                  placeholder="Select designation"
                  options={designationOptions}
                  viewOnly={isViewMode}
                />
              </Grid>

              <Box>
                <CustomInput
                  label="Required Headcount"
                  name="required_count"
                  type="number"
                  placeholder="0"
                  viewOnly={isViewMode}
                />
              </Box>

              <Flex gap="22px" justifyContent="flex-end">
                <Button
                  variant="subtle"
                  onClick={() => router.push("/employee-allocation")}
                >
                  Back
                </Button>
                {!isViewMode && (
                  <Button onClick={handleSubmit}>
                    {isEditMode ? "Update" : "Create"}
                  </Button>
                )}
              </Flex>
            </Flex>
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default EmployeeAllocationForm;
