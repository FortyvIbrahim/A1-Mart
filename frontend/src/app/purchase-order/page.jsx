"use client";

import usePurchaseOrders from "@/api/customHooks/usePurchaseOrders";
import AgGrid from "@/components/AgGrid";
import { useListFilters } from "@/components/ListFilters";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import useDeleteModal from "@/customHooks/useDeleteModal";
import { capitalizeWords } from "@/utils/string";
import { Button, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import moment from "moment";
import usePermission from "@/customHooks/usePermission";


/** Figma list filters for this page. */
const LIST_FILTERS = [
  { key: "q", type: "search", label: "Search", placeholder: "Search purchase order...", getText: (r) => `${r.purchase_order_id ?? ""} ${r.purchase_order_ref ?? ""} ${r.vendor_name ?? ""}` },
  { key: "vendor", type: "select", label: "Vendor", placeholder: "All vendors", getValue: (r) => r.vendor_name },
  { key: "date", type: "date", label: "Date", getValue: (r) => r.date },
  { key: "status", type: "select", label: "Status", placeholder: "All statuses", getValue: (r) => r.status },
];

function PurchaseOrders() {
  const router = useRouter();
  const {
    purchaseOrders,
    handleDelete: handleDeletePurchaseOrder,
    updateStatus,
  } = usePurchaseOrders();
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();

  const allowAdd = usePermission("add_purchase_order");
  const allowStatusUpdate = usePermission("update_purchase_order_status");

  const handleUpdateStatus = (id, status) => {
    updateStatus(id, status);
  };

  const getMenuItems = (props) => {
    const items = [];

    if (
      props.data.pdf?.pdf_path &&
      (props.data.status === "approved" || props.data.status === "purchased")
    ) {
      items.push({
        label: "View PDF",
        value: "view_pdf",
        type: "link",
        onClick: () => {
          window.open(props.data.pdf?.pdf_path, "_blank");
        },
      });
    }

    items.push({
      label: "View",
      value: "view",
      onClick: () =>
        router.push(`/purchase-order/view/${props.data.purchase_order_id}`),
    });

    if (allowAdd) {
      items.push({
        label: "Edit",
        value: "edit",
        onClick: () =>
          router.push(`/purchase-order/edit/${props.data.purchase_order_id}`),
      });
      items.push({
        label: "Delete",
        value: "delete",
        onClick: () => handleDelete(props.data.purchase_order_id),
      });
    }

    if (allowStatusUpdate && props.data.status === "raised") {
      items.push({
        label: "Set to Approved",
        value: "set_to_approved",
        type: "status-change",
        onClick: () =>
          handleUpdateStatus(props.data.purchase_order_id, "approved"),
      });
    }

    // if (allowStatusUpdate && props.data.status === "approved") {
    //   items.push({
    //     label: "Set to Purchased",
    //     value: "set_to_approved",
    //     type: "status-change",
    //     onClick: () =>
    //       handleUpdateStatus(props.data.purchase_order_id, "purchased"),
    //   });
    // }

    return items;
  };

  const handleDelete = (id) => {
    openDeleteModal({
      title: "Delete Purchase Order",
      message: "Are you sure you want to delete this purchase order?",
      onDelete: () => handleDeletePurchaseOrder(id),
    });
  };

  const calculateTotalAmount = (poData) => {
    if (!poData) return 0;
    const items = poData.items || [];
    if (items.length === 0) return 0;

    // Calculate subtotal from items
    const subTotal = items.reduce((total, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      return total + quantity * rate;
    }, 0);

    // Calculate discount amount
    const discountPercentage = parseFloat(poData.discount) || 0;
    const discountAmount = (subTotal * discountPercentage) / 100;

    // Get tax, adjustment
    const tax = parseFloat(poData.tax) || 0;
    const adjustment = parseFloat(poData.adjustment) || 0;

    // Calculate total: subtotal - discount + tax + adjustment
    return subTotal - discountAmount + tax + adjustment;
  };

  const colDefs = [
    {
      field: "purchase_order_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "purchase_order_ref",
      headerName: "Purchase Order #",
      resizable: true,
    },
    {
      field: "vendor_name",
      headerName: "Vendor",
      resizable: true,
      valueGetter: (props) => {
        if (props.data.vendor) {
          return props.data.vendor.name || props.data.vendor.master_name || "-";
        }
        return "-";
      },
      type: "capitalized",
    },
    {
      field: "date",
      headerName: "Date",
      resizable: true,
      maxWidth: 150,
      cellRenderer: (props) => {
        if (!props.value) return "-";
        return moment(props.value).format("DD/MM/YYYY");
      },
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
      field: "status",
      headerName: "Status",
      resizable: true,
      maxWidth: 150,
      type: "badge-column",
      valueGetter: (props) => {
        const status = props.data.pe_created
          ? "PE Created"
          : props.data.status || "raised";

        const statusColors = {
          raised: "blue",
          approved: "brand",
          "PE Created": "green",
          purchased: "green",
        };
        return {
          label: status === "PE Created" ? status : capitalizeWords(status),
          colorScheme: statusColors[status] || "gray",
        };
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

  const { filtered: filteredRows, filterCard } = useListFilters(purchaseOrders, LIST_FILTERS, { reset: true });

  return (
    <GlobalWrapper permissionKey="view_purchase_order">
      <DeleteModalComponent />
      <CustomContainer headerBand
        title="Purchase Orders"
        rightSection={
          allowAdd && (
            <Link href="/purchase-order/create">
              <Button>Add</Button>
            </Link>
          )
        }
      >
        {filterCard}
        <AgGrid
          rowData={filteredRows}
          colDefs={colDefs}
          tableKey="purchase-order"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseOrders;
