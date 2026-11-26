"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Yup from "yup";
import toast from "react-hot-toast";
import { Button, Flex, Grid, Text } from "@chakra-ui/react";
import { Formik } from "formik";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import useLedgerById from "@/api/customHooks/useLedgerById";
import { createLedger, updateLedger } from "@/api/helpers/ledgers";

const LEDGER_CATEGORIES = [
  { value: 1, label: "Expense" },
  { value: 2, label: "Income" },
  { value: 3, label: "Sundry Creditors" },
];

const VALIDATION_SCHEMA = Yup.object({
  label: Yup.string()
    .trim()
    .max(255, "Label must be at most 255 characters")
    .required("Label is required"),
  category: Yup.number().required("Category is required"),
});

const INITIAL_VALUES = {
  label: "",
  category: null,
};

function LedgersForm({ params }) {
  const router = useRouter();
  const { mode } = params;
  const action = mode?.[0];
  const ledgerId = mode?.[1];

  const isViewMode = action === "view";
  const isEditMode = action === "edit";
  const isAddMode = action === "create";

  const { ledger, loading } = useLedgerById(
    isEditMode || isViewMode ? ledgerId : null
  );

  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);

  useEffect(() => {
    if ((isEditMode || isViewMode) && ledger) {
      setInitialValues({
        label: ledger.label ?? "",
        category: ledger.category ?? null,
      });
    }
  }, [ledger, isEditMode, isViewMode]);

  const categoryOptions = useMemo(
    () =>
      LEDGER_CATEGORIES.map((c) => ({
        value: c.value,
        label: c.label,
      })),
    []
  );

  const getTitle = () => {
    if (isAddMode) return "New Master";
    if (isEditMode) return `Edit Master #${ledgerId}`;
    return `Master #${ledgerId}`;
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        label: (values.label || "").trim(),
        category: Number(values.category),
      };

      if (isAddMode) {
        await toast.promise(createLedger(payload), {
          loading: "Creating ledger...",
          success: (response) => {
            if (response.code === 200) {
              router.push("/accounts/ledgers");
              return "Master created successfully!";
            }
            throw new Error(response.message || "Error creating ledger");
          },
          error: (err) => err.message || "Error creating ledger",
        });
      } else if (isEditMode) {
        await toast.promise(updateLedger(ledgerId, payload), {
          loading: "Updating ledger...",
          success: (response) => {
            if (response.code === 200) {
              router.push("/accounts/ledgers");
              return "Master updated successfully!";
            }
            throw new Error(response.message || "Error updating ledger");
          },
          error: (err) => err.message || "Error updating ledger",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPermissionKey = () => {
    if (isAddMode || isEditMode) return "add_ledgers";
    return "view_ledgers";
  };

  if ((isEditMode || isViewMode) && loading) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer title={getTitle()}>
          <Flex justifyContent="center" p={8}>
            Loading...
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if ((isEditMode || isViewMode) && !ledger && !loading) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer title={getTitle()}>
          <Flex flexDirection="column" gap="22px" alignItems="center" p={8}>
            <Text>Master not found</Text>
            <Button
              variant="subtle"
              onClick={() => router.push("/accounts/ledgers")}
            >
              Back to Master
            </Button>
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer title={getTitle()}>
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
                  label="Label"
                  name="label"
                  type="text"
                  placeholder="Master name"
                  viewOnly={isViewMode}
                />
                <CustomInput
                  label="Category"
                  name="category"
                  method="dropdown"
                  placeholder="Select category"
                  options={categoryOptions}
                  viewOnly={isViewMode}
                />
              </Grid>

              <Flex gap="22px" justifyContent="flex-end">
                <Button
                  variant="subtle"
                  onClick={() => router.push("/accounts/ledgers")}
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

export default LedgersForm;
