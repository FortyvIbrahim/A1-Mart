"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Box, Flex, Grid, Text, Spinner, NativeSelect } from "@chakra-ui/react";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import useAccountAssets from "@/api/customHooks/useAccountAssets";
import useBranches from "@/api/customHooks/useBranches";
import useLedgers from "@/api/customHooks/useLedgers";
import usePaymentItems from "@/api/customHooks/usePaymentItems";
import useReceiptItems from "@/api/customHooks/useReceiptItems";
import useMoneyTransfers from "@/api/customHooks/useMoneyTransfers";
import { useUser } from "@/contexts/UserContext";

// Virtual "ledger" for money transfer rows in cashbook (filter Master = "Money Transfer")
const LEDGER_ID_MONEY_TRANSFER = "money_transfer";
const LEDGER_LABEL_MONEY_TRANSFER = "Money Transfer";
import usePermission from "@/customHooks/usePermission";
import DatePicker from "react-datepicker";
import { CustomDateTimeInput } from "@/components/CustomInput";
import moment from "moment";
import { formatAccountCurrency, formatCurrency } from "@/utils/string";

function Cashbook() {
  const { branches } = useBranches();
  const { assets } = useAccountAssets();
  const { ledgers } = useLedgers();
  const { employeeData } = useUser();
  const canAccessAllBranches = usePermission("access_all_branches");
  const canEditPayment = usePermission("add_payments");
  const canEditReceipt = usePermission("add_receipts");

  const {
    items: paymentItems,
    loading: loadingPaymentItems,
    refresh: refreshPaymentItems,
  } = usePaymentItems({
    allBranches: canAccessAllBranches,
  });
  const {
    items: receiptItems,
    loading: loadingReceiptItems,
    refresh: refreshReceiptItems,
  } = useReceiptItems({
    allBranches: canAccessAllBranches,
  });
  const { transfers: moneyTransfers, loading: loadingMoneyTransfers } =
    useMoneyTransfers();

  // Default date range: current month
  const [dateRange, setDateRange] = useState({
    startDate: moment().startOf("month").toDate(),
    endDate: moment().endOf("month").toDate(),
  });

  // Branch filter
  const [selectedBranch, setSelectedBranch] = useState(null);
  // Account asset filter
  const [selectedAccountAsset, setSelectedAccountAsset] = useState(null);
  // Master filter (when set, debit/credit columns are swapped in the UI)
  const [selectedLedger, setSelectedLedger] = useState(null);

  useEffect(() => {
    if (employeeData && !canAccessAllBranches) {
      setSelectedBranch(employeeData.branch_id ?? null);
    } else {
      setSelectedBranch(null);
    }
  }, [employeeData, canAccessAllBranches]);

  const entries = useMemo(() => {
    if (!paymentItems && !receiptItems && !moneyTransfers) return [];

    const allRows = [];

    // Helper to check branch filter
    const branchMatches = (branchId) => {
      if (!selectedBranch) return true;
      return String(branchId) === String(selectedBranch);
    };

    // Helper to check account asset filter
    const assetMatches = (accountAssetId) => {
      if (!selectedAccountAsset) return true;
      return String(accountAssetId) === String(selectedAccountAsset);
    };

    // Helper to check ledger filter
    const ledgerMatches = (ledgerId) => {
      if (!selectedLedger) return true;
      return String(ledgerId) === String(selectedLedger);
    };

    // Build full chronological list for running balance
    (paymentItems || []).forEach((item) => {
      if (!branchMatches(item.branch_id)) return;
      if (!assetMatches(item.account_asset_id)) return;
      if (!ledgerMatches(item.ledger_id)) return;

      const createdAt = item.created_at || item.voucher_date;

      allRows.push({
        type: "payment",
        payment_id: item.payment_id,
        account_asset_id: item.account_asset_id,
        ledger_id: item.ledger_id,
        createdAt: createdAt
          ? new Date(createdAt)
          : new Date(item.voucher_date),
        date: item.voucher_date
          ? new Date(item.voucher_date)
          : new Date(createdAt),
        branch_name: item.branch_name,
        details:
          item.narration ||
          item.ledger_label ||
          `Payment to ledger #${item.ledger_id}`,
        // Payments should appear under Credit in the UI
        debit: null,
        credit: Number(item.amount) || 0,
        file_url: item.file_url,
        ledger_label: item.ledger_label,
        account_asset_label: item.account_asset_label,
      });
    });

    (receiptItems || []).forEach((item) => {
      if (!branchMatches(item.branch_id)) return;
      if (!assetMatches(item.account_asset_id)) return;
      if (!ledgerMatches(item.ledger_id)) return;

      const createdAt = item.created_at || item.voucher_date;

      allRows.push({
        type: "receipt",
        receipt_id: item.receipt_id,
        account_asset_id: item.account_asset_id,
        ledger_id: item.ledger_id,
        createdAt: createdAt
          ? new Date(createdAt)
          : new Date(item.voucher_date),
        date: item.voucher_date
          ? new Date(item.voucher_date)
          : new Date(createdAt),
        branch_name: item.branch_name,
        details:
          item.narration ||
          item.ledger_label ||
          `Receipt from ledger #${item.ledger_id}`,
        // Receipts should appear under Debit in the UI
        debit: Number(item.amount) || 0,
        credit: null,
        file_url: item.file_url,
        ledger_label: item.ledger_label,
        account_asset_label: item.account_asset_label,
      });
    });

    // Money transfer: 2 entries per transfer — from branch (credit), to branch (debit)
    (moneyTransfers || []).forEach((t) => {
      const date = t.created_at ? new Date(t.created_at) : new Date();
      const amount = Number(t.amount) || 0;
      if (!branchMatches(t.from_branch_id)) return;
      if (!assetMatches(t.account_asset_id)) return;
      if (!ledgerMatches(LEDGER_ID_MONEY_TRANSFER)) return;
      allRows.push({
        type: "money_transfer",
        money_transfer_id: t.money_transfer_id,
        account_asset_id: t.account_asset_id,
        ledger_id: LEDGER_ID_MONEY_TRANSFER,
        createdAt: date,
        date,
        branch_name: t.from_branch_name,
        details: null,
        debit: null,
        credit: amount,
        ledger_label: LEDGER_LABEL_MONEY_TRANSFER,
        account_asset_label: t.account_asset_label,
      });
    });
    (moneyTransfers || []).forEach((t) => {
      const date = t.created_at ? new Date(t.created_at) : new Date();
      const amount = Number(t.amount) || 0;
      if (!branchMatches(t.to_branch_id)) return;
      if (!assetMatches(t.account_asset_id)) return;
      if (!ledgerMatches(LEDGER_ID_MONEY_TRANSFER)) return;
      allRows.push({
        type: "money_transfer",
        money_transfer_id: t.money_transfer_id,
        account_asset_id: t.account_asset_id,
        ledger_id: LEDGER_ID_MONEY_TRANSFER,
        createdAt: date,
        date,
        branch_name: t.to_branch_name,
        details: null,
        debit: amount,
        credit: null,
        ledger_label: LEDGER_LABEL_MONEY_TRANSFER,
        account_asset_label: t.account_asset_label,
      });
    });

    // Sort all rows by voucher_date (date), then createdAt as tiebreaker
    allRows.sort((a, b) => {
      const dA = a.date?.getTime?.() ?? 0;
      const dB = b.date?.getTime?.() ?? 0;
      if (dA !== dB) return dA - dB;
      const cA = a.createdAt?.getTime?.() ?? 0;
      const cB = b.createdAt?.getTime?.() ?? 0;
      return cA - cB;
    });

    // When a ledger is selected, debit/credit display is swapped (ledger view).
    // Use the same convention for opening/running balance:
    // - Cashbook view: delta = debit - credit (receipts increase, payments decrease cash balance).
    // - Ledger view (swapped): delta = credit - debit so running balance matches the swapped column values (displayed Credit − displayed Debit).
    const getDelta = (row) => {
      const d = row.debit ?? 0;
      const c = row.credit ?? 0;
      return selectedLedger ? c - d : d - c;
    };
    const deltas = allRows.map(getDelta);
    const prefixBefore = [];
    let acc = 0;
    for (let i = 0; i < deltas.length; i++) {
      prefixBefore[i] = acc;
      acc += deltas[i];
    }

    // Apply date range filter only for display
    const { startDate, endDate } = dateRange;
    const isInRange = (date) => {
      if (!date) return false;
      const d = moment(date);
      return (
        (!startDate || d.isSameOrAfter(startDate, "day")) &&
        (!endDate || d.isSameOrBefore(endDate, "day"))
      );
    };

    // Build final rows with correct running balance:
    // - For the first row in-range, runningBalance = balance BEFORE that row
    // - For subsequent rows, runningBalance += delta (credit - debit)
    const result = [];
    let runningBalance = 0;
    let isFirstInRange = true;

    allRows.forEach((row, index) => {
      if (!isInRange(row.date)) {
        return;
      }

      const delta = deltas[index];

      if (isFirstInRange) {
        // Opening balance (from previous data) PLUS this row's delta
        runningBalance = prefixBefore[index] + delta;
        isFirstInRange = false;
      } else {
        runningBalance += delta;
      }

      result.push({
        ...row,
        sno: result.length + 1,
        runningBalance,
      });
    });

    return result;
  }, [
    paymentItems,
    receiptItems,
    moneyTransfers,
    dateRange,
    selectedBranch,
    selectedAccountAsset,
    selectedLedger,
  ]);

  const loading =
    loadingPaymentItems || loadingReceiptItems || loadingMoneyTransfers;

  // When a ledger is selected, swap debit and credit columns in the UI
  const swapDebitCredit = Boolean(selectedLedger);

  const colDefs = useMemo(
    () => [
      {
        field: "sno",
        headerName: "S.No",
        type: "id",
        maxWidth: 100,
      },
      {
        field: "date",
        headerName: "Date",
        type: "date",
        valueGetter: (params) =>
          params.data?.date ? new Date(params.data.date) : null,
      },
      {
        field: "branch_name",
        headerName: "Branch",
        type: "capitalize",
      },
      {
        field: "account_asset_label",
        headerName: "Account",
        type: "capitalize",
      },
      {
        field: "ledger_label",
        headerName: "Master",
        type: "capitalize",
      },
      {
        field: "details",
        headerName: "Narration",
      },
      {
        field: "file_url",
        headerName: "File",
        type: "file",
        hideByDefault: true,
      },
      {
        field: "debit",
        headerName: "Debit",
        type: "currency",
        ...(swapDebitCredit && {
          valueGetter: (params) => params.data?.credit ?? null,
        }),
      },
      {
        field: "credit",
        headerName: "Credit",
        type: "currency",
        ...(swapDebitCredit && {
          valueGetter: (params) => params.data?.debit ?? null,
        }),
      },
      {
        field: "runningBalance",
        headerName: "Running Balance",
        type: "currency",
        useRenderedForExport: true,
        cellRenderer: (params) => formatAccountCurrency(params.value),
      },
      {
        field: "actions",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => {
          const row = params.data;
          if (!row) return [];
          if (
            row.type === "payment" &&
            canEditPayment &&
            row.payment_id != null
          ) {
            return [
              {
                label: "Edit",
                value: "edit-payment",
                redirectionUrl: `/accounts/payments/edit/${row.payment_id}`,
                target: "_blank",
              },
            ];
          }
          if (
            row.type === "receipt" &&
            canEditReceipt &&
            row.receipt_id != null
          ) {
            return [
              {
                label: "Edit",
                value: "edit-receipt",
                redirectionUrl: `/accounts/receipts/edit/${row.receipt_id}`,
                target: "_blank",
              },
            ];
          }
          return [];
        },
      },
    ],
    [swapDebitCredit, canEditPayment, canEditReceipt]
  );

  return (
    <GlobalWrapper permissionKey="view_cashbook">
      <CustomContainer title="Ledger">
        {/* Filters */}
        <Flex
          mb={4}
          gap={4}
          flexDirection={{ base: "column", md: "row" }}
          alignItems={{ base: "flex-start", md: "center" }}
        >
          <Box minW={{ base: "100%", md: "220px" }}>
            <Text fontSize="xs" mb={1} color="gray.500">
              Branch
            </Text>
            <NativeSelect.Root
              width={{ base: "100%", md: "220px" }}
              disabled={!canAccessAllBranches}
            >
              <NativeSelect.Field
                value={selectedBranch || ""}
                color={
                  selectedBranch === "" || !selectedBranch
                    ? "gray.400"
                    : "black"
                }
                onChange={(e) => {
                  setSelectedBranch(e.target.value || null);
                }}
              >
                <option value="">All Branches</option>
                {branches.map((item) => (
                  <option key={item.branch_id} value={item.branch_id}>
                    {item.branch_name}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>

          <Box minW={{ base: "100%", md: "220px" }}>
            <Text fontSize="xs" mb={1} color="gray.500">
              Current Asset
            </Text>
            <NativeSelect.Root width={{ base: "100%", md: "220px" }}>
              <NativeSelect.Field
                value={selectedAccountAsset || ""}
                color={
                  selectedAccountAsset === "" || !selectedAccountAsset
                    ? "gray.400"
                    : "black"
                }
                onChange={(e) => {
                  setSelectedAccountAsset(e.target.value || null);
                }}
              >
                <option value="">All Assets</option>
                {(assets || []).map((asset) => (
                  <option
                    key={asset.account_asset_id}
                    value={asset.account_asset_id}
                  >
                    {asset.label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>

          <Box minW={{ base: "100%", md: "220px" }}>
            <Text fontSize="xs" mb={1} color="gray.500">
              Master
            </Text>
            <NativeSelect.Root width={{ base: "100%", md: "220px" }}>
              <NativeSelect.Field
                value={selectedLedger || ""}
                color={
                  selectedLedger === "" || !selectedLedger
                    ? "gray.400"
                    : "black"
                }
                onChange={(e) => {
                  setSelectedLedger(e.target.value || null);
                }}
              >
                <option value="">All Masters</option>
                <option value={LEDGER_ID_MONEY_TRANSFER}>
                  {LEDGER_LABEL_MONEY_TRANSFER}
                </option>
                {(ledgers || []).map((ledger) => (
                  <option key={ledger.ledger_id} value={ledger.ledger_id}>
                    {ledger.label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>

          <Flex
            gap={3}
            flexWrap="wrap"
            alignItems="center"
            w={"100%"}
            justifyContent={{ base: "flex-start", md: "flex-end" }}
          >
            <Box>
              <Text fontSize="xs" mb={1} color="gray.500">
                From
              </Text>
              <DatePicker
                selected={dateRange.startDate}
                onChange={(date) =>
                  setDateRange((prev) => ({ ...prev, startDate: date }))
                }
                maxDate={dateRange.endDate}
                portalId="root-portal"
                customInput={
                  <CustomDateTimeInput placeholder="DD/MM/YYYY" type="date" />
                }
              />
            </Box>
            <Box>
              <Text fontSize="xs" mb={1} color="gray.500">
                To
              </Text>
              <DatePicker
                selected={dateRange.endDate}
                onChange={(date) =>
                  setDateRange((prev) => ({ ...prev, endDate: date }))
                }
                minDate={dateRange.startDate}
                portalId="root-portal"
                customInput={
                  <CustomDateTimeInput placeholder="DD/MM/YYYY" type="date" />
                }
              />
            </Box>
          </Flex>
        </Flex>

        {loading ? (
          <Flex justifyContent="center" py={10}>
            <Spinner />
          </Flex>
        ) : (
          <AgGrid
            rowData={entries}
            columnDefs={colDefs}
            tableKey="accounts-cashbook"
            defaultRows={100}
            noMobileVersion
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Cashbook;
