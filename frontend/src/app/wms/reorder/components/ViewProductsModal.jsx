"use client";

import React, { useMemo } from "react";
import { Box, Button } from "@chakra-ui/react";
import { LuChevronLeft } from "react-icons/lu";
import CustomDialog from "@/components/CustomDialog";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";

const getProductModalColumnDefs = (mode) => {
  const base = [
    {
      field: "product_image",
      headerName: "Image",
      type: "image",
    },
    {
      field: "product_name",
      headerName: "Product",
      flex: 2,
      valueGetter: (params) =>
        params.data?.product?.product_name ??
        params.data?.product?.product_display_name ??
        "—",
    },
    { field: "qty", headerName: "Qty", type: "number" },
    { field: "cost_price", headerName: "Cost", type: "number" },
    { field: "mrp", headerName: "MRP", type: "number" },
    { field: "discount", headerName: "Discount", type: "number" },
    {
      field: "order_worth",
      headerName: "Order worth",
      type: "number",
    },
    { field: "tax_amount", headerName: "Tax", type: "number" },
    {
      field: "is_purchased",
      headerName: "Purchased",
      type: "badge-column",
      valueGetter: (params) => {
        const isPurchased = params.data?.is_purchased ?? false;
        return {
          label: isPurchased ? "Yes" : "No",
          colorScheme: isPurchased ? "green" : "red",
        };
      },
    },
  ];
  if (mode === "by_supplier") {
    return [
      ...base.slice(0, 2),
      {
        field: "buyer_name",
        headerName: "Buyer",
        flex: 2,
        valueGetter: (params) =>
          params.data?.buyer?.employee_name ?? params.data?.buyer_id ?? "—",
      },
      ...base.slice(2),
    ];
  }
  if (mode === "by_buyer") {
    return [
      ...base.slice(0, 2),
      {
        field: "supplier_name",
        headerName: "Supplier",
        flex: 2,
        valueGetter: (params) =>
          params.data?.supplier?.name ??
          params.data?.supplier?.master_name ??
          params.data?.supplier_id ??
          "—",
      },
      ...base.slice(2),
    ];
  }
  return base;
};

export default function ViewProductsModal({
  open,
  onClose,
  items = [],
  mode = "all",
}) {
  const columnDefs = useMemo(() => getProductModalColumnDefs(mode), [mode]);

  const rowData = useMemo(
    () =>
      items.map((row) => ({
        ...row,
        product_image: row.product?.image_url ?? null,
        product_name:
          row.product?.product_name ?? row.product?.product_display_name ?? "—",
      })),
    [items]
  );

  return (
    <CustomDialog
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      title="Products"
      maxW="90vw"
      maxH="85vh"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <Box w="100%" minH="200px">
        <AgGrid
          tableKey="reorder-view-products-modal"
          rowData={rowData}
          columnDefs={columnDefs}
          pagination={true}
          paginationPageSize={10}
          showColumnSettings={false}
        />
      </Box>
    </CustomDialog>
  );
}

/**
 * Figma PUR/01.03 "Reordered Products": shown in place of the list, with a
 * back chevron before the title that returns to the reorder list.
 */
export function ReorderedProductsView({ onBack, items = [], mode = "all" }) {
  const columnDefs = useMemo(() => getProductModalColumnDefs(mode), [mode]);
  const rowData = useMemo(
    () =>
      items.map((row) => ({
        ...row,
        product_image: row.product?.image_url ?? null,
        product_name:
          row.product?.product_name ?? row.product?.product_display_name ?? "—",
      })),
    [items]
  );

  return (
    <CustomContainer
      headerBand
      title={
        <Box as="span" display="inline-flex" alignItems="center" gap="8px">
          <Box
            as="button"
            type="button"
            onClick={onBack}
            aria-label="Back to purchase reorders"
            display="inline-flex"
            color="fg"
            _hover={{ color: "#C95C18" }}
          >
            <LuChevronLeft size={20} />
          </Box>
          Reordered Products
        </Box>
      }
    >
      <AgGrid
        tableKey="reorder-view-products-modal"
        rowData={rowData}
        columnDefs={columnDefs}
        pagination={true}
        paginationPageSize={10}
      />
    </CustomContainer>
  );
}
