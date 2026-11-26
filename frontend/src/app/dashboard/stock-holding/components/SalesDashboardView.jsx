"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Center, Flex, Grid, Spinner, Tabs, Text } from "@chakra-ui/react";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import { formatDateDisplay, filterSalesItemsBySoldStatus, soldStatusFromBarName, SALES_SOLD_STATUS_KEYS } from "@/utils/salesDashboard";
import { useStockHoldingDashboard } from "../StockHoldingDashboardContext";
import useSalesDashboardData from "../hooks/useSalesDashboardData";
import SalesWindowStatCard from "./SalesWindowStatCard";
import SalesLineChartCard from "./SalesLineChartCard";
import SalesSoldUnsoldBarChart from "./SalesSoldUnsoldBarChart";
import SalesGroupedTabPanel from "./SalesGroupedTabPanel";
import ViewSalesItemsModal from "./ViewSalesItemsModal";
import ScrollableTabsList from "./ScrollableTabsList";
import {
  getSalesCumulativeColumnDefs,
  getSalesItemsColumnDefs,
  SALES_ITEMS_TABLE_KEY,
} from "../salesItemsColumnDefs";

const GROUP_TABS = [
  { value: "branch", label: "By Branch" },
  { value: "department", label: "By Department" },
  { value: "category", label: "By Category" },
  { value: "subcategory", label: "By Subcategory" },
];

