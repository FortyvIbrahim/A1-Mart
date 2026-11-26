"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Center,
  Flex,
  Grid,
  Icon,
  Spinner,
  Tabs,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FaBoxOpen } from "react-icons/fa";
import moment from "moment";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import DashboardPageTitle, {
  DashboardTitleSection,
} from "@/components/dashboard/DashboardPageTitle";
import BranchFilter from "@/components/BranchFilter";
import StockCircleFilter, { circleKey } from "@/components/StockCircleFilter";
import useStockCircles from "@/api/customHooks/useStockCircles";
import useProducts from "@/api/customHooks/useProducts";
import usePermission from "@/customHooks/usePermission";
import { getStockCirclesChecked } from "@/api/helpers/stock_circle_checked";
import {
  calculateSummaryStats,
  countDashboardProductInstances,
  createCheckedStockMap,
  filterProductsByCircle,
  getCheckedStockValue,
  getProductSellingPriceForBranch,
  getProductStockForBranch,
} from "@/utils/stockChecker";
import { calculateDaysLeft } from "@/utils/stockCirclePeriod";
import { capitalizeWords, formatCurrency } from "@/utils/string";
import DashboardBarChart from "@/components/dashboard/DashboardBarChart";
import DashboardChartLegend from "@/components/dashboard/DashboardChartLegend";
import { DASHBOARD_ROUTES } from "@/constants/routes/index";
import StockCircleCheckerDetailsModal from "@/components/dashboard/StockCircleCheckerDetailsModal";
import StockCircleDashboardCirclesTab from "@/components/dashboard/stock-circle/StockCircleDashboardCirclesTab";
import StockCircleDashboardCheckersTab from "@/components/dashboard/stock-circle/StockCircleDashboardCheckersTab";
import StockCircleDashboardDeadlinesTab from "@/components/dashboard/stock-circle/StockCircleDashboardDeadlinesTab";
import StockCircleDashboardProducts from "@/components/dashboard/stock-circle/StockCircleDashboardProducts";

const PIE_COLORS = { Completed: "#38A169", Pending: "#A0AEC0" };

/** Bar colors for Completion by branch (matches DashboardBarChart default palette) */
const BRANCH_BAR_COLORS = [
  "#3182CE",
  "#38A169",
  "#ECC94B",
  "#ED8936",
  "#9F7AEA",
  "#4A5568",
];

const DUE_SOON_DAYS = 14;

function normalizeCheckedResponse(res) {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  return [];
}

