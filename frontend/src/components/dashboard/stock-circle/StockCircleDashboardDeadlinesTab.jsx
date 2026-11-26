"use client";

import React, { useMemo } from "react";
import { Box, Flex } from "@chakra-ui/react";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import StockCircleDaysLeftCell, {
  stockCircleDaysLeftValueGetter,
} from "@/components/StockChecker/StockCircleDaysLeftCell";
import {
  formatStockCircleDepartments,
  getPeriod,
} from "@/app/stock/circle/page";

export default function StockCircleDashboardDeadlinesTab({
  dueSoonRows,
  overdueRows,
  dueSoonDays,
}) {
  const deadlineColDefs = useMemo(
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
        headerName: "Period",
        valueGetter: (p) => getPeriod(p.data),
      },
      {
        field: "percentCompleted",
        headerName: "Completion %",
        valueFormatter: (params) => `${params.value ?? 0}%`,
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
    <Flex flexDirection="column" gap={6}>
      <CustomContainer title={`Due within ${dueSoonDays} days`} size="sm" color="brand">
        <Box minH="160px">
          <AgGrid
            rowData={dueSoonRows}
            colDefs={deadlineColDefs}
            tableKey="stock-circle-dashboard-due-soon"
          />
        </Box>
      </CustomContainer>
      <CustomContainer title="Past deadline" size="sm" color="secondary">
        <Box minH="160px">
          <AgGrid
            rowData={overdueRows}
            colDefs={deadlineColDefs}
            tableKey="stock-circle-dashboard-overdue"
          />
        </Box>
      </CustomContainer>
    </Flex>
  );
}
