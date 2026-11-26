"use client";

import React, { useCallback } from "react";
import PurchaseReturnListing, {
  getNoOfBoxesDelivered,
  getNoOfBoxesPending,
} from "@/components/PurchaseReturn/PurchaseReturnListing";

function getIssueEntryActions(params, handleDeleteClick) {
  const id = params.data?.purchase_return_id;

  const row = params.data;
  let noOfBoxesDelivered = getNoOfBoxesDelivered(row);
  let noOfBoxesPending = getNoOfBoxesPending(row);

  if (noOfBoxesPending === 0 || noOfBoxesDelivered > 0) {
    return [
      {
        label: "View",
        value: "view",
        redirectionUrl: `/purchase-return/issue-entry/view/${id}`,
      },
    ];
  }

  return [
    {
      label: "View",
      value: "view",
      redirectionUrl: `/purchase-return/issue-entry/view/${id}`,
    },
    {
      label: "Edit",
      value: "edit",
      redirectionUrl: `/purchase-return/issue-entry/edit/${id}`,
    },
    {
      label: "Delete",
      value: "delete",
      type: "danger",
      onClick: () => handleDeleteClick(id),
    },
  ];
}

function IssueEntryListing() {
  const getActions = useCallback(getIssueEntryActions, []);

  return (
    <PurchaseReturnListing
      title="Purchase Return - Issue Entry"
      permissionKey="view_purchase_return_issue_entry"
      tableKey="purchase-return-issue-entry"
      addLink="/purchase-return/issue-entry/create"
      addPermission="add_purchase_return_issue_entry"
      getActions={getActions}
    />
  );
}

export default IssueEntryListing;
