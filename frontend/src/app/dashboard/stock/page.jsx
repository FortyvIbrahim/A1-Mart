"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Center,
  Flex,
  FormatNumber,
  Grid,
  Input,
  NativeSelect,
  Spinner,
  Tabs,
  Text,
} from "@chakra-ui/react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { LuBox, LuIndianRupee, LuPackage } from "react-icons/lu";
import moment from "moment";
import toast from "react-hot-toast";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import CustomDialog from "@/components/CustomDialog";
import AgGrid from "@/components/AgGrid";
import DashboardPageTitle, {
  DashboardTitleSection,
} from "@/components/dashboard/DashboardPageTitle";
import useProducts from "@/api/customHooks/useProducts";
import { DASHBOARD_ROUTES } from "@/constants/routes/index";
import { getLatestDeadStockReportByDate } from "@/api/helpers/dead_stock_report";
import DashboardChartLegend from "@/components/dashboard/DashboardChartLegend";
import {
  DashboardCard,
  DashboardMetricCard,
  DashboardStripTabs,
} from "@/components/dashboard/DashboardUI";
import {
  matchesMultiFilter,
  pruneMultiFilter,
  stringOptionsFromValues,
} from "@/utils/dashboardFilters";
import useBranchFilterAccess, {
  getLockedBranchFilterByName,
} from "@/customHooks/useBranchFilterAccess";
import {
  capitalizeWordsLatest,
  formatCurrency,
  formatShorthandNumber,
} from "@/utils/string";

