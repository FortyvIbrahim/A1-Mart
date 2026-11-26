"use client";

import React, { useMemo } from "react";
import { Box, Tabs, Text } from "@chakra-ui/react";
import AgGrid from "@/components/AgGrid";

function buildActionsCol(onViewProducts, mode) {
  return {
    field: "actions",
    headerName: "Actions",
    type: "action-column",
    width: 140,
    valueGetter: (params) => [
      {
        label: "View products",
        value: "view_products",
        onClick: () => {
          const items = params.data?.items ?? [];
          onViewProducts(items, mode);
        },
      },
    ],
  };
}

export default function ReorderListTabs({
  groupedBySupplierBuyer = [],
  groupedBySupplier = [],
  groupedByBuyer = [],
  onViewProducts,
  loading,
}) {
  const formatTotValue = (v) => {
    const n = Number(v);
    return Number.isNaN(n) ? "—" : n.toFixed(2);
  };

  const totValueCol = {
    field: "tot_value",
    headerName: "Tot. Value",
    width: 120,
    type: "number",
    valueFormatter: (params) => formatTotValue(params.value),
  };

  const totPurchasedCol = {
    field: "tot_purchased",
    headerName: "Tot. Purchased",
    width: 120,
    type: "number",
  };
  const totPendingCol = {
    field: "tot_pending",
    headerName: "Tot. Pending",
    width: 120,
    type: "number",
  };

  const allColumnDefs = useMemo(
    () => [
      {
        field: "supplier",
        headerName: "Supplier",
        flex: 2,
        type: "capitalized",
      },
      { field: "buyer", headerName: "Buyer", flex: 2, type: "capitalized" },
      totValueCol,
      {
        field: "tot_items",
        headerName: "Tot. Items",
        width: 110,
        type: "number",
      },
      totPurchasedCol,
      totPendingCol,
      buildActionsCol(onViewProducts, "all"),
    ],
    [onViewProducts]
  );

  const bySupplierColumnDefs = useMemo(
    () => [
      {
        field: "supplier",
        headerName: "Supplier",
        flex: 2,
        type: "capitalized",
      },
      totValueCol,
      {
        field: "tot_items",
        headerName: "Tot. Items",
        width: 110,
        type: "number",
      },
      totPurchasedCol,
      totPendingCol,
      buildActionsCol(onViewProducts, "by_supplier"),
    ],
    [onViewProducts]
  );

  const byBuyerColumnDefs = useMemo(
    () => [
      { field: "buyer", headerName: "Buyer", flex: 2, type: "capitalized" },
      totValueCol,
      {
        field: "tot_items",
        headerName: "Tot. Items",
        width: 110,
        type: "number",
      },
      totPurchasedCol,
      totPendingCol,
      buildActionsCol(onViewProducts, "by_buyer"),
    ],
    [onViewProducts]
  );

  if (loading) {
    return <Text color="gray.500">Loading...</Text>;
  }

  return (
    <Tabs.Root defaultValue="all">
      <Tabs.List mb={4}>
        <Tabs.Trigger value="all">All</Tabs.Trigger>
        <Tabs.Trigger value="by_supplier">Grouped by Supplier</Tabs.Trigger>
        <Tabs.Trigger value="by_buyer">Grouped by Buyer</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="all">
        <Box>
          <AgGrid
            tableKey="purchase-reorders-list-all"
            rowData={groupedBySupplierBuyer}
            columnDefs={allColumnDefs}
            showColumnSettings={true}
          />
        </Box>
      </Tabs.Content>

      <Tabs.Content value="by_supplier">
        <Box>
          <AgGrid
            tableKey="purchase-reorders-list-by-supplier"
            rowData={groupedBySupplier}
            columnDefs={bySupplierColumnDefs}
            showColumnSettings={true}
          />
        </Box>
      </Tabs.Content>

      <Tabs.Content value="by_buyer">
        <Box>
          <AgGrid
            tableKey="purchase-reorders-list-by-buyer"
            rowData={groupedByBuyer}
            columnDefs={byBuyerColumnDefs}
            showColumnSettings={true}
          />
        </Box>
      </Tabs.Content>
    </Tabs.Root>
  );
}
