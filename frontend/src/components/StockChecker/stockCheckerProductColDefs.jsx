"use client";

import { Badge } from "@chakra-ui/react";
import StockCheckerInput from "@/components/StockChecker";
import { getProductStockForBranch } from "@/utils/stockChecker";
import { formatStockDisplay } from "@/utils/stockFormat";

function sumBranchStock(data, fallbackBranchId) {
  const branchId =
    data?.circle_branch_id != null && data?.circle_branch_id !== ""
      ? data.circle_branch_id
      : fallbackBranchId;
  return getProductStockForBranch(data, branchId);
}

function checkedMapLookup(row, checkedStockMap) {
  const key = row?._checkKey ?? row?.product_id;
  return checkedStockMap[key];
}

/**
 * @param {object} params
 * @param {Record<string|number, unknown>} params.checkedStockMap
 * @param {(args: { productId: string|number, checkedStock: string, stockCircleId?: string|number }) => void | Promise<void>} params.onSave
 * @param {"remaining" | "all"} [params.listMode="remaining"]
 * @param {boolean} [params.showCircleColumn=false]
 * @param {string|number|null} [params.branchId]
 */
export function getStockCheckerProductColDefs({
  checkedStockMap,
  onSave,
  listMode = "remaining",
  showCircleColumn = false,
  branchId = null,
}) {
  const productCols = [
    {
      field: "product_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "image_url",
      headerName: "Image",
      type: "image",
    },
    {
      field: "product_name",
      headerName: "Name",
      type: "capitalized",
      flex: 1.5,
    },
  ];

  if (showCircleColumn) {
    productCols.push({
      field: "circle_label",
      headerName: "Circle",
      type: "capitalized",
      flex: 1.5,
    });
  }

  return [
    ...productCols,
    {
      field: "department_name",
      headerName: "Department",
      type: "capitalized",
    },
    {
      field: "category_name",
      headerName: "Category",
      type: "capitalized",
    },
    {
      field: "subcategory_name",
      headerName: "Subcategory",
      type: "capitalized",
    },
    {
      field: "brand_name",
      headerName: "Brand",
      type: "capitalized",
    },
    {
      colId: "total_stock",
      headerName: "Total Stock",
      wrapText: true,
      autoHeight: true,
      valueGetter: (params) => sumBranchStock(params.data, branchId),
      cellRenderer: (params) => {
        const total = params.value ?? 0;
        const inStock = total > 0;
        const formattedStock = formatStockDisplay(total);
        return (
          <Badge colorPalette={inStock ? "green" : "red"}>
            {inStock ? `Stock (${formattedStock})` : "Out of Stock"}
          </Badge>
        );
      },
    },
    listMode === "all"
      ? {
          colId: "checked_stock",
          headerName: "Checked Stock",
          width: 140,
          type: "number",
          valueGetter: (params) => {
            const raw = checkedMapLookup(params.data, checkedStockMap);
            if (raw === null || raw === undefined || raw === "") return null;
            const n = Number(raw);
            return Number.isNaN(n) ? null : n;
          },
        }
      : {
          colId: "checked_stock",
          headerName: "Checked Stock",
          autoHeight: true,
          minWidth: 200,
          cellRenderer: (params) => {
            const row = params.data;
            const productId = row.product_id;
            const totalStock = sumBranchStock(row, branchId);
            const raw = checkedMapLookup(row, checkedStockMap);
            const hasChecked =
              raw !== null &&
              raw !== undefined &&
              raw !== "" &&
              !Number.isNaN(Number(raw));
            const initialCheckedStock = hasChecked ? raw : null;
            return (
              <StockCheckerInput
                key={String(row._checkKey ?? productId)}
                totalStock={totalStock}
                productId={productId}
                stockCircleId={row.stock_circle_id}
                initialCheckedStock={initialCheckedStock}
                onSave={onSave}
              />
            );
          },
        },
  ];
}
