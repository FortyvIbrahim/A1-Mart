"use client";

import usePurchaseEntries from "@/api/customHooks/usePurchaseEntries";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import useDeleteModal from "@/customHooks/useDeleteModal";
import usePermission from "@/customHooks/usePermission";
import { capitalizeWords } from "@/utils/string";
import { Button, Text, Link as ChakraLink } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import moment from "moment";

function PurchaseEntry() {
  const router = useRouter();
  const { purchaseEntries, handleDelete: handleDeletePurchaseEntry } =
    usePurchaseEntries();
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();

  const allowAdd = usePermission("add_purchase_entry");

  const getMenuItems = (props) => {
    const items = [];

    if (props.data.invoice_file) {
      items.push({
        label: "View Invoice",
        value: "view_invoice",
        type: "link",
        onClick: () => window.open(props.data.invoice_file, "_blank"),
      });
    }

    items.push({
      label: "View",
      value: "view",
      onClick: () =>
        router.push(`/purchase-entry/view/${props.data.purchase_entry_id}`),
    });

    if (allowAdd) {
      items.push({
        label: "Edit",
        value: "edit",
        onClick: () =>
          router.push(`/purchase-entry/edit/${props.data.purchase_entry_id}`),
      });
      items.push({
        label: "Delete",
        value: "delete",
        onClick: () => handleDelete(props.data.purchase_entry_id),
      });
    }

    return items;
  };

  const handleDelete = (id) => {
    openDeleteModal({
      title: "Delete Purchase Entry",
      message: "Are you sure you want to delete this purchase entry?",
      onDelete: () => handleDeletePurchaseEntry(id),
    });
  };

  const calculateTotalAmount = (peData) => {
    if (!peData) return 0;
    const items = peData.items || [];
    if (items.length === 0) return 0;

    // Calculate subtotal from items
    const subTotal = items.reduce((total, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      return total + quantity * rate;
    }, 0);

    // Calculate discount amount
    const discountPercentage = parseFloat(peData.discount) || 0;
    const discountAmount = (subTotal * discountPercentage) / 100;

    // Get tax, adjustment
    const tax = parseFloat(peData.tax) || 0;
    const adjustment = parseFloat(peData.adjustment) || 0;

    // Calculate total: subtotal - discount + tax + adjustment
    return subTotal - discountAmount + tax + adjustment;
  };

  const colDefs = [
    {
      field: "purchase_entry_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "invoice_no",
      headerName: "Invoice Number",
      resizable: true,
    },
    {
      field: "invoice_date",
      headerName: "Invoice Date",
      resizable: true,
      maxWidth: 150,
      cellRenderer: (props) => {
        if (!props.value) return "-";
        return moment(props.value).format("DD/MM/YYYY");
      },
    },
    {
      field: "purchase_order_ref",
      headerName: "PO Number",
      resizable: true,
      valueGetter: (props) => {
        // PO reference might be in purchase_order or directly in data
        return (
          props.data?.purchase_order_ref || props.data?.purchase_order_id || "-"
        );
      },
    },
    {
      field: "vendor_name",
      headerName: "Vendor",
      resizable: true,
      valueGetter: (props) => {
        if (props.data.vendor) {
          return props.data.vendor.name || "-";
        }
        return "-";
      },
      type: "capitalized",
    },
    {
      field: "items",
      headerName: "Items",
      resizable: true,
      maxWidth: 100,
      valueGetter: (props) => props.data.items?.length || 0,
    },
    {
      field: "total_amount",
      headerName: "Total Amount",
      resizable: true,
      maxWidth: 150,
      valueGetter: (props) => {
        return calculateTotalAmount(props.data);
      },
      cellRenderer: (props) => {
        const total = calculateTotalAmount(props.data);
        return <Text fontWeight="medium">₹{total.toFixed(2)}</Text>;
      },
    },
    {
      field: "actions",
      headerName: "Action",
      resizable: false,
      maxWidth: 100,
      filter: false,
      type: "action-column",
      valueGetter: getMenuItems,
    },
  ];

  return (
    <GlobalWrapper permissionKey="view_purchase_entry">
      <DeleteModalComponent />
      <CustomContainer
        title="Purchase Entries"
        rightSection={
          allowAdd && (
            <Link href="/purchase-entry/create">
              <Button>Add</Button>
            </Link>
          )
        }
      >
        <AgGrid
          rowData={purchaseEntries}
          colDefs={colDefs}
          tableKey="purchase-entry"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseEntry;
