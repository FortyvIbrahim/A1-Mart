"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Center,
  Flex,
  Icon,
  Spinner,
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
import DashboardPageTitle from "@/components/dashboard/DashboardPageTitle";
import {
  DashboardCard,
  DashboardFilterPanel,
  DashboardMetricCard,
  DashboardMetricRow,
  DashboardTabs,
  DashboardTwoColumn,
} from "@/components/dashboard/DashboardUI";
import { getPeriod } from "@/app/stock/circle/page";
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
import { formatCurrency } from "@/utils/string";
import DashboardBarChart from "@/components/dashboard/DashboardBarChart";
import DashboardChartLegend from "@/components/dashboard/DashboardChartLegend";
import { DASHBOARD_ROUTES } from "@/constants/routes/index";
import StockCircleCheckerDetailsModal from "@/components/dashboard/StockCircleCheckerDetailsModal";
import StockCircleDashboardCirclesTab from "@/components/dashboard/stock-circle/StockCircleDashboardCirclesTab";
import StockCircleDashboardCheckersTab from "@/components/dashboard/stock-circle/StockCircleDashboardCheckersTab";
import StockCircleDashboardDeadlinesTab from "@/components/dashboard/stock-circle/StockCircleDashboardDeadlinesTab";
import StockCircleDashboardProducts from "@/components/dashboard/stock-circle/StockCircleDashboardProducts";

/** Figma "Completion" donut: completed green, pending grey-blue. */
const PIE_COLORS = { Completed: "#11976A", Pending: "#9AAAC1" };

