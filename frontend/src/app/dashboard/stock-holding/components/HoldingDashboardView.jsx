"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Box, Flex, Grid, Tabs } from "@chakra-ui/react";
import { LuBox, LuIndianRupee, LuPackage } from "react-icons/lu";
import {
  DashboardCard,
  DashboardMetricCard,
  DashboardTabs,
} from "@/components/dashboard/DashboardUI";
import DonutChartCard from "./DonutChartCard";
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

  const activeCount =
    (itemStatusPieData || []).find((d) => d.filterValue === "active")?.value ?? 0;
  const groupedTitle =
    {
      products: "Products",
      branch: "By Branch",
      distributor: "By Distributor",
      supplier: "By Supplier",
      buyer: "By Buyer",
      department: "By Department",
      category: "By Category",
      subcategory: "By Subcategory",
      purchase_type: "By Purchase Type",
      chain_bill_count_level: "By Bill Level",
      status: "By Status",
    }[groupedTab] ?? "Products";

  return (
    <>
      {/* Figma "Stock Holding / Products": two donut cards, three tinted
          metric cards, pill tabs, then the table card. */}
      <Grid templateColumns={{ base: "1fr", lg: "repeat(2, minmax(0, 1fr))" }} gap="16px">
        <DonutChartCard
          title="Purchase Type"
          data={purchaseTypePieData}
          onSliceClick={handlePurchaseTypeBarClick}
          valueFormatter={formatFullNumber}
        />
        <DonutChartCard
          title="Chain Bill Count Level"
          data={chainBillPieData}
          onSliceClick={handleChainBillBarClick}
          valueFormatter={formatFullNumber}
        />
      </Grid>

      <Grid templateColumns={{ base: "1fr", lg: "repeat(3, 1fr)" }} gap="16px">
        <DashboardMetricCard
          tone="orange"
          icon={<LuPackage />}
          label="Product Availability"
          value={formatFullNumber(activeCount)}
          caption="Active"
          onClick={() =>
            handleItemStatusBarClick({ filterValue: "active" })
          }
        />
        <DashboardMetricCard
          tone="blue"
          icon={<LuBox />}
          label="Total Stock Qty"
          value={formatFullNumber(totalStockQty)}
          caption="Selected period"
        />
        <DashboardMetricCard
          tone="purple"
          icon={<LuIndianRupee />}
          label="Total Stock Value"
          value={formatCurrency(totalStockValue)}
          caption="Selected period"
        />
      </Grid>

      <Flex ref={groupedTableRef} direction="column" gap="16px">
        <Box overflowX="auto" css={{ scrollbarWidth: "none" }}>
          <DashboardTabs
            value={groupedTab}
            onChange={setGroupedTab}
            tabs={[
            { value: "products", label: "Products" },
            { value: "branch", label: "By Branch" },
            { value: "distributor", label: "By Distributor" },
            { value: "supplier", label: "By Supplier" },
            { value: "buyer", label: "By Buyer" },
            { value: "department", label: "By Department" },
            { value: "category", label: "By Category" },
            { value: "subcategory", label: "By Subcategory" },
            { value: "purchase_type", label: "By Purchase Type" },
            { value: "chain_bill_count_level", label: "By Bill Level" },
            { value: "status", label: "By Status" },
            ]}
          />
        </Box>
        <DashboardCard title={groupedTitle}>
          <Tabs.Root value={groupedTab} onValueChange={(d) => setGroupedTab(d.value)}>
            <Tabs.Content pt={0} value="products">
              <AgGrid
                bare
                key={gridKey(`${STOCK_HOLDING_ITEMS_TABLE_KEY}-products`)}
                tableKey={`${STOCK_HOLDING_ITEMS_TABLE_KEY}-products`}
                rowData={filteredRows}
                columnDefs={productsColumnDefs}
              />
            </Tabs.Content>
            <Tabs.Content pt={0} value="branch">
              <AgGrid
                bare
                key={gridKey("stock-holding-dashboard-grouped-branch")}
                tableKey="stock-holding-dashboard-grouped-branch"
                rowData={branchTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content pt={0} value="distributor">
              <AgGrid
                bare
                key={gridKey("stock-holding-dashboard-grouped-distributor")}
                tableKey="stock-holding-dashboard-grouped-distributor"
                rowData={distributorTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content pt={0} value="supplier">
              <AgGrid
                bare
                key={gridKey("stock-holding-dashboard-grouped-supplier")}
                tableKey="stock-holding-dashboard-grouped-supplier"
                rowData={supplierTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content pt={0} value="buyer">
              <AgGrid
                bare
                key={gridKey("stock-holding-dashboard-grouped-buyer")}
                tableKey="stock-holding-dashboard-grouped-buyer"
                rowData={buyerTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content pt={0} value="department">
              <AgGrid
                bare
                key={gridKey("stock-holding-dashboard-grouped-department")}
                tableKey="stock-holding-dashboard-grouped-department"
                rowData={departmentTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content pt={0} value="category">
              <AgGrid
                bare
                key={gridKey("stock-holding-dashboard-grouped-category")}
                tableKey="stock-holding-dashboard-grouped-category"
                rowData={categoryTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content pt={0} value="subcategory">
              <AgGrid
                bare
                key={gridKey("stock-holding-dashboard-grouped-subcategory")}
                tableKey="stock-holding-dashboard-grouped-subcategory"
                rowData={subcategoryTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content pt={0} value="purchase_type">
              <AgGrid
                bare
                key={gridKey("stock-holding-dashboard-grouped-purchase-type")}
                tableKey="stock-holding-dashboard-grouped-purchase-type"
                rowData={purchaseTypeTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content pt={0} value="chain_bill_count_level">
              <AgGrid
                bare
                key={gridKey("stock-holding-dashboard-grouped-chain-level")}
                tableKey="stock-holding-dashboard-grouped-chain-level"
                rowData={chainLevelTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
            <Tabs.Content pt={0} value="status">
              <AgGrid
                bare
                key={gridKey("stock-holding-dashboard-grouped-status")}
                tableKey="stock-holding-dashboard-grouped-status"
                rowData={statusTableRows}
                columnDefs={groupedTableColDefs}
              />
            </Tabs.Content>
          </Tabs.Root>
        </DashboardCard>
      </Flex>
    </>
  );
}
