"use client";

import React, { useCallback, useMemo } from "react";
import { useListFilters } from "@/components/ListFilters";
import { Button } from "@chakra-ui/react";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import useReceipts from "@/api/customHooks/useReceipts";
import useDeleteModal from "@/customHooks/useDeleteModal";
import Link from "next/link";
import usePermission from "@/customHooks/usePermission";


const LIST_FILTERS = [
  { key: "branch", type: "select", label: "Branch", placeholder: "All branches", getValue: (r) => r.branch_name },
  { key: "from", type: "dateFrom", label: "Voucher From", getValue: (r) => r.voucher_date },
  { key: "to", type: "dateTo", label: "Voucher To", getValue: (r) => r.voucher_date },
  { key: "createdBy", type: "select", label: "Created By", placeholder: "All users", getValue: (r) => r.created_by_name },
];

function ReceiptsList() {
  const { receipts, deleteReceipt } = useReceipts();
  const canAdd = usePermission("add_receipts");
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();

  const handleDeleteClick = useCallback(
    (receiptId) => {
      openDeleteModal({
        title: "Delete Receipt Entry",
        message:
          "Are you sure you want to delete this receipt? This action cannot be undone.",
        onDelete: () => deleteReceipt(receiptId),
      });
    },
    [openDeleteModal, deleteReceipt]
  );

  const colDefs = useMemo(
    () => [
      {
        field: "receipt_id",
        headerName: "ID",
        type: "id",
      },
      {
        field: "voucher_date",
        headerName: "Voucher Date",
        type: "date",
        valueGetter: (params) =>
          params.data?.voucher_date ? new Date(params.data.voucher_date) : null,
      },
      {
        field: "branch_name",
        headerName: "Branch",
        type: "capitalize",
      },
      {
        field: "total_amount",
        headerName: "Total Amount",
        type: "currency",
      },
      {
        field: "created_by_name",
        headerName: "Created By",
        type: "capitalize",
      },
      {
        field: "receipt_id",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => [
          {
            label: "View",
            value: "view",
            redirectionUrl: `/accounts/receipts/view/${params.data.receipt_id}`,
          },
          {
            label: "Edit",
            value: "edit",
            redirectionUrl: `/accounts/receipts/edit/${params.data.receipt_id}`,
          },
          {
            label: "Delete",
            value: "delete",
            type: "danger",
            onClick: () => handleDeleteClick(params.data.receipt_id),
          },
        ],
      },
    ],
    [handleDeleteClick]
  );

  const { filtered: filteredRows, filterCard } = useListFilters(receipts, LIST_FILTERS);

  return (
    <GlobalWrapper permissionKey="view_receipts">
      <CustomContainer
        title="Receipt Entry"
        rightSection={
          canAdd && (
            <Link href="/accounts/receipts/create">
              <Button size="sm">Add</Button>
            </Link>
          )
        }
      >
        <div style={{ marginBottom: 16 }}>{filterCard}</div>
        <AgGrid
          rowData={filteredRows}
          columnDefs={colDefs}
          tableKey="accounts-receipts"
        />
      </CustomContainer>
      <DeleteModalComponent />
    </GlobalWrapper>
  );
}

export default ReceiptsList;

