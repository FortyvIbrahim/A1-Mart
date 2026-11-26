"use client";

import useWMSPurchaseEntries from "@/api/customHooks/useWMSPurchaseEntries";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import useDeleteModal from "@/customHooks/useDeleteModal";
import usePermission from "@/customHooks/usePermission";
import { capitalizeWords } from "@/utils/string";
import { Button, FormatNumber, Text } from "@chakra-ui/react";
import moment from "moment";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

function WMSPurchaseEntry() {
  const router = useRouter();
  const { wmsPurchaseEntries, loading, handleDelete } = useWMSPurchaseEntries();
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();
  const canDelete = usePermission("delete_wms_purchase_entry");
  const allowAdd = usePermission("add_wms_purchase_entry");

  const onDelete = (id) => {
    openDeleteModal({
      title: "Delete WMS Purchase Entry",
      message: "Are you sure you want to delete this WMS purchase entry?",
      onDelete: () => handleDelete(id),
    });
  };

  const getMenuItems = (props) => {
    const items = [
      {
        label: "View",
        value: "view",
        onClick: () =>
          router.push(
            `/wms/purchase-entry/view/${props.data.purchase_entry_id}`
          ),
      },
    ];

    if (allowAdd) {
      items.push({
        label: "Edit",
        value: "edit",
        onClick: () =>
          router.push(
            `/wms/purchase-entry/edit/${props.data.purchase_entry_id}`
          ),
      });
    }

    if (canDelete) {
      items.push({
        label: "Delete",
        value: "delete",
        onClick: () => onDelete(props.data.purchase_entry_id),
        type: "danger",
      });
    }

    return items;
  };

  const colDefs = [
    {
      field: "purchase_entry_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "supplier_name",
      headerName: "Supplier",
      type: "capitalized",
    },
    {
      field: "invoice_no",
      headerName: "Invoice No",
      resizable: true,
    },
    {
      field: "invoice_date",
      headerName: "Invoice Date",
      type: "date",
    },
    {
      field: "invoice_amount",
      headerName: "Invoice Amount",
      type: "currency",
      cellRenderer: (props) => (
        <Text
          color={
            props.value == props.data.actual_invoice_amount
              ? "gray.800"
              : "red.500"
          }
        >
          <FormatNumber value={props.value} style="currency" currency="INR" />
        </Text>
      ),
    },
    {
      field: "actual_invoice_amount",
      headerName: "Actual Invoice Amount",
      type: "currency",
    },
    {
      field: "employee_name",
      headerName: "Handled By",
      type: "capitalized",
    },
    {
      field: "created_at",
      headerName: "Created At",
      type: "datetime",
    },
    {
      field: "id",
      headerName: "Action",
      type: "action-column",
      valueGetter: getMenuItems,
    },
  ];

  return (
    <GlobalWrapper permissionKey="view_wms_purchase_entry">
      <DeleteModalComponent />
      <CustomContainer
        title="WMS Purchase Entry"
        rightSection={
          allowAdd && (
            <Link href="/wms/purchase-entry/create">
              <Button>Add</Button>
            </Link>
          )
        }
      >
        <AgGrid
          rowData={wmsPurchaseEntries}
          columnDefs={colDefs}
          loading={loading}
          tableKey="wms-purchase-entry"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default WMSPurchaseEntry;
