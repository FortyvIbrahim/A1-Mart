"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Button } from "@chakra-ui/react";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import usePurchaseReturns from "@/api/customHooks/usePurchaseReturns";
import useDeleteModal from "@/customHooks/useDeleteModal";
import { deleteDelivered } from "@/api/helpers/purchaseReturns";
import toast from "react-hot-toast";
import moment from "moment";

/** Build unique delivered records from all purchase returns (employees[].suppliers[].delivered[]) */
function getDeliveredListFromPurchaseReturns(purchaseReturns) {
  if (!Array.isArray(purchaseReturns)) return [];
  const byId = new Map();
  for (const pr of purchaseReturns) {
    for (const emp of pr.employees || []) {
      for (const s of emp.suppliers || []) {
        const list = s.delivered ?? [];
        const supplierName =
          s.supplier?.name ?? s.supplier?.supplier_name ?? "—";
        for (const d of list) {
          const id = d.purchase_returns_items_delivered_id;
          if (id == null) continue;
          if (!byId.has(id)) {
            byId.set(id, {
              purchase_returns_items_delivered_id: id,
              supplier_name: supplierName,
              pick_up_name: d.pick_up_name ?? "—",
              pick_up_number: d.pick_up_number ?? "—",
              created_at: d.created_at,
              updated_at: d.updated_at,
            });
          }
        }
      }
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) =>
      (b.purchase_returns_items_delivered_id ?? 0) -
      (a.purchase_returns_items_delivered_id ?? 0)
  );
}

function DistributorIssueListing() {
  const { purchaseReturns, refresh } = usePurchaseReturns();
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();

  const rowData = useMemo(
    () => getDeliveredListFromPurchaseReturns(purchaseReturns),
    [purchaseReturns]
  );

  const handleDelete = (id) => {
    openDeleteModal({
      title: "Delete Distributor Issue",
      message:
        "Are you sure you want to delete this returned record? This action cannot be undone.",
      onDelete: async () => {
        await toast.promise(deleteDelivered(id), {
          loading: "Deleting...",
          success: () => {
            refresh();
            return "Deleted successfully";
          },
          error: (e) => e?.message || "Delete failed",
        });
      },
    });
  };

  const colDefs = useMemo(
    () => [
      {
        field: "purchase_returns_items_delivered_id",
        headerName: "ID",
        type: "id",
      },
      {
        field: "supplier_name",
        headerName: "Supplier",
        flex: 1,
        minWidth: 140,
      },
      {
        field: "pick_up_name",
        headerName: "Pick up name",
        type: "capitalized",
      },
      {
        field: "pick_up_number",
        headerName: "Pick up Phone Number",
      },
      {
        field: "created_at",
        headerName: "Created",
        type: "datetime",
      },
      {
        field: "purchase_returns_items_delivered_id",
        headerName: "Action",
        type: "action-column",
        width: 140,
        valueGetter: (params) => {
          const id = params.data?.purchase_returns_items_delivered_id;
          return [
            {
              label: "View",
              value: "view",
              redirectionUrl: `/purchase-return/distibutor-issue/view/${id}`,
            },
            {
              label: "Edit",
              value: "edit",
              redirectionUrl: `/purchase-return/distibutor-issue/edit/${id}`,
            },
            {
              label: "Delete",
              value: "delete",
              type: "danger",
              onClick: () => handleDelete(id),
            },
          ];
        },
      },
    ],
    []
  );

  return (
    <GlobalWrapper permissionKey="view_purchase_return_distibutor_issue">
      <CustomContainer
        title="Distributor Issue"
        rightSection={
          <Link href="/purchase-return/distibutor-issue/create">
            <Button size="sm">Add</Button>
          </Link>
        }
      >
        <AgGrid
          rowData={rowData}
          columnDefs={colDefs}
          tableKey="distributor-issue-listing"
          defaultRows={20}
        />
      </CustomContainer>
      <DeleteModalComponent />
    </GlobalWrapper>
  );
}

export default DistributorIssueListing;
