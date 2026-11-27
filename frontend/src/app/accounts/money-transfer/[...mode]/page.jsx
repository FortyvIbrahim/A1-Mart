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
import AgGrid from "@/components/AgGrid";
import useAccountAssets from "@/api/customHooks/useAccountAssets";
import useAccountAssetById from "@/api/customHooks/useAccountAssetById";
import useBranches from "@/api/customHooks/useBranches";
import useMoneyTransferById from "@/api/customHooks/useMoneyTransferById";
import {
  createMoneyTransfer,
  updateMoneyTransfer,
} from "@/api/helpers/money_transfers";

const VALIDATION_SCHEMA = Yup.object({
  account_asset_id: Yup.number()
    .nullable()
    .required("Current asset is required"),
  from_branch_id: Yup.number().nullable().required("From branch is required"),
  to_branch_id: Yup.number()
    .nullable()
    .required("To branch is required")
    .test(
      "not-same",
      "From and To branches cannot be the same",
      function (value) {
        return value != null && value !== this.parent.from_branch_id;
      }
    ),
  amount: Yup.number()
    .typeError("Amount must be a number")
    .min(0, "Amount must be 0 or more")
    .required("Amount is required")
    .test(
      "decimals",
      "Amount can have at most 2 decimal places",
      (value) => value == null || /^\d+(\.\d{1,2})?$/.test(String(value))
    ),
});

const INITIAL_VALUES = {
  account_asset_id: "",
  from_branch_id: "",
  to_branch_id: "",
  amount: "",
};

function MoneyTransferForm({ params }) {
  const router = useRouter();
  const { mode } = params;
  const action = mode?.[0];
  const moneyTransferId = mode?.[1];

  const isViewMode = action === "view";
  const isEditMode = action === "edit";
  const isAddMode = action === "create";

  const { assets } = useAccountAssets();
  const { branches } = useBranches();
  const { transfer, loading: transferLoading } = useMoneyTransferById(
    isEditMode || isViewMode ? moneyTransferId : null
  );

  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  const { asset: selectedAsset, loading: assetLoading } =
    useAccountAssetById(selectedAssetId);

  useEffect(() => {
    if ((isEditMode || isViewMode) && transfer) {
      setInitialValues({
        account_asset_id: transfer.account_asset_id ?? null,
        from_branch_id: transfer.from_branch_id ?? null,
        to_branch_id: transfer.to_branch_id ?? null,
        amount: transfer.amount ?? "",
      });
      setSelectedAssetId(transfer.account_asset_id ?? null);
    }
  }, [transfer, isEditMode, isViewMode]);

  const assetOptions = useMemo(
    () =>
      (assets || []).map((a) => ({
        value: a.account_asset_id,
        label: a.label,
      })),
    [assets]
  );

  const branchOptions = useMemo(
    () =>
      (branches || []).map((b) => ({
        value: b.branch_id,
        label: b.branch_name,
      })),
    [branches]
  );

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

  const getTitle = () => {
    if (isAddMode) return "New Money Transfer";
    if (isEditMode) return `Edit Money Transfer #${moneyTransferId}`;
    return `Money Transfer #${moneyTransferId}`;
  };

  const getPermissionKey = () => {
    if (isAddMode || isEditMode) return "add_money_transfer";
    return "view_money_transfer";
  };

  const handleSubmit = async (values) => {
    try {
      const amount = parseFloat(Number(values.amount).toFixed(2));
      const fromBranchId = values.from_branch_id;

      if (selectedAsset?.balances && fromBranchId != null) {
        const fromBalanceEntry = selectedAsset.balances.find(
          (b) => String(b.branch_id) === String(fromBranchId)
        );
        const fromBalance = parseFloat(fromBalanceEntry?.balance ?? 0);
        if (amount > fromBalance) {
          toast.error("Not enough balance in the from branch");
          return;
        }
      }

      const payload = {
        account_asset_id: Number(values.account_asset_id),
        from_branch_id: Number(values.from_branch_id),
        to_branch_id: Number(values.to_branch_id),
        amount,
      };

      if (isAddMode) {
        await toast.promise(createMoneyTransfer(payload), {
          loading: "Creating money transfer...",
          success: (response) => {
            if (response.code === 200) {
              router.push("/accounts/money-transfer");
              return "Money transfer created successfully!";
            }
            throw new Error(
              response.message || "Error creating money transfer"
            );
          },
          error: (err) => err.message || "Error creating money transfer",
        });
      } else if (isEditMode) {
        await toast.promise(updateMoneyTransfer(moneyTransferId, payload), {
          loading: "Updating money transfer...",
          success: (response) => {
            if (response.code === 200) {
              router.push("/accounts/money-transfer");
              return "Money transfer updated successfully!";
            }
            throw new Error(
              response.message || "Error updating money transfer"
            );
          },
          error: (err) => err.message || "Error updating money transfer",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if ((isEditMode || isViewMode) && transferLoading) {
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

  if ((isEditMode || isViewMode) && !transfer && !transferLoading) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer pageForm title={getTitle()}>
          <Flex flexDirection="column" gap="22px" alignItems="center" p={8}>
            <Text>Money transfer not found</Text>
            <Button
              variant="subtle"
              onClick={() => router.push("/accounts/money-transfer")}
            >
              Back to Money Transfers
            </Button>
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
          {({ handleSubmit, values, setFieldValue }) => {
            const currentAssetId =
              values.account_asset_id != null && values.account_asset_id !== ""
                ? Number(values.account_asset_id)
                : null;
            const showBalances = currentAssetId != null && selectedAsset;

            return (
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
                      label="Current Asset"
                      name="account_asset_id"
                      method="dropdown"
                      placeholder="Select current asset"
                      options={assetOptions}
                      viewOnly={isViewMode}
                      onChange={(e) => {
                        const val =
                          e?.target?.value != null ? e.target.value : e;
                        const id =
                          val !== "" && val != null ? Number(val) : null;
                        setSelectedAssetId(id);
                      }}
                    />
                  </Box>
                </Grid>

                {showBalances && !isViewMode && (
                  <AgGrid
                    rowData={selectedAsset.balances || []}
                    columnDefs={balanceColumnDefs}
                    tableKey="money-transfer-balances"
                    showColumnSettings={false}
                  />
                )}

                <Grid
                  templateColumns={{
                    base: "1fr",
                    md: "repeat(3, minmax(0, 1fr))",
                  }}
                  gap="22px"
                >
                  <Box maxW="400px">
                    <CustomInput
                      label="From Branch"
                      name="from_branch_id"
                      method="dropdown"
                      placeholder="Select from branch"
                      options={branchOptions}
                      viewOnly={isViewMode}
                    />
                  </Box>
                  <Box maxW="400px">
                    <CustomInput
                      label="To Branch"
                      name="to_branch_id"
                      method="dropdown"
                      placeholder="Select to branch"
                      options={branchOptions}
                      viewOnly={isViewMode}
                    />
                  </Box>
                  <Box maxW="400px">
                    <CustomInput
                      label="Amount"
                      name="amount"
                      type="number"
                      placeholder="0.00"
                      viewOnly={isViewMode}
                      min={0}
                      step={0.01}
                    />
                  </Box>
                </Grid>

                <Flex gap="22px" justifyContent="flex-end">
                  <Button
                    variant="subtle"
                    onClick={() => router.push("/accounts/money-transfer")}
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
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default MoneyTransferForm;
