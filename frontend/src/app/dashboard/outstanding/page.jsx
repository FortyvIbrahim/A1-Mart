"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  Input,
  Separator,
  Spinner,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { LuIndianRupee, LuUndo2, LuWallet } from "react-icons/lu";
import moment from "moment";
import toast from "react-hot-toast";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import AgGrid from "@/components/AgGrid";
import DashboardPageTitle, {
  DashboardTitleSection,
} from "@/components/dashboard/DashboardPageTitle";
import DashboardBarChart from "@/components/dashboard/DashboardBarChart";
import {
  DashboardCard,
  DashboardMetricCard,
  DashboardStripTabs,
} from "@/components/dashboard/DashboardUI";
import { DASHBOARD_ROUTES } from "@/constants/routes/index";
import { getLatestOutstandingReportByDate } from "@/api/helpers/outstanding_report";
import ViewInvoicesModal from "./components/ViewInvoicesModal";
import {
  AGE_BUCKETS,
  OUTSTANDING_CATEGORIES,
  OUTSTANDING_CATEGORY_KEYS,
  buildCategoryDonutData,
  buildGroupedTableRows,
  enrichOutstandingInvoice,
  formatDateDisplay,
  getAgeBucketBadge,
  getCategoryBadge,
  getCategoryLabel,
  hasChartData,
  countByCategory,
  sumByCategory,
  sumNetBalance,
} from "@/utils/outstandingDashboard";
import { formatCurrency, formatShorthandNumber } from "@/utils/string";
import useBranchFilterAccess, {
  getLockedBranchFilterByKey,
} from "@/customHooks/useBranchFilterAccess";

// Figma: Return #F47721 · Purchase #11976A · Advance #526FA8.
const CATEGORY_CHART_COLORS = ["#F47721", "#11976A", "#526FA8"];

const CATEGORY_CHART_AXIS_LABEL = {
  "Purchase Return": "Return",
  "Purchase Outstanding": "Purchase",
  "On Account": "Advance",
  "Advance Payment": "Advance",
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const matchesMultiFilter = (selected, rowKey) =>
  !selected?.length || selected.includes(rowKey);

const pruneMultiFilter = (selected, options) =>
  (selected || []).filter((value) => options.some((o) => o.value === value));

function formatSignedChartValue(value) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n) || n === 0) return "0";
  return formatShorthandNumber(n);
}

function CategoryBarCard({
  title,
  data,
  color = "secondary",
  ageBucketKey,
  onBarClick,
}) {
  const chartData = (data || []).map((d) => ({
    ...d,
    chartLabel: CATEGORY_CHART_AXIS_LABEL[d.name] ?? d.name,
    fill: CATEGORY_CHART_COLORS[d.colorIndex % CATEGORY_CHART_COLORS.length],
  }));
  const barData = chartData.filter((d) => Number(d.value) > 0);
  const hasData = hasChartData(data);
  const yAxisPadding = useMemo(() => {
    const maxVal = Math.max(0, ...barData.map((d) => Number(d.value) || 0));
    if (maxVal <= 0) return 2;
    return Math.max(maxVal * 0.08, 1);
  }, [barData]);

  return (
    <DashboardCard title={title} p="16px" gap="12px">
      {!hasData ? (
        <Center minH="200px">
          <Text color="fg.muted" fontSize="12px">
            No data available
          </Text>
        </Center>
      ) : (
        <DashboardBarChart
          data={barData}
          xDataKey="chartLabel"
          bars={[{ dataKey: "value", perBarColor: true }]}
          legendItems={chartData.map((d) => ({
            name: `${d.chartLabel} · ${formatSignedChartValue(d.displayValue)}`,
            fill: d.fill,
          }))}
          legendColumns={1}
          height="200px"
          hideYAxisLabels
          marginTop={16}
          barLabelOffset={6}
          yAxisMaxPadding={yAxisPadding}
          barCategoryGap={8}
          valueFormatter={(v) =>
            v === 0 || v == null ? "" : formatSignedChartValue(v)
          }
          tooltipContent={(payload) => {
            if (!payload?.length) return null;
            const row = payload[0]?.payload;
            const name = row?.name ?? payload[0]?.name;
            const signed = row?.displayValue ?? row?.value;
            const fill = row?.fill ?? payload[0]?.color;
            return (
              <Flex
                bg="white"
                borderRadius="md"
                boxShadow="md"
                px={3}
                py={2}
                borderWidth="1px"
                borderColor="gray.100"
                align="center"
                gap={2}
                fontSize="sm"
              >
                <Box
                  w="8px"
                  h="8px"
                  minW="8px"
                  minH="8px"
                  borderRadius="2px"
                  bg={fill || "gray.400"}
                  flexShrink={0}
                />
                <Text>
                  {name} ({formatSignedChartValue(signed)})
                </Text>
              </Flex>
            );
          }}
          emptyMessage="No data available"
          onBarClick={
            onBarClick ? (entry) => onBarClick(ageBucketKey, entry) : undefined
          }
        />
      )}
    </DashboardCard>
  );
}

