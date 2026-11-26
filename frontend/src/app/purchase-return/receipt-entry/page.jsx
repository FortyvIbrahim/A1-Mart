"use client";

import React, { useCallback } from "react";
import PurchaseReturnListing from "@/components/PurchaseReturn/PurchaseReturnListing";

function getReceiptEntryActions(params) {
  const id = params.data?.purchase_return_id;
  const receiptEntryDone = !!params.data?.receipt_entry_handled_by_employee;

  if (!receiptEntryDone) {
    return [];
  }

  return [
    {
      label: "View",
      value: "view",
      redirectionUrl: `/purchase-return/receipt-entry/view/${id}`,
    },
    {
      label: "Edit",
      value: "edit",
      redirectionUrl: `/purchase-return/receipt-entry/edit/${id}`,
    },
  ];
}

function ReceiptEntryListing() {
  const getActions = useCallback(
    (params, _handleDeleteClick) => getReceiptEntryActions(params),
    []
  );

  return (
    <PurchaseReturnListing
      title="Purchase Return - Receipt Entry"
      permissionKey="view_purchase_return_issue_entry"
      tableKey="purchase-return-receipt-entry"
      addLink="/purchase-return/receipt-entry/create"
      addPermission="add_purchase_return_issue_entry"
      type="receipt-entry"
      getActions={getActions}
    />
  );
}

export default ReceiptEntryListing;