export default function SalesDashboardView() {
  const [groupedTab, setGroupedTab] = useState("daily");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalRows, setModalRows] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const {
    salesSelectedDate,
    dashboardFilters,
    setSalesFilterOptions,
    registerSalesRefresh,
    getStockRowsForDate,
    clearSalesStockCache,
    salesSoldStatusFilter,
    setSalesSoldStatusFilter,
    applyFilterUpdate,
  } = useStockHoldingDashboard();

  const {
    loading,
    refreshing,
    summaryStreaming,
    summaryStreamProgress,
    loadedFromCache,
    bundle,
    refreshData,
    window7,
    window15,
    window30,
    window60,
    window90,
    todaySummary,
    soldUnsoldBarData,
    lineChartData,
    cumulativeRows,
    displayItems,
    displayItemsLoading,
    itemsFetchProgress,
    selectedDateHasReport,
    filterOptions,
    loadItemsForModal,
  } = useSalesDashboardData({
    selectedDate: salesSelectedDate,
    dashboardFilters,
    enabled: true,
    getStockRowsForDate,
    clearSalesStockCache,
  });

  useEffect(() => {
    registerSalesRefresh(refreshData);
    return () => registerSalesRefresh(null);
  }, [refreshData, registerSalesRefresh]);

  useEffect(() => {
    if (filterOptions) {
      setSalesFilterOptions(filterOptions);
    }
  }, [filterOptions, setSalesFilterOptions]);

  const handleViewDay = useCallback(
    async (date) => {
      if (!date) return;
      setModalTitle(`Sales on ${formatDateDisplay(date)}`);
      setModalOpen(true);
      setModalLoading(true);
      setModalRows([]);
      try {
        const items = await loadItemsForModal(date);
        setModalRows(items);
      } catch {
        setModalRows([]);
      } finally {
        setModalLoading(false);
      }
    },
    [loadItemsForModal]
  );

  const handleViewProducts = useCallback((groupName, items) => {
    setModalTitle(`${groupName} — ${formatDateDisplay(salesSelectedDate)}`);
    setModalOpen(true);
    setModalLoading(false);
    setModalRows(items || []);
  }, [salesSelectedDate]);

  const itemsColumnDefs = useMemo(() => getSalesItemsColumnDefs(), []);

  const cumulativeColumnDefs = useMemo(
    () =>
      getSalesCumulativeColumnDefs({
        onViewDay: handleViewDay,
      }),
    [handleViewDay]
  );

  const filteredDisplayItems = useMemo(
    () => filterSalesItemsBySoldStatus(displayItems, salesSoldStatusFilter),
    [displayItems, salesSoldStatusFilter]
  );

  const handleSoldUnsoldBarClick = useCallback(
    (entry) => {
      const nextStatus = soldStatusFromBarName(entry?.name);
      applyFilterUpdate(() => {
        setSalesSoldStatusFilter((prev) =>
          prev === nextStatus ? SALES_SOLD_STATUS_KEYS.ALL : nextStatus
        );
      });
    },
    [applyFilterUpdate, setSalesSoldStatusFilter]
  );

  const productsLoading = displayItemsLoading;
  const hasProductRows = filteredDisplayItems.length > 0;
  const hasUnfilteredProductRows = displayItems.length > 0;
  const isSoldStatusFiltered =
    salesSoldStatusFilter && salesSoldStatusFilter !== SALES_SOLD_STATUS_KEYS.ALL;

  const groupedPanelProps = {
    selectedDate: salesSelectedDate,
    items: filteredDisplayItems,
    loading: displayItemsLoading,
    hasReport: selectedDateHasReport,
    hasSourceItems: hasUnfilteredProductRows,
    onViewProducts: handleViewProducts,
    emptyMessage: isSoldStatusFiltered
      ? "No products match the selected sold status filter."
      : undefined,
  };

  const summaryProgressPercent = summaryStreamProgress
    ? Math.round(
        (summaryStreamProgress.loadedDays / summaryStreamProgress.totalDays) *
          100
      )
    : 0;

  if (loading && !refreshing && !loadedFromCache && !bundle) {
    return (
      <Center minH="240px" flexDirection="column" gap={3}>
        <Spinner size="lg" colorPalette="brand" />
        <Text fontSize="sm" color="gray.600">
          Loading sales dashboard…
        </Text>
      </Center>
    );
  }

  return (
    <>
      {summaryStreaming && summaryStreamProgress ? (
        <CustomContainer title="Loading Sales Data" size="sm" color="secondary">
          <Flex direction="column" gap={2}>
            <Flex justify="space-between" align="center" gap={3}>
              <Text fontSize="sm" color="gray.600">
                Loading sales data… {summaryStreamProgress.loadedDays} /{" "}
                {summaryStreamProgress.totalDays} days
                {summaryStreamProgress.currentDate
                  ? ` (${summaryStreamProgress.currentDate})`
                  : ""}
              </Text>
              <Text fontSize="xs" color="gray.500">
                Day {summaryStreamProgress.chunkIndex} /{" "}
                {summaryStreamProgress.totalChunks}
              </Text>
            </Flex>
            <Box
              w="100%"
              h="8px"
              borderRadius="full"
              bg="gray.100"
              overflow="hidden"
            >
              <Box
                h="100%"
                borderRadius="full"
                bg="brand.500"
                w={`${summaryProgressPercent}%`}
                transition="width 0.35s ease"
              />
            </Box>
          </Flex>
        </CustomContainer>
      ) : null}
      {refreshing ? (
        <CustomContainer title="Refreshing Sales Data" size="sm" color="secondary">
          <Flex align="center" gap={3}>
            <Spinner size="sm" colorPalette="brand" />
            <Text fontSize="sm" color="gray.600">
              Refreshing sales dashboard…
            </Text>
          </Flex>
        </CustomContainer>
      ) : null}
      <ViewSalesItemsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        rows={modalRows}
        loading={modalLoading}
      />

      <Flex direction="column" gap={4}>
        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2, 1fr)",
            xl: "repeat(4, 1fr)",
          }}
          gap={4}
        >
          <SalesWindowStatCard
            periodLabel="Today"
            windowSummary={todaySummary}
            color="orange"
            deltaLabel="vs yesterday"
          />
          <SalesWindowStatCard
            days={7}
            windowSummary={window7}
            color="blue"
          />
          <SalesWindowStatCard
            days={15}
            windowSummary={window15}
            color="purple"
          />
          <SalesWindowStatCard
            days={30}
            windowSummary={window30}
            color="green"
          />
          <SalesWindowStatCard
            days={60}
            windowSummary={window60}
            color="teal"
          />
          <SalesWindowStatCard
            days={90}
            windowSummary={window90}
            color="cyan"
          />
          <Box gridColumn={{ base: "1", md: "span 2", xl: "span 2" }}>
            <SalesSoldUnsoldBarChart
              data={soldUnsoldBarData}
              title={`Sold vs Unsold (${formatDateDisplay(salesSelectedDate)})`}
              activeFilter={salesSoldStatusFilter}
              onBarClick={handleSoldUnsoldBarClick}
            />
          </Box>
        </Grid>

        <Tabs.Root
          value={groupedTab}
          onValueChange={(details) => setGroupedTab(details.value)}
          variant="line"
          colorPalette="brand"
        >
          <ScrollableTabsList>
            <Tabs.List flexWrap="nowrap" w="max-content" minW="100%" gap={1}>
              <Tabs.Trigger value="daily" whiteSpace="nowrap">
                Daily Sales
              </Tabs.Trigger>
              <Tabs.Trigger value="cumulative" whiteSpace="nowrap">
                Cumulative Sales
              </Tabs.Trigger>
              {GROUP_TABS.map((tab) => (
                <Tabs.Trigger key={tab.value} value={tab.value} whiteSpace="nowrap">
                  {tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </ScrollableTabsList>

          <Tabs.Content value="daily" pt={4}>
            <Flex direction="column" gap={4}>
              <SalesLineChartCard
                data={lineChartData}
                title="Daily Sales (Last 30 Days)"
              />

              <CustomContainer
                title={`Sales on ${formatDateDisplay(salesSelectedDate)}`}
                size="sm"
                color="secondary"
              >
                {!selectedDateHasReport && !hasUnfilteredProductRows ? (
                  <Text fontSize="sm" color="gray.600">
                    No sales report uploaded for the selected date.
                  </Text>
                ) : productsLoading && !hasProductRows ? (
                  <Center py={8} flexDirection="column" gap={2}>
                    <Spinner size="md" colorPalette="brand" />
                    <Text fontSize="sm" color="gray.600">
                      {itemsFetchProgress?.total != null
                        ? `Loading products… ${itemsFetchProgress.loaded.toLocaleString()} / ${itemsFetchProgress.total.toLocaleString()}`
                        : itemsFetchProgress?.loaded
                          ? `Loading products… ${itemsFetchProgress.loaded.toLocaleString()} rows`
                          : "Loading products…"}
                    </Text>
                  </Center>
                ) : !hasProductRows ? (
                  <Text fontSize="sm" color="gray.600">
                    {isSoldStatusFiltered
                      ? "No products match the selected sold status filter."
                      : "No products match the current filters for this date."}
                  </Text>
                ) : (
                  <Flex direction="column" gap={3}>
                    {productsLoading ? (
                      <Flex align="center" gap={2}>
                        <Spinner size="sm" colorPalette="brand" />
                        <Text fontSize="sm" color="gray.600">
                          {itemsFetchProgress?.total != null
                            ? `Loading more products… ${itemsFetchProgress.loaded.toLocaleString()} / ${itemsFetchProgress.total.toLocaleString()}`
                            : itemsFetchProgress?.loaded
                              ? `Loading more products… ${itemsFetchProgress.loaded.toLocaleString()} rows`
                              : "Loading more products…"}
                        </Text>
                      </Flex>
                    ) : null}
                    <AgGrid
                      tableKey={SALES_ITEMS_TABLE_KEY}
                      rowData={filteredDisplayItems}
                      columnDefs={itemsColumnDefs}
                      pagination={true}
                      paginationPageSize={20}
                    />
                  </Flex>
                )}
              </CustomContainer>
            </Flex>
          </Tabs.Content>

          <Tabs.Content value="cumulative" pt={4}>
            <CustomContainer
              title="Cumulative Sales (Last 30 Days)"
              size="sm"
              color="secondary"
            >
              <AgGrid
                tableKey="sales-dashboard-cumulative"
                rowData={cumulativeRows}
                columnDefs={cumulativeColumnDefs}
                pagination={true}
                paginationPageSize={15}
              />
            </CustomContainer>
          </Tabs.Content>

          {GROUP_TABS.map((tab) => (
            <Tabs.Content key={tab.value} value={tab.value} pt={4}>
              <SalesGroupedTabPanel groupBy={tab.value} {...groupedPanelProps} />
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </Flex>
    </>
  );
}
