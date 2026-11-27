"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Yup from "yup";
import moment from "moment";
import toast from "react-hot-toast";
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Text,
  IconButton,
  Field,
} from "@chakra-ui/react";
import { Formik, FieldArray } from "formik";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import useAccountAssets from "@/api/customHooks/useAccountAssets";
import useBranches from "@/api/customHooks/useBranches";
import useLedgers from "@/api/customHooks/useLedgers";
import usePaymentById from "@/api/customHooks/usePaymentById";
import { useUser } from "@/contexts/UserContext";
import usePermission from "@/customHooks/usePermission";
import { createPayment, updatePayment } from "@/api/helpers/payments";
import { uploadAsset } from "@/api/helpers/assets";
import { formatAccountCurrency, formatCurrency } from "@/utils/string";

const VALIDATION_SCHEMA = Yup.object({
  voucher_date: Yup.date().required("Voucher date is required"),
  branch_id: Yup.number().nullable(),
  account_asset_id: Yup.number().required("Current asset is required"),
  items: Yup.array()
    .of(
      Yup.object({
        ledger_id: Yup.number().required("Master is required"),
        amount: Yup.number()
          .typeError("Amount must be a number")
          .positive("Amount must be greater than 0")
          .required("Amount is required"),
        narration: Yup.string().trim().required("Narration is required"),
        file_url: Yup.string().nullable(),
      })
    )
    .min(1, "At least one payment item is required"),
});

const EMPTY_ITEM = {
  ledger_id: null,
  amount: "",
  narration: "",
  file_url: "",
};

const INITIAL_VALUES = {
  voucher_date: new Date(),
  branch_id: null,
  account_asset_id: 1,
  items: [EMPTY_ITEM],
};

