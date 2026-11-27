"use client";

import React, { useMemo } from "react";
import { Box, Flex } from "@chakra-ui/react";
import { DashboardCard } from "@/components/dashboard/DashboardUI";
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
    <Flex flexDirection="column" gap="20px">
      <DashboardCard title={`Due within ${dueSoonDays} days`} subtitle="Use search, filters and sorting to narrow records.">
        <Box minH="160px">
          <AgGrid
            bare
            rowData={dueSoonRows}
            colDefs={deadlineColDefs}
            tableKey="stock-circle-dashboard-due-soon"
          />
        </Box>
      </DashboardCard>
      <DashboardCard title="Past deadline" subtitle="Use search, filters and sorting to narrow records.">
        <Box minH="160px">
          <AgGrid
            bare
            rowData={overdueRows}
            colDefs={deadlineColDefs}
            tableKey="stock-circle-dashboard-overdue"
          />
        </Box>
      </DashboardCard>
    </Flex>
  );
}
