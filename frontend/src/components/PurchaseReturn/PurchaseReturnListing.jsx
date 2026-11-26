"use client";

import React, { useCallback, useMemo } from "react";
import { Button } from "@chakra-ui/react";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import usePurchaseReturns from "@/api/customHooks/usePurchaseReturns";
import useDeleteModal from "@/customHooks/useDeleteModal";
import Link from "next/link";
import usePermission from "@/customHooks/usePermission";

/**
 * Shared purchase return listing: ID, Driver, Total No of Boxes, Action column.
 * @param {string} title - Page title (e.g. "Purchase Return Issue Entry")
 * @param {string} permissionKey - Permission for viewing (e.g. "view_purchase_return_issue_entry")
 * @param {string} tableKey - AgGrid table key (e.g. "purchase-return-issue-entry")
 * @param {string} [addLink] - URL for Add button (e.g. "/purchase-return/issue-entry/create")
 * @param {string} [addPermission] - Permission for Add button (e.g. "add_purchase_return_issue_entry")
 * @param {function} getActions - (params, handleDeleteClick) => array of action column items
 * @param {string} [type] - Type of purchase return (e.g. "issue-entry", "receipt-entry")
 */

export const getTotalNoOfBoxes = (row) => {
  if (!row?.employees?.length) return 0;
  return row.employees.reduce(
    (sum, emp) =>
      sum +
      (emp.suppliers || []).reduce(
        (s, sup) => s + (Number(sup.no_of_boxes) || 0),
        0
      ),
    0
  );
};

export const getNoOfBoxesPending = (row) => {
  if (!row?.employees?.length) return 0;
  let noOfBoxesPending = 0;
  for (const emp of row.employees) {
    for (const s of emp.suppliers || []) {
      const delivered = s.delivered;
      if (!Array.isArray(delivered) || delivered.length === 0)
        noOfBoxesPending += Number(s.no_of_boxes) || 0;
    }
  }

  return noOfBoxesPending;
};

export const getNoOfBoxesDelivered = (row) => {
  if (!row?.employees?.length) return 0;
  let noOfBoxesDelivered = 0;
  for (const emp of row.employees) {
    for (const s of emp.suppliers || []) {
      if (Array.isArray(s.delivered) && s.delivered.length > 0)
        noOfBoxesDelivered += Number(s.no_of_boxes) || 0;
    }
  }
  return noOfBoxesDelivered;
};

/** Enrich each row with total_no_of_boxes, no_of_boxes_delivered, no_of_boxes_pending so AgGrid computation (totals row) can sum them */
function enrichRowWithBoxCounts(row) {
  if (!row) return row;
  return {
    ...row,
    total_no_of_boxes: getTotalNoOfBoxes(row),
    no_of_boxes_delivered: getNoOfBoxesDelivered(row),
    no_of_boxes_pending: getNoOfBoxesPending(row),
  };
}

function PurchaseReturnListing({
  title,
  permissionKey,
  tableKey,
  addLink,
  addPermission,
  getActions,
  type = "issue-entry",
}) {
  const { purchaseReturns, deletePurchaseReturn } = usePurchaseReturns({
    filterByBranch: type === "issue-entry" ? false : true,
  });
  const canAdd = addPermission ? usePermission(addPermission) : false;
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();

  const rowData = useMemo(
    () => (purchaseReturns || []).map(enrichRowWithBoxCounts),
    [purchaseReturns]
  );

  const handleDeleteClick = useCallback(
    (id) => {
      openDeleteModal({
        title: "Delete Purchase Return",
        message:
          "Are you sure you want to delete this purchase return? This action cannot be undone.",
        onDelete: () => deletePurchaseReturn(id),
      });
    },
    [openDeleteModal, deletePurchaseReturn]
  );

  const colDefs = useMemo(
    () => [
      {
        field: "purchase_return_id",
        headerName: "ID",
        type: "id",
      },
      {
        field: "receiving_branch_name",
        headerName: "Receiving Branch",
        type: "capitalized",
      },
      {
        field: "driver",
        headerName: "Driver",
        type: "capitalized",
        valueGetter: (params) =>
          params.data?.driver?.employee_name ??
          params.data?.driver?.name ??
          params.data?.driver_id ??
          "—",
      },
      {
        field: "total_no_of_boxes",
        headerName: "Total No of Boxes",
        type: "number",
        valueGetter: (params) => {
          const row = params.data;
          if (!row?.employees?.length) return 0;
          return row.employees.reduce(
            (sum, emp) =>
              sum +
              (emp.suppliers || []).reduce(
                (s, sup) => s + (Number(sup.no_of_boxes) || 0),
                0
              ),
            0
          );
        },
      },
      {
        field: "no_of_boxes_delivered",
        headerName: "No of Boxes Returned",
        type: "number",
        valueGetter: (params) => {
          const row = params.data;
          if (!row?.employees?.length) return 0;
          return getNoOfBoxesDelivered(row);
        },
      },
      {
        field: "no_of_boxes_pending",
        headerName: "No of Boxes Pending",
        type: "number",
        valueGetter: (params) => {
          const row = params.data;
          if (!row?.employees?.length) return 0;
          return getNoOfBoxesPending(row);
        },
      },
      ...(type === "receipt-entry"
        ? [
            {
              field: "receipt_entry_handled_by_employee.employee_name",
              headerName: "Handled By",
              type: "capitalized",
              valueGetter: (params) =>
                params.data?.receipt_entry_handled_by_employee?.employee_name,
            },
          ]
        : [
            {
              field: "receipt_entry_handled_by_employee.employee_name",
              headerName: "Status",
              type: "badge-column",
              valueGetter: (params) => {
                const row = params.data;
                let noOfBoxesDelivered = getNoOfBoxesDelivered(row);
                let noOfBoxesPending = getNoOfBoxesPending(row);

                if (noOfBoxesPending === 0) {
                  return {
                    colorScheme: "green",
                    label: "Done",
                  };
                }

                if (noOfBoxesDelivered > 0) {
                  return {
                    colorScheme: "purple",
                    label: "Return In Progress",
                  };
                }

                if (params.data.receipt_entry_handled_by_employee) {
                  return {
                    colorScheme: "blue",
                    label: "Receipt Entry Done",
                  };
                }

                return {
                  colorScheme: "gray",
                  label: "Pending",
                };
              },
            },
          ]),
      {
        field: "purchase_return_id",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => getActions(params, handleDeleteClick),
      },
    ],
    [getActions, handleDeleteClick, type]
  );

  return (
    <GlobalWrapper permissionKey={permissionKey}>
      <CustomContainer
        title={title}
        rightSection={
          addLink &&
          canAdd && (
            <Link href={addLink}>
              <Button size="sm">Add</Button>
            </Link>
          )
        }
      >
        <AgGrid rowData={rowData} columnDefs={colDefs} tableKey={tableKey} />
      </CustomContainer>
      <DeleteModalComponent />
    </GlobalWrapper>
  );
}

export default PurchaseReturnListing;
