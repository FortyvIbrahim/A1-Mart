"use client";

import React, { useMemo } from "react";
import { Center, Spinner, Text } from "@chakra-ui/react";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import { formatDateDisplay, computeSalesGroupedRows } from "@/utils/salesDashboard";
import { getSalesGroupedColumnDefs } from "../salesItemsColumnDefs";

const GROUP_TAB_LABELS = {
  branch: "Branch",
  department: "Department",
  category: "Category",
  subcategory: "Subcategory",
};

export default function SalesGroupedTabPanel({
  groupBy,
  selectedDate,
  items = [],
  loading = false,
  hasReport = false,
  onViewProducts,
  emptyMessage,
  hasSourceItems = true,
}) {
  const rows = useMemo(
    () => computeSalesGroupedRows(items, groupBy),
    [items, groupBy]
  );

  const columnDefs = useMemo(
    () => getSalesGroupedColumnDefs({ onViewProducts }),
    [onViewProducts]
  );

  const label = GROUP_TAB_LABELS[groupBy] || "Group";
  const title = `Sales by ${label} on ${formatDateDisplay(selectedDate)}`;

  return (
    <CustomContainer title={title} size="sm" color="secondary">
      {!hasReport && !hasSourceItems ? (
        <Text fontSize="sm" color="gray.600">
          No sales report uploaded for the selected date.
        </Text>
      ) : loading ? (
        <Center py={8}>
          <Spinner size="md" colorPalette="brand" />
        </Center>
      ) : !rows.length ? (
        <Text fontSize="sm" color="gray.600">
          {emptyMessage ?? "No products match the current filters for this date."}
        </Text>
      ) : (
        <AgGrid
          tableKey={`sales-dashboard-grouped-${groupBy}`}
          rowData={rows}
          columnDefs={columnDefs}
          pagination={true}
          paginationPageSize={15}
        />
      )}
    </CustomContainer>
  );
}