// Figma chart palette.
const PIE_COLORS = [
  "#F47721",
  "#11976A",
  "#526FA8",
  "#E3B63E",
  "#9AAAC1",
  "#E7474D",
  "#C95C18",
  "#637188",
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const formatNum = (v) => Number(round2(v)).toLocaleString("en-IN");

const toNum = (v) => {
  const n = Number(v ?? 0);
  return Number.isNaN(n) ? 0 : n;
};

const sumQty = (row) =>
  round2(
    toNum(row["30_days_stock"]) +
      toNum(row["90_days_stock"]) +
      toNum(row["120_days_stock"]) +
      toNum(row.than_120_days_stock)
  );

const sumValue = (row) =>
  round2(
    toNum(row["30_days_stock_value"]) +
      toNum(row["90_days_stock_value"]) +
      toNum(row["120_days_stock_value"]) +
      toNum(row.than_120_days_stock_value)
  );

const labelOf = (v) =>
  v == null || String(v).trim() === "" ? "Unknown" : String(v).trim();

const pickProductMeta = (apiProduct, mappedProduct) => {
  const src = apiProduct || mappedProduct || {};
  const supplierId =
    src.supplier_id ??
    src.supplier?.master_id ??
    src.supplier?.supplier_id ??
    src.de_supplier_id ??
    null;
  const supplierName = labelOf(
    src.supplier_name || src.de_supplier_name || src.supplier?.name
  );
  return {
    buyer: labelOf(
      src.de_buyer_name ||
        src.buyer_name ||
        src.buyer?.employee_name ||
        src.buyer?.name
    ),
    supplier_id: supplierId == null ? null : Number(supplierId),
    supplier: supplierName,
    department: labelOf(src.department_name || src.department?.department_name),
    category: labelOf(src.category_name || src.category?.category_name),
    subcategory: labelOf(
      src.subcategory_name || src.subcategory?.subcategory_name
    ),
  };
};

const buildDonutData = (rows, groupKey, valueKey) => {
  const grouped = new Map();
  rows.forEach((row) => {
    const group = labelOf(row[groupKey]);
    const cur = grouped.get(group) || 0;
    grouped.set(group, round2(cur + toNum(row[valueKey])));
  });
  return Array.from(grouped.entries())
    .map(([name, value]) => ({
      name,
      value: round2(value),
      filterValue: name,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
};

const buildGroupedTableRows = (rows, groupKey) => {
  const grouped = new Map();
  rows.forEach((row) => {
    const key = labelOf(row[groupKey]);
    const cur = grouped.get(key) || {
      group_name: key,
      group_value: key,
      total_stock: 0,
      total_value: 0,
      "30_days_stock_value": 0,
      "90_days_stock_value": 0,
      "120_days_stock_value": 0,
      than_120_days_stock_value: 0,
      products: [],
    };
    cur.total_stock = round2(cur.total_stock + toNum(row.total_stock));
    cur.total_value = round2(cur.total_value + toNum(row.total_value));
    cur["30_days_stock_value"] = round2(
      cur["30_days_stock_value"] + toNum(row["30_days_stock_value"])
    );
    cur["90_days_stock_value"] = round2(
      cur["90_days_stock_value"] + toNum(row["90_days_stock_value"])
    );
    cur["120_days_stock_value"] = round2(
      cur["120_days_stock_value"] + toNum(row["120_days_stock_value"])
    );
    cur.than_120_days_stock_value = round2(
      cur.than_120_days_stock_value + toNum(row.than_120_days_stock_value)
    );
    cur.products.push(row);
    grouped.set(key, cur);
  });
  return Array.from(grouped.values()).sort(
    (a, b) => b.total_value - a.total_value
  );
};

const buildSupplierGroupedTableRows = (rows) => {
  const grouped = new Map();
  rows.forEach((row) => {
    const supplierId = row.supplier_id;
    const supplierName = labelOf(row.supplier);
    const key = supplierId == null ? "unknown" : String(supplierId);
    const cur = grouped.get(key) || {
      group_name: supplierName,
      group_value: key,
      supplier_id: supplierId,
      total_stock: 0,
      total_value: 0,
      "30_days_stock_value": 0,
      "90_days_stock_value": 0,
      "120_days_stock_value": 0,
      than_120_days_stock_value: 0,
      products: [],
    };
    cur.total_stock = round2(cur.total_stock + toNum(row.total_stock));
    cur.total_value = round2(cur.total_value + toNum(row.total_value));
    cur["30_days_stock_value"] = round2(
      cur["30_days_stock_value"] + toNum(row["30_days_stock_value"])
    );
    cur["90_days_stock_value"] = round2(
      cur["90_days_stock_value"] + toNum(row["90_days_stock_value"])
    );
    cur["120_days_stock_value"] = round2(
      cur["120_days_stock_value"] + toNum(row["120_days_stock_value"])
    );
    cur.than_120_days_stock_value = round2(
      cur.than_120_days_stock_value + toNum(row.than_120_days_stock_value)
    );
    cur.products.push(row);
    grouped.set(key, cur);
  });
  return Array.from(grouped.values()).sort(
    (a, b) => b.total_value - a.total_value
  );
};

/** Figma "Department – Qty" etc.: 150px donut, two-column legend below. */
function DonutCard({ title, data, onSliceClick }) {
  return (
    <DashboardCard title={title}>
      {data.length === 0 ? (
        <Center minH="150px">
          <Text color="fg.muted" fontSize="12px">
            No data available
          </Text>
        </Center>
      ) : (
        <>
          <Box h="150px" w="150px" mx="auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={72}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map((entry, idx) => (
                    <Cell
                      key={`${entry.name}-${idx}`}
                      fill={PIE_COLORS[idx % PIE_COLORS.length]}
                      onClick={() => onSliceClick?.(entry)}
                      style={onSliceClick ? { cursor: "pointer" } : undefined}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value, name) => [formatShorthandNumber(value), name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <DashboardChartLegend
            items={data.map((d, idx) => ({
              name: `${d.name} · ${formatShorthandNumber(d.value)}`,
              fill: PIE_COLORS[idx % PIE_COLORS.length],
              onClick: onSliceClick ? () => onSliceClick(d) : undefined,
            }))}
            columns={2}
            truncateLabelOnly={true}
          />
        </>
      )}
    </DashboardCard>
  );
}

export default function StockDashboardPage() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  const [rawRows, setRawRows] = useState([]);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productModalTitle, setProductModalTitle] = useState("");
  const [productModalRows, setProductModalRows] = useState([]);
  const [showModalBranchFilter, setShowModalBranchFilter] = useState(true);
  const [modalBucketFilter, setModalBucketFilter] = useState(null);
  const [modalBranchFilter, setModalBranchFilter] = useState("");

  const [buyerFilter, setBuyerFilter] = useState([]);
  const [supplierFilter, setSupplierFilter] = useState([]);
  const [branchFilter, setBranchFilter] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [subcategoryFilter, setSubcategoryFilter] = useState([]);
  const [groupedTab, setGroupedTab] = useState("supplier");
  const groupedTableRef = useRef(null);

  const { products } = useProducts();
  const { isBranchLocked, userBranchName } = useBranchFilterAccess();
  const lockedBranchFilter = useMemo(
    () => getLockedBranchFilterByName(userBranchName),
    [userBranchName]
  );

  const productById = useMemo(() => {
    const map = {};
    (products || []).forEach((p) => {
      const id = Number(p?.product_id);
      if (!Number.isNaN(id) && id > 0) map[id] = p;
    });
    return map;
  }, [products]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await getLatestDeadStockReportByDate(selectedDate);
        if (cancelled) return;
        const report = response?.data || {};
        setRawRows(Array.isArray(report?.products) ? report.products : []);
        setLastSyncAt(report?.created_at ?? null);
      } catch (err) {
        if (cancelled) return;
        if (err?.code === 404) {
          setRawRows([]);
          setLastSyncAt(null);
        } else {
          toast.error(err?.message || "Failed to load stock dashboard data.");
          setRawRows([]);
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

  const enrichedRows = useMemo(() => {
    return (rawRows || []).map((row) => {
      const productId = Number(row.product_id);
      const mappedProduct = productById[productId];
      const meta = pickProductMeta(row.product, mappedProduct);
      return {
        ...row,
        product_id: productId,
        product_name:
          row?.product_name ||
          row?.product?.de_name ||
          mappedProduct?.product_name ||
          mappedProduct?.product_display_name ||
          "—",
        product_image:
          row?.product?.image_url || mappedProduct?.image_url || null,
        total_stock: sumQty(row),
        total_value: sumValue(row),
        buyer: meta.buyer,
        supplier_id: meta.supplier_id,
        supplier: meta.supplier,
        branch_name: row?.branch_name || row?.branch?.branch_name || "Unknown",
        department: meta.department,
        category: meta.category,
        subcategory: meta.subcategory,
      };
    });
  }, [rawRows, productById]);

  const buyerOptions = useMemo(
    () =>
      stringOptionsFromValues(
        Array.from(new Set(enrichedRows.map((r) => r.buyer))).sort()
      ),
    [enrichedRows]
  );
  const supplierSourceRows = useMemo(() => {
    if (!buyerFilter.length) return enrichedRows;
    return enrichedRows.filter((row) => matchesMultiFilter(buyerFilter, row.buyer));
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
              : `${row.supplier} (${row.supplier_id})`,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [supplierSourceRows]);
  const departmentOptions = useMemo(
    () =>
      stringOptionsFromValues(
        Array.from(new Set(enrichedRows.map((r) => r.department))).sort()
      ),
    [enrichedRows]
  );
  const branchOptions = useMemo(() => {
    const names = Array.from(
      new Set(enrichedRows.map((r) => r.branch_name))
    ).sort();
    if (isBranchLocked && userBranchName && !names.includes(userBranchName)) {
      names.push(userBranchName);
      names.sort();
    }
    return stringOptionsFromValues(names);
  }, [enrichedRows, isBranchLocked, userBranchName]);
  const categoryOptions = useMemo(
    () =>
      stringOptionsFromValues(
        Array.from(new Set(enrichedRows.map((r) => r.category))).sort()
      ),
    [enrichedRows]
  );
  const subcategoryOptions = useMemo(
    () =>
      stringOptionsFromValues(
        Array.from(new Set(enrichedRows.map((r) => r.subcategory))).sort()
      ),
    [enrichedRows]
  );

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
    setBuyerFilter((prev) => pruneMultiFilter(prev, buyerOptions));
    setSupplierFilter((prev) => pruneMultiFilter(prev, supplierOptions));
    setDepartmentFilter((prev) => pruneMultiFilter(prev, departmentOptions));
    setCategoryFilter((prev) => pruneMultiFilter(prev, categoryOptions));
    setSubcategoryFilter((prev) => pruneMultiFilter(prev, subcategoryOptions));
  }, [
    branchOptions,
    buyerOptions,
    supplierOptions,
    departmentOptions,
    categoryOptions,
    subcategoryOptions,
    isBranchLocked,
  ]);

  const filteredRows = useMemo(() => {
    return enrichedRows.filter((row) => {
      if (!matchesMultiFilter(buyerFilter, row.buyer)) return false;
      if (supplierFilter.length) {
        const currentSupplierValue =
          row.supplier_id == null ? "unknown" : String(row.supplier_id);
        if (!supplierFilter.includes(currentSupplierValue)) return false;
      }
      if (!matchesMultiFilter(branchFilter, row.branch_name)) return false;
      if (!matchesMultiFilter(departmentFilter, row.department)) return false;
      if (!matchesMultiFilter(categoryFilter, row.category)) return false;
      if (!matchesMultiFilter(subcategoryFilter, row.subcategory)) return false;
      return true;
    });
  }, [
    enrichedRows,
    buyerFilter,
    supplierFilter,
    branchFilter,
    departmentFilter,
    categoryFilter,
    subcategoryFilter,
  ]);

  const totalProducts = useMemo(() => {
    const ids = new Set();
    filteredRows.forEach((row) => {
      const id = Number(row.product_id);
      if (!Number.isNaN(id) && id > 0) ids.add(id);
    });
    return ids.size;
  }, [filteredRows]);

  const totalStockQty = useMemo(
    () =>
      round2(
        filteredRows.reduce((sum, row) => sum + toNum(row.total_stock), 0)
      ),
    [filteredRows]
  );
  const totalStockValue = useMemo(
    () =>
      round2(
        filteredRows.reduce((sum, row) => sum + toNum(row.total_value), 0)
      ),
    [filteredRows]
  );

  const deptQtyData = useMemo(
    () => buildDonutData(filteredRows, "department", "total_stock"),
    [filteredRows]
  );
  const deptValueData = useMemo(
    () => buildDonutData(filteredRows, "department", "total_value"),
    [filteredRows]
  );
  const buyerQtyData = useMemo(
    () => buildDonutData(filteredRows, "buyer", "total_stock"),
    [filteredRows]
  );
  const buyerValueData = useMemo(
    () => buildDonutData(filteredRows, "buyer", "total_value"),
    [filteredRows]
  );
  const applyBuyerFilterAndOpenTab = (entry) => {
    const val = entry?.filterValue;
    if (!val) return;
    setBuyerFilter([val]);
    setSupplierFilter([]);
    setDepartmentFilter([]);
    setCategoryFilter([]);
    setSubcategoryFilter([]);
    setGroupedTab("buyer");
    setTimeout(() => {
      groupedTableRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const applyDepartmentFilterAndOpenTab = (entry) => {
    const val = entry?.filterValue;
    if (!val) return;
    setDepartmentFilter([val]);
    setBuyerFilter([]);
    setSupplierFilter([]);
    setCategoryFilter([]);
    setSubcategoryFilter([]);
    setGroupedTab("department");
    setTimeout(() => {
      groupedTableRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const clearFilters = () => {
    setBuyerFilter([]);
    setSupplierFilter([]);
    setBranchFilter(isBranchLocked ? lockedBranchFilter : []);
    setDepartmentFilter([]);
    setCategoryFilter([]);
    setSubcategoryFilter([]);
  };

  const supplierTableRows = useMemo(
    () => buildSupplierGroupedTableRows(filteredRows),
    [filteredRows]
  );
  const buyerTableRows = useMemo(
    () => buildGroupedTableRows(filteredRows, "buyer"),
    [filteredRows]
  );
  const departmentTableRows = useMemo(
    () => buildGroupedTableRows(filteredRows, "department"),
    [filteredRows]
  );
  const branchTableRows = useMemo(
    () => buildGroupedTableRows(filteredRows, "branch_name"),
    [filteredRows]
  );

  const openProductsModal = (title, rows, options = {}) => {
    const { showBranchFilter = true } = options;
    setProductModalTitle(title);
    setProductModalRows(rows || []);
    setShowModalBranchFilter(showBranchFilter);
    setModalBranchFilter("");
    setModalBucketFilter(null);
    setProductModalOpen(true);
  };

  const modalBranchOptions = useMemo(
    () =>
      Array.from(
        new Set((productModalRows || []).map((r) => r.branch_name || "Unknown"))
      ).sort(),
    [productModalRows]
  );

  const filteredProductModalRows = useMemo(() => {
    return (productModalRows || []).filter((row) => {
      if (
        modalBranchFilter &&
        (row.branch_name || "Unknown") !== modalBranchFilter
      )
        return false;

      if (modalBucketFilter) {
        if (modalBucketFilter === "30") {
          if (
            toNum(row["30_days_stock"]) <= 0 &&
            toNum(row["30_days_stock_value"]) <= 0
          )
            return false;
        } else if (modalBucketFilter === "90") {
          if (
            toNum(row["90_days_stock"]) <= 0 &&
            toNum(row["90_days_stock_value"]) <= 0
          )
            return false;
        } else if (modalBucketFilter === "120") {
          if (
            toNum(row["120_days_stock"]) <= 0 &&
            toNum(row["120_days_stock_value"]) <= 0
          )
            return false;
        } else if (modalBucketFilter === "gt120") {
          if (
            toNum(row.than_120_days_stock) <= 0 &&
            toNum(row.than_120_days_stock_value) <= 0
          )
            return false;
        }
      }
      return true;
    });
  }, [productModalRows, modalBranchFilter, modalBucketFilter]);

  const summaryProductModalRows = useMemo(() => {
    return (productModalRows || []).filter((row) => {
      if (
        modalBranchFilter &&
        (row.branch_name || "Unknown") !== modalBranchFilter
      )
        return false;
      return true;
    });
  }, [productModalRows, modalBranchFilter]);

  const groupedTableColDefs = useMemo(
    () => [
      { field: "group_name", headerName: "Name", flex: 1 },
      { field: "total_stock", headerName: "Total Stock", type: "number" },
      { field: "total_value", headerName: "Total Value", type: "number" },
      {
        field: "30_days_stock_value",
        headerName: "30D Value",
        type: "number",
      },
      {
        field: "90_days_stock_value",
        headerName: "90D Value",
        type: "number",
      },
      {
        field: "120_days_stock_value",
        headerName: "120D Value",
        type: "number",
      },
      {
        field: "than_120_days_stock_value",
        headerName: ">120D Value",
        type: "number",
      },
      {
        field: "action",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => [
          {
            label: "View Products",
            value: "view_products",
            onClick: () =>
              openProductsModal(
                `${params.data?.group_name} - Products`,
                params.data?.products
              ),
          },
        ],
      },
    ],
    []
  );

  const groupedBranchTableColDefs = useMemo(
    () => [
      { field: "group_name", headerName: "Name", flex: 1 },
      { field: "total_stock", headerName: "Total Stock", type: "number" },
      { field: "total_value", headerName: "Total Value", type: "number" },
      {
        field: "30_days_stock_value",
        headerName: "30D Value",
        type: "number",
      },
      {
        field: "90_days_stock_value",
        headerName: "90D Value",
        type: "number",
      },
      {
        field: "120_days_stock_value",
        headerName: "120D Value",
        type: "number",
      },
      {
        field: "than_120_days_stock_value",
        headerName: ">120D Value",
        type: "number",
      },
      {
        field: "action",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => [
          {
            label: "View Products",
            value: "view_products",
            onClick: () =>
              openProductsModal(
                `${params.data?.group_name} - Products`,
                params.data?.products,
                { showBranchFilter: false }
              ),
          },
        ],
      },
    ],
    []
  );

  const productModalColDefs = useMemo(
    () => [
      { field: "product_id", type: "id" },
      { field: "product_image", headerName: "Image", type: "image" },
      {
        field: "product_name",
        headerName: "Product",
        flex: 1,
        type: "new-capitalized",
        valueGetter: (params) =>
          params.data.product_name
            ? capitalizeWordsLatest(params.data.product_name)
            : "-",
      },
      { field: "branch_name", headerName: "Branch", hideByDefault: true },
      { field: "buyer", headerName: "Buyer", flex: 1, hideByDefault: true },
      {
        field: "supplier",
        headerName: "Supplier",
        flex: 1,
        hideByDefault: true,
      },
      { field: "department", headerName: "Department", hideByDefault: true },
      { field: "category", headerName: "Category", hideByDefault: true },
      { field: "subcategory", headerName: "Subcategory", hideByDefault: true },
      { field: "30_days_stock", headerName: "30D Stock", type: "number" },
      { field: "30_days_stock_value", headerName: "30D Value", type: "number" },
      { field: "90_days_stock", headerName: "90D Stock", type: "number" },
      { field: "90_days_stock_value", headerName: "90D Value", type: "number" },
      { field: "120_days_stock", headerName: "120D Stock", type: "number" },
      {
        field: "120_days_stock_value",
        headerName: "120D Value",
        type: "number",
      },
      {
        field: "than_120_days_stock",
        headerName: ">120D Stock",
        type: "number",
      },
      {
        field: "than_120_days_stock_value",
        headerName: ">120D Value",
        type: "number",
      },
      { field: "total_stock", headerName: "Total Stock", type: "number" },
      { field: "total_value", headerName: "Total Value", type: "number" },
    ],
    []
  );

  const productModalSummary = useMemo(() => {
    const totals = {
      30: { qty: 0, value: 0 },
      90: { qty: 0, value: 0 },
      120: { qty: 0, value: 0 },
      gt120: { qty: 0, value: 0 },
    };

    (summaryProductModalRows || []).forEach((row) => {
      totals["30"].qty = round2(totals["30"].qty + toNum(row["30_days_stock"]));
      totals["30"].value = round2(
        totals["30"].value + toNum(row["30_days_stock_value"])
      );
      totals["90"].qty = round2(totals["90"].qty + toNum(row["90_days_stock"]));
      totals["90"].value = round2(
        totals["90"].value + toNum(row["90_days_stock_value"])
      );
      totals["120"].qty = round2(
        totals["120"].qty + toNum(row["120_days_stock"])
      );
      totals["120"].value = round2(
        totals["120"].value + toNum(row["120_days_stock_value"])
      );
      totals.gt120.qty = round2(
        totals.gt120.qty + toNum(row.than_120_days_stock)
      );
      totals.gt120.value = round2(
        totals.gt120.value + toNum(row.than_120_days_stock_value)
      );
    });

    return totals;
  }, [summaryProductModalRows]);

  const productSummaryCards = useMemo(
    () => [
      {
        key: "30",
        title: "Total 30D",
        qty: productModalSummary["30"].qty,
        value: productModalSummary["30"].value,
        color: "blue",
      },
      {
        key: "90",
        title: "Total 90D",
        qty: productModalSummary["90"].qty,
        value: productModalSummary["90"].value,
        color: "green",
      },
      {
        key: "120",
        title: "Total 120D",
        qty: productModalSummary["120"].qty,
        value: productModalSummary["120"].value,
        color: "purple",
      },
      {
        key: "gt120",
        title: "Total >120D",
        qty: productModalSummary.gt120.qty,
        value: productModalSummary.gt120.value,
        color: "orange",
      },
    ],
    [productModalSummary]
  );

  if (loading) {
    return (
      <GlobalWrapper permissionKey={DASHBOARD_ROUTES.stock.permissionKey}>
        <Center minH="240px">
          <Spinner size="lg" />
        </Center>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey={DASHBOARD_ROUTES.stock.permissionKey}>
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
            <DashboardPageTitle title="Stock Dashboard" subtitle="" size="sm" />
            <Flex align="center" gap="12px" flexWrap="wrap">
              <Text fontSize="11px" color="fg.muted">
                Last sync:{" "}
                {loading ? "Loading..." : lastSyncFormatted || "No sync data"}
              </Text>
              <Input
                type="date"
                aria-label="Date"
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
              label="Branch"
              placeholder="All branches"
              method="multiple-dropdown"
              value={branchFilter}
              options={branchOptions}
              disabled={isBranchLocked}
              onChange={(val) =>
                setBranchFilter(Array.isArray(val) ? val : [])
              }
            />
            <CustomInput
              label="Buyer"
              placeholder="All buyers"
              method="multiple-dropdown"
              value={buyerFilter}
              options={buyerOptions}
              onChange={(val) => {
                setBuyerFilter(Array.isArray(val) ? val : []);
                setSupplierFilter([]);
              }}
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
              label="Department"
              placeholder="All departments"
              method="multiple-dropdown"
              value={departmentFilter}
              options={departmentOptions}
              onChange={(val) =>
                setDepartmentFilter(Array.isArray(val) ? val : [])
              }
            />
            <Box gridColumn={{ lg: "span 2" }}>
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
            </Box>
            <Box gridColumn={{ lg: "span 2" }}>
            <CustomInput
              label="Subcategory"
              placeholder="All subcategories"
              method="multiple-dropdown"
              value={subcategoryFilter}
              options={subcategoryOptions}
              onChange={(val) =>
                setSubcategoryFilter(Array.isArray(val) ? val : [])
              }
            />
            </Box>
          </Grid>
        </DashboardCard>

        <Grid templateColumns={{ base: "1fr", lg: "repeat(3, 1fr)" }} gap="16px">
          <DashboardMetricCard
            tone="orange"
            icon={<LuPackage />}
            label="Total Products"
            caption="Selected period"
            value={formatNum(totalProducts)}
          />
          <DashboardMetricCard
            tone="blue"
            icon={<LuBox />}
            label="Total Stock Qty"
            caption="Selected period"
            value={Number(round2(totalStockQty)).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          />
          <DashboardMetricCard
            tone="purple"
            icon={<LuIndianRupee />}
            label="Total Stock Value"
            caption="Selected period"
            value={formatCurrency(totalStockValue)}
          />
        </Grid>

        <Grid templateColumns={{ base: "1fr", lg: "repeat(2, minmax(0, 1fr))" }} gap="16px">
          <DonutCard
            title="Department – Qty"
            data={deptQtyData}
            onSliceClick={applyDepartmentFilterAndOpenTab}
          />
          <DonutCard
            title="Department – Value"
            data={deptValueData}
            onSliceClick={applyDepartmentFilterAndOpenTab}
          />
          <DonutCard
            title="Buyer – Qty"
            data={buyerQtyData}
            onSliceClick={applyBuyerFilterAndOpenTab}
          />
          <DonutCard
            title="Buyer – Value"
            data={buyerValueData}
            onSliceClick={applyBuyerFilterAndOpenTab}
          />
        </Grid>

        {/* Figma: strip tabs, then a "Grouped totals" table card. */}
        <Flex ref={groupedTableRef} direction="column" gap="16px">
          <DashboardStripTabs
            value={groupedTab}
            onChange={setGroupedTab}
            tabs={[
              { value: "supplier", label: "By Supplier" },
              { value: "buyer", label: "By Buyer" },
              { value: "department", label: "By Department" },
              { value: "branch", label: "By Branch" },
            ]}
          />
          <DashboardCard title="Grouped totals">
            <AgGrid
              bare
              key={groupedTab}
              tableKey={`stock-dashboard-grouped-${groupedTab}`}
              rowData={
                {
                  supplier: supplierTableRows,
                  buyer: buyerTableRows,
                  department: departmentTableRows,
                  branch: branchTableRows,
                }[groupedTab]
              }
              columnDefs={
                groupedTab === "branch"
                  ? groupedBranchTableColDefs
                  : groupedTableColDefs
              }
              pagination={true}
              paginationPageSize={10}
            />
          </DashboardCard>
        </Flex>

        <CustomDialog
          open={productModalOpen}
          onOpenChange={(e) => {
            if (!e.open) {
              setProductModalOpen(false);
              setShowModalBranchFilter(true);
              setModalBranchFilter("");
              setModalBucketFilter(null);
            }
          }}
          title={productModalTitle || "Products"}
          maxW="95vw"
          maxH="90vh"
        >
          <Flex gap={4} align="center" mb={3}>
            {showModalBranchFilter && (
              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>
                  Branch
                </Text>
                <NativeSelect.Root size="sm">
                  <NativeSelect.Field
                    value={modalBranchFilter}
                    onChange={(e) => setModalBranchFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    {modalBranchOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Box>
            )}
          </Flex>

          <Grid
            templateColumns={{
              base: "1fr",
              md: "repeat(2, 1fr)",
              xl: "repeat(4, 1fr)",
            }}
            gap={4}
            mb={5}
          >
            {productSummaryCards.map((card) => (
              <Box
                key={card.key}
                p={4}
                borderWidth="1px"
                borderRadius="12px"
                borderColor={
                  modalBucketFilter === card.key
                    ? `${card.color}.500`
                    : `${card.color}.200`
                }
                borderTopWidth="4px"
                bg={`${card.color}.50`}
                minH="120px"
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
                cursor="pointer"
                onClick={() =>
                  setModalBucketFilter((prev) =>
                    prev === card.key ? null : card.key
                  )
                }
                boxShadow={modalBucketFilter === card.key ? "md" : "none"}
              >
                <Text
                  fontSize="sm"
                  color={`${card.color}.700`}
                  fontWeight="bold"
                  mb={3}
                >
                  {card.title}
                </Text>
                <Flex align="center" justify="space-between" mb={1}>
                  <Text fontSize="xs" color="gray.600" fontWeight="medium">
                    Qty
                  </Text>
                  <Text fontSize="md" color="gray.900" fontWeight="semibold">
                    <FormatNumber
                      value={card.qty}
                      maximumFractionDigits={2}
                      minimumFractionDigits={2}
                    />
                  </Text>
                </Flex>
                <Flex align="center" justify="space-between">
                  <Text fontSize="xs" color="gray.600" fontWeight="medium">
                    Value
                  </Text>
                  <Text fontSize="md" color="gray.900" fontWeight="semibold">
                    {formatCurrency(card.value)}
                  </Text>
                </Flex>
              </Box>
            ))}
          </Grid>
          <AgGrid
            tableKey="stock-dashboard-group-products"
            rowData={filteredProductModalRows}
            columnDefs={productModalColDefs}
            pagination={true}
            paginationPageSize={10}
          />
        </CustomDialog>
      </Flex>
    </GlobalWrapper>
  );
}
