"use client";

import React, { useCallback, useMemo } from "react";
import { useListFilters } from "@/components/ListFilters";
import { Button } from "@chakra-ui/react";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import usePayments from "@/api/customHooks/usePayments";
import useDeleteModal from "@/customHooks/useDeleteModal";
import Link from "next/link";
import usePermission from "@/customHooks/usePermission";


const LIST_FILTERS = [
  { key: "branch", type: "select", label: "Branch", placeholder: "All branches", getValue: (r) => r.branch_name },
  { key: "from", type: "dateFrom", label: "Voucher From", getValue: (r) => r.voucher_date },
  { key: "to", type: "dateTo", label: "Voucher To", getValue: (r) => r.voucher_date },
  { key: "createdBy", type: "select", label: "Created By", placeholder: "All users", getValue: (r) => r.created_by_name },
];

function PaymentsList() {
  const { payments, deletePayment } = usePayments();
  const canAdd = usePermission("add_payments");
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();

  const handleDeleteClick = useCallback(
    (paymentId) => {
      openDeleteModal({
        title: "Delete Payment Entry",
        message:
          "Are you sure you want to delete this payment? This action cannot be undone.",
        onDelete: () => deletePayment(paymentId),
      });
    },
    [openDeleteModal, deletePayment]
  );

  const colDefs = useMemo(
    () => [
      {
        field: "payment_id",
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
        field: "payment_id",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => [
          {
            label: "View",
            value: "view",
            redirectionUrl: `/accounts/payments/view/${params.data.payment_id}`,
          },
          {
            label: "Edit",
            value: "edit",
            redirectionUrl: `/accounts/payments/edit/${params.data.payment_id}`,
          },
          {
            label: "Delete",
            value: "delete",
            type: "danger",
            onClick: () => handleDeleteClick(params.data.payment_id),
          },
        ],
      },
    ],
    [handleDeleteClick]
  );

  const { filtered: filteredRows, filterCard } = useListFilters(payments, LIST_FILTERS);

  return (
    <GlobalWrapper permissionKey="view_payments">
      <CustomContainer contentCard
        title="Payment Entry"
        rightSection={
          canAdd && (
            <Link href="/accounts/payments/create">
              <Button size="sm">Add</Button>
            </Link>
          )
        }
      >
        {filterCard}
        <AgGrid
          rowData={filteredRows}
          columnDefs={colDefs}
          tableKey="accounts-payments"
        />
      </CustomContainer>
      <DeleteModalComponent />
    </GlobalWrapper>
  );
}

export default PaymentsList;