function StatCard({ title, value, invoiceCount, color = "brand", icon }) {
  const valueTextProps = {
    fontSize: "2xl",
    fontWeight: "bold",
    color: `${color}.800`,
    lineHeight: "1",
  };

  return (
    <Flex
      direction="column"
      align="flex-start"
      justify="center"
      p={8}
      borderWidth="1px"
      borderColor={`${color}.200`}
      borderRadius="10px"
      bg={`${color}.50`}
      h="100%"
      gap={2}
    >
      <Center
        color={`${color}.300`}
        fontSize="40px"
        lineHeight="1"
        opacity={0.65}
      >
        {icon}
      </Center>
      <Text fontSize="xs" fontWeight="semibold" color={`${color}.700`}>
        {title}
      </Text>
      <Text {...valueTextProps}>{value}</Text>
      {invoiceCount != null && (
        <>
          <Separator w="100%" borderColor={`${color}.200`} />
          <Text {...valueTextProps}>
            {Number(invoiceCount).toLocaleString()}{" "}
            <Text
              as="span"
              fontSize="sm"
              fontWeight="medium"
              color={`${color}.600`}
            >
              {Number(invoiceCount) === 1 ? "invoice" : "invoices"}
            </Text>
          </Text>
        </>
      )}
    </Flex>
  );
}

