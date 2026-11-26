"use client";

import React, { useMemo } from "react";
import moment from "moment";
import {
  Box,
  Button,
  Center,
  Checkbox,
  Flex,
  Grid,
  Input,
  Spinner,
  Tabs,
  Text,
} from "@chakra-ui/react";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import { DashboardTitleSection } from "@/components/dashboard/DashboardPageTitle";
import { DASHBOARD_ROUTES } from "@/constants/routes/index";
import ViewItemsModal from "./ViewItemsModal";
import { useStockHoldingDashboard } from "../StockHoldingDashboardContext";
import useBranchFilterAccess from "@/customHooks/useBranchFilterAccess";
import { SALES_SOLD_STATUS_OPTIONS } from "@/utils/salesDashboard";

const DASHBOARD_TABS = [
  { value: "holding", label: "Stock Holding" },
  { value: "availability", label: "Stock Availability" },
  { value: "sales", label: "Sales Dashboard" },
];

export default function StockHoldingDashboardShell({
  activeTab,
  onTabChange,
  children,
}) {
  const {
    selectedDate,
    setSelectedDate,
    salesSelectedDate,
    setSalesSelectedDate,
    loading,
    refreshing,
    fetchProgress,
    lastSyncAt,
    refreshData,
    refreshSalesData,
    rawItems,
    enriching,
    dashboard,
    applyFilterUpdate,
    isBranchLocked,
    branchFilter,
    setBranchFilter,
    buyerFilter,
    setBuyerFilter,
    supplierFilter,
    setSupplierFilter,
    distributorFilter,
    setDistributorFilter,
    departmentFilter,
    setDepartmentFilter,
    categoryFilter,
    setCategoryFilter,
    subcategoryFilter,
    setSubcategoryFilter,
    purchaseTypeFilter,
    setPurchaseTypeFilter,
    chainLevelFilter,
    setChainLevelFilter,
    statusFilter,
    setStatusFilter,
    stockAvailabilityFilter,
    setStockAvailabilityFilter,
    showLowStock,
    setShowLowStock,
    salesSoldStatusFilter,
    setSalesSoldStatusFilter,
    // showStockOnOrderOnly,
    // setShowStockOnOrderOnly,
    clearFilters,
    itemsModalOpen,
    setItemsModalOpen,
    itemsModalTitle,
    filteredModalRows,
    salesFilterOptions,
  } = useStockHoldingDashboard();

  const {
    branchOptions,
    buyerOptions,
    supplierOptions,
    distributorOptions,
    departmentOptions,
    categoryOptions,
    subcategoryOptions,
    purchaseTypeOptions,
    chainLevelOptions,
    statusOptions,
    stockAvailabilityOptions,
  } = dashboard;

  const isSalesTab = activeTab === "sales";
  const salesFiltersReady = !isSalesTab || Boolean(salesFilterOptions);
  const { userBranchKey, userBranchName } = useBranchFilterAccess();
  const branchOptionsSource = isSalesTab
    ? salesFilterOptions?.branchOptions ?? []
    : branchOptions;
  const displayBranchOptions = useMemo(() => {
    if (!isBranchLocked || !userBranchKey) return branchOptionsSource;
    if (branchOptionsSource.some((option) => option.value === userBranchKey)) {
      return branchOptionsSource;
    }
    return [
      ...branchOptionsSource,
      { value: userBranchKey, label: userBranchName || "My Branch" },
    ].sort((a, b) => a.label.localeCompare(b.label));
  }, [
    branchOptionsSource,
    isBranchLocked,
    userBranchKey,
    userBranchName,
  ]);

  const lastSyncFormatted = useMemo(() => {
    if (!lastSyncAt) return null;
    const m = moment(lastSyncAt);
    return m.isValid() ? m.format("DD MMM YYYY, hh:mm A") : null;
  }, [lastSyncAt]);

  const hasReportData = rawItems.length > 0;
  const showStockDashboard = hasReportData && !enriching;
  const showFiltersAndContent = isSalesTab || showStockDashboard;
  const datePickerValue = isSalesTab ? salesSelectedDate : selectedDate;
  const handleDateChange = (value) => {
    if (isSalesTab) {
      setSalesSelectedDate(value);
      return;
    }
    setSelectedDate(value);
  };

  const effectiveBuyerOptions = isSalesTab
    ? salesFilterOptions?.buyerOptions ?? []
    : buyerOptions;
  const effectiveSupplierOptions = isSalesTab
    ? salesFilterOptions?.supplierOptions ?? []
    : supplierOptions;
  const effectiveDistributorOptions = isSalesTab
    ? salesFilterOptions?.distributorOptions ?? []
    : distributorOptions;
  const effectiveDepartmentOptions = isSalesTab
    ? salesFilterOptions?.departmentOptions ?? []
    : departmentOptions;
  const effectiveCategoryOptions = isSalesTab
    ? salesFilterOptions?.categoryOptions ?? []
    : categoryOptions;
  const effectiveSubcategoryOptions = isSalesTab
    ? salesFilterOptions?.subcategoryOptions ?? []
    : subcategoryOptions;
  const effectivePurchaseTypeOptions = isSalesTab
    ? salesFilterOptions?.purchaseTypeOptions ?? []
    : purchaseTypeOptions;
  const effectiveChainLevelOptions = isSalesTab
    ? salesFilterOptions?.chainLevelOptions ?? []
    : chainLevelOptions;

  const handleRefresh = () => {
    if (isSalesTab) {
      refreshSalesData();
      return;
    }
    refreshData();
  };

  if (loading && !refreshing && !isSalesTab) {
    return (
      <GlobalWrapper
        permissionKey={DASHBOARD_ROUTES.stockHolding.permissionKey}
      >
        <Center minH="240px" flexDirection="column" gap={3}>
          <Spinner size="lg" colorPalette="brand" />
          <Text fontSize="sm" color="gray.600">
            {fetchProgress?.total != null
              ? `Loading report… ${fetchProgress.loaded.toLocaleString()} / ${fetchProgress.total.toLocaleString()} rows`
              : fetchProgress?.loaded
                ? `Loading report… ${fetchProgress.loaded.toLocaleString()} rows`
                : "Loading report…"}
          </Text>
        </Center>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey={DASHBOARD_ROUTES.stockHolding.permissionKey}>
      <ViewItemsModal
        open={itemsModalOpen}
        onClose={() => setItemsModalOpen(false)}
        title={itemsModalTitle}
        rows={filteredModalRows}
        showAvailabilitySummary={activeTab === "availability"}
        showLowStock={showLowStock}
      />

      <Flex
        direction="column"
        gap="22px"
        w="100%"
        maxW="100%"
        overflow="hidden"
      >
        <DashboardTitleSection>
          <Flex
            direction="column"
            gap={3}
            w="100%"
            align="stretch"
          >
            <Flex
              justify="space-between"
              w="100%"
              gap={3}
              flexWrap="wrap"
              alignItems="flex-end"
            >
              <Tabs.Root
                value={activeTab}
                onValueChange={(details) => onTabChange(details.value)}
                variant="line"
                colorPalette="brand"
                fitted={false}
              >
                <Tabs.List borderBottomWidth="0">
                  {DASHBOARD_TABS.map((tab) => (
                    <Tabs.Trigger key={tab.value} value={tab.value}>
                      {tab.label}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>
              </Tabs.Root>

              <Flex align="flex-end" gap={3} flexWrap="wrap">
                <Box w={{ base: "100%", md: "220px" }}>
                  <Text fontSize="sm" mb={1} color="gray.600">
                    Date
                  </Text>
                  <Input
                    type="date"
                    value={datePickerValue}
                    onChange={(e) => handleDateChange(e.target.value)}
                  />
                </Box>
                {!isSalesTab ? (
                  <Box>
                    <Text fontSize="xs" mb={1} color="gray.500">
                      Last sync
                    </Text>
                    <Text fontSize="sm" color="gray.700">
                      {lastSyncFormatted || "No sync data"}
                    </Text>
                  </Box>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="brand"
                  onClick={handleRefresh}
                  disabled={isSalesTab ? false : loading || refreshing}
                  loading={isSalesTab ? false : refreshing}
                  loadingText="Refreshing..."
                >
                  <i className="fa fa-refresh" aria-hidden="true" />
                  Refresh
                </Button>
              </Flex>
            </Flex>
          </Flex>
        </DashboardTitleSection>

        {refreshing && !isSalesTab ? (
          <CustomContainer title="Refreshing Data" size="sm" color="secondary">
            <Flex align="center" gap={3}>
              <Spinner size="sm" colorPalette="brand" />
              <Text fontSize="sm" color="gray.600">
                {fetchProgress?.total != null
                  ? `Fetching latest report… ${fetchProgress.loaded.toLocaleString()} / ${fetchProgress.total.toLocaleString()} rows`
                  : fetchProgress?.loaded
                    ? `Fetching latest report… ${fetchProgress.loaded.toLocaleString()} rows`
                    : "Fetching latest report…"}
              </Text>
            </Flex>
          </CustomContainer>
        ) : null}

        {hasReportData && enriching && !isSalesTab ? (
          <Center minH="240px">
            <Spinner size="lg" colorPalette="brand" />
          </Center>
        ) : !showFiltersAndContent ? (
          <CustomContainer title="No Data" size="sm" color="secondary">
            <Text color="gray.600" fontSize="sm">
              No stock holding report found on or before the selected date.
              Sync stock holding data from WMS to view dashboard data.
            </Text>
          </CustomContainer>
        ) : (
          <>
            <CustomContainer
              title="Filters"
              size="sm"
              color="secondary"
              rightSection={
                <Flex align="center" gap={4} flexWrap="wrap" justify="flex-end">
                  {!isSalesTab ? (
                    <Checkbox.Root
                      checked={showLowStock}
                      onCheckedChange={(e) =>
                        applyFilterUpdate(() =>
                          setShowLowStock(Boolean(e.checked))
                        )
                      }
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label fontSize="sm" whiteSpace="nowrap">
                        Show Low Stock
                      </Checkbox.Label>
                    </Checkbox.Root>
                  ) : null}
                  <Button
                    size="xs"
                    variant="outline"
                    colorPalette="secondary"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </Button>
                </Flex>
              }
            >
              <Grid
                templateColumns={{
                  base: "1fr",
                  md: "repeat(2, 1fr)",
                  lg: "repeat(4, 1fr)",
                }}
                gap={3}
              >
                <CustomInput
                  label="Branch"
                  placeholder="All branches"
                  method="multiple-dropdown"
                  value={branchFilter}
                  options={displayBranchOptions}
                  disabled={isBranchLocked || !salesFiltersReady}
                  onChange={(val) =>
                    applyFilterUpdate(() =>
                      setBranchFilter(Array.isArray(val) ? val : [])
                    )
                  }
                />
                <CustomInput
                  label="Buyer"
                  placeholder="All buyers"
                  method="multiple-dropdown"
                  value={buyerFilter}
                  options={effectiveBuyerOptions}
                  disabled={!salesFiltersReady}
                  onChange={(val) =>
                    applyFilterUpdate(() =>
                      setBuyerFilter(Array.isArray(val) ? val : [])
                    )
                  }
                />
                <CustomInput
                  label="Distributor"
                  placeholder="All distributors"
                  method="multiple-dropdown"
                  value={distributorFilter}
                  options={effectiveDistributorOptions}
                  disabled={!salesFiltersReady}
                  onChange={(val) =>
                    applyFilterUpdate(() =>
                      setDistributorFilter(Array.isArray(val) ? val : [])
                    )
                  }
                />
                <CustomInput
                  label="Supplier"
                  placeholder="All suppliers"
                  method="multiple-dropdown"
                  value={supplierFilter}
                  options={effectiveSupplierOptions}
                  disabled={!salesFiltersReady}
                  onChange={(val) =>
                    applyFilterUpdate(() =>
                      setSupplierFilter(Array.isArray(val) ? val : [])
                    )
                  }
                />
                <CustomInput
                  label="Department"
                  placeholder="All departments"
                  method="multiple-dropdown"
                  value={departmentFilter}
                  options={effectiveDepartmentOptions}
                  disabled={!salesFiltersReady}
                  onChange={(val) =>
                    applyFilterUpdate(() =>
                      setDepartmentFilter(Array.isArray(val) ? val : [])
                    )
                  }
                />
                <CustomInput
                  label="Category"
                  placeholder="All categories"
                  method="multiple-dropdown"
                  value={categoryFilter}
                  options={effectiveCategoryOptions}
                  disabled={!salesFiltersReady}
                  onChange={(val) =>
                    applyFilterUpdate(() =>
                      setCategoryFilter(Array.isArray(val) ? val : [])
                    )
                  }
                />
                <CustomInput
                  label="Subcategory"
                  placeholder="All subcategories"
                  method="multiple-dropdown"
                  value={subcategoryFilter}
                  options={effectiveSubcategoryOptions}
                  disabled={!salesFiltersReady}
                  onChange={(val) =>
                    applyFilterUpdate(() =>
                      setSubcategoryFilter(Array.isArray(val) ? val : [])
                    )
                  }
                />
                <CustomInput
                  label="Purchase Type"
                  placeholder="All purchase types"
                  method="multiple-dropdown"
                  value={purchaseTypeFilter}
                  options={effectivePurchaseTypeOptions}
                  disabled={!salesFiltersReady}
                  onChange={(val) =>
                    applyFilterUpdate(() =>
                      setPurchaseTypeFilter(Array.isArray(val) ? val : [])
                    )
                  }
                />
                <CustomInput
                  label="Chain Bill Count Level"
                  placeholder="All levels"
                  method="multiple-dropdown"
                  value={chainLevelFilter}
                  options={effectiveChainLevelOptions}
                  disabled={!salesFiltersReady}
                  onChange={(val) =>
                    applyFilterUpdate(() =>
                      setChainLevelFilter(Array.isArray(val) ? val : [])
                    )
                  }
                />
                {!isSalesTab ? (
                  <>
                    <CustomInput
                      label="Product Availability"
                      placeholder="All availability"
                      method="multiple-dropdown"
                      value={stockAvailabilityFilter}
                      options={stockAvailabilityOptions}
                      onChange={(val) =>
                        applyFilterUpdate(() =>
                          setStockAvailabilityFilter(
                            Array.isArray(val) ? val : []
                          )
                        )
                      }
                    />
                    <CustomInput
                      label="Item Status"
                      placeholder="All statuses"
                      method="multiple-dropdown"
                      value={statusFilter}
                      options={statusOptions}
                      onChange={(val) =>
                        applyFilterUpdate(() =>
                          setStatusFilter(Array.isArray(val) ? val : [])
                        )
                      }
                    />
                  </>
                ) : (
                  <CustomInput
                    label="Sold Status"
                    placeholder="All products"
                    method="dropdown"
                    value={salesSoldStatusFilter}
                    options={SALES_SOLD_STATUS_OPTIONS}
                    onChange={(val) =>
                      applyFilterUpdate(() =>
                        setSalesSoldStatusFilter(val || "all")
                      )
                    }
                  />
                )}
                {/* <Flex align="flex-end" pb={1}>
                  <Checkbox.Root
                    checked={showStockOnOrderOnly}
                    onCheckedChange={(e) =>
                      applyFilterUpdate(() =>
                        setShowStockOnOrderOnly(Boolean(e.checked))
                      )
                    }
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label fontSize="sm">
                      Show Stock On Order
                    </Checkbox.Label>
                  </Checkbox.Root>
                </Flex> */}
              </Grid>
            </CustomContainer>

            {children}
          </>
        )}
      </Flex>
    </GlobalWrapper>
  );
}
