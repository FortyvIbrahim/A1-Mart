"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Box, Button } from "@chakra-ui/react";
import moment from "moment";
import CustomDialog from "@/components/CustomDialog";
import AgGrid from "@/components/AgGrid";
import { capitalizeWords } from "@/utils/string";
import { circleKey } from "@/components/StockCircleFilter";
import { getCheckedStockValue } from "@/utils/stockChecker";
import StockCircleCheckerProductsByDayModal from "./StockCircleCheckerProductsByDayModal";

function buildProductRowsForDay(
  allChecked,
  checkerRowKey,
  dateKey,
  circles,
  products
) {
  const circleIdSet = new Set((circles || []).map((c) => String(circleKey(c))));
  const circleById = new Map(
    (circles || []).map((circle) => [String(circleKey(circle)), circle])
  );
  const productById = new Map(
    (products || []).map((product) => [String(product.product_id), product])
  );
  const rows = (allChecked || []).filter((row) => {
    if (!circleIdSet.has(String(row.stock_circle_id))) return false;
    const code = row.created_by ?? "";
    const name = row.created_by_name ?? row.created_by ?? "Unknown";
    if (`${code}|${name}` !== checkerRowKey) return false;
    const raw = row.created_at ?? row.updated_at;
    const d = raw ? moment(raw).format("YYYY-MM-DD") : "Unknown date";
    return d === dateKey;
  });
  const byProduct = new Map();
  for (const row of rows) {
    const pid = row.product_id;
    if (pid == null) continue;
    const ts = moment(row.updated_at || row.created_at).valueOf();
    const stock = Number(row.checked_stock);
    const prev = byProduct.get(pid);
    const qty = Number.isFinite(stock) ? stock : 0;
    const circle = circleById.get(String(row.stock_circle_id));
    const product = productById.get(String(pid));
    const branchId = circle?.branch_id;
    const checkedValue = getCheckedStockValue(qty, product, branchId);
    const priceRow =
      branchId == null || branchId === ""
        ? null
        : product?.stock_price?.find(
            (stock) => String(stock.branch_id) === String(branchId)
          ) ?? null;
    const mrp = Number(priceRow?.cost_price);
    const sellingPrice = Number(priceRow?.selling_price);
    const rowImage =
      row.image_url ?? row.product_image_url ?? row.product_image ?? null;
    if (!prev || ts >= prev._ts) {
      byProduct.set(pid, {
        product_id: pid,
        product_name: row.product_name || prev?.product_name || "",
        checked_stock: qty,
        checked_value: Math.round(checkedValue * 100) / 100,
        mrp: Number.isFinite(mrp) ? mrp : null,
        selling_price: Number.isFinite(sellingPrice) ? sellingPrice : null,
        image_url: rowImage ?? prev?.image_url ?? null,
        _ts: ts,
      });
    } else {
      if (row.product_name && !prev.product_name) {
        prev.product_name = row.product_name;
      }
      if (rowImage && !prev.image_url) {
        prev.image_url = rowImage;
      }
    }
  }
  return Array.from(byProduct.values())
    .map(({ _ts, ...rest }) => rest)
    .sort((a, b) => b.checked_stock - a.checked_stock);
}

/**
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {{ rowKey?: string; employee_name?: string; employee_code?: string } | null} checkerRow
 * @param {{ date: string; count: number; checked_value?: number }[]} dateRows
 * @param {object[]} allChecked
 * @param {object[]} circles
 * @param {object[]} products
 */
function StockCircleCheckerDetailsModal({
  open,
  onClose,
  checkerRow,
  dateRows = [],
  allChecked = [],
  circles = [],
  products = [],
}) {
  const [productsOpen, setProductsOpen] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState(null);

  const rowData = useMemo(
    () =>
      dateRows.map((r) => ({
        id: r.date,
        date: r.date,
        calendarDate: r.date && r.date !== "Unknown date" ? r.date : null,
        count: r.count,
        checked_value: r.checked_value ?? 0,
      })),
    [dateRows]
  );

  const handleOpenProducts = useCallback((dateKey) => {
    setSelectedDateKey(dateKey);
    setProductsOpen(true);
  }, []);

  const handleCloseProducts = useCallback(() => {
    setProductsOpen(false);
    setSelectedDateKey(null);
  }, []);

  const productRows = useMemo(() => {
    if (!checkerRow?.rowKey || selectedDateKey == null) return [];
    return buildProductRowsForDay(
      allChecked,
      checkerRow.rowKey,
      selectedDateKey,
      circles,
      products
    );
  }, [allChecked, checkerRow?.rowKey, selectedDateKey, circles, products]);

  const productsTitle = useMemo(() => {
    const name = capitalizeWords(
      String(checkerRow?.employee_name ?? "").trim() || "unknown"
    );
    const code = String(checkerRow?.employee_code ?? "").trim() || "-";
    const dayPart =
      selectedDateKey === "Unknown date"
        ? "Unknown date"
        : selectedDateKey &&
          moment(selectedDateKey, "YYYY-MM-DD", true).isValid()
        ? moment(selectedDateKey, "YYYY-MM-DD").format("D MMM YYYY")
        : selectedDateKey || "";
    return `Products checked - ${dayPart} - ${name} (${code})`;
  }, [checkerRow, selectedDateKey]);

  const colDefs = useMemo(
    () => [
      {
        headerName: "Date",
        type: "date",
        field: "calendarDate",
        flex: 1,
        valueGetter: (p) => {
          const v = p.data?.calendarDate;
          if (v == null || v === "") return null;
          const d = new Date(`${v}T12:00:00`);
          return Number.isNaN(d.getTime()) ? null : d;
        },
      },
      {
        field: "count",
        headerName: "Checked",
        type: "number",
      },
      {
        field: "checked_value",
        headerName: "Checked Value",
        type: "currency",
        minWidth: 150,
      },
      {
        headerName: "Action",
        type: "action-column",
        valueGetter: (p) => [
          {
            label: "View products",
            value: "products",
            onClick: () => handleOpenProducts(p.data?.date),
          },
        ],
      },
    ],
    [handleOpenProducts]
  );

  const name = capitalizeWords(
    String(checkerRow?.employee_name ?? "").trim() || "unknown"
  );
  const code = String(checkerRow?.employee_code ?? "").trim() || "-";
  const title = `Checks by day - ${name} (${code})`;

  return (
    <>
      <CustomDialog
        open={open}
        onOpenChange={(e) => {
          if (!e.open) {
            onClose?.();
            setProductsOpen(false);
            setSelectedDateKey(null);
          }
        }}
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
            No dated check records found for this employee in the current scope.
          </Box>
        ) : (
          <Box minH="280px" h="520px" w="100%">
            <AgGrid
              rowData={rowData}
              colDefs={colDefs}
              tableKey="stock-circle-checker-day-details"
              pagination={false}
            />
          </Box>
        )}
      </CustomDialog>

      <StockCircleCheckerProductsByDayModal
        open={productsOpen}
        onClose={handleCloseProducts}
        title={productsTitle}
        productRows={productRows}
      />
    </>
  );
}

export default StockCircleCheckerDetailsModal;