export default function OutstandingDashboardPage() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  const [rawInvoices, setRawInvoices] = useState([]);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const [buyerFilter, setBuyerFilter] = useState([]);
  const [supplierFilter, setSupplierFilter] = useState([]);
  const [branchFilter, setBranchFilter] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [groupedTab, setGroupedTab] = useState("invoices");
  const [chartFilter, setChartFilter] = useState({
    ageBucketKey: null,
    categoryKey: null,
  });
  const groupedTableRef = useRef(null);

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceModalTitle, setInvoiceModalTitle] = useState("");
  const [invoiceModalRows, setInvoiceModalRows] = useState([]);

  const { isBranchLocked, userBranchKey, userBranchName } =
    useBranchFilterAccess();
  const lockedBranchFilter = useMemo(
    () => getLockedBranchFilterByKey(userBranchKey),
    [userBranchKey]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await getLatestOutstandingReportByDate(selectedDate);
        if (cancelled) return;
        const report = response?.data || {};
        setRawInvoices(Array.isArray(report?.invoices) ? report.invoices : []);
        setLastSyncAt(report?.created_at ?? null);
      } catch (err) {
        if (cancelled) return;
        if (err?.code === 404) {
          setRawInvoices([]);
          setLastSyncAt(null);
        } else {
          toast.error(
            err?.message || "Failed to load outstanding dashboard data."
          );
          setRawInvoices([]);
          setLastSyncAt(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const lastSyncFormatted = useMemo(() => {
    if (!lastSyncAt) return null;
    const m = moment(lastSyncAt);
    return m.isValid() ? m.format("DD MMM YYYY, hh:mm A") : null;
  }, [lastSyncAt]);

  const enrichedRows = useMemo(
    () =>
      (rawInvoices || []).map((inv) =>
        enrichOutstandingInvoice(inv, todayStr())
      ),
    [rawInvoices]
  );

  const buyerOptions = useMemo(() => {
    const map = new Map();
    enrichedRows.forEach((row) => {
      const key = row.buyer_id == null ? "unknown" : String(row.buyer_id);
      if (!map.has(key)) {
        map.set(key, {
          value: key,
          label:
            row.buyer_id == null
              ? "Unknown"
              : `${row.buyer_name || "Unknown"} (${row.buyer_id})`,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [enrichedRows]);

  const supplierSourceRows = useMemo(() => {
    if (!buyerFilter.length) return enrichedRows;
    return enrichedRows.filter((row) => {
      const key = row.buyer_id == null ? "unknown" : String(row.buyer_id);
      return buyerFilter.includes(key);
    });
  }, [enrichedRows, buyerFilter]);

  const supplierOptions = useMemo(() => {
    const map = new Map();
    supplierSourceRows.forEach((row) => {
      const key = row.supplier_id == null ? "unknown" : String(row.supplier_id);
      if (!map.has(key)) {
        map.set(key, {
          value: key,
          label:
            row.supplier_id == null
              ? "Unknown"
              : row.supplier_name || "Unknown",
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [supplierSourceRows]);

  const branchOptions = useMemo(() => {
    const map = new Map();
    enrichedRows.forEach((row) => {
      const key = row.branch_id == null ? "unknown" : String(row.branch_id);
      if (!map.has(key)) {
        map.set(key, {
          value: key,
          label:
            row.branch_id == null ? "Unknown" : row.branch_name || "Unknown",
        });
      }
    });
    if (isBranchLocked && userBranchKey && !map.has(userBranchKey)) {
      map.set(userBranchKey, {
        value: userBranchKey,
        label: userBranchName || "My Branch",
      });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [enrichedRows, isBranchLocked, userBranchKey, userBranchName]);

  const categoryOptions = useMemo(
    () =>
      OUTSTANDING_CATEGORIES.map((c) => ({
        value: c.key,
        label: c.label,
      })),
    []
  );

  useEffect(() => {
    setBuyerFilter((prev) => pruneMultiFilter(prev, buyerOptions));
  }, [buyerOptions]);

  useEffect(() => {
    setSupplierFilter((prev) => pruneMultiFilter(prev, supplierOptions));
  }, [supplierOptions]);

  useEffect(() => {
    if (!isBranchLocked) return;
    setBranchFilter((prev) => {
      if (
        prev.length === lockedBranchFilter.length &&
        prev.every((value, index) => value === lockedBranchFilter[index])
      ) {
        return prev;
      }
      return lockedBranchFilter;
    });
  }, [isBranchLocked, lockedBranchFilter]);

  useEffect(() => {
    if (isBranchLocked) return;
    setBranchFilter((prev) => pruneMultiFilter(prev, branchOptions));
  }, [branchOptions, isBranchLocked]);

  useEffect(() => {
    setCategoryFilter((prev) => pruneMultiFilter(prev, categoryOptions));
  }, [categoryOptions]);

  const filteredRows = useMemo(() => {
    return enrichedRows.filter((row) => {
      const buyerKey =
        row.buyer_id == null ? "unknown" : String(row.buyer_id);
      if (!matchesMultiFilter(buyerFilter, buyerKey)) return false;

      const supplierKey =
        row.supplier_id == null ? "unknown" : String(row.supplier_id);
      if (!matchesMultiFilter(supplierFilter, supplierKey)) return false;

      const branchKey =
        row.branch_id == null ? "unknown" : String(row.branch_id);
      if (!matchesMultiFilter(branchFilter, branchKey)) return false;

      if (
        categoryFilter.length &&
        !categoryFilter.includes(row.category_key)
      ) {
        return false;
      }
      return true;
    });
  }, [enrichedRows, buyerFilter, supplierFilter, branchFilter, categoryFilter]);

  const chartFilteredRows = useMemo(() => {
    return filteredRows.filter((row) => {
      if (
        chartFilter.ageBucketKey &&
        row.age_bucket_key !== chartFilter.ageBucketKey
      ) {
        return false;
      }
      if (
        chartFilter.categoryKey &&
        row.category_key !== chartFilter.categoryKey
      ) {
        return false;
      }
      return true;
    });
  }, [filteredRows, chartFilter]);

  const hasChartFilter = Boolean(
    chartFilter.ageBucketKey || chartFilter.categoryKey
  );

  const chartFilterPeriodLabel = useMemo(() => {
    if (!chartFilter.ageBucketKey) return null;
    return (
      AGE_BUCKETS.find((b) => b.key === chartFilter.ageBucketKey)?.label ??
      chartFilter.ageBucketKey
    );
  }, [chartFilter.ageBucketKey]);

  const chartFilterCategoryLabel = useMemo(() => {
    if (!chartFilter.categoryKey) return null;
    return getCategoryLabel(chartFilter.categoryKey);
  }, [chartFilter.categoryKey]);

  const categoryTotals = useMemo(
    () => ({
      purchase_return: sumByCategory(
        filteredRows,
        OUTSTANDING_CATEGORY_KEYS.PURCHASE_RETURN
      ),
      purchase_outstanding: sumByCategory(
        filteredRows,
        OUTSTANDING_CATEGORY_KEYS.PURCHASE_OUTSTANDING
      ),
      on_account: sumByCategory(
        filteredRows,
        OUTSTANDING_CATEGORY_KEYS.ON_ACCOUNT
      ),
    }),
    [filteredRows]
  );

  const categoryBillCounts = useMemo(
    () => ({
      purchase_return: countByCategory(
        filteredRows,
        OUTSTANDING_CATEGORY_KEYS.PURCHASE_RETURN
      ),
      purchase_outstanding: countByCategory(
        filteredRows,
        OUTSTANDING_CATEGORY_KEYS.PURCHASE_OUTSTANDING
      ),
      on_account: countByCategory(
        filteredRows,
        OUTSTANDING_CATEGORY_KEYS.ON_ACCOUNT
      ),
    }),
    [filteredRows]
  );

  const totalNetBalance = useMemo(
    () => sumNetBalance(filteredRows),
    [filteredRows]
  );

  const ageBucketCharts = useMemo(
    () =>
      AGE_BUCKETS.map((bucket) => ({
        bucket,
        data: buildCategoryDonutData(filteredRows, bucket.key),
      })),
    [filteredRows]
  );

  const categoryTableRows = useMemo(
    () => buildGroupedTableRows(chartFilteredRows, "category"),
    [chartFilteredRows]
  );
  const supplierTableRows = useMemo(
    () => buildGroupedTableRows(chartFilteredRows, "supplier"),
    [chartFilteredRows]
  );
  const buyerTableRows = useMemo(
    () => buildGroupedTableRows(chartFilteredRows, "buyer"),
    [chartFilteredRows]
  );
  const branchTableRows = useMemo(
    () => buildGroupedTableRows(chartFilteredRows, "branch"),
    [chartFilteredRows]
  );

  const handleChartBarClick = useCallback((ageBucketKey, entry) => {
    const categoryKey = entry?.categoryKey ?? entry?.filterValue;
    if (!categoryKey || !ageBucketKey) return;
    setChartFilter((prev) => {
      if (
        prev.ageBucketKey === ageBucketKey &&
        prev.categoryKey === categoryKey
      ) {
        return { ageBucketKey: null, categoryKey: null };
      }
      return { ageBucketKey, categoryKey };
    });
    setGroupedTab("invoices");
    groupedTableRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const clearChartFilter = useCallback(() => {
    setChartFilter({ ageBucketKey: null, categoryKey: null });
  }, []);

  const openInvoicesModal = (title, rows) => {
    setInvoiceModalTitle(title);
    setInvoiceModalRows(rows || []);
    setInvoiceModalOpen(true);
  };

  const groupedTableColDefs = useMemo(
    () => [
      { field: "group_name", headerName: "Name", flex: 1 },
      { field: "total_value", headerName: "Total Value", type: "number" },
      {
        field: "purchase_outstanding",
        headerName: "Purchase Outstanding",
        type: "number",
      },
      {
        field: "purchase_return",
        headerName: "Purchase Return",
        type: "number",
      },
      { field: "on_account", headerName: "Advance Payment", type: "number" },
      {
        field: "action",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => [
          {
            label: "View Invoices",
            value: "view_invoices",
            onClick: () =>
              openInvoicesModal(
                `${params.data?.group_name} - Invoices`,
                params.data?.invoices
              ),
          },
        ],
      },
    ],
    []
  );

  const invoiceColumnDefs = useMemo(
    () => [
      // Figma: Ref no · Invoice no · Supplier · Buyer · Category ·
      // Invoice date · Net balance · Days · Age.
      { field: "ref_no", headerName: "Ref no", flex: 1 },
      { field: "invoice_no", headerName: "Invoice no" },
      { field: "supplier_name", headerName: "Supplier", flex: 1 },
      { field: "buyer_name", headerName: "Buyer", flex: 1 },
      {
        field: "category_key",
        headerName: "Category",
        valueGetter: (p) => getCategoryBadge(p.data?.category_key)?.label ?? "",
      },
      {
        field: "invoice_date",
        headerName: "Invoice date",
        valueGetter: (p) => formatDateDisplay(p.data?.invoice_date),
      },
      { field: "net_balance", headerName: "Net balance", type: "currency" },
      {
        field: "age_days",
        headerName: "Days",
        type: "number",
        valueGetter: (p) => {
          const days = p.data?.age_days;
          if (days == null || Number.isNaN(Number(days))) return null;
          return Number(days);
        },
      },
      {
        field: "age_bucket_key",
        headerName: "Age",
        type: "badge-column",
        minWidth: 120,
        width: 120,
        valueGetter: (p) => getAgeBucketBadge(p.data?.age_bucket_key),
      },
    ],
    []
  );

  const clearFilters = () => {
    setBuyerFilter([]);
    setSupplierFilter([]);
    setBranchFilter(isBranchLocked ? lockedBranchFilter : []);
    setCategoryFilter([]);
    clearChartFilter();
  };

  if (loading) {
    return (
      <GlobalWrapper permissionKey={DASHBOARD_ROUTES.outstanding.permissionKey}>
        <Center minH="240px">
          <Spinner size="lg" />
        </Center>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey={DASHBOARD_ROUTES.outstanding.permissionKey}>
      <Flex
        direction="column"
        gap="24px"
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
            alignItems="flex-end"
          >
            {/* Figma: 22px title, no subtitle; last sync + date on the right. */}
            <DashboardPageTitle title="Outstanding Dashboard" subtitle="" size="sm" />
            <Flex align="center" gap="12px" flexWrap="wrap">
              <Text fontSize="11px" color="fg.muted">
                Last sync:{" "}
                {loading ? "Loading..." : lastSyncFormatted || "No sync data"}
              </Text>
              <Input
                type="date"
                aria-label="Report date"
                w={{ base: "100%", md: "160px" }}
                h="40px"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </Flex>
          </Flex>
        </DashboardTitleSection>

        <DashboardCard title="Filters" gap="12px">
          <Grid
            templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }}
            gap="16px"
          >
            <CustomInput
              label="Buyer"
              placeholder="All buyers"
              method="multiple-dropdown"
              value={buyerFilter}
              options={buyerOptions}
              onChange={(val) => setBuyerFilter(Array.isArray(val) ? val : [])}
            />
            <CustomInput
              label="Supplier"
              placeholder="All suppliers"
              method="multiple-dropdown"
              value={supplierFilter}
              options={supplierOptions}
              onChange={(val) =>
                setSupplierFilter(Array.isArray(val) ? val : [])
              }
            />
            <CustomInput
              label="Branch"
              placeholder="All branches"
              method="multiple-dropdown"
              value={branchFilter}
              options={branchOptions}
              disabled={isBranchLocked}
              onChange={(val) => setBranchFilter(Array.isArray(val) ? val : [])}
            />
            <CustomInput
              label="Category"
              placeholder="All categories"
              method="multiple-dropdown"
              value={categoryFilter}
              options={categoryOptions}
              onChange={(val) =>
                setCategoryFilter(Array.isArray(val) ? val : [])
              }
            />
          </Grid>
        </DashboardCard>

        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          }}
          gap="16px"
        >
          <DashboardMetricCard
            tone="blue"
            icon={<LuWallet />}
            label="Net Balance"
            value={formatCurrency(totalNetBalance)}
            caption={`${Number(filteredRows.length).toLocaleString()} invoices`}
          />
          <DashboardMetricCard
            tone="purple"
            icon={<LuIndianRupee />}
            label="Purchase Outstanding"
            value={formatCurrency(categoryTotals.purchase_outstanding)}
            caption={`${Number(categoryBillCounts.purchase_outstanding || 0).toLocaleString()} invoices`}
          />
          <DashboardMetricCard
            tone="orange"
            icon={<LuUndo2 />}
            label="Purchase Return"
            value={formatCurrency(categoryTotals.purchase_return)}
            caption={`${Number(categoryBillCounts.purchase_return || 0).toLocaleString()} invoices`}
          />
          <DashboardMetricCard
            tone="purple"
            icon={<LuIndianRupee />}
            label="Advance Payment"
            value={formatCurrency(categoryTotals.on_account)}
            caption={`${Number(categoryBillCounts.on_account || 0).toLocaleString()} invoices`}
          />
        </Grid>

        <Box overflowX="auto" w="100%">
          <Grid
            templateColumns="repeat(5, minmax(0, 1fr))"
            gap="16px"
            minW={{ base: "900px", xl: "100%" }}
            w="100%"
          >
            {ageBucketCharts.map(({ bucket, data }) => (
              <CategoryBarCard
                key={bucket.key}
                title={bucket.label.replace(/^(\d+) to (\d+)/, "$1–$2")}
                data={data}
                color={bucket.key === "gt_31" ? "red" : "secondary"}
                ageBucketKey={bucket.key}
                onBarClick={handleChartBarClick}
              />
            ))}
          </Grid>
        </Box>

        {/* Figma: strip tabs, then the table card ("Invoices" / grouped). */}
        <Flex ref={groupedTableRef} direction="column" gap="16px">
          <DashboardStripTabs
            value={groupedTab}
            onChange={setGroupedTab}
            tabs={[
              { value: "invoices", label: "Invoices" },
              { value: "category", label: "By Category" },
              { value: "supplier", label: "By Supplier" },
              { value: "buyer", label: "By Buyer" },
              { value: "branch", label: "By Branch" },
            ]}
          />
          <DashboardCard
            title={
              {
                invoices: "Invoices",
                category: "By Category",
                supplier: "By Supplier",
                buyer: "By Buyer",
                branch: "By Branch",
              }[groupedTab]
            }
            rightSection={
              hasChartFilter ? (
                <Flex
                  as="button"
                  type="button"
                  onClick={clearChartFilter}
                  align="center"
                  gap="6px"
                  h="28px"
                  px="10px"
                  borderRadius="8px"
                  bg="#FFF5ED"
                  color="#C95C18"
                  fontSize="11px"
                  fontWeight="500"
                >
                  {[chartFilterPeriodLabel, chartFilterCategoryLabel]
                    .filter(Boolean)
                    .join(" · ")}
                  <Text as="span" aria-hidden>
                    ×
                  </Text>
                </Flex>
              ) : null
            }
          >
            <AgGrid
              bare
              key={groupedTab}
              tableKey={
                groupedTab === "invoices"
                  ? "outstanding-dashboard-invoices"
                  : `outstanding-dashboard-grouped-${groupedTab}`
              }
              rowData={
                {
                  invoices: chartFilteredRows,
                  category: categoryTableRows,
                  supplier: supplierTableRows,
                  buyer: buyerTableRows,
                  branch: branchTableRows,
                }[groupedTab]
              }
              columnDefs={
                groupedTab === "invoices" ? invoiceColumnDefs : groupedTableColDefs
              }
              pagination={true}
              paginationPageSize={10}
            />
          </DashboardCard>
        </Flex>

        <ViewInvoicesModal
          open={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          title={invoiceModalTitle}
          invoices={invoiceModalRows}
        />
      </Flex>
    </GlobalWrapper>
  );
}
