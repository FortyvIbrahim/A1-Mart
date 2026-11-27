"use client";

import usePurchaseAcknowledgments from "@/api/customHooks/usePurchaseAcknowledgments";
import AgGrid from "@/components/AgGrid";
import { FigmaBadge } from "@/components/AgGrid/columnTypes";
import { useListFilters } from "@/components/ListFilters";
import CustomContainer from "@/components/CustomContainer";
import CustomMenu from "@/components/CustomMenu";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Badge, Button, Flex, Text } from "@chakra-ui/react";
import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import usePermission from "@/customHooks/usePermission";
import useDeleteModal from "@/customHooks/useDeleteModal";
import { deletePurchaseAcknowledgment } from "@/api/helpers/purchaseAcknowledgment";
import toast from "react-hot-toast";

function PurchaseAcknowledgments() {
  const router = useRouter();
  const { purchaseAcknowledgments, fetchData } = usePurchaseAcknowledgments();
  const canAdd = usePermission("add_purchase_acknowledgment");
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();

  const handleDelete = (id) => {
    openDeleteModal({
      title: "Delete Purchase Acknowledgment",
      message:
        "Are you sure you want to delete this purchase acknowledgment? This action cannot be undone.",
      onDelete: async () => {
        try {
          const res = await deletePurchaseAcknowledgment(id);
          if (res.code === 200) {
            toast.success("Purchase acknowledgment deleted successfully.");
            fetchData();
          } else {
            throw res;
          }
        } catch (err) {
          console.error(err);
          toast.error(
            err?.message ||
              err?.error ||
              "Error deleting purchase acknowledgment."
          );
        }
      },
    });
  };

  const colDefs = [
    {
      field: "purchase_acknowledgment_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "supplier",
      headerName: "Supplier",
      type: "capitalized",
      valueGetter: (props) => props.data.supplier?.name || "-",
    },
    {
      field: "invoice_no",
      headerName: "Invoice No",
      type: "capitalized",
    },
    {
      field: "invoice_date",
      headerName: "Invoice Date",
      type: "date",
    },
    {
      field: "branch_name",
      headerName: "Branch",
      type: "capitalized",
    },
    {
      field: "amount",
      headerName: "Amount",
      type: "currency",
    },
    {
      field: "status_counts",
      headerName: "Status",
      autoHeight: true,
      cellRenderer: (props) => {
        const hasGRN = props.data.has_grn;
        const totalDone = props.value.done + props.value.cancelled;
        const total = props.value.open + props.value.in_progress + totalDone;
        const repackCount = props.data.repacking_entry_count;

        const jobEntryDone = total === totalDone;
        const repackEntryDone = repackCount === total;

        const purchaseEntryCreated = props.data.purchase_entry_id !== null;

        if (!hasGRN) {
          return <FigmaBadge colorScheme="blue">GRN Pending</FigmaBadge>;
        }

        if (purchaseEntryCreated && total == 0) {
          return <FigmaBadge colorScheme="green">Purchase Entry Done</FigmaBadge>;
        }

        if (total == 0) {
          return <FigmaBadge colorScheme="orange">GRN Done</FigmaBadge>;
        }

        return (
          <Flex wrap="wrap" gap="2" pt="2" pb="2">
            <Badge
              colorPalette={jobEntryDone ? "green" : "brand"}
            >{`Job Entry : ${
              jobEntryDone ? "Done" : `${totalDone} / ${total}`
            }`}</Badge>
            {repackCount > 0 && (
              <Badge
                colorPalette={repackEntryDone ? "green" : "secondary"}
              >{` Repack Entry : ${
                repackEntryDone ? "Done" : `${repackCount} / ${total}`
              }`}</Badge>
            )}
          </Flex>
        );
      },
    },
    {
      field: "created_at",
      headerName: "Created At",
      type: "datetime",
    },
    {
      field: "purchase_acknowledgment_id",
      headerName: "Action",
      type: "action-column",
      valueGetter: (props) => {
        const menuItems = [
          {
            label: "View",
            value: "view",
            onClick: () =>
              router.push(
                `/purchase-acknowledgment/view/${props.data.purchase_acknowledgment_id}`
              ),
          },
        ];

        if (canAdd) {
          menuItems.push({
            label: "Edit",
            value: "edit",
            onClick: () =>
              router.push(
                `/purchase-acknowledgment/edit/${props.data.purchase_acknowledgment_id}`
              ),
          });
          menuItems.push({
            label: "Delete",
            value: "delete",
            type: "danger",
            onClick: () => handleDelete(props.data.purchase_acknowledgment_id),
          });
        }

        return menuItems;
      },
    },
  ];

  // Figma PUR/03 filters: Search · Supplier · Branch · All status.
  const ackStatus = (r) => {
    const c = r.status_counts || {};
    const totalDone = (c.done || 0) + (c.cancelled || 0);
    const total = (c.open || 0) + (c.in_progress || 0) + totalDone;
    if (!r.has_grn) return "GRN Pending";
    if (r.purchase_entry_id !== null && total == 0) return "Purchase Entry Done";
    if (total == 0) return "GRN Done";
    return total === totalDone ? "Job Entry Done" : "Job Entry In Progress";
  };
  const { filtered: filteredAcks, filterCard } = useListFilters(
    purchaseAcknowledgments ?? [],
    [
      {
        key: "search",
        type: "search",
        placeholder: "Search...",
        getText: (r) =>
          [r.purchase_acknowledgment_id, r.supplier?.name, r.invoice_no, r.branch_name]
            .filter(Boolean)
            .join(" "),
      },
      { key: "supplier", type: "select", placeholder: "Supplier", getValue: (r) => r.supplier?.name },
      { key: "branch", type: "select", placeholder: "Branch", getValue: (r) => r.branch_name },
      { key: "status", type: "select", placeholder: "All status", getValue: ackStatus },
    ]
  );

  return (
    <GlobalWrapper permissionKey="view_purchase_acknowledgment">
      <CustomContainer
        contentCard
        title="Purchase Acknowledgments"
        rightSection={
          canAdd && (
            <Link href="/purchase-acknowledgment/create">
              <Button>Add</Button>
            </Link>
          )
        }
      >
        {filterCard}
        <AgGrid
          rowData={filteredAcks}
          columnDefs={colDefs}
          tableKey="purchase-acknowledgment"
        />
        <DeleteModalComponent />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseAcknowledgments;
