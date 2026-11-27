"use client";

import React, { useCallback, useMemo } from "react";
import { useListFilters } from "@/components/ListFilters";
import { Button } from "@chakra-ui/react";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import useMoneyTransfers from "@/api/customHooks/useMoneyTransfers";
import useDeleteModal from "@/customHooks/useDeleteModal";
import Link from "next/link";
import usePermission from "@/customHooks/usePermission";
import { formatCurrency } from "@/utils/string";


const LIST_FILTERS = [
  { key: "fromBranch", type: "select", label: "From Branch", placeholder: "All branches", getValue: (r) => r.from_branch_name },
  { key: "toBranch", type: "select", label: "To Branch", placeholder: "All branches", getValue: (r) => r.to_branch_name },
  { key: "asset", type: "select", label: "Current Asset", placeholder: "All current assets", getValue: (r) => r.account_asset_label },
];

function MoneyTransferList() {
  const { transfers, deleteMoneyTransfer } = useMoneyTransfers();
  const canAdd = usePermission("add_money_transfer");
  const canDelete = usePermission("delete_money_transfer");
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();

  const handleDeleteClick = useCallback(
    (moneyTransferId) => {
      openDeleteModal({
        title: "Delete Money Transfer",
        message:
          "Are you sure you want to delete this money transfer? Balances will be reversed (amount added back to source branch and removed from destination branch).",
        onDelete: () => deleteMoneyTransfer(moneyTransferId),
      });
    },
    [openDeleteModal, deleteMoneyTransfer]
  );

  const colDefs = useMemo(
    () => [
      {
        field: "money_transfer_id",
        headerName: "ID",
        type: "id",
      },
      {
        field: "from_branch_name",
        headerName: "From Branch",
      },
      {
        field: "to_branch_name",
        headerName: "To Branch",
      },
      {
        field: "amount",
        headerName: "Amount",
        type: "currency",
      },
      {
        field: "account_asset_label",
        headerName: "Current Asset",
      },
      {
        field: "created_at",
        headerName: "Created",
        hideByDefault: true,
        type: "datetime",
      },
      {
        field: "money_transfer_id",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => {
          const actions = [
            {
              label: "View",
              value: "view",
              redirectionUrl: `/accounts/money-transfer/view/${params.data.money_transfer_id}`,
            },
            {
              label: "Edit",
              value: "edit",
              redirectionUrl: `/accounts/money-transfer/edit/${params.data.money_transfer_id}`,
            },
          ];
          if (canDelete) {
            actions.push({
              label: "Delete",
              value: "delete",
              type: "danger",
              onClick: () => handleDeleteClick(params.data.money_transfer_id),
            });
          }
          return actions;
        },
      },
    ],
    [handleDeleteClick, canDelete]
  );

  const { filtered: filteredRows, filterCard } = useListFilters(transfers, LIST_FILTERS);

  return (
    <GlobalWrapper permissionKey="view_money_transfer">
      <CustomContainer contentCard
        title="Money Transfers"
        rightSection={
          canAdd && (
            <Link href="/accounts/money-transfer/create">
              <Button size="sm">Add</Button>
            </Link>
          )
        }
      >
        {filterCard}
        <AgGrid
          rowData={filteredRows}
          columnDefs={colDefs}
          tableKey="accounts-money-transfers"
        />
      </CustomContainer>
      <DeleteModalComponent />
    </GlobalWrapper>
  );
}

export default MoneyTransferList;
