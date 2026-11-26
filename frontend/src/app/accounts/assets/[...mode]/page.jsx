"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Yup from "yup";
import toast from "react-hot-toast";
import { Button, Flex, Grid, Text, Box } from "@chakra-ui/react";
import { Formik } from "formik";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import AgGrid from "@/components/AgGrid";
import useAccountAssetById from "@/api/customHooks/useAccountAssetById";
import {
  createAccountAsset,
  updateAccountAsset,
} from "@/api/helpers/account_assets";

const VALIDATION_SCHEMA = Yup.object({
  label: Yup.string()
    .trim()
    .max(255, "Label must be at most 255 characters")
    .required("Label is required"),
});

const INITIAL_VALUES = {
  label: "",
};

function AssetsForm({ params }) {
  const router = useRouter();
  const { mode } = params;
  const action = mode?.[0];
  const accountAssetId = mode?.[1];

  const isViewMode = action === "view";
  const isEditMode = action === "edit";
  const isAddMode = action === "create";

  const { asset, loading } = useAccountAssetById(
    isEditMode || isViewMode ? accountAssetId : null
  );

  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);

  useEffect(() => {
    if ((isEditMode || isViewMode) && asset) {
      setInitialValues({
        label: asset.label ?? "",
      });
    }
  }, [asset, isEditMode, isViewMode]);

  const getTitle = () => {
    if (isAddMode) return "New Current Asset";
    if (isEditMode) return `Edit Current Asset #${accountAssetId}`;
    return `Current Asset #${accountAssetId}`;
  };

  const handleSubmit = async (values) => {
    try {
      const payload = { label: (values.label || "").trim() };

      if (isAddMode) {
        await toast.promise(createAccountAsset(payload), {
          loading: "Creating account asset...",
          success: (response) => {
            if (response.code === 200) {
              router.push("/accounts/assets");
              return "Current Asset created successfully!";
            }
            throw new Error(response.message || "Error creating account asset");
          },
          error: (err) => err.message || "Error creating account asset",
        });
      } else if (isEditMode) {
        await toast.promise(updateAccountAsset(accountAssetId, payload), {
          loading: "Updating account asset...",
          success: (response) => {
            if (response.code === 200) {
              router.push("/accounts/assets");
              return "Current Asset updated successfully!";
            }
            throw new Error(response.message || "Error updating account asset");
          },
          error: (err) => err.message || "Error updating account asset",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPermissionKey = () => {
    if (isAddMode || isEditMode) return "add_account_assets";
    return "view_account_assets";
  };

  const balanceColumnDefs = useMemo(
    () => [
      { field: "branch_name", headerName: "Branch" },
      {
        field: "balance",
        headerName: "Balance",
        valueFormatter: (params) =>
          params.value != null
            ? new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
              }).format(parseFloat(params.value))
            : "-",
      },
    ],
    []
  );

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

  if ((isEditMode || isViewMode) && !asset && !loading) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer title={getTitle()}>
          <Flex flexDirection="column" gap="22px" alignItems="center" p={8}>
            <Text>Current asset not found</Text>
            <Button
              variant="subtle"
              onClick={() => router.push("/accounts/assets")}
            >
              Back to Current Assets
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
                <Box maxW="400px">
                  <CustomInput
                    label="Label"
                    name="label"
                    type="text"
                    placeholder="e.g. Cash, Bank"
                    viewOnly={isViewMode}
                  />
                </Box>
              </Grid>

              {isViewMode && asset?.balances?.length > 0 && (
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    Balances by branch
                  </Text>
                  <AgGrid
                    rowData={asset.balances}
                    columnDefs={balanceColumnDefs}
                    tableKey="accounts-asset-balances"
                    showColumnSettings={false}
                  />
                </Box>
              )}

              <Flex gap="22px" justifyContent="flex-end">
                <Button
                  variant="subtle"
                  onClick={() => router.push("/accounts/assets")}
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

export default AssetsForm;
