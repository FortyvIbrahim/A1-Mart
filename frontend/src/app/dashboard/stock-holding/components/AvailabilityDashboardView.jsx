"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Box, Flex, Grid, Tabs } from "@chakra-ui/react";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import {
  enrichGroupedRowsWithAvailabilityPct,
  enrichGroupedRowsWithProductCount,
  getStockAvailabilityPieOrder,
} from "@/utils/stockHoldingDashboard";
import { useStockHoldingDashboard } from "../StockHoldingDashboardContext";
import BarChartCard from "./BarChartCard";
import ScrollableTabsList from "./ScrollableTabsList";
import {
  getStockHoldingItemsColumnDefs,
  STOCK_HOLDING_ITEMS_TABLE_KEY,
} from "../stockHoldingItemsColumnDefs";

const AVAILABILITY_STAT_COLORS = {
  available: "green",
  low_stock: "orange",
  out_of_stock: "red",
};

const formatFullNumber = (value) => Number(value ?? 0).toLocaleString();

const pctCellRenderer = (props) => {
  const value = props.value;
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${value}%`;
};

function AvailabilityStatCard({ title, pct, count, color = "brand" }) {
  return (
    <Flex
      direction="column"
      align="flex-start"
      justify="center"
      p={6}
      borderWidth="1px"
      borderColor={`${color}.200`}
      borderRadius="10px"
      bg={`${color}.50`}
      flex="1"
      minH="0"
      gap={2}
      w="100%"
    >
      <Box fontSize="xs" fontWeight="semibold" color={`${color}.700`}>
        {title}
      </Box>
      <Box
        fontSize="2xl"
        fontWeight="bold"
        color={`${color}.800`}
        lineHeight="1"
      >
        {pct}%
      </Box>
      <Box fontSize="sm" color={`${color}.600`}>
        {formatFullNumber(count)} items
      </Box>
    </Flex>
  );
}

export default function AvailabilityDashboardView() {
  const [groupedTab, setGroupedTab] = useState("products");

  const {
    dashboard,
    toggleChartFilter,
    setStockAvailabilityFilter,
    openItemsModal,
    showLowStock,
    gridResetKey,
  } = useStockHoldingDashboard();

  const {
    filteredRows,
    stockAvailabilityBarData,
    stockAvailabilityTableRows,
    supplierTableRows,
    distributorTableRows,
    departmentTableRows,
    categoryTableRows,
    subcategoryTableRows,
    buyerTableRows,
    branchTableRows,
    purchaseTypeTableRows,
    chainLevelTableRows,
  } = dashboard;

  const handleAvailabilityBarClick = useCallback(
    (entry) =>
      toggleChartFilter(setStockAvailabilityFilter, entry?.filterValue),
    [toggleChartFilter, setStockAvailabilityFilter]
  );

  const chartNumberFormatter = useCallback(
    (value) => (value === 0 || value == null ? "" : formatFullNumber(value)),
    []
  );

  const enrichRows = useCallback(
    (rows) => enrichGroupedRowsWithAvailabilityPct(rows, showLowStock),
    [showLowStock]
  );

  const branchRows = useMemo(
    () => enrichRows(branchTableRows),
    [branchTableRows, enrichRows]
  );
  const distributorRows = useMemo(
    () => enrichRows(distributorTableRows),
    [distributorTableRows, enrichRows]
  );
  const supplierRows = useMemo(
    () => enrichRows(supplierTableRows),
    [supplierTableRows, enrichRows]
  );
  const buyerRows = useMemo(
    () => enrichRows(buyerTableRows),
    [buyerTableRows, enrichRows]
  );
  const departmentRows = useMemo(
    () => enrichRows(departmentTableRows),
    [departmentTableRows, enrichRows]
  );
  const categoryRows = useMemo(
    () => enrichRows(categoryTableRows),
    [categoryTableRows, enrichRows]
  );
  const subcategoryRows = useMemo(
    () => enrichRows(subcategoryTableRows),
    [subcategoryTableRows, enrichRows]
  );
  const purchaseTypeRows = useMemo(
    () => enrichRows(purchaseTypeTableRows),
    [purchaseTypeTableRows, enrichRows]
  );
  const chainLevelRows = useMemo(
    () => enrichRows(chainLevelTableRows),
    [chainLevelTableRows, enrichRows]
  );
  const availabilityStatusRows = useMemo(
    () => enrichGroupedRowsWithProductCount(stockAvailabilityTableRows),
    [stockAvailabilityTableRows]
  );

  const groupedTableColDefs = useMemo(() => {
    const pctColumns = [
      {
        field: "available_pct",
        headerName: "Available %",
        valueGetter: (params) => params.data?.available_pct,
        cellRenderer: pctCellRenderer,
      },
      {
        field: "out_of_stock_pct",
        headerName: "Out Of Stock %",
        valueGetter: (params) => params.data?.out_of_stock_pct,
        cellRenderer: pctCellRenderer,
      },
    ];

    if (showLowStock) {
      pctColumns.push({
        field: "low_stock_pct",
        headerName: "Low Stock %",
        valueGetter: (params) => params.data?.low_stock_pct,
        cellRenderer: pctCellRenderer,
      });
    }

    return [
      { field: "group_name", headerName: "Name", flex: 1 },
      { field: "item_count", headerName: "Products", type: "number" },
      { field: "total_stock", headerName: "Stock", type: "number" },
      { field: "total_value", headerName: "Stock Value", type: "number" },
      ...pctColumns,
      {
        field: "action",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => [
          {
            label: "View Items",
            value: "view_items",
            onClick: () =>
              openItemsModal(
                `${params.data?.group_name} - Items`,
                params.data?.items
              ),
          },
        ],
      },
    ];
  }, [openItemsModal, showLowStock]);

  const availabilityStatusColDefs = useMemo(
    () => [
      { field: "group_name", headerName: "Status", flex: 1 },
      { field: "item_count", headerName: "Products", type: "number" },
      {
        field: "pct_split",
        headerName: "% Split",
        valueGetter: (params) => {
          const pct = params.data?.pct_split;
          if (pct == null || Number.isNaN(Number(pct))) return null;
          return pct;
        },
        cellRenderer: pctCellRenderer,
      },
      { field: "total_stock", headerName: "Stock", type: "number" },
      { field: "total_value", headerName: "Stock Value", type: "number" },
      {
        field: "action",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => [
          {
            label: "View Items",
            value: "view_items",
            onClick: () =>
              openItemsModal(
                `${params.data?.group_name} - Items`,
                params.data?.items
              ),
          },
        ],
      },
    ],
    [openItemsModal]
  );

  const productsColumnDefs = useMemo(
    () => getStockHoldingItemsColumnDefs({ showLowStock }),
    [showLowStock]
  );

  const availabilityStatCards = useMemo(() => {
    const byKey = Object.fromEntries(
      (stockAvailabilityBarData || []).map((entry) => [
        entry.filterValue,
        entry,
      ])
    );
    return getStockAvailabilityPieOrder(showLowStock).map(({ key, name }) => {
      const entry = byKey[key];
      return {
        key,
        name,
        pct: entry?.pct ?? 0,
        count: entry?.value ?? 0,
        color: AVAILABILITY_STAT_COLORS[key] ?? "gray",
      };
    });
  }, [stockAvailabilityBarData, showLowStock]);

  const gridKey = (tableKey) => `${tableKey}-${gridResetKey}`;

  return (
    <>
      <Grid
        templateColumns={{
          base: "1fr",
          lg: "minmax(0, 1fr) minmax(220px, 280px)",
        }}
        gap={4}
        alignItems="stretch"
      >
        <BarChartCard
          title="Stock Availability by Status"
          data={stockAvailabilityBarData}
          onBarClick={handleAvailabilityBarClick}
          valueFormatter={chartNumberFormatter}
          legendValueFormatter={chartNumberFormatter}
          showPctInTooltip
        />

        <Flex
          direction="column"
          gap={4}
          w="100%"
          maxW={{ base: "100%", lg: "280px" }}
          justifySelf={{ lg: "end" }}
          alignSelf="stretch"
          minH={{ base: "auto", lg: "320px" }}
        >
          {availabilityStatCards.map((entry) => (
            <AvailabilityStatCard
              key={entry.key}
              title={entry.name}
              pct={entry.pct}
              count={entry.count}
              color={entry.color}
            />
          ))}
        </Flex>
      </Grid>

      <Box>
        <CustomContainer title="Grouped Totals" size="sm" color="secondary">
          <Tabs.Root
            value={groupedTab}
            onValueChange={(details) => setGroupedTab(details.value)}
            variant="line"
            colorPalette="secondary"
          >
            <ScrollableTabsList>
              <Tabs.List flexWrap="nowrap" w="max-content" minW="100%" gap={1}>
                <Tabs.Trigger value="products" whiteSpace="nowrap">
                  Products
                </Tabs.Trigger>
                <Tabs.Trigger value="branch" whiteSpace="nowrap">
                  By Branch
                </Tabs.Trigger>
                <Tabs.Trigger value="distributor" whiteSpace="nowrap">
                  By Distributor
                </Tabs.Trigger>
                <Tabs.Trigger value="supplier" whiteSpace="nowrap">
                  By Supplier
                </Tabs.Trigger>
                <Tabs.Trigger value="buyer" whiteSpace="nowrap">
                  By Buyer
                </Tabs.Trigger>
                <Tabs.Trigger value="department" whiteSpace="nowrap">
                  By Department
                </Tabs.Trigger>
                <Tabs.Trigger value="category" whiteSpace="nowrap">
                  By Category
                </Tabs.Trigger>
                <Tabs.Trigger value="subcategory" whiteSpace="nowrap">
                  By Subcategory
                </Tabs.Trigger>
                <Tabs.Trigger value="purchase_type" whiteSpace="nowrap">
                  By Purchase Type
                </Tabs.Trigger>
                <Tabs.Trigger value="chain_bill_count_level" whiteSpace="nowrap">
                  By Chain Bill Count Level
                </Tabs.Trigger>
                <Tabs.Trigger value="product_availability" whiteSpace="nowrap">
                  By Product Availability
                </Tabs.Trigger>
              </Tabs.List>
            </ScrollableTabsList>
            <Tabs.Content value="products" pt={4}>
              <AgGrid
                key={gridKey(`${STOCK_HOLDING_ITEMS_TABLE_KEY}-availability-products`)}
                tableKey={`${STOCK_HOLDING_ITEMS_TABLE_KEY}-availability-products`}
                rowData={filteredRows}
                columnDefs={productsColumnDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="branch" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-availability-branch")}
                tableKey="stock-holding-dashboard-availability-branch"
                rowData={branchRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="distributor" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-availability-distributor")}
                tableKey="stock-holding-dashboard-availability-distributor"
                rowData={distributorRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="supplier" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-availability-supplier")}
                tableKey="stock-holding-dashboard-availability-supplier"
                rowData={supplierRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="buyer" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-availability-buyer")}
                tableKey="stock-holding-dashboard-availability-buyer"
                rowData={buyerRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="department" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-availability-department")}
                tableKey="stock-holding-dashboard-availability-department"
                rowData={departmentRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="category" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-availability-category")}
                tableKey="stock-holding-dashboard-availability-category"
                rowData={categoryRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="subcategory" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-availability-subcategory")}
                tableKey="stock-holding-dashboard-availability-subcategory"
                rowData={subcategoryRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="purchase_type" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-availability-purchase-type")}
                tableKey="stock-holding-dashboard-availability-purchase-type"
                rowData={purchaseTypeRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="chain_bill_count_level" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-availability-chain-level")}
                tableKey="stock-holding-dashboard-availability-chain-level"
                rowData={chainLevelRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="product_availability" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-grouped-availability-status")}
                tableKey="stock-holding-dashboard-grouped-availability-status"
                rowData={availabilityStatusRows}
                columnDefs={availabilityStatusColDefs}
              />
            </Tabs.Content>
          </Tabs.Root>
        </CustomContainer>
      </Box>
    </>
  );
}