/** Figma "Completion by branch" bar colours, in order. */
const BRANCH_BAR_COLORS = [
  "#526FA8",
  "#11976A",
  "#F47721",
  "#E3B63E",
  "#9AAAC1",
  "#E7474D",
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
  const [circleSearch, setCircleSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [sortBy, setSortBy] = useState("completion");

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

  const periodOptions = useMemo(() => {
    const seen = new Set();
    for (const c of branchFilteredCircles) {
      const p = getPeriod(c);
      if (p) seen.add(String(p));
    }
    return [...seen].map((p) => ({ value: p, label: p }));
  }, [branchFilteredCircles]);

  const filteredCircles = useMemo(() => {
    const idSet = new Set(selectedCircleIds.map(String));
    const q = circleSearch.trim().toLowerCase();
    return branchFilteredCircles.filter((c) => {
      if (idSet.size && !idSet.has(String(circleKey(c)))) return false;
      if (periodFilter && String(getPeriod(c) ?? "") !== periodFilter) return false;
      if (q && !String(circleKey(c)).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [branchFilteredCircles, selectedCircleIds, circleSearch, periodFilter]);

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

  const sortedCircleSummaries = useMemo(() => {
    const rows = [...circleSummaries];
    if (sortBy === "days_left") {
      rows.sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
    } else if (sortBy === "id") {
      rows.sort((a, b) => Number(b.id) - Number(a.id));
    } else {
      rows.sort((a, b) => (b.percentCompleted ?? 0) - (a.percentCompleted ?? 0));
    }
    return rows;
  }, [circleSummaries, sortBy]);

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


  const pieData = useMemo(() => {
    const { completedInStockCount, pendingProductCount, inStockProductCount } =
      completionTabStats;
    if (inStockProductCount === 0) return [];
    return [
      {
        name: "Completed",
        value: completedInStockCount,
        color: PIE_COLORS.Completed,
      },
      {
        name: "Pending",
        value: pendingProductCount,
        color: PIE_COLORS.Pending,
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
      const fullName = String(g.branch_name || `Branch ${g.branch_id ?? ""}`);
      return {
        name: fullName.toUpperCase().slice(0, 48),
        // Figma bar labels drop the "AIMART-" store prefix.
        short: fullName.replace(/^\s*a1?\s*-?\s*mart\s*-\s*/i, "").toUpperCase(),
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

  const completionPercent = completionTabStats.percentCompleted;

  const metricRows = [
    [
      { label: "Total products", value: completionTabStats.totalProducts, status: "total" },
      { label: "Out of stock", value: completionTabStats.outOfStockProductCount, status: "out_of_stock" },
      { label: "Checked", value: completionTabStats.completedProductCount, status: "checked" },
      { label: "Pending", value: completionTabStats.pendingProductCount, status: "pending" },
    ],
    [
      { label: "Checked value", value: formatCurrency(summaryValueStats.checkedValue) },
      { label: "Pending value", value: formatCurrency(summaryValueStats.pendingValue) },
      {
        label: "Checked today",
        value: (
          <>
            {summaryValueStats.checkedToday}
            <Box as="span" mx="8px" color="fg">
              |
            </Box>
            {formatCurrency(summaryValueStats.checkedTodayValue)}
          </>
        ),
        caption: "Today",
      },
      { label: "Completion", value: `${completionPercent}%` },
    ],
  ];

  const tabs = [
    { value: "circles", label: "Circle completion" },
    { value: "checkers", label: "Who checked" },
    { value: "products", label: "Products" },
    ...(!isCircleFilterActive ? [{ value: "deadlines", label: "Deadlines" }] : []),
  ];

  let completionBody;
  if (!circleSummaries.length) {
    completionBody = (
      <Text fontSize="12px" color="fg.muted">
        No stock circles match the current filters.
      </Text>
    );
  } else if (completionTabStats.totalProducts === 0) {
    completionBody = (
      <Center py={10} px={4}>
        <VStack gap={4} maxW="md" textAlign="center">
          <Icon as={FaBoxOpen} boxSize={12} color="fg.muted" aria-hidden />
          <Text fontSize="12px" color="fg.muted">
            No products in scope for the selected circles (check branch /
            department filters on the circles).
          </Text>
        </VStack>
      </Center>
    );
  } else if (completionTabStats.inStockProductCount === 0) {
    completionBody = (
      <Text fontSize="12px" color="fg.muted">
        No in-stock products in scope for the selected circles (all are out of
        stock at their branch).
      </Text>
    );
  } else {
    const donutData = pieData.length
      ? pieData
      : [{ name: "Pending", value: 1, color: PIE_COLORS.Pending }];
    completionBody = (
      <Flex align="center" gap="40px" direction={{ base: "column", sm: "row" }}>
        <Box position="relative" w="220px" h="220px" flexShrink={0}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                dataKey="value"
                nameKey="name"
                innerRadius={80}
                outerRadius={110}
                startAngle={90}
                endAngle={-270}
                stroke="none"
                isAnimationActive={false}
              >
                {donutData.map((entry, index) => (
                  <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} />
                ))}
              </Pie>
              {pieData.length > 0 && (
                <RechartsTooltip formatter={(value, name) => [`${value}`, name]} />
              )}
            </PieChart>
          </ResponsiveContainer>
          <Flex
            position="absolute"
            inset="0"
            direction="column"
            align="center"
            justify="center"
            gap="4px"
            pointerEvents="none"
          >
            <Text fontSize="25px" fontWeight="600" lineHeight="30px" color="fg">
              {completionPercent}%
            </Text>
            <Text fontSize="10px" lineHeight="12px" color="fg.muted">
              total
            </Text>
          </Flex>
        </Box>
        <Box flex="1" minW={0} w="100%" mt="-16px">
          <DashboardChartLegend
            columns={1}
            items={[
              {
                name: "Completed",
                value: completionTabStats.completedInStockCount,
                fill: "#147D52",
                labelColor: "#147D52",
              },
              {
                name: "Pending",
                value: completionTabStats.pendingProductCount,
                fill: "#946200",
                labelColor: "#946200",
              },
            ]}
          />
        </Box>
      </Flex>
    );
  }

  return (
    <GlobalWrapper permissionKey={DASHBOARD_ROUTES.stockCircle.permissionKey}>
      <Flex direction="column" gap="24px" w="100%" maxW="100%" overflow="hidden">
        <DashboardPageTitle
          title="Stock Circle Dashboard"
          rightSection={
            <>
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
              />
            </>
          }
        />

        <DashboardFilterPanel
          columns={3}
          fields={[
            {
              key: "search",
              type: "search",
              label: "Search",
              placeholder: "Search circle id…",
              value: circleSearch,
              onChange: setCircleSearch,
            },
            {
              key: "period",
              label: "Period",
              placeholder: "All periods",
              value: periodFilter,
              onChange: setPeriodFilter,
              options: periodOptions,
            },
            {
              key: "sortBy",
              label: "Sort by",
              placeholder: false,
              value: sortBy,
              onChange: setSortBy,
              options: [
                { value: "completion", label: "Completion %" },
                { value: "days_left", label: "Days left" },
                { value: "id", label: "Newest" },
              ],
            },
          ]}
        />

        <DashboardTwoColumn>
          <DashboardCard title="Completion">{completionBody}</DashboardCard>

          <DashboardCard title="Completion by branch">
            <Box w="100%" minW={0}>
              <DashboardBarChart
                data={completionBarData}
                xDataKey="short"
                bars={[{ dataKey: "completion", perBarColor: true }]}
                yTickFormatter={(v) => `${v}%`}
                showLegend={false}
                height="206px"
                emptyMessage="No branch data to chart"
                valueFormatter={(v) => `${v}%`}
              />
              {completionBarData.length > 0 && (
                <Text mt="16px" fontSize="10px" lineHeight="12px" color="fg.muted">
                  {completionBarData
                    .map((d) => `${d.name} · ${d.completion}%`)
                    .join("     ")}
                </Text>
              )}
            </Box>
          </DashboardCard>
        </DashboardTwoColumn>

        {metricRows.map((row, idx) => (
          <DashboardMetricRow key={idx}>
            {row.map((m) => (
              <DashboardMetricCard
                key={m.label}
                label={m.label}
                value={m.value}
                caption={m.caption ?? "All selected circles"}
                onClick={m.status ? () => openProductsTabWithStatus(m.status) : undefined}
              />
            ))}
          </DashboardMetricRow>
        ))}

        <DashboardTabs tabs={tabs} value={mainTab} onChange={setMainTab} />

        {mainTab === "circles" && (
          <StockCircleDashboardCirclesTab rowData={sortedCircleSummaries} />
        )}

        {mainTab === "checkers" && (
          <StockCircleDashboardCheckersTab
            checkerEmployeeOptions={checkerEmployeeOptions}
            selectedCheckerRowKeys={selectedCheckerRowKeys}
            onSelectedCheckerRowKeysChange={setSelectedCheckerRowKeys}
            displayedCheckerRows={displayedCheckerRows}
            onViewCheckerDetails={setCheckerDetailsRow}
          />
        )}

        {mainTab === "products" && (
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
        )}

        {mainTab === "deadlines" && !isCircleFilterActive && (
          <StockCircleDashboardDeadlinesTab
            dueSoonRows={dueSoonRows}
            overdueRows={overdueRows}
            dueSoonDays={DUE_SOON_DAYS}
          />
        )}

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
