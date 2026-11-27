"use client";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useBranches from "@/api/customHooks/useBranches";
import usePermission from "@/customHooks/usePermission";
import { useUser } from "@/contexts/UserContext";
import { createTargetBranch } from "@/api/helpers/target_branch";
import toast from "react-hot-toast";
import useTargetBranchesById from "@/api/customHooks/useTargetBranchesById";
import useTargetBranches from "@/api/customHooks/useTargetBranches";
import moment from "moment";

const VALIDATION_SCHEMA = Yup.object({
  branch_id: Yup.mixed().required("Required"),
  target_month: Yup.string().required("Required"),
  target_amount: Yup.number()
    .typeError("Must be a number")
    .min(0, "Must be at least 0")
    .required("Required"),
});

const INITIAL_VALUES = {
  branch_id: null,
  target_month: null,
  target_amount: null,
};

export default function TargetBranchForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const branchTargetId = mode[1];

  const { targets } = useTargetBranches();

  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const [isStoreSelected, setIsStoreSelected] = useState(false);

  const { target, handleUpdate } = useTargetBranchesById(branchTargetId);

  const { employeeData } = useUser();
  const canAccessAllBranches = usePermission("access_all_branches");

  const { branches } = useBranches();
  const filteredBranches = branches.map((branch) => ({
    value: branch.branch_id,
    label: branch.branch_name,
  }));

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  useEffect(() => {
    if ((isEditMode || isViewMode) && target) {
      setInitialValues({
        branch_id: target.branch_id,
        target_month: target.target_month,
        target_amount: target.target_amount,
      });
    }
  }, [isEditMode, isViewMode, target]);

  useEffect(() => {
    if (!canAccessAllBranches && isCreateMode && employeeData) {
      setInitialValues({
        ...initialValues,
        branch_id: employeeData.branch_id,
      });
      setIsStoreSelected(true);
    } else {
      setIsStoreSelected(false);
    }
  }, [employeeData, isCreateMode, canAccessAllBranches]);

  const getTitle = () => {
    if (isCreateMode) {
      return "Add Branch Target";
    }

    if (isEditMode) {
      return "Edit Branch Target";
    }

    return `Branch Target : #${branchTargetId ?? ""}`;
  };

  const handleSubmit = async (values) => {
    try {
      const data = {
        branch_id: values.branch_id,
        target_month: values.target_month,
        target_amount: values.target_amount,
      };

      if (isEditMode) {
        handleUpdate(data);
        return;
      }

      toast.promise(createTargetBranch(data), {
        loading: "Adding new branch target...",
        success: (response) => {
          if (response.code === 200) {
            router.push("/target/branch");
            return "Branch target added successfully!";
          } else {
            throw new Error(response.message);
          }
        },
        error: (err) => {
          console.error(err);
          return "Error adding branch target!";
        },
      });
    } catch (err) {
      console.error(err);
      toast.error("Error adding branch target!");
    }
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_target_branch";
    }

    return "view_target_branch";
  };

  const handleDateBranchChange = (date, branch_id, setFieldValue) => {
    if (date && branch_id) {
      const existingTarget = targets.find(
        (item) =>
          moment(item.target_month).isSame(date, "month") &&
          item.branch_id == branch_id
      );

      if (existingTarget) {
        setFieldValue("target_amount", existingTarget.target_amount);
      } else {
        setFieldValue("target_amount", "");
      }
    } else {
      setFieldValue("target_amount", "");
    }
  };

  const viewBranchName =
    filteredBranches.find((b) => b.value == initialValues.branch_id)?.label ||
    "—";
  const viewMonthLabel = initialValues.target_month
    ? moment(initialValues.target_month).format("MMM YYYY")
    : "—";

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer pageForm headerBand title={getTitle()}>
        {isViewMode ? (
          <Flex direction="column" gap="20px">
            <Box
              bg="white"
              borderWidth="1px"
              borderColor="border"
              borderRadius="12px"
              p={{ base: "16px", md: "20px" }}
            >
              <Grid
                templateColumns={{ base: "1fr", md: "1fr 1fr 1.2fr" }}
                gap="18px"
                alignItems="center"
              >
                <Box>
                  <Text fontSize="12px" color="fg.muted" mb="4px">
                    Branch
                  </Text>
                  <Text fontSize="14px" fontWeight="600" color="fg">
                    {viewBranchName}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="12px" color="fg.muted" mb="4px">
                    Target Month
                  </Text>
                  <Text fontSize="14px" fontWeight="600" color="fg">
                    {viewMonthLabel}
                  </Text>
                </Box>
                <Box
                  bg="#FFF5ED"
                  borderWidth="1px"
                  borderColor="border"
                  borderRadius="10px"
                  px="18px"
                  py="14px"
                >
                  <Text fontSize="12px" color="fg.muted" mb="4px">
                    Target Amount
                  </Text>
                  <Text fontSize="20px" lineHeight="26px" fontWeight="600" color="#C95C18">
                    {initialValues.target_amount ?? "—"}
                  </Text>
                </Box>
              </Grid>
            </Box>

            <Flex justifyContent="flex-end">
              <Link href="/target/branch">
                <Button variant="subtle">Back</Button>
              </Link>
            </Flex>
          </Flex>
        ) : (
          <Formik
            initialValues={initialValues}
            validationSchema={VALIDATION_SCHEMA}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ handleSubmit, values, setFieldValue }) => {
              return (
                <Flex flexDirection="column" gap="22px">
                  <Grid
                    templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
                    gap="22px"
                  >
                    <CustomInput
                      label="Select Branch"
                      isRequired
                      placeholder="Click here to select branch..."
                      name="branch_id"
                      method="dropdown"
                      options={filteredBranches}
                      disabled={isStoreSelected}
                      onChange={(value) =>
                        handleDateBranchChange(
                          values.target_month,
                          value.target.value,
                          setFieldValue
                        )
                      }
                    />

                    <CustomInput
                      label="Target Month"
                      name="target_month"
                      type="month"
                      method="date-picker"
                      onChange={(value) =>
                        handleDateBranchChange(
                          value,
                          values.branch_id,
                          setFieldValue
                        )
                      }
                    />

                    <CustomInput
                      label="Target Amount"
                      name="target_amount"
                      type="number"
                    />
                  </Grid>

                  <Flex gap="12px" justifyContent="flex-end">
                    <Link href="/target/branch">
                      <Button variant="subtle">Back</Button>
                    </Link>
                    {(isCreateMode || isEditMode) && (
                      <Button
                        bg="#F47721"
                        color="white"
                        _hover={{ bg: "#E06612" }}
                        onClick={handleSubmit}
                      >
                        {isCreateMode ? "Create" : "Update"}
                      </Button>
                    )}
                  </Flex>
                </Flex>
              );
            }}
          </Formik>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}
