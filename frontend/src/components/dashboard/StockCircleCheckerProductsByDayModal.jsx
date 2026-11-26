"use client";

import React, { useMemo } from "react";
import { Box, Button } from "@chakra-ui/react";
import CustomDialog from "@/components/CustomDialog";
import AgGrid from "@/components/AgGrid";
import { formatStockDisplay } from "@/utils/stockFormat";
/**
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {string} title
 * @param {{ product_id: number|string; product_name?: string; checked_stock: number; checked_value?: number; mrp?: number|null; selling_price?: number|null; image_url?: string|null }[]} productRows
 */
function StockCircleCheckerProductsByDayModal({
  open,
  onClose,
  title,
  productRows = [],
}) {
  const rowData = useMemo(
    () =>
      productRows.map((r) => ({
        id: String(r.product_id),
        product_id: r.product_id,
        product_name: r.product_name ?? "",
        checked_stock: r.checked_stock ?? 0,
        checked_value: r.checked_value ?? 0,
        mrp: r.mrp ?? null,
        selling_price: r.selling_price ?? null,
        image_url: r.image_url ?? null,
      })),
    [productRows]
  );

  const colDefs = useMemo(
    () => [
      { field: "product_id", headerName: "ID", type: "id" },
      {
        field: "image_url",
        headerName: "Image",
        type: "image",
        hideByDefault: true,
      },
      {
        field: "product_name",
        headerName: "Product",
        type: "capitalized",
        flex: 1,
      },
      {
        field: "mrp",
        headerName: "MRP",
        type: "currency",
        minWidth: 96,
      },
      {
        field: "selling_price",
        headerName: "SP",
        type: "currency",
        minWidth: 96,
      },
      {
        field: "checked_stock",
        headerName: "Checked stock",
        type: "number",
        valueFormatter: (params) => formatStockDisplay(params.value),
      },
      {
        field: "checked_value",
        headerName: "Checked Value",
        type: "currency",
        minWidth: 150,
      },
    ],
    []
  );

  return (
    <CustomDialog
      open={open}
      onOpenChange={(e) => !e.open && onClose?.()}
      maxW="5xl"
      title={title}
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
      bodyProps={{ pt: 2 }}
    >
      {rowData.length === 0 ? (
        <Box fontSize="sm" color="gray.500">
          No product checks for this day.
        </Box>
      ) : (
        <Box minH="280px" h="520px" w="100%">
          <AgGrid
            rowData={rowData}
            colDefs={colDefs}
            tableKey="stock-circle-checker-products-by-day"
            pagination
            defaultRows={20}
          />
        </Box>
      )}
    </CustomDialog>
  );
}

export default StockCircleCheckerProductsByDayModal;