export default function StockCircleDashboardPage() {
  const { stockCircles, loading: loadingCircles } = useStockCircles();
  const { products, loading: loadingProducts } = useProducts({
    withStockPrice: true,
  });
  const canAccessAllBranches = usePermission("access_all_branches");

  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCircleIds, setSelectedCircleIds] = useState([]);
  const [allChecked, setAllChecked] = useState([]);
  const [loadingChecked, setLoadingChecked] = useState(true);
  const [selectedCheckerRowKeys, setSelectedCheckerRowKeys] = useState([]);
  const [mainTab, setMainTab] = useState("circles");
  const [productsStatusPreset, setProductsStatusPreset] = useState("total");
  const [productsScrollTrigger, setProductsScrollTrigger] = useState(0);
  const [checkerDetailsRow, setCheckerDetailsRow] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingChecked(true);
        const res = await getStockCirclesChecked();
        const list = normalizeCheckedResponse(res);
        if (!cancelled) setAllChecked(list);
      } catch (e) {
        console.error(e);
        if (!cancelled) setAllChecked([]);
      } finally {
        if (!cancelled) setLoadingChecked(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const branchFilteredCircles = useMemo(() => {
    if (!stockCircles?.length) return [];
    let rows = stockCircles;
    if (selectedBranch != null && selectedBranch !== "") {
      rows = rows.filter((c) => String(c.branch_id) === String(selectedBranch));
    }
    return rows.filter(
      (c) => c.is_active == null || c.is_active === 1 || c.is_active === true
    );
  }, [stockCircles, selectedBranch]);

  const filteredCircles = useMemo(() => {
    const idSet = new Set(selectedCircleIds.map(String));
    if (idSet.size === 0) return branchFilteredCircles;
    return branchFilteredCircles.filter((c) => idSet.has(String(circleKey(c))));
  }, [branchFilteredCircles, selectedCircleIds]);

  useEffect(() => {
    setSelectedCircleIds([]);
  }, [selectedBranch]);

  useEffect(() => {
    setSelectedCircleIds((prev) => {
      if (!prev?.length) return prev;
      const valid = new Set(
        branchFilteredCircles.map((c) => String(circleKey(c)))
      );
      return prev.filter((id) => valid.has(String(id)));
    });
  }, [branchFilteredCircles]);

  const isCircleFilterActive = selectedCircleIds.length > 0;
  const showSummaryDaysLeftCard = selectedCircleIds.length === 1;

  useEffect(() => {
    if (isCircleFilterActive && mainTab === "deadlines") {
      setMainTab("circles");
    }
  }, [isCircleFilterActive, mainTab]);

  const refetchAllChecked = useCallback(async () => {
    try {
      const res = await getStockCirclesChecked();
      const list = normalizeCheckedResponse(res);
      setAllChecked(list);
    } catch (e) {
      console.error(e);
      setAllChecked([]);
    }
  }, []);

  const circleSummaries = useMemo(() => {
    if (!products?.length || !filteredCircles.length) return [];

    return filteredCircles.map((circle) => {
      const id = circleKey(circle);
      const circleProducts = filterProductsByCircle(products, circle);
      const checkedForCircle = allChecked.filter(
        (row) => String(row.stock_circle_id) === String(id)
      );
      const stats = calculateSummaryStats(
        checkedForCircle,
        circleProducts,
        circle
      );
      const daysLeft = calculateDaysLeft(circle);

      let deadlineBucket = "unknown";
      if (daysLeft !== null) {
        if (daysLeft < 0) deadlineBucket = "overdue";
        else if (daysLeft <= DUE_SOON_DAYS) deadlineBucket = "due_soon";
        else deadlineBucket = "ok";
      }

      return {
        ...circle,
        id,
        daysLeft,
        deadlineBucket,
        ...stats,
      };
    });
  }, [products, filteredCircles, allChecked]);

  const completionTabStats = useMemo(() => {
    /** Same (circle × product) instance count as the Products table base rows — one SKU can appear in multiple circles. */
    const totalProducts = countDashboardProductInstances(
      filteredCircles,
      products
    );

    let checked = 0;
    let outOfStock = 0;
    let pending = 0;
    let completedInStock = 0;
    let inStock = 0;
    for (const s of circleSummaries) {
      checked += s.completedProductCount ?? 0;
      outOfStock += s.outOfStockProductCount ?? 0;
      pending += s.pendingProductCount ?? 0;
      completedInStock += s.completedInStockCount ?? 0;
      inStock += s.inStockProductCount ?? 0;
    }
    const percentCompleted =
      inStock > 0 ? Math.round((completedInStock / inStock) * 100) : 0;
    return {
      totalProducts,
      completedProductCount: checked,
      completedInStockCount: completedInStock,
      inStockProductCount: inStock,
      pendingProductCount: pending,
      outOfStockProductCount: outOfStock,
      percentCompleted,
    };
  }, [circleSummaries, filteredCircles, products]);

  const summaryValueStats = useMemo(() => {
    const today = moment().format("YYYY-MM-DD");
    const productById = new Map(
      (products || []).map((product) => [String(product.product_id), product])
    );
    const checksByCircle = new Map();
    for (const row of allChecked || []) {
      const circleId = String(row.stock_circle_id);
      if (!checksByCircle.has(circleId)) checksByCircle.set(circleId, []);
      checksByCircle.get(circleId).push(row);
    }

    let checkedValue = 0;
    let pendingValue = 0;
    let checkedToday = 0;
    let checkedTodayValue = 0;

    for (const circle of filteredCircles) {
      const circleId = String(circleKey(circle));
      const circleChecks = checksByCircle.get(circleId) || [];
      const checkedMap = createCheckedStockMap(circleChecks);
      const branchId = circle.branch_id;

      for (const product of filterProductsByCircle(products, circle)) {
        const stock = getProductStockForBranch(product, branchId);
        const isChecked = checkedMap[product.product_id] !== undefined;
        if (!isChecked && stock > 0) {
          pendingValue +=
            stock * getProductSellingPriceForBranch(product, branchId);
        }
      }

      for (const row of circleChecks) {
        const lineValue = getCheckedStockValue(
          row.checked_stock,
          productById.get(String(row.product_id)),
          branchId
        );
        checkedValue += lineValue;
        const raw = row.created_at ?? row.updated_at;
        const day = raw ? moment(raw).format("YYYY-MM-DD") : null;
        if (day === today) {
          checkedToday += 1;
          checkedTodayValue += lineValue;
        }
      }
    }

    return {
      checkedValue: Math.round(checkedValue * 100) / 100,
      pendingValue: Math.round(pendingValue * 100) / 100,
      checkedToday,
      checkedTodayValue: Math.round(checkedTodayValue * 100) / 100,
    };
  }, [allChecked, filteredCircles, products]);

  /** Days left for the single selected circle (hidden when multiple circles are selected). */
  const summaryDaysLeft = useMemo(() => {
    if (!showSummaryDaysLeftCard || !circleSummaries.length) return null;
    const d = circleSummaries[0]?.daysLeft;
    return d !== null && d !== undefined ? d : null;
  }, [showSummaryDaysLeftCard, circleSummaries]);

  const pieData = useMemo(() => {
    const { completedInStockCount, pendingProductCount, inStockProductCount } =
      completionTabStats;
    if (inStockProductCount === 0) return [];
    return [
      {
        name: "Completed",
        value: completedInStockCount,
        color: "#38A169",
      },
      {
        name: "Pending",
        value: pendingProductCount,
        color: "#A0AEC0",
      },
    ].filter((d) => d.value > 0);
  }, [completionTabStats]);

  /** Completion % per branch: sum(checked in-stock) / sum(in-stock in scope). */
  const completionBarData = useMemo(() => {
    const groups = new Map();
    for (const s of circleSummaries) {
      const bid =
        s.branch_id != null && s.branch_id !== ""
          ? String(s.branch_id)
          : "unknown";
      const cur = groups.get(bid) || {
        branch_id: s.branch_id,
        branch_name: s.branch_name,
        completedInStockCount: 0,
        inStockProductCount: 0,
      };
      cur.completedInStockCount += s.completedInStockCount ?? 0;
      cur.inStockProductCount += s.inStockProductCount ?? 0;
      if (s.branch_name) cur.branch_name = s.branch_name;
      groups.set(bid, cur);
    }
    const rows = Array.from(groups.values()).map((g) => {
      const ins = g.inStockProductCount;
      const completion =
        ins > 0 ? Math.round((g.completedInStockCount / ins) * 100) : 0;
      return {
        name: capitalizeWords(
          g.branch_name || `Branch ${g.branch_id ?? ""}`
        ).slice(0, 48),
        completion,
      };
    });
    return rows
      .sort((a, b) => b.completion - a.completion)
      .map((row, idx) => ({
        ...row,
        fill: BRANCH_BAR_COLORS[idx % BRANCH_BAR_COLORS.length],
      }));
  }, [circleSummaries]);

  const checkerRows = useMemo(() => {
    const circleById = new Map(
      filteredCircles.map((circle) => [String(circleKey(circle)), circle])
    );
    const productById = new Map(
      (products || []).map((product) => [String(product.product_id), product])
    );
    const map = new Map();

    allChecked.forEach((row) => {
      const circle = circleById.get(String(row.stock_circle_id));
      if (!circle) return;
      const code = row.created_by ?? "";
      const name = row.created_by_name ?? row.created_by ?? "Unknown";
      const key = `${code}|${name}`;
      const cur = map.get(key) || {
        rowKey: key,
        employee_code: code || "-",
        employee_name: name,
        products_checked: 0,
        checked_value: 0,
      };
      cur.products_checked += 1;
      cur.checked_value += getCheckedStockValue(
        row.checked_stock,
        productById.get(String(row.product_id)),
        circle.branch_id
      );
      map.set(key, cur);
    });

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        checked_value: Math.round(row.checked_value * 100) / 100,
      }))
      .sort((a, b) => b.products_checked - a.products_checked);
  }, [allChecked, filteredCircles, products]);

  const checkerEmployeeOptions = useMemo(
    () =>
      checkerRows.map((r) => ({
        value: r.rowKey,
        label: `${r.employee_code} - ${r.employee_name}`,
        searchText: `${r.employee_code} ${r.employee_name}`.toLowerCase(),
        employee_code: r.employee_code,
        employee_name: r.employee_name,
      })),
    [checkerRows]
  );

  const displayedCheckerRows = useMemo(() => {
    if (!selectedCheckerRowKeys?.length) return checkerRows;
    const allow = new Set(selectedCheckerRowKeys.map(String));
    return checkerRows.filter((r) => allow.has(String(r.rowKey)));
  }, [checkerRows, selectedCheckerRowKeys]);

  const checkerDateWiseDetails = useMemo(() => {
    if (!checkerDetailsRow) return [];
    const circleById = new Map(
      filteredCircles.map((circle) => [String(circleKey(circle)), circle])
    );
    const productById = new Map(
      (products || []).map((product) => [String(product.product_id), product])
    );
    const byDay = new Map();
    allChecked.forEach((row) => {
      const circle = circleById.get(String(row.stock_circle_id));
      if (!circle) return;
      const code = row.created_by ?? "";
      const name = row.created_by_name ?? row.created_by ?? "Unknown";
      const key = `${code}|${name}`;
      if (key !== checkerDetailsRow.rowKey) return;
      const raw = row.created_at ?? row.updated_at;
      const d = raw ? moment(raw).format("YYYY-MM-DD") : "Unknown date";
      const cur = byDay.get(d) || { count: 0, checked_value: 0 };
      cur.count += 1;
      cur.checked_value += getCheckedStockValue(
        row.checked_stock,
        productById.get(String(row.product_id)),
        circle.branch_id
      );
      byDay.set(d, cur);
    });
    return Array.from(byDay.entries())
      .map(([date, stats]) => ({
        date,
        count: stats.count,
        checked_value: Math.round(stats.checked_value * 100) / 100,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [checkerDetailsRow, allChecked, filteredCircles, products]);

  const dueSoonRows = useMemo(
    () => circleSummaries.filter((s) => s.deadlineBucket === "due_soon"),
    [circleSummaries]
  );

  const overdueRows = useMemo(
    () => circleSummaries.filter((s) => s.deadlineBucket === "overdue"),
    [circleSummaries]
  );

  const loading = loadingCircles || loadingProducts || loadingChecked;

  const openProductsTabWithStatus = useCallback((status) => {
    setProductsStatusPreset(status);
    setMainTab("products");
    setProductsScrollTrigger((prev) => prev + 1);
  }, []);

  const onBranchChange = useCallback((v) => {
    setSelectedBranch(v ?? "");
  }, []);

  if (loading) {
    return (
      <GlobalWrapper permissionKey={DASHBOARD_ROUTES.stockCircle.permissionKey}>
        <Center minH="240px">
          <Spinner size="lg" />
        </Center>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey={DASHBOARD_ROUTES.stockCircle.permissionKey}>
      <Flex
        flexDirection="column"
        gap="22px"
        w="100%"
        maxW="100%"
        overflow="hidden"
      >
        <DashboardTitleSection>
          <Flex
            justify="space-between"
            w="100%"
            gap={3}
            flexWrap="wrap"
            alignItems={{ base: "stretch", md: "center" }}
            rowGap={3}
          >
            <DashboardPageTitle title="Stock Circle Dashboard" />
            <Flex
              gap={4}
              flexWrap="wrap"
              alignItems="flex-end"
              justify="flex-end"
              w={{ base: "100%", md: "auto" }}
              flex={{ md: 1 }}
              minW={0}
            >
              {canAccessAllBranches && (
                <BranchFilter
                  value={selectedBranch}
                  onChange={onBranchChange}
                  label="Branch"
                  allLabel="All branches"
                />
              )}
              <StockCircleFilter
                circles={branchFilteredCircles}
                value={selectedCircleIds}
                onChange={setSelectedCircleIds}
                label="Circle"
                width={{ base: "100%", md: "min(100%, 320px)" }}
              />
            </Flex>
          </Flex>
        </DashboardTitleSection>

        <Grid
          templateColumns={{
            base: "1fr",
            lg: "minmax(0, 1fr) minmax(0, 2fr)",
          }}
          gap={6}
          alignItems="stretch"
        >
          <CustomContainer title="Completion" color="brand" size="sm" fullWidth>
            {!circleSummaries.length && (
              <Text fontSize="sm" color="gray.500">
                No stock circles match the current filters.
              </Text>
            )}
            {circleSummaries.length > 0 &&
              completionTabStats.totalProducts === 0 && (
                <Center py={10} px={4}>
                  <VStack gap={4} maxW="md" textAlign="center">
                    <Icon
                      as={FaBoxOpen}
                      boxSize={12}
                      color="gray.400"
                      aria-hidden
                    />
                    <Text fontSize="sm" color="gray.600" lineHeight="tall">
                      No products in scope for the selected circles (check
                      branch / department filters on the circles).
                    </Text>
                  </VStack>
                </Center>
              )}
            {circleSummaries.length > 0 &&
              completionTabStats.totalProducts > 0 &&
              (completionTabStats.inStockProductCount === 0 ? (
                <Text fontSize="sm" color="gray.600">
                  No in-stock products in scope for the selected circles (all
                  are out of stock at their branch).
                </Text>
              ) : pieData.length ? (
                <Box w="100%">
                  <Box height="250px" w="100%">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={78}
                          paddingAngle={2}
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${entry.name}-${index}`}
                              fill={
                                PIE_COLORS[entry.name] ||
                                (index === 0 ? "#3182CE" : "#CBD5E0")
                              }
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value, name) => [`${value}`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                  <DashboardChartLegend
                    items={pieData.map((d) => ({
                      name: d.name,
                      value: d.value,
                      fill:
                        PIE_COLORS[d.name] ||
                        (d.name === "Completed" ? "#38A169" : "#A0AEC0"),
                    }))}
                    columns={2}
                  />
                </Box>
              ) : (
                <Text fontSize="sm" color="gray.600">
                  No checks recorded yet on in-stock SKUs — 100% pending.
                </Text>
              ))}
          </CustomContainer>

          <CustomContainer
            title="Completion by branch"
            color="secondary"
            size="sm"
            fullWidth
          >
            <Box w="100%" minW={0}>
              <DashboardBarChart
                data={completionBarData}
                xDataKey="name"
                bars={[
                  {
                    dataKey: "completion",
                    perBarColor: true,
                    labelOnTop: true,
                  },
                ]}
                showLegend={false}
                height="250px"
                emptyMessage="No branch data to chart"
                // xAxisAngle={-35}
                xAxisDy={12}
                valueFormatter={(v) => (v === 0 ? "" : `${v}%`)}
              />
              {completionBarData.length > 0 && (
                <DashboardChartLegend
                  items={completionBarData.map((d) => ({
                    name: d.name,
                    value: `${d.completion}%`,
                    fill: d.fill,
                  }))}
                  columns={5}
                />
              )}
            </Box>
          </CustomContainer>
        </Grid>

        <CustomContainer title="Summary" size="sm" color="secondary">
          <Grid
            templateColumns={{
              base: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              xl: "repeat(4, 1fr)",
            }}
            gap="22px"
          >
            <Flex
              direction="column"
              p={4}
              bg="brand.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="brand.200"
              cursor="pointer"
              onClick={() => openProductsTabWithStatus("total")}
            >
              <Text fontSize="xs" color="brand.600" fontWeight="medium" mb={1}>
                Total products
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="brand.700">
                {completionTabStats.totalProducts}
              </Text>
            </Flex>
            <Flex
              direction="column"
              p={4}
              bg="red.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="red.200"
              cursor="pointer"
              onClick={() => openProductsTabWithStatus("out_of_stock")}
            >
              <Text fontSize="xs" color="red.600" fontWeight="medium" mb={1}>
                Out of stock
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="red.700">
                {completionTabStats.outOfStockProductCount}
              </Text>
            </Flex>
            <Flex
              direction="column"
              p={4}
              bg="green.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="green.200"
              cursor="pointer"
              onClick={() => openProductsTabWithStatus("checked")}
            >
              <Text fontSize="xs" color="green.600" fontWeight="medium" mb={1}>
                Checked
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="green.700">
                {completionTabStats.completedProductCount}
              </Text>
            </Flex>
            <Flex
              direction="column"
              p={4}
              bg="orange.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="orange.200"
              cursor="pointer"
              onClick={() => openProductsTabWithStatus("pending")}
            >
              <Text fontSize="xs" color="orange.600" fontWeight="medium" mb={1}>
                Pending
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="orange.700">
                {completionTabStats.pendingProductCount}
              </Text>
            </Flex>
            <Flex
              direction="column"
              p={4}
              bg="green.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="green.200"
            >
              <Text fontSize="xs" color="green.600" fontWeight="medium" mb={1}>
                Checked value
              </Text>
              <Text
                fontSize="xl"
                fontWeight="bold"
                color="green.700"
                lineHeight="short"
              >
                {formatCurrency(summaryValueStats.checkedValue)}
              </Text>
            </Flex>
            <Flex
              direction="column"
              p={4}
              bg="orange.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="orange.200"
            >
              <Text fontSize="xs" color="orange.600" fontWeight="medium" mb={1}>
                Pending value
              </Text>
              <Text
                fontSize="xl"
                fontWeight="bold"
                color="orange.700"
                lineHeight="short"
              >
                {formatCurrency(summaryValueStats.pendingValue)}
              </Text>
            </Flex>
            <Flex
              direction="column"
              p={4}
              bg="blue.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="blue.200"
            >
              <Text fontSize="xs" color="blue.600" fontWeight="medium" mb={1}>
                Checked today
              </Text>
              <Text
                fontSize="xl"
                fontWeight="bold"
                color="blue.700"
                lineHeight="short"
              >
                {summaryValueStats.checkedToday}
                <Text
                  as="span"
                  mx={2}
                  fontWeight="normal"
                  color="blue.300"
                >
                  |
                </Text>
                {formatCurrency(summaryValueStats.checkedTodayValue)}
              </Text>
            </Flex>
            <Flex
              direction="column"
              p={4}
              bg="purple.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="purple.200"
            >
              <Text fontSize="xs" color="purple.600" fontWeight="medium" mb={1}>
                Completion
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="purple.700">
                {completionTabStats.percentCompleted}%
              </Text>
            </Flex>
            {showSummaryDaysLeftCard && (
              <Flex
                direction="column"
                p={4}
                borderRadius="md"
                borderWidth="1px"
                bg={
                  summaryDaysLeft === null
                    ? "gray.50"
                    : summaryDaysLeft < 0
                    ? "red.50"
                    : "green.50"
                }
                borderColor={
                  summaryDaysLeft === null
                    ? "gray.200"
                    : summaryDaysLeft < 0
                    ? "red.200"
                    : "green.200"
                }
              >
                <Text
                  fontSize="xs"
                  fontWeight="medium"
                  mb={1}
                  color={
                    summaryDaysLeft === null
                      ? "gray.600"
                      : summaryDaysLeft < 0
                      ? "red.700"
                      : "green.700"
                  }
                >
                  Days left
                </Text>
                {summaryDaysLeft === null ? (
                  <Text fontSize="xl" fontWeight="bold" color="gray.500">
                    -
                  </Text>
                ) : (
                  <Text
                    fontSize="2xl"
                    fontWeight="bold"
                    color={summaryDaysLeft < 0 ? "red.600" : "green.700"}
                  >
                    {Math.abs(summaryDaysLeft)} days{" "}
                    {summaryDaysLeft > 0 ? "left" : "overdue"}
                  </Text>
                )}
              </Flex>
            )}
          </Grid>
        </CustomContainer>

        <Tabs.Root
          value={mainTab}
          onValueChange={(details) => setMainTab(details.value)}
          variant="line"
        >
          <Tabs.List flexWrap="wrap" gap={1}>
            <Tabs.Trigger value="circles">Circle completion</Tabs.Trigger>
            <Tabs.Trigger value="checkers">Who checked</Tabs.Trigger>
            <Tabs.Trigger value="products">Products</Tabs.Trigger>
            {!isCircleFilterActive && (
              <Tabs.Trigger value="deadlines">Deadlines</Tabs.Trigger>
            )}
          </Tabs.List>

          <Tabs.Content value="circles" pt={4}>
            <StockCircleDashboardCirclesTab rowData={circleSummaries} />
          </Tabs.Content>

          <Tabs.Content value="checkers" pt={4}>
            <StockCircleDashboardCheckersTab
              checkerEmployeeOptions={checkerEmployeeOptions}
              selectedCheckerRowKeys={selectedCheckerRowKeys}
              onSelectedCheckerRowKeysChange={setSelectedCheckerRowKeys}
              displayedCheckerRows={displayedCheckerRows}
              onViewCheckerDetails={setCheckerDetailsRow}
            />
          </Tabs.Content>

          <Tabs.Content value="products" pt={4}>
            <StockCircleDashboardProducts
              filteredCircles={filteredCircles}
              selectedCircleIds={selectedCircleIds}
              products={products}
              productsLoading={loadingProducts}
              allChecked={allChecked}
              statusPreset={productsStatusPreset}
              scrollToTableTrigger={productsScrollTrigger}
              onRefetchChecked={refetchAllChecked}
            />
          </Tabs.Content>

          {!isCircleFilterActive && (
            <Tabs.Content value="deadlines" pt={4}>
              <StockCircleDashboardDeadlinesTab
                dueSoonRows={dueSoonRows}
                overdueRows={overdueRows}
                dueSoonDays={DUE_SOON_DAYS}
              />
            </Tabs.Content>
          )}
        </Tabs.Root>

        <StockCircleCheckerDetailsModal
          open={!!checkerDetailsRow}
          onClose={() => setCheckerDetailsRow(null)}
          checkerRow={checkerDetailsRow}
          dateRows={checkerDateWiseDetails}
          allChecked={allChecked}
          circles={filteredCircles}
          products={products}
        />
      </Flex>
    </GlobalWrapper>
  );
}
