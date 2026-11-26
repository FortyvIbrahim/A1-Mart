"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Box, Flex, Grid, Tabs } from "@chakra-ui/react";
import { FaBox, FaIndianRupeeSign } from "react-icons/fa6";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import { formatCurrency } from "@/utils/string";
import { useStockHoldingDashboard } from "../StockHoldingDashboardContext";
import BarChartCard from "./BarChartCard";
import ScrollableTabsList from "./ScrollableTabsList";
import {
  getStockHoldingItemsColumnDefs,
  STOCK_HOLDING_ITEMS_TABLE_KEY,
} from "../stockHoldingItemsColumnDefs";

const formatFullNumber = (value) => Number(value ?? 0).toLocaleString();

function StatCard({ title, value, color = "brand", icon }) {
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
      h="100%"
      gap={2}
      w="100%"
    >
      <Flex
        color={`${color}.300`}
        fontSize="36px"
        lineHeight="1"
        opacity={0.65}
        align="center"
        justify="center"
      >
        {icon}
      </Flex>
      <Box fontSize="xs" fontWeight="semibold" color={`${color}.700`}>
        {title}
      </Box>
      <Box
        fontSize="2xl"
        fontWeight="bold"
        color={`${color}.800`}
        lineHeight="1"
      >
        {value}
      </Box>
    </Flex>
  );
}

export default function HoldingDashboardView() {
  const [groupedTab, setGroupedTab] = useState("products");
  const groupedTableRef = useRef(null);

  const {
    dashboard,
    toggleChartFilter,
    setStatusFilter,
    setPurchaseTypeFilter,
    setChainLevelFilter,
    openItemsModal,
    showLowStock,
    gridResetKey,
  } = useStockHoldingDashboard();

  const {
    filteredRows,
    itemStatusPieData,
    purchaseTypePieData,
    chainBillPieData,
    totalStockQty,
    totalStockValue,
    supplierTableRows,
    distributorTableRows,
    departmentTableRows,
    categoryTableRows,
    subcategoryTableRows,
    buyerTableRows,
    branchTableRows,
    purchaseTypeTableRows,
    chainLevelTableRows,
    statusTableRows,
  } = dashboard;

  const handleItemStatusBarClick = useCallback(
    (entry) => toggleChartFilter(setStatusFilter, entry?.filterValue),
    [toggleChartFilter, setStatusFilter]
  );

  const handlePurchaseTypeBarClick = useCallback(
    (entry) => toggleChartFilter(setPurchaseTypeFilter, entry?.filterValue),
    [toggleChartFilter, setPurchaseTypeFilter]
  );

  const handleChainBillBarClick = useCallback(
    (entry) => toggleChartFilter(setChainLevelFilter, entry?.filterValue),
    [toggleChartFilter, setChainLevelFilter]
  );

  const chartNumberFormatter = useCallback(
    (value) => (value === 0 || value == null ? "" : formatFullNumber(value)),
    []
  );

  const productsColumnDefs = useMemo(
    () => getStockHoldingItemsColumnDefs({ showLowStock }),
    [showLowStock]
  );

  const groupedTableColDefs = useMemo(
    () => [
      { field: "group_name", headerName: "Name", flex: 1 },
      { field: "item_count", headerName: "Items", type: "number" },
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
        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2, 1fr)",
            xl: "repeat(3, 1fr)",
          }}
          gap={4}
        >
          <BarChartCard
            title="Product Availability"
            data={itemStatusPieData}
            onBarClick={handleItemStatusBarClick}
            valueFormatter={chartNumberFormatter}
            legendValueFormatter={chartNumberFormatter}
          />
          <BarChartCard
            title="Purchase Type"
            data={purchaseTypePieData}
            onBarClick={handlePurchaseTypeBarClick}
            valueFormatter={chartNumberFormatter}
            legendValueFormatter={chartNumberFormatter}
          />
          <BarChartCard
            title="Chain Bill Count Level"
            data={chainBillPieData}
            onBarClick={handleChainBillBarClick}
            valueFormatter={chartNumberFormatter}
            legendValueFormatter={chartNumberFormatter}
          />
        </Grid>
        <Grid
          templateColumns="1fr"
          gap={4}
          w="100%"
          maxW={{ base: "100%", lg: "280px" }}
          justifySelf={{ lg: "end" }}
        >
          <StatCard
            title="Total Stock Qty"
            color="blue"
            icon={<FaBox />}
            value={formatFullNumber(totalStockQty)}
          />
          <StatCard
            title="Total Stock Value"
            color="brand"
            icon={<FaIndianRupeeSign />}
            value={formatCurrency(totalStockValue)}
          />
        </Grid>
      </Grid>

      <Box ref={groupedTableRef}>
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
                <Tabs.Trigger value="status" whiteSpace="nowrap">
                  By Item Status
                </Tabs.Trigger>
              </Tabs.List>
            </ScrollableTabsList>
            <Tabs.Content value="products" pt={4}>
              <AgGrid
                key={gridKey(`${STOCK_HOLDING_ITEMS_TABLE_KEY}-products`)}
                tableKey={`${STOCK_HOLDING_ITEMS_TABLE_KEY}-products`}
                rowData={filteredRows}
                columnDefs={productsColumnDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="branch" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-grouped-branch")}
                tableKey="stock-holding-dashboard-grouped-branch"
                rowData={branchTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="distributor" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-grouped-distributor")}
                tableKey="stock-holding-dashboard-grouped-distributor"
                rowData={distributorTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="supplier" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-grouped-supplier")}
                tableKey="stock-holding-dashboard-grouped-supplier"
                rowData={supplierTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="buyer" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-grouped-buyer")}
                tableKey="stock-holding-dashboard-grouped-buyer"
                rowData={buyerTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="department" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-grouped-department")}
                tableKey="stock-holding-dashboard-grouped-department"
                rowData={departmentTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="category" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-grouped-category")}
                tableKey="stock-holding-dashboard-grouped-category"
                rowData={categoryTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="subcategory" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-grouped-subcategory")}
                tableKey="stock-holding-dashboard-grouped-subcategory"
                rowData={subcategoryTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="purchase_type" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-grouped-purchase-type")}
                tableKey="stock-holding-dashboard-grouped-purchase-type"
                rowData={purchaseTypeTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="chain_bill_count_level" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-grouped-chain-level")}
                tableKey="stock-holding-dashboard-grouped-chain-level"
                rowData={chainLevelTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content value="status" pt={4}>
              <AgGrid
                key={gridKey("stock-holding-dashboard-grouped-status")}
                tableKey="stock-holding-dashboard-grouped-status"
                rowData={statusTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
          </Tabs.Root>
        </CustomContainer>
      </Box>
    </>
  );
}