function PaymentsForm({ params }) {
  const router = useRouter();
  const { mode } = params;
  const action = mode?.[0];
  const paymentId = mode?.[1];

  const isViewMode = action === "view";
  const isEditMode = action === "edit";
  const isAddMode = action === "create";

  const { branches } = useBranches();
  const { assets } = useAccountAssets();
  const { ledgers } = useLedgers();
  const { payment, loading } = usePaymentById(
    isEditMode || isViewMode ? paymentId : null
  );

  const { employeeData } = useUser();
  const canAccessAllBranches = usePermission("access_all_branches");

  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const [isStoreSelected, setIsStoreSelected] = useState(false);

  useEffect(() => {
    if ((isEditMode || isViewMode) && payment) {
      setInitialValues({
        voucher_date: payment.voucher_date
          ? new Date(payment.voucher_date)
          : new Date(),
        branch_id: payment.branch_id ?? null,
        account_asset_id: payment.account_asset_id ?? null,
        items:
          payment.items?.length > 0
            ? payment.items.map((item) => ({
                ledger_id: item.ledger_id,
                amount: item.amount ?? "",
                narration: item.narration ?? "",
                file_url: item.file_url ?? "",
              }))
            : [EMPTY_ITEM],
      });
    }
  }, [payment, isEditMode, isViewMode]);

  // Pre-select branch based on user's branch; lock only if user cannot access all branches
  useEffect(() => {
    if (isAddMode && employeeData) {
      setInitialValues((prev) => ({
        ...prev,
        branch_id: employeeData.branch_id ?? prev.branch_id,
      }));
      setIsStoreSelected(!canAccessAllBranches);
    } else {
      setIsStoreSelected(false);
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

  const assetOptions = useMemo(
    () =>
      (assets || []).map((asset) => ({
        value: asset.account_asset_id,
        label: asset.label,
      })),
    [assets]
  );

  const ledgerOptions = useMemo(
    () =>
      (ledgers || [])
        .filter((ledger) => [1, 3].includes(ledger.category))
        .map((ledger) => ({
          value: ledger.ledger_id,
          label: ledger.label,
        })),
    [ledgers]
  );

  const getTitle = () => {
    if (isAddMode) return "New Payment Entry";
    if (isEditMode) return `Edit Payment Entry #${paymentId}`;
    return `Payment Entry #${paymentId}`;
  };

  const handleSubmit = async (values) => {
    try {
      // First, resolve file URLs for each item:
      // - If existing value is a string, send as-is
      // - If it's a File object, upload via assets helper and use the returned URL
      const resolvedItems = [];
      const baseName = `payment_${moment(values.voucher_date).format(
        "YYYYMMDD"
      )}`;

      for (let index = 0; index < (values.items || []).length; index++) {
        const item = values.items[index];
        let fileUrl = item.file_url || null;

        if (fileUrl && typeof fileUrl !== "string") {
          const toastId = toast.loading("Uploading attachment...");
          try {
            const response = await uploadAsset(
              fileUrl,
              `${baseName}_item_${index + 1}`,
              "payments",
              "file"
            );
            toast.dismiss(toastId);
            if (response.code === 200) {
              fileUrl = response.remoteUrl;
            } else {
              throw new Error(response.message || "Failed to upload file");
            }
          } catch (err) {
            toast.dismiss(toastId);
            toast.error("Error uploading attachment!");
            throw err;
          }
        }

        resolvedItems.push({
          ledger_id: item.ledger_id,
          amount: Number(item.amount) || 0,
          narration: item.narration || null,
          file_url: fileUrl,
        });
      }

      const payload = {
        voucher_date: moment(values.voucher_date).format("YYYY-MM-DD"),
        branch_id: values.branch_id || undefined,
        account_asset_id: values.account_asset_id ?? undefined,
        items: resolvedItems,
      };

      if (isAddMode) {
        await toast.promise(createPayment(payload), {
          loading: "Creating payment...",
          success: (response) => {
            if (response.code === 200) {
              router.push("/accounts/payments");
              return "Payment Entry created successfully!";
            } else if (
              response.app_code === "INSUFFICIENT_ACCOUNT_ASSET_BALANCE"
            ) {
              throw new Error("Insufficient account asset balance");
            }
            throw new Error(response.message || "Error creating payment");
          },
          error: (err) => err.message || "Error creating payment",
        });
      } else if (isEditMode) {
        await toast.promise(updatePayment(paymentId, payload), {
          loading: "Updating payment...",
          success: (response) => {
            if (response.code === 200) {
              router.push("/accounts/payments");
              return "Payment Entry updated successfully!";
            } else if (
              response.app_code === "INSUFFICIENT_ACCOUNT_ASSET_BALANCE"
            ) {
              throw new Error("Insufficient account asset balance");
            }
            throw new Error(response.message || "Error updating payment");
          },
          error: (err) => err.message || "Error updating payment",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPermissionKey = () => {
    if (isAddMode || isEditMode) {
      return "add_payments";
    }

    return "view_payments";
  };

  if ((isEditMode || isViewMode) && loading) {
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

  if ((isEditMode || isViewMode) && !payment && !loading) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer pageForm title={getTitle()}>
          <Flex flexDirection="column" gap="22px" alignItems="center" p={8}>
            <Text>Payment Entry not found</Text>
            <Button
              variant="subtle"
              onClick={() => router.push("/accounts/payments")}
            >
              Back to Payment Entry
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
          {({ handleSubmit, values }) => (
            <Flex flexDirection="column" gap="22px">
              <Grid
                templateColumns={{
                  base: "1fr",
                  md: "repeat(3, minmax(0, 1fr))",
                }}
                gap="22px"
              >
                <Box>
                  <CustomInput
                    label="Current Asset"
                    name="account_asset_id"
                    method="dropdown"
                    placeholder="Select current asset"
                    options={assetOptions}
                    viewOnly={isViewMode}
                  />
                  {values.account_asset_id &&
                    (values.branch_id ?? employeeData?.branch_id) && (
                      <Text fontSize="sm" color="gray.600" mt={4}>
                        Available balance:{" "}
                        {formatAccountCurrency(
                          parseFloat(
                            (assets || [])
                              .find(
                                (a) =>
                                  a.account_asset_id == values.account_asset_id
                              )
                              ?.balances?.find(
                                (b) =>
                                  String(b.branch_id) ===
                                  String(
                                    values.branch_id ?? employeeData?.branch_id
                                  )
                              )?.balance ?? "0"
                          ) || 0
                        )}
                      </Text>
                    )}
                </Box>
                <CustomInput
                  label="Voucher Date"
                  name="voucher_date"
                  method="date-picker"
                  type="date"
                  placeholder="DD/MM/YYYY"
                  viewOnly={isViewMode}
                />
                <CustomInput
                  label="Branch"
                  name="branch_id"
                  method="dropdown"
                  placeholder="Select branch"
                  options={branchOptions}
                  viewOnly={isViewMode}
                  disabled={isStoreSelected}
                />
              </Grid>

              <Box>
                <CustomContainer pageForm
                  title="Payment Entry Items"
                  size="sm"
                  color="secondary"
                >
                  <FieldArray
                    name="items"
                    render={(arrayHelpers) => (
                      <Box>
                        {values.items && values.items.length > 0 ? (
                          <Flex direction="column" gap={3}>
                            {values.items.map((item, index) => {
                              const selectedLedger = ledgers?.find(
                                (l) => l.ledger_id == item.ledger_id
                              );
                              const branchId = values.branch_id;
                              const branchBalance =
                                selectedLedger?.balances?.find(
                                  (b) =>
                                    String(b.branch_id) ===
                                    String(branchId ?? employeeData?.branch_id)
                                )?.balance ?? 0;

                              return (
                                <Grid
                                  key={index}
                                  templateColumns={{
                                    base: "1fr",
                                    md: isViewMode
                                      ? "1fr 1fr 1fr 1fr"
                                      : "1fr 0.25fr 1fr 1fr 1fr auto",
                                  }}
                                  gap={3}
                                  alignItems="flex-end"
                                >
                                  <CustomInput
                                    label="Master"
                                    name={`items[${index}].ledger_id`}
                                    method="searchable-dropdown"
                                    placeholder="Select master"
                                    options={ledgerOptions}
                                    viewOnly={isViewMode}
                                  />

                                  {!isViewMode && (
                                    <Flex
                                      justifyContent="center"
                                      alignItems="center"
                                    >
                                      <Field.Root w="fit-content">
                                        <Field.Label color={"brand500"}>
                                          <Flex
                                            justifyContent="space-between"
                                            w="100%"
                                            alignItems="center"
                                          >
                                            <Text lineClamp={1} fontSize="xs">
                                              Balance
                                            </Text>
                                          </Flex>
                                        </Field.Label>

                                        {Number(branchBalance).toFixed(2)}
                                      </Field.Root>
                                    </Flex>
                                  )}

                                  <CustomInput
                                    label="Amount"
                                    name={`items[${index}].amount`}
                                    type="number"
                                    placeholder="0.00"
                                    viewOnly={isViewMode}
                                  />

                                  <CustomInput
                                    label="Narration"
                                    name={`items[${index}].narration`}
                                    type="text"
                                    viewOnly={isViewMode}
                                  />
                                  <CustomInput
                                    label="File URL"
                                    name={`items[${index}].file_url`}
                                    method="file"
                                    viewOnly={isViewMode}
                                  />
                                  {!isViewMode && (
                                    <Flex alignItems="flex-end" pb={2}>
                                      <IconButton
                                        aria-label="Remove item"
                                        size="sm"
                                        variant="outline"
                                        colorPalette="red"
                                        onClick={() =>
                                          arrayHelpers.remove(index)
                                        }
                                        disabled={
                                          (values.items?.length ?? 0) <= 1
                                        }
                                      >
                                        <i className="fa fa-trash" />
                                      </IconButton>
                                    </Flex>
                                  )}
                                </Grid>
                              );
                            })}

                            {!isViewMode && (
                              <Button
                                size="xs"
                                variant="outline"
                                alignSelf="flex-start"
                                onClick={() => arrayHelpers.push(EMPTY_ITEM)}
                              >
                                <i
                                  className="fa fa-plus"
                                  style={{ marginRight: 6 }}
                                />
                                Add Item
                              </Button>
                            )}
                          </Flex>
                        ) : (
                          !isViewMode && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => arrayHelpers.push(EMPTY_ITEM)}
                            >
                              <i
                                className="fa fa-plus"
                                style={{ marginRight: 6 }}
                              />
                              Add Item
                            </Button>
                          )
                        )}
                      </Box>
                    )}
                  />
                </CustomContainer>
              </Box>

              <Flex gap="22px" justifyContent="flex-end">
                <Button
                  variant="subtle"
                  onClick={() => router.push("/accounts/payments")}
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

export default PaymentsForm;
