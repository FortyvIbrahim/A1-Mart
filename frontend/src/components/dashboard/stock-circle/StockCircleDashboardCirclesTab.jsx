"use client";

import React, { useMemo } from "react";
import { Box } from "@chakra-ui/react";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import StockCircleDaysLeftCell, {
  stockCircleDaysLeftValueGetter,
} from "@/components/StockChecker/StockCircleDaysLeftCell";
import {
  formatStockCircleDepartments,
  getPeriod,
} from "@/app/stock/circle/page";

export default function StockCircleDashboardCirclesTab({ rowData }) {
  const completionColDefs = useMemo(
    () => [
      { field: "id", headerName: "ID", type: "id" },
      {
        field: "branch_name",
        headerName: "Branch",
        type: "capitalized",
      },
      {
        headerName: "Departments",
        flex: 1.2,
        valueGetter: (p) => formatStockCircleDepartments(p.data),
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
        headerName: "Period",
        flex: 1.5,
        valueGetter: (p) => getPeriod(p.data),
      },
      {
        field: "percentCompleted",
        headerName: "Completion %",
        valueFormatter: (params) => `${params.value ?? 0}%`,
      },
      {
        field: "totalProducts",
        headerName: "Total Products",
      },
      {
        field: "completedProductCount",
        headerName: "Checked",
      },
      {
        field: "pendingProductCount",
        headerName: "Pending",
      },
      {
        headerName: "Days Left",
        valueGetter: stockCircleDaysLeftValueGetter,
        cellRenderer: StockCircleDaysLeftCell,
      },
    ],
    []
  );

  return (
    <CustomContainer title="All circles" size="sm" color="brand">
      <Box minH="200px">
        <AgGrid
          rowData={rowData}
          colDefs={completionColDefs}
          tableKey="stock-circle-dashboard-completion"
        />
      </Box>
    </CustomContainer>
  );
}
