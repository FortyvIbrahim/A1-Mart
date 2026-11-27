"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { Stack, Flex, Badge, Box, Tabs, Text } from "@chakra-ui/react";
import usePurchaseAcknowledgments from "@/api/customHooks/usePurchaseAcknowledgments";
import { transformPurchaseAckData } from "@/utils/purchaseAck";
import CustomDrawer from "@/components/CustomDrawer";
import CustomContainer from "@/components/CustomContainer";
import { capitalizeWordsLatest, purchaseAckStatusBadgeLabel } from "@/utils/string";
import moment from "moment";
import DashboardPageTitle, {
  DashboardTitleSection,
} from "@/components/dashboard/DashboardPageTitle";
import FiltersBar from "@/components/wms-dashboard/FiltersBar";
import SummaryChartsRow from "@/components/wms-dashboard/SummaryChartsRow";
import StatusTimelineContent from "@/components/wms-dashboard/StatusTimelineContent";
import PurchasesTabContent from "@/components/wms-dashboard/tabs/PurchasesTabContent";
import PurchaseReturnTabContent from "@/components/wms-dashboard/tabs/PurchaseReturnTabContent";
import PurchaseReturnByBuyersTabContent from "@/components/wms-dashboard/tabs/PurchaseReturnByBuyersTabContent";
import WorksheetTableCard from "@/components/wms-dashboard/tabs/WorksheetTableCard";
import GlobalWrapper from "@/components/GlobalWrapper";
import useStickering from "@/api/customHooks/useStickering";
import usePurchaseReturns from "@/api/customHooks/usePurchaseReturns";
import useBranches from "@/api/customHooks/useBranches";
import AgGrid from "@/components/AgGrid";
import { generatePDFWithToast } from "@/utils/pdfGenerator";
import { SKU_TYPES } from "@/constants/sku_mode";
import { DIST_WAREHOUSE_ID, PROD_WAREHOUSE_ID } from "@/constants/branches";
import useBranchFilterAccess from "@/customHooks/useBranchFilterAccess";

/** Figma "By Status" palette (Concept C). */
const COLORS_MAP = {
  grn_pending: "#F47721",
  pe_created: "#9AAAC1",
  po_linked: "#C95C18",
  job_entry_in_progress: "#E3B63E",
  repack_entry_in_progress: "#E7474D",
  grn_done: "#11976A",
  job_entry_done: "#E3B63E",
  done: "#526FA8",
};

const COLORS_MAP_CHAKRA = {
  grn_pending: "blue",
  pe_created: "blue",
  po_linked: "blue",
  job_entry_in_progress: "purple",
  repack_entry_in_progress: "purple",
  grn_done: "yellow",
  job_entry_done: "orange",
  done: "green",
};

const STATUS_SORT_ORDER = {
  grn_pending: 0,
  grn_done: 1,
  pe_created: 2,
  job_entry_in_progress: 3,
  job_entry_done: 4,
  repack_entry_in_progress: 5,
  repack_entry_done: 6,
  done: 7,
};

/** Stickering rows keep original `created_at` when marked done; completion time is `updated_at` (see Stickering grid "Updated At"). */
function stickeringCompletionMoment(item) {
  const ts = item?.updated_at ?? item?.created_at;
  return ts ? moment(ts) : null;
}

function parseStickeringQtyValue(item) {
  const raw = item?.qty;
  if (raw == null || raw === "") return 0;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw), 10);
  return Number.isFinite(n) ? n : 0;
}

/** Inclusive calendar days for the job worksheet "by day" modal (dashboard Pending Date range). */
function buildJobWorksheetStatsModalDays(dateRange) {
  const today = moment().startOf("day");
  const hasStart = Boolean(dateRange?.startDate);
  const hasEnd = Boolean(dateRange?.endDate);

  let start = hasStart ? moment(dateRange.startDate).startOf("day") : null;
  let end = hasEnd ? moment(dateRange.endDate).startOf("day") : null;

  if (!hasStart && !hasEnd) {
    start = today.clone();
    end = today.clone();
  } else if (hasStart && !hasEnd) {
    end = today.clone();
    if (start.isAfter(end)) {
      end = start.clone();
    }
  } else if (!hasStart && hasEnd) {
    start = end.clone();
  }

  if (start.isAfter(end)) {
    const tmp = start.clone();
    start = end.clone();
    end = tmp;
  }

  const days = [];
  const cursor = start.clone();
  const maxSpan = 400;
  let n = 0;
  while (!cursor.isAfter(end, "day") && n < maxSpan) {
    days.push(cursor.clone());
    cursor.add(1, "day");
    n += 1;
  }
  return days;
}

function formatJobStatsModalRangeSubtitle(dateRange) {
  const fmt = (d) => (d ? moment(d).format("DD/MM/YYYY") : "—");
  if (!dateRange?.startDate && !dateRange?.endDate) {
    return "Date range: today (set Pending Date on the dashboard for a custom range)";
  }
  if (dateRange?.startDate && !dateRange?.endDate) {
    return `Date range: ${fmt(dateRange.startDate)} → ${moment().format(
      "DD/MM/YYYY"
    )}`;
  }
  if (!dateRange?.startDate && dateRange?.endDate) {
    return `Date range: ${fmt(dateRange.endDate)}`;
  }
  return `Date range: ${fmt(dateRange.startDate)} → ${fmt(dateRange.endDate)}`;
}

function Dashboard() {
  const { purchaseReturns } = usePurchaseReturns();
  const { branches } = useBranches();
  const { isBranchLocked, userBranchKey } = useBranchFilterAccess();
  const [selectedAck, setSelectedAck] = useState(null);
  const [selectedJobSupervisor, setSelectedJobSupervisor] = useState(null);
  const [selectedRepackSupervisor, setSelectedRepackSupervisor] =
    useState(null);
  const [selectedPurchaseReturnSupplier, setSelectedPurchaseReturnSupplier] =
    useState(null);
  const [dateRange, setDateRange] = useState(() => ({
    startDate: moment().startOf("month").toDate(),
    endDate: new Date(),
  }));
  const listApiDateFrom = useMemo(
    () =>
      dateRange.startDate
        ? moment(dateRange.startDate).format("YYYY-MM-DD")
        : undefined,
    [dateRange.startDate]
  );
  const listApiDateTo = useMemo(
    () =>
      dateRange.endDate
        ? moment(dateRange.endDate).format("YYYY-MM-DD")
        : undefined,
    [dateRange.endDate]
  );
  const { purchaseAcknowledgments, loading } = usePurchaseAcknowledgments({
    from: listApiDateFrom,
    to: listApiDateTo,
  });
  const { stickering, loading: stickeringLoading } = useStickering({
    from: listApiDateFrom,
    to: listApiDateTo,
  });
  const [statusFilter, setStatusFilter] = useState(null);
  const [tableTab, setTableTab] = useState("purchases");
  const [purchaseReturnBuyerFilter, setPurchaseReturnBuyerFilter] =
    useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const branchOptions = useMemo(() => {
    const warehouseBranches = (branches || [])
      .filter(
        (b) =>
          b.branch_id === DIST_WAREHOUSE_ID ||
          b.branch_id === PROD_WAREHOUSE_ID
      )
      .map((b) => ({
        value: String(b.branch_id),
        label: b.branch_name,
      }));

    if (!isBranchLocked || !userBranchKey) return warehouseBranches;

    if (warehouseBranches.some((b) => b.value === userBranchKey)) {
      return warehouseBranches;
    }

    const userBranch = (branches || []).find(
      (b) => String(b.branch_id) === userBranchKey
    );
    if (!userBranch) return warehouseBranches;

    return [
      ...warehouseBranches,
      { value: userBranchKey, label: userBranch.branch_name },
    ].sort((a, b) => a.label.localeCompare(b.label));
  }, [branches, isBranchLocked, userBranchKey]);

  useEffect(() => {
    if (!isBranchLocked || !userBranchKey) return;
    setSelectedBranchId((prev) =>
      prev === userBranchKey ? prev : userBranchKey
    );
  }, [isBranchLocked, userBranchKey]);

  const [isJobDoneByDayModalOpen, setIsJobDoneByDayModalOpen] = useState(false);
  const [isJobDayEmployeesModalOpen, setIsJobDayEmployeesModalOpen] =
    useState(false);
  const [jobDayEmployeesContext, setJobDayEmployeesContext] = useState(null);
  const [isJobEmployeeJobsModalOpen, setIsJobEmployeeJobsModalOpen] =
    useState(false);
  const [jobEmployeeJobsContext, setJobEmployeeJobsContext] = useState(null);

  const tablesSectionRef = useRef(null);

  const scrollToTablesSection = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        tablesSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  };

  const transformedPurchaseAcknowledgments = useMemo(() => {
    const transformed = transformPurchaseAckData(purchaseAcknowledgments || []);
    return transformed.filter(
      (item) =>
        !(
          item.status === "done" &&
          moment(item.created_at).isBefore(moment().startOf("day"))
        )
    );
  }, [purchaseAcknowledgments]);

  /** Full transformed list (no "hide old done" filter) for job/repack tables so PA rows match sticker-derived counts. */
  const transformedAllPurchaseAcknowledgments = useMemo(
    () => transformPurchaseAckData(purchaseAcknowledgments || []),
    [purchaseAcknowledgments]
  );

  const filteredPurchaseAcknowledgments = useMemo(() => {
    if (!transformedPurchaseAcknowledgments) return [];

    return transformedPurchaseAcknowledgments.filter((ack) => {
      const ackBranchId = ack?.branch_id ?? ack?.branch?.branch_id ?? null;
      if (
        selectedBranchId &&
        String(ackBranchId ?? "") !== String(selectedBranchId)
      ) {
        return false;
      }

      if (statusFilter && ack.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [transformedPurchaseAcknowledgments, statusFilter, selectedBranchId]);

  /** When a status chip is selected, job worksheet stats/table only count sticker lines for PAs in the filtered purchases list. */
  const filteredPurchaseAckIds = useMemo(() => {
    if (!statusFilter) return null;
    return new Set(
      filteredPurchaseAcknowledgments
        .map((a) => a.purchase_acknowledgment_id)
        .filter(Boolean)
    );
  }, [statusFilter, filteredPurchaseAcknowledgments]);

  const filteredStickering = useMemo(() => {
    if (!stickering || !Array.isArray(stickering)) return [];

    return stickering.filter((item) => {
      const itemBranchId =
        item?.branch_id ??
        item?.purchase_acknowledgment_branch_id ??
        item?.purchase_acknowledgment?.branch_id ??
        null;
      if (
        selectedBranchId &&
        String(itemBranchId ?? "") !== String(selectedBranchId)
      ) {
        return false;
      }
      if (!item.purchase_acknowledgment_invoice_no) return false;

      return true;
    });
  }, [stickering, selectedBranchId]);

  /** Stickering lines used for job worksheet table + stats (date filter on invoice, optional supervisor + PA status drill-down). */
  const jobWorksheetStickeringSource = useMemo(() => {
    let source = selectedJobSupervisor
      ? filteredStickering.filter((item) => {
          const sup = item.supervisor_name || item.supervisor_id || "Unknown";
          return sup === selectedJobSupervisor;
        })
      : filteredStickering;

    if (filteredPurchaseAckIds) {
      source = source.filter(
        (item) =>
          item.purchase_acknowledgment_id != null &&
          filteredPurchaseAckIds.has(item.purchase_acknowledgment_id)
      );
    }
    return source;
  }, [filteredStickering, selectedJobSupervisor, filteredPurchaseAckIds]);

  /** Purchase Return Pending: not scoped by dashboard date filter (always all returns). */
  const filteredPurchaseReturns = useMemo(() => {
    if (!Array.isArray(purchaseReturns)) return [];
    return purchaseReturns;
  }, [purchaseReturns]);

  const {
    purchaseReturnSummary,
    purchaseReturnSupplierRows,
    purchaseReturnByBuyer,
  } = useMemo(() => {
    const supplierBuyerMap = new Map();
    const buyerMap = new Map();

    filteredPurchaseReturns.forEach((pr) => {
      (pr.employees || []).forEach((emp) => {
        const buyerName =
          emp.employee?.employee_name ??
          emp.employee?.name ??
          emp.employee_name ??
          emp.employee_code ??
          "Unknown";
        if (!buyerMap.has(buyerName)) {
          buyerMap.set(buyerName, {
            buyerName,
            suppliersMap: new Map(),
          });
        }

        (emp.suppliers || []).forEach((supplier) => {
          const isReturned =
            Array.isArray(supplier.delivered) && supplier.delivered.length > 0;
          if (isReturned) return;

          const supplierName =
            supplier.supplier?.name ?? supplier.supplier?.supplier_name ?? "—";
          const supplierId =
            supplier.supplier_id ?? supplier.master_id ?? supplierName;
          const supplierKey = `${supplierId}-${supplierName}`;
          const noOfBoxes = Number(supplier.no_of_boxes) || 0;

          const buyerEntry = buyerMap.get(buyerName);
          if (!buyerEntry.suppliersMap.has(supplierKey)) {
            buyerEntry.suppliersMap.set(supplierKey, {
              supplier_id: supplierId,
              supplierName,
              no_of_boxes: 0,
              items: [],
            });
          }
          const buyerSupplierEntry = buyerEntry.suppliersMap.get(supplierKey);
          buyerSupplierEntry.no_of_boxes += noOfBoxes;

          const supplierBuyerKey = `${buyerName}__${supplierKey}`;
          if (!supplierBuyerMap.has(supplierBuyerKey)) {
            supplierBuyerMap.set(supplierBuyerKey, {
              supplier_name: supplierName,
              buyer_name: buyerName,
              prNos: new Set(),
              total_value: 0,
              items: [],
            });
          }
          const target = supplierBuyerMap.get(supplierBuyerKey);
          (supplier.items || []).forEach((it) => {
            if (it?.pr_no != null && it.pr_no !== "") {
              target.prNos.add(String(it.pr_no));
            }
            target.total_value += Number(it?.total_amount || 0);
            target.items.push({
              product_name:
                it.product?.de_display_name ??
                it.product?.de_name ??
                it.product?.product_name ??
                it.item_name ??
                "—",
              buyer_name: buyerName,
              qty: it.qty ?? "—",
              total_amount: it.total_amount != null ? it.total_amount : "—",
              pr_no: it.pr_no ?? "—",
              outlet_name: it.outlet_name ?? it.outlet?.branch_name ?? "—",
              delivered: false,
            });
            buyerSupplierEntry.items.push({
              product_name:
                it.product?.de_display_name ??
                it.product?.de_name ??
                it.product?.product_name ??
                it.item_name ??
                "—",
              qty: it.qty ?? "—",
              total_amount: it.total_amount != null ? it.total_amount : "—",
              pr_no: it.pr_no ?? "—",
              outlet_name: it.outlet_name ?? it.outlet?.branch_name ?? "—",
              delivered: false,
            });
          });
        });
      });
    });

    const supplierRows = Array.from(supplierBuyerMap.values())
      .map((entry) => ({
        supplier_name: entry.supplier_name,
        buyer_name: entry.buyer_name,
        total_bills: entry.prNos.size,
        total_value: Math.round(entry.total_value * 100) / 100,
        status: "Not Returned",
        items: entry.items,
      }))
      .sort(
        (a, b) =>
          a.buyer_name.localeCompare(b.buyer_name) ||
          b.total_value - a.total_value
      );

    const buyerTotalBillsSumMap = new Map();
    for (const name of buyerMap.keys()) {
      buyerTotalBillsSumMap.set(name, 0);
    }
    for (const row of supplierRows) {
      buyerTotalBillsSumMap.set(
        row.buyer_name,
        (buyerTotalBillsSumMap.get(row.buyer_name) ?? 0) + row.total_bills
      );
    }

    const summary = Array.from(buyerTotalBillsSumMap.entries())
      .filter(([, value]) => Number(value) > 0)
      .map(([name, value]) => ({
        name,
        value,
        color: "#DD6B20",
      }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

    const byBuyer = Array.from(buyerMap.values())
      .map((entry) => ({
        buyerName: entry.buyerName,
        suppliers: Array.from(entry.suppliersMap.values()),
      }))
      .sort((a, b) => a.buyerName.localeCompare(b.buyerName));

    return {
      purchaseReturnSummary: summary,
      purchaseReturnSupplierRows: supplierRows,
      purchaseReturnByBuyer: byBuyer,
    };
  }, [filteredPurchaseReturns]);

  const purchaseReturnBuyerOptions = useMemo(
    () =>
      purchaseReturnByBuyer.map((entry) => ({
        label: entry.buyerName,
        value: entry.buyerName,
      })),
    [purchaseReturnByBuyer]
  );

  const filteredPurchaseReturnByBuyer = useMemo(() => {
    if (!purchaseReturnBuyerFilter) return purchaseReturnByBuyer;
    return purchaseReturnByBuyer.filter(
      (entry) => entry.buyerName === purchaseReturnBuyerFilter
    );
  }, [purchaseReturnByBuyer, purchaseReturnBuyerFilter]);

  const filteredPurchaseReturnSupplierRows = useMemo(() => {
    if (!purchaseReturnBuyerFilter) return purchaseReturnSupplierRows;
    return purchaseReturnSupplierRows.filter(
      (row) => row.buyer_name === purchaseReturnBuyerFilter
    );
  }, [purchaseReturnSupplierRows, purchaseReturnBuyerFilter]);

  const { byStatus, jobSummary, repackSummary } = useMemo(() => {
    const statusMap = {};
    let totalJobs = 0;
    let totalJobsDone = 0;
    let totalRepackDone = 0;

    const today = moment().startOf("day");

    filteredPurchaseAcknowledgments.forEach((ack) => {
      const rawStatus = ack.status || "unknown";
      statusMap[rawStatus] = (statusMap[rawStatus] || 0) + 1;

      const sc = ack.status_counts || {};
      const open = sc.open || 0;
      const inProgress = sc.in_progress || 0;
      const done = sc.done || 0;
      const cancelled = sc.cancelled || 0;

      const jobsForAck = open + inProgress + done + cancelled;
      const jobsDoneForAck = done + cancelled;

      totalJobs += jobsForAck;
      totalJobsDone += jobsDoneForAck;

      totalRepackDone += ack.repacking_entry_count || 0;
    });

    const byStatus = Object.entries(statusMap)
      .filter(([code]) => code !== "job_entry_done")
      .sort(([codeA], [codeB]) => {
        const orderA =
          STATUS_SORT_ORDER[codeA] !== undefined
            ? STATUS_SORT_ORDER[codeA]
            : Number.MAX_SAFE_INTEGER;
        const orderB =
          STATUS_SORT_ORDER[codeB] !== undefined
            ? STATUS_SORT_ORDER[codeB]
            : Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return codeA.localeCompare(codeB);
      })
      .map(([code, value]) => {
        const label =
          code === "pe_created"
            ? "Purchase Entry Done"
            : capitalizeWordsLatest(code).replaceAll("_", " ");
        return {
          code,
          name: label,
          value,
          color: COLORS_MAP[code],
        };
      });

    // Job Worksheet Status — done segment = completed today only (matches Job Worksheet table).
    const jobPendingBySupervisor = {};
    const jobDoneTodayBySupervisor = {};

    filteredStickering.forEach((item) => {
      const supervisorName =
        item.supervisor_name || item.supervisor_id || "Unknown";

      if (item.status !== "done") {
        jobPendingBySupervisor[supervisorName] =
          (jobPendingBySupervisor[supervisorName] || 0) + 1;
      } else {
        const doneAt = stickeringCompletionMoment(item);
        if (doneAt && doneAt.isSame(today, "day")) {
          jobDoneTodayBySupervisor[supervisorName] =
            (jobDoneTodayBySupervisor[supervisorName] || 0) + 1;
        }
      }
    });

    const jobSupervisors = Array.from(
      new Set([
        ...Object.keys(jobPendingBySupervisor),
        ...Object.keys(jobDoneTodayBySupervisor),
      ])
    ).sort();

    const jobSummary = jobSupervisors.map((name) => {
      const pending = jobPendingBySupervisor[name] || 0;
      const doneToday = jobDoneTodayBySupervisor[name] || 0;
      return {
        name,
        pending,
        doneToday,
        total: pending + doneToday,
      };
    });

    // Repack Entry Status — done segment = repack completed today only (matches Repack Entry table).
    const repackPendingBySupervisor = {};
    const repackDoneTodayBySupervisor = {};

    filteredStickering
      .filter(
        (item) =>
          item.repack_supervisor_id !== null &&
          item.repack_supervisor_id !== undefined &&
          item.repack_supervisor_id !== ""
      )
      .filter((item) => item.status === "done")
      .forEach((item) => {
        const supervisorName =
          item.repack_supervisor_name || item.repack_supervisor_id || "Unknown";

        const hasRepackDetails =
          item.packing != null ||
          item.loose != null ||
          item.pur_ret != null ||
          item.wastage != null;

        if (!hasRepackDetails) {
          repackPendingBySupervisor[supervisorName] =
            (repackPendingBySupervisor[supervisorName] || 0) + 1;
        } else {
          const completedAt = stickeringCompletionMoment(item);
          if (completedAt && completedAt.isSame(today, "day")) {
            repackDoneTodayBySupervisor[supervisorName] =
              (repackDoneTodayBySupervisor[supervisorName] || 0) + 1;
          }
        }
      });

    const repackSupervisors = Array.from(
      new Set([
        ...Object.keys(repackPendingBySupervisor),
        ...Object.keys(repackDoneTodayBySupervisor),
      ])
    ).sort();

    const repackSummary = repackSupervisors.map((name) => {
      const pending = repackPendingBySupervisor[name] || 0;
      const doneToday = repackDoneTodayBySupervisor[name] || 0;
      return {
        name,
        pending,
        doneToday,
        total: pending + doneToday,
      };
    });

    return {
      byStatus,
      jobSummary,
      repackSummary,
    };
  }, [filteredPurchaseAcknowledgments, filteredStickering]);

  const jobWorksheetTableRows = useMemo(() => {
    if (!jobWorksheetStickeringSource.length) return [];
    const today = moment().startOf("day");
    const source = jobWorksheetStickeringSource;

    const byPa = {};
    const byPaStickersToday = {};
    const byPaPendingQty = {};
    const byPaJobSupervisors = {};
    source.forEach((item) => {
      const paId = item.purchase_acknowledgment_id;
      if (!paId) return;
      if (!byPa[paId]) byPa[paId] = { pending: 0, done: 0 };
      const jobSupRaw =
        item.supervisor_name != null &&
        String(item.supervisor_name).trim() !== ""
          ? String(item.supervisor_name).trim()
          : item.supervisor_id != null && item.supervisor_id !== ""
          ? String(item.supervisor_id)
          : "";
      if (jobSupRaw) {
        if (!byPaJobSupervisors[paId]) byPaJobSupervisors[paId] = new Set();
        byPaJobSupervisors[paId].add(jobSupRaw);
      }
      if (item.status !== "done") {
        byPa[paId].pending += 1;
        byPaPendingQty[paId] =
          (byPaPendingQty[paId] || 0) + parseStickeringQtyValue(item);
        return;
      }
      const doneAt = stickeringCompletionMoment(item);
      if (doneAt && doneAt.isSame(today, "day")) {
        byPa[paId].done += 1;
        byPaStickersToday[paId] =
          (byPaStickersToday[paId] || 0) + parseStickeringQtyValue(item);
      }
    });
    const paIds = Object.keys(byPa)
      .map(Number)
      .filter((id) => byPa[id].pending + byPa[id].done > 0);

    const formatSupervisorSet = (set) =>
      set && set.size > 0
        ? Array.from(set)
            .sort((a, b) => a.localeCompare(b))
            .join(", ")
        : "—";

    return transformedAllPurchaseAcknowledgments
      .filter((ack) => paIds.includes(ack.purchase_acknowledgment_id))
      .map((ack) => ({
        ...ack,
        total_jobs_pending: byPa[ack.purchase_acknowledgment_id]?.pending ?? 0,
        total_jobs_done: byPa[ack.purchase_acknowledgment_id]?.done ?? 0,
        stickers_stuck_today_qty:
          byPaStickersToday[ack.purchase_acknowledgment_id] ?? 0,
        pending_qty: byPaPendingQty[ack.purchase_acknowledgment_id] ?? 0,
        job_worksheet_supervisors: formatSupervisorSet(
          byPaJobSupervisors[ack.purchase_acknowledgment_id]
        ),
      }));
  }, [jobWorksheetStickeringSource, transformedAllPurchaseAcknowledgments]);

  /** Job worksheet line stats: same stickering source as the job table (see jobWorksheetStickeringSource). */
  const jobWorksheetStickeringStats = useMemo(() => {
    const today = moment().startOf("day");
    const source = jobWorksheetStickeringSource;

    let stickersStuckTodayQty = 0;
    let totalDoneTodayCount = 0;
    let totalPendingCount = 0;
    let totalStickerPendingQty = 0;

    source.forEach((item) => {
      if (item.status !== "done") {
        totalPendingCount += 1;
        totalStickerPendingQty += parseStickeringQtyValue(item);
        return;
      }
      const doneAt = stickeringCompletionMoment(item);
      if (doneAt && doneAt.isSame(today, "day")) {
        totalDoneTodayCount += 1;
        stickersStuckTodayQty += parseStickeringQtyValue(item);
      }
    });

    return {
      stickersStuckTodayQty,
      totalDoneTodayCount,
      totalPendingCount,
      totalStickerPendingQty,
    };
  }, [jobWorksheetStickeringSource]);

  const jobWorksheetStickeringDailyRows = useMemo(() => {
    const days = buildJobWorksheetStatsModalDays(dateRange);
    const byDay = new Map();

    for (const item of jobWorksheetStickeringSource) {
      if (item.status !== "done") continue;
      const doneAt = stickeringCompletionMoment(item);
      if (!doneAt || !doneAt.isValid()) continue;
      const key = doneAt.format("YYYY-MM-DD");
      const cur = byDay.get(key) ?? { qty: 0, jobs: 0 };
      cur.jobs += 1;
      cur.qty += parseStickeringQtyValue(item);
      byDay.set(key, cur);
    }

    return days.map((d) => {
      const key = d.format("YYYY-MM-DD");
      const agg = byDay.get(key) ?? { qty: 0, jobs: 0 };
      return {
        dateKey: key,
        dateLabel: d.format("DD/MM/YYYY"),
        totalStickersStuckQty: agg.qty,
        totalJobsDone: agg.jobs,
      };
    });
  }, [jobWorksheetStickeringSource, dateRange]);

  const jobDayEmployeeStickerRows = useMemo(() => {
    const dateKey = jobDayEmployeesContext?.dateKey;
    if (!dateKey) return [];
    const byEmployee = new Map();
    for (const item of jobWorksheetStickeringSource) {
      if (item.status !== "done") continue;
      const doneAt = stickeringCompletionMoment(item);
      if (!doneAt || !doneAt.isValid()) continue;
      if (doneAt.format("YYYY-MM-DD") !== dateKey) continue;
      const code =
        item.employee_code != null && String(item.employee_code).trim() !== ""
          ? String(item.employee_code).trim()
          : "";
      const name =
        item.employee_name != null && String(item.employee_name).trim() !== ""
          ? String(item.employee_name).trim()
          : "";
      const groupKey = code ? `code:${code}` : `name:${name || "unknown"}`;
      const cur = byEmployee.get(groupKey) ?? {
        employee_group_key: groupKey,
        employee_name: name || code || "Unknown",
        employee_code: code,
        jobs_done: 0,
        stickers_stuck_qty: 0,
      };
      cur.jobs_done += 1;
      cur.stickers_stuck_qty += parseStickeringQtyValue(item);
      if (name) cur.employee_name = name;
      else if (!cur.employee_name || cur.employee_name === "Unknown")
        cur.employee_name = code || "Unknown";
      if (code) cur.employee_code = code;
      byEmployee.set(groupKey, cur);
    }
    return Array.from(byEmployee.values()).sort((a, b) => {
      const dq = b.stickers_stuck_qty - a.stickers_stuck_qty;
      if (dq !== 0) return dq;
      return String(a.employee_name).localeCompare(String(b.employee_name));
    });
  }, [jobDayEmployeesContext?.dateKey, jobWorksheetStickeringSource]);

  const jobEmployeeCompletedJobsRows = useMemo(() => {
    const dateKey = jobEmployeeJobsContext?.dateKey;
    const employeeGroupKey = jobEmployeeJobsContext?.employee_group_key;
    if (!dateKey || !employeeGroupKey) return [];

    return jobWorksheetStickeringSource
      .filter((item) => item.status === "done")
      .filter((item) => {
        const doneAt = stickeringCompletionMoment(item);
        if (!doneAt || !doneAt.isValid()) return false;
        return doneAt.format("YYYY-MM-DD") === dateKey;
      })
      .filter((item) => {
        const code =
          item.employee_code != null && String(item.employee_code).trim() !== ""
            ? String(item.employee_code).trim()
            : "";
        const name =
          item.employee_name != null && String(item.employee_name).trim() !== ""
            ? String(item.employee_name).trim()
            : "";
        const groupKey = code ? `code:${code}` : `name:${name || "unknown"}`;
        return groupKey === employeeGroupKey;
      })
      .map((item) => ({
        stickering_id: item.stickering_id,
        purchase_acknowledgment_id: item.purchase_acknowledgment_id ?? "—",
        invoice_no: item.purchase_acknowledgment_invoice_no ?? "—",
        product_id: item.product_id ?? "—",
        product_name: item.product_name ?? "—",
        qty: parseStickeringQtyValue(item),
        status: "Done",
        completed_at: stickeringCompletionMoment(item)?.toISOString() ?? null,
      }));
  }, [
    jobEmployeeJobsContext?.dateKey,
    jobEmployeeJobsContext?.employee_group_key,
    jobWorksheetStickeringSource,
  ]);

  const jobDoneByDayModalColDefs = useMemo(
    () => [
      {
        field: "dateLabel",
        headerName: "Date",
        minWidth: 120,
        flex: 1,
      },
      {
        field: "totalStickersStuckQty",
        headerName: "Total stickers stuck",
        type: "number",
        minWidth: 170,
        flex: 1,
      },
      {
        field: "totalJobsDone",
        headerName: "Total jobs",
        type: "number",
        minWidth: 120,
        width: 130,
      },
      {
        headerName: "Actions",
        field: "actions",
        type: "action-column",
        minWidth: 120,
        maxWidth: 130,
        valueGetter: (params) => [
          {
            label: "View Employees",
            value: "view-employees",
            onClick: () => {
              const row = params.data;
              if (!row?.dateKey) return;
              setJobDayEmployeesContext({
                dateKey: row.dateKey,
                dateLabel: row.dateLabel,
              });
              setIsJobDayEmployeesModalOpen(true);
            },
          },
        ],
      },
    ],
    []
  );

  const jobDayEmployeesModalColDefs = useMemo(
    () => [
      {
        headerName: "Code",
        field: "employee_code",
        type: "id",
      },
      {
        headerName: "Employee",
        field: "employee_name",
        flex: 1.25,
        valueGetter: (params) => {
          const n = params.data?.employee_name;
          const c = params.data?.employee_code;
          if (n && String(n).trim()) return String(n).trim();
          if (c && String(c).trim()) return String(c).trim();
          return "—";
        },
      },
      {
        headerName: "Jobs done",
        field: "jobs_done",
        type: "number",
      },
      {
        headerName: "Stickers stuck (qty)",
        field: "stickers_stuck_qty",
        type: "number",
      },
      {
        headerName: "Actions",
        field: "actions",
        type: "action-column",
        minWidth: 120,
        maxWidth: 130,
        valueGetter: (params) => [
          {
            label: "View Jobs",
            value: "view-jobs",
            onClick: () => {
              const row = params.data;
              if (!row?.employee_group_key || !jobDayEmployeesContext?.dateKey)
                return;
              setJobEmployeeJobsContext({
                dateKey: jobDayEmployeesContext.dateKey,
                dateLabel: jobDayEmployeesContext.dateLabel,
                employee_group_key: row.employee_group_key,
                employee_name: row.employee_name ?? "Unknown",
                employee_code: row.employee_code ?? "",
              });
              setIsJobEmployeeJobsModalOpen(true);
            },
          },
        ],
      },
    ],
    [jobDayEmployeesContext?.dateKey, jobDayEmployeesContext?.dateLabel]
  );

  const jobEmployeeJobsModalColDefs = useMemo(
    () => [
      {
        headerName: "ID",
        field: "stickering_id",
        type: "id",
      },
      {
        headerName: "PA ID",
        field: "purchase_acknowledgment_id",
        type: "id",
      },
      {
        headerName: "Inv #",
        field: "invoice_no",
      },
      {
        headerName: "Product ID",
        field: "product_id",
      },
      {
        headerName: "Product",
        field: "product_name",
        flex: 1,
        minWidth: 180,
      },
      {
        headerName: "Qty",
        field: "qty",
        type: "number",
      },
      {
        headerName: "Status",
        field: "status",
        type: "badge-column",
        valueGetter: () => ({
          label: "Done",
          colorScheme: "green",
        }),
      },
      {
        headerName: "Completed At",
        field: "completed_at",
        type: "datetime",
      },
    ],
    []
  );

  const repackEntryTableRows = useMemo(() => {
    if (!filteredStickering.length) return [];
    const today = moment().startOf("day");
    let source = filteredStickering
      .filter((item) => item.status === "done")
      .filter(
        (item) =>
          item.repack_supervisor_id !== null &&
          item.repack_supervisor_id !== undefined &&
          item.repack_supervisor_id !== ""
      );
    if (selectedRepackSupervisor) {
      source = source.filter((item) => {
        const sup =
          item.repack_supervisor_name || item.repack_supervisor_id || "Unknown";
        return sup === selectedRepackSupervisor;
      });
    }
    const byPa = {};
    const byPaPendingQty = {};
    const byPaDoneTodayQty = {};
    const byPaRepackSupervisors = {};
    source.forEach((item) => {
      const paId = item.purchase_acknowledgment_id;
      if (!paId) return;
      if (!byPa[paId]) byPa[paId] = { pending: 0, done: 0 };
      const repackSupRaw =
        item.repack_supervisor_name != null &&
        String(item.repack_supervisor_name).trim() !== ""
          ? String(item.repack_supervisor_name).trim()
          : item.repack_supervisor_id != null &&
            item.repack_supervisor_id !== ""
          ? String(item.repack_supervisor_id)
          : "";
      if (repackSupRaw) {
        if (!byPaRepackSupervisors[paId])
          byPaRepackSupervisors[paId] = new Set();
        byPaRepackSupervisors[paId].add(repackSupRaw);
      }
      const hasDetails =
        item.packing != null ||
        item.loose != null ||
        item.pur_ret != null ||
        item.wastage != null;
      if (!hasDetails) {
        byPa[paId].pending += 1;
        byPaPendingQty[paId] =
          (byPaPendingQty[paId] || 0) + parseStickeringQtyValue(item);
      } else {
        const completedAt = stickeringCompletionMoment(item);
        if (completedAt && completedAt.isSame(today, "day")) {
          byPa[paId].done += 1;
          byPaDoneTodayQty[paId] =
            (byPaDoneTodayQty[paId] || 0) + parseStickeringQtyValue(item);
        }
      }
    });
    const paIds = Object.keys(byPa)
      .map(Number)
      .filter((id) => byPa[id].pending + byPa[id].done > 0);

    const formatRepackSupervisorSet = (set) =>
      set && set.size > 0
        ? Array.from(set)
            .sort((a, b) => a.localeCompare(b))
            .join(", ")
        : "—";

    return transformedAllPurchaseAcknowledgments
      .filter((ack) => paIds.includes(ack.purchase_acknowledgment_id))
      .map((ack) => ({
        ...ack,
        total_jobs_pending: byPa[ack.purchase_acknowledgment_id]?.pending ?? 0,
        total_jobs_done: byPa[ack.purchase_acknowledgment_id]?.done ?? 0,
        repack_pending_qty: byPaPendingQty[ack.purchase_acknowledgment_id] ?? 0,
        repack_done_today_qty:
          byPaDoneTodayQty[ack.purchase_acknowledgment_id] ?? 0,
        repack_supervisors: formatRepackSupervisorSet(
          byPaRepackSupervisors[ack.purchase_acknowledgment_id]
        ),
      }));
  }, [
    filteredStickering,
    selectedRepackSupervisor,
    transformedAllPurchaseAcknowledgments,
  ]);

  const jobWorksheetDrawerColDefs = useMemo(
    () => [
      {
        headerName: "ID",
        field: "purchase_acknowledgment_id",
        type: "id",
      },
      {
        headerName: "Inv #",
        field: "invoice_no",
      },
      {
        headerName: "Inv date",
        field: "invoice_date",
        type: "date",
      },
      {
        headerName: "Supplier",
        field: "supplier.name",
        valueGetter: (params) => params.data?.supplier?.name ?? "-",
      },
      {
        headerName: "Branch",
        field: "branch_name",
      },
      {
        headerName: "Supv.",
        field: "job_worksheet_supervisors",
        flex: 1,
        minWidth: 140,
        valueGetter: (params) => params.data?.job_worksheet_supervisors ?? "—",
      },
      {
        headerName: "Status",
        field: "status",
        type: "badge-column",
        valueGetter: (params) => {
          const statusCode = params.data.status;
          const statusLabel =
            params.data.status === "pe_created"
              ? "Purchase Entry Done"
              : capitalizeWordsLatest(params.data.status).replaceAll("_", " ");
          return {
            label: statusLabel,
            colorScheme: COLORS_MAP_CHAKRA[statusCode],
          };
        },
      },
      {
        headerName: "Pend.",
        field: "total_jobs_pending",
      },
      {
        headerName: "Done",
        field: "total_jobs_done",
      },
      {
        headerName: "Stuck qty",
        field: "stickers_stuck_today_qty",
        type: "number",
      },
      {
        headerName: "Pend qty",
        field: "pending_qty",
        type: "number",
      },
      {
        headerName: "Total",
        field: "total_jobs",
        valueGetter: (params) => {
          const pending = params.data?.total_jobs_pending || 0;
          const done = params.data?.total_jobs_done || 0;
          return pending + done;
        },
      },
      {
        headerName: "Created",
        field: "created_at",
        type: "date",
      },
      {
        headerName: "Act.",
        field: "actions",
        type: "action-column",
        valueGetter: (params) => [
          {
            label: "View Progress",
            value: "view-progress",
            onClick: () => setSelectedAck(params.data),
          },
        ],
      },
    ],
    [setSelectedAck]
  );

  const repackEntryDrawerColDefs = useMemo(
    () => [
      {
        headerName: "ID",
        field: "purchase_acknowledgment_id",
        type: "id",
      },
      {
        headerName: "Inv #",
        field: "invoice_no",
      },
      {
        headerName: "Inv date",
        field: "invoice_date",
        type: "date",
      },
      {
        headerName: "Supplier",
        field: "supplier.name",
        valueGetter: (params) => params.data?.supplier?.name ?? "-",
      },
      {
        headerName: "Branch",
        field: "branch_name",
      },
      {
        headerName: "Rpk supv.",
        field: "repack_supervisors",
        flex: 1,
        minWidth: 140,
        valueGetter: (params) => params.data?.repack_supervisors ?? "—",
      },
      {
        headerName: "Status",
        field: "status",
        type: "badge-column",
        valueGetter: (params) => {
          const statusCode = params.data.status;
          const statusLabel =
            params.data.status === "pe_created"
              ? "Purchase Entry Done"
              : capitalizeWordsLatest(params.data.status).replaceAll("_", " ");
          return {
            label: statusLabel,
            colorScheme: COLORS_MAP_CHAKRA[statusCode],
          };
        },
      },
      {
        headerName: "Pend.",
        field: "total_jobs_pending",
      },
      {
        headerName: "Done",
        field: "total_jobs_done",
      },
      {
        headerName: "Done qty",
        field: "repack_done_today_qty",
        type: "number",
      },
      {
        headerName: "Pend qty",
        field: "repack_pending_qty",
        type: "number",
      },
      {
        headerName: "Total",
        field: "total_jobs",
        valueGetter: (params) => {
          const pending = params.data?.total_jobs_pending || 0;
          const done = params.data?.total_jobs_done || 0;
          return pending + done;
        },
      },
      {
        headerName: "Created",
        field: "created_at",
        type: "date",
      },
      {
        headerName: "Act.",
        field: "actions",
        type: "action-column",
        valueGetter: (params) => [
          {
            label: "View Progress",
            value: "view-progress",
            onClick: () => setSelectedAck(params.data),
          },
        ],
      },
    ],
    [setSelectedAck]
  );

  // Figma "Job Worksheet" / "Repack Entry" tables: ID · Invoice · Supplier ·
  // Supervisor · Status · Pending · Done · Pending qty.
  const worksheetStatusCol = useMemo(
    () => ({
      headerName: "Status",
      field: "status",
      type: "badge-column",
      valueGetter: (params) => {
        const statusCode = params.data.status;
        const statusLabel =
          statusCode === "pe_created"
            ? "Purchase Entry Done"
            : capitalizeWordsLatest(statusCode).replaceAll("_", " ");
        return {
          label: statusLabel,
          colorScheme: statusCode === "done" ? "green" : "orange",
        };
      },
    }),
    []
  );
  const jobWorksheetFigmaColDefs = useMemo(
    () => [
      { headerName: "ID", field: "purchase_acknowledgment_id", type: "id" },
      { headerName: "Invoice", field: "invoice_no" },
      { headerName: "Supplier", field: "supplier.name", valueGetter: (p) => p.data?.supplier?.name ?? "-" },
      { headerName: "Supervisor", field: "job_worksheet_supervisors", valueGetter: (p) => p.data?.job_worksheet_supervisors ?? "—" },
      worksheetStatusCol,
      { headerName: "Pending", field: "total_jobs_pending" },
      { headerName: "Done", field: "total_jobs_done" },
      { headerName: "Pending qty", field: "pending_qty", type: "number" },
    ],
    [worksheetStatusCol]
  );
  const repackEntryFigmaColDefs = useMemo(
    () => [
      { headerName: "ID", field: "purchase_acknowledgment_id", type: "id" },
      { headerName: "Invoice", field: "invoice_no" },
      { headerName: "Supplier", field: "supplier.name", valueGetter: (p) => p.data?.supplier?.name ?? "-" },
      { headerName: "Supervisor", field: "repack_supervisors", valueGetter: (p) => p.data?.repack_supervisors ?? "—" },
      worksheetStatusCol,
      { headerName: "Pending", field: "total_jobs_pending" },
      { headerName: "Done", field: "total_jobs_done" },
      { headerName: "Pending qty", field: "repack_pending_qty", type: "number" },
    ],
    [worksheetStatusCol]
  );

  // Helper function to transform row data for PDF export based on colDefs
  const transformDataForPDF = (rows, colDefs) => {
    return rows.map((row, index) => {
      const transformedRow = {};
      colDefs.forEach((colDef) => {
        // Skip action columns
        if (colDef.type === "action-column") return;

        const field = colDef.field;
        let value;

        // Use valueGetter if available
        if (colDef.valueGetter) {
          const mockParams = { data: row, value: row[field] };
          value = colDef.valueGetter(mockParams);
        } else {
          // Handle nested fields like supplier.name
          if (field.includes(".")) {
            const parts = field.split(".");
            value = parts.reduce((obj, part) => obj?.[part], row);
          } else {
            value = row[field];
          }
        }

        // Format based on type
        if (colDef.type === "date" && value) {
          value = moment(value).format("DD-MM-YYYY");
        } else if (colDef.type === "badge-column" && value) {
          value = value.label || value;
        } else if (colDef.type === "id" && value) {
          value = value.toString();
        }

        // Use headerName as key, fallback to field
        const headerKey = colDef.headerName || field;
        transformedRow[headerKey] = value ?? "-";
      });
      return { ...transformedRow, sno: index + 1 };
    });
  };

  // Helper function to create headers object from colDefs
  const createHeadersFromColDefs = (colDefs) => {
    const headers = {};
    colDefs.forEach((colDef) => {
      if (colDef.type === "action-column") return;
      const headerName = colDef.headerName || colDef.field;
      headers[headerName] = headerName;
    });
    return { sno: "S.No", ...headers };
  };

  // Export functions for Job Worksheet drawer
  const handleExportJobWorksheetPurchases = async () => {
    try {
      const transformedData = transformDataForPDF(
        jobWorksheetTableRows,
        jobWorksheetDrawerColDefs
      );
      const headers = createHeadersFromColDefs(jobWorksheetDrawerColDefs);

      const fileName = `job-worksheet-purchases-${
        selectedJobSupervisor || "all"
      }-${moment().format("DD-MM-YYYY-HH-mm-ss")}`;

      const response = await generatePDFWithToast({
        data: transformedData,
        headers: headers,
        pdf_name: fileName,
        title: `Job Worksheet - Purchases${
          selectedJobSupervisor ? ` - ${selectedJobSupervisor}` : ""
        }`,
        size: "md",
        orientation: "landscape",
      });

      const pdfUrl =
        response.code === 200 ? response.data.pdf_url : response.pdf_url;
      if (pdfUrl) {
        window.open(pdfUrl, "_blank");
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
    }
  };

  const handleExportJobWorksheetData = async () => {
    try {
      const getStickerTypes = (item) => {
        const stickerTypes = [];
        if (item.sticker_type_1_material) {
          stickerTypes.push(item.sticker_type_1_material.name);
        }
        if (item.sticker_type_2_material) {
          stickerTypes.push(item.sticker_type_2_material.name);
        }

        return stickerTypes.join(", ");
      };

      const jobWorksheetData = filteredStickering
        .filter((item) => {
          if (!selectedJobSupervisor) return true;
          const sup = item.supervisor_name || item.supervisor_id || "Unknown";
          return sup === selectedJobSupervisor;
        })
        .filter((item) => {
          return item.status !== "done";
        })
        .map((item, index) => ({
          sno: index + 1,
          stickering_id: item.stickering_id,
          product_code: item.product_id,
          product_name: item.product_name,
          qty: item.qty,
          employee_code: item.employee_code,
          employee_name: item.employee_name,
          status: item.status,
          purchase_acknowledgment_id: item.purchase_acknowledgment_id,
          invoice_no: item.purchase_acknowledgment_invoice_no,
          created_at: item.created_at,
          sticker_types: getStickerTypes(item),
        }));

      const headers = {
        sno: "S.No",
        stickering_id: "ID",
        product_code: "Product Code",
        product_name: "Product Name",
        qty: "Quantity",
        sticker_types: "Sticker Types",
        employee_code: "Employee Code",
        employee_name: "Employee Name",
        status: "Status",
        invoice_no: "Invoice No",
        created_at: "Created At",
      };

      const fileName = `job-worksheet-data-${
        selectedJobSupervisor || "all"
      }-${moment().format("DD-MM-YYYY-HH-mm-ss")}`;

      const response = await generatePDFWithToast({
        data: jobWorksheetData.map((item) => ({
          ...item,
          created_at: item.created_at
            ? moment(item.created_at).format("DD-MM-YYYY")
            : "-",
        })),
        headers: headers,
        pdf_name: fileName,
        title: `Job Worksheet Data${
          selectedJobSupervisor ? ` - ${selectedJobSupervisor}` : ""
        }`,
        size: "md",
        orientation: "landscape",
      });

      const pdfUrl =
        response.code === 200 ? response.data.pdf_url : response.pdf_url;
      if (pdfUrl) {
        window.open(pdfUrl, "_blank");
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
    }
  };

  // Export functions for Repack drawer
  const handleExportRepackPurchases = async () => {
    try {
      const transformedData = transformDataForPDF(
        repackEntryTableRows,
        repackEntryDrawerColDefs
      );
      const headers = createHeadersFromColDefs(repackEntryDrawerColDefs);

      const fileName = `repack-purchases-${
        selectedRepackSupervisor || "all"
      }-${moment().format("DD-MM-YYYY-HH-mm-ss")}`;

      const response = await generatePDFWithToast({
        data: transformedData,
        headers: headers,
        pdf_name: fileName,
        title: `Repack - Purchases${
          selectedRepackSupervisor ? ` - ${selectedRepackSupervisor}` : ""
        }`,
        size: "md",
        orientation: "landscape",
      });

      const pdfUrl =
        response.code === 200 ? response.data.pdf_url : response.pdf_url;
      if (pdfUrl) {
        window.open(pdfUrl, "_blank");
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
    }
  };

  const handleExportRepackData = async () => {
    try {
      // Get all stickering data for the selected supervisor that are done but need repack
      const repackData = filteredStickering
        .filter((item) => item.status === "done")
        .filter(
          (item) =>
            item.repack_supervisor_id !== null &&
            item.repack_supervisor_id !== undefined &&
            item.repack_supervisor_id !== ""
        )
        .filter((item) => {
          if (!selectedRepackSupervisor) return true;
          const sup =
            item.repack_supervisor_name ||
            item.repack_supervisor_id ||
            "Unknown";
          return sup === selectedRepackSupervisor;
        })
        .filter((item) => {
          const hasRepackDetails =
            item.packing != null ||
            item.loose != null ||
            item.pur_ret != null ||
            item.wastage != null;
          return !hasRepackDetails;
        })
        .map((item, index) => {
          // Format Details field (packing, loose, pur_ret, wastage)
          const detailsItems = [];
          if (item.packing !== null && item.packing !== undefined) {
            detailsItems.push(`Packing: ${item.packing}`);
          }
          if (item.loose !== null && item.loose !== undefined) {
            detailsItems.push(`Loose: ${item.loose}`);
          }
          if (item.pur_ret !== null && item.pur_ret !== undefined) {
            detailsItems.push(`Pur Ret: ${item.pur_ret}`);
          }
          if (item.wastage !== null && item.wastage !== undefined) {
            detailsItems.push(`Wastage: ${item.wastage}`);
          }

          return {
            sno: index + 1,
            stickering_id: item.stickering_id,
            product_id: item.product_id,
            purchase_acknowledgment_invoice_no:
              item.purchase_acknowledgment_invoice_no || "-",
            product_name: item.product_name || "-",
            qty: item.qty || "-",
            details: detailsItems.length > 0 ? detailsItems.join(", ") : "-",
            employee_name: item.employee_name || "-",
            supervisor_name:
              item.repack_supervisor_name ||
              item.repack_supervisor_id ||
              "Unknown",
            status:
              item.status === "done"
                ? "Done"
                : capitalizeWordsLatest(item.status || "open"),
          };
        });

      // Repack entry sheet colDefs headers
      const headers = {
        sno: "S.No",
        stickering_id: "ID",
        product_id: "Product ID",
        purchase_acknowledgment_invoice_no: "Invoice No",
        product_name: "Product Name",
        qty: "Quantity",
        details: "Details",
        employee_name: "Employee Name",
        supervisor_name: "Supervisor Name",
      };

      const fileName = `repack-worksheet-${
        selectedRepackSupervisor || "all"
      }-${moment().format("DD-MM-YYYY-HH-mm-ss")}`;

      // const response = null;
      const response = await generatePDFWithToast({
        data: repackData,
        headers: headers,
        pdf_name: fileName,
        title: `Repack Worksheet${
          selectedRepackSupervisor ? ` - ${selectedRepackSupervisor}` : ""
        }`,
        size: "md",
        orientation: "landscape",
      });

      const pdfUrl =
        response.code === 200 ? response.data.pdf_url : response.pdf_url;
      if (pdfUrl) {
        window.open(pdfUrl, "_blank");
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
    }
  };

  // Figma "WMS Dashboard / Purchases": ID · Supplier · Branch · Invoice date ·
  // Invoice no. · Amount · Status. Clicking a row opens the progress drawer.
  const columnDefs = useMemo(
    () => [
      { headerName: "ID", field: "purchase_acknowledgment_id", type: "id" },
      { headerName: "Supplier", field: "supplier.name" },
      { headerName: "Branch", field: "branch_name" },
      { headerName: "Invoice date", field: "invoice_date", type: "date" },
      { headerName: "Invoice no.", field: "invoice_no" },
      { headerName: "Amount", field: "amount", type: "currency" },
      {
        headerName: "Status",
        field: "status",
        type: "badge-column",
        valueGetter: (params) => {
          const statusCode = params.data.status;
          const statusLabel =
            statusCode === "pe_created"
              ? "Purchase Entry Done"
              : capitalizeWordsLatest(statusCode).replaceAll("_", " ");
          return {
            label: statusLabel,
            colorScheme: statusCode === "done" ? "green" : "orange",
          };
        },
      },
    ],
    []
  );

  const purchaseReturnItemsColDefs = useMemo(
    () => [
      {
        field: "buyer_name",
        headerName: "Buyer",
        flex: 1,
        minWidth: 120,
      },
      {
        field: "product_name",
        headerName: "Product",
        flex: 1,
        minWidth: 160,
      },
      { field: "qty", headerName: "Qty", width: 90 },
      {
        field: "total_amount",
        headerName: "Amount",
        width: 110,
        type: "currency",
      },
      { field: "pr_no", headerName: "PR No", width: 100 },
      { field: "outlet_name", headerName: "Outlet", flex: 1, minWidth: 100 },
      {
        field: "delivered",
        headerName: "Status",
        width: 120,
        type: "badge-column",
        valueGetter: () => ({
          label: "Not Returned",
          colorScheme: "gray",
        }),
      },
    ],
    []
  );

  const purchaseReturnColDefs = useMemo(
    () => [
      // Figma: Buyer · Supplier · Total bills · Total value · Status.
      { headerName: "Buyer", field: "buyer_name", type: "capitalized" },
      { headerName: "Supplier", field: "supplier_name", type: "capitalized" },
      { headerName: "Total bills", field: "total_bills", type: "number" },
      { headerName: "Total value", field: "total_value", type: "currency" },
      {
        headerName: "Status",
        field: "status",
        type: "badge-column",
        valueGetter: () => ({ label: "Not Returned", colorScheme: "red" }),
      },
    ],
    []
  );

  const purchaseReturnSupplierItemsColDefs = useMemo(
    () => [
      {
        field: "product_name",
        headerName: "Product",
        flex: 1,
        minWidth: 160,
      },
      { field: "qty", headerName: "Qty", width: 90 },
      {
        field: "total_amount",
        headerName: "Amount",
        width: 110,
        type: "currency",
      },
      { field: "pr_no", headerName: "PR No", width: 100 },
      { field: "outlet_name", headerName: "Outlet", flex: 1, minWidth: 100 },
      {
        field: "delivered",
        headerName: "Status",
        width: 120,
        type: "badge-column",
        valueGetter: () => ({
          label: "Not Returned",
          colorScheme: "gray",
        }),
      },
    ],
    []
  );

  return (
    <GlobalWrapper permissionKey="view_wms_dashboard">
      <Box minH="100vh">
        <Stack gap="24px">
          <DashboardTitleSection>
            <Flex
              w="100%"
              direction={{ base: "column", md: "row" }}
              align={{ base: "stretch", md: "center" }}
              justify={{ md: "space-between" }}
              gap={3}
              rowGap={3}
            >
              {/* Figma: 22px title, no subtitle, filters on the right. */}
              <DashboardPageTitle title="WMS Dashboard" subtitle="" size="sm" />
              <FiltersBar
                dateRange={dateRange}
                setDateRange={setDateRange}
                selectedBranchId={selectedBranchId}
                setSelectedBranchId={setSelectedBranchId}
                branchOptions={branchOptions}
                branchDisabled={isBranchLocked}
              />
            </Flex>
          </DashboardTitleSection>

          <SummaryChartsRow
            byStatus={byStatus}
            jobSummary={jobSummary}
            repackSummary={repackSummary}
            purchaseReturnSummary={purchaseReturnSummary}
            onStatusClick={(item) => {
              setStatusFilter((prev) =>
                prev === item.code ? null : item.code
              );
              setTableTab("purchases");
              scrollToTablesSection();
            }}
            onResetStatus={() => setStatusFilter(null)}
            onJobBarClick={(entry) => {
              setTableTab("job_worksheet");
              setSelectedJobSupervisor(entry?.name ?? null);
              scrollToTablesSection();
            }}
            onRepackBarClick={(entry) => {
              setTableTab("repack_entry");
              setSelectedRepackSupervisor(entry?.name ?? null);
              scrollToTablesSection();
            }}
            onPurchaseReturnBarClick={(entry) => {
              setTableTab("purchase_return_by_buyers");
              setPurchaseReturnBuyerFilter(entry?.name ?? "");
              scrollToTablesSection();
            }}
          />

          <Box ref={tablesSectionRef} scrollMarginTop="96px">
            <Box>
              <Tabs.Root
                value={tableTab}
                onValueChange={(e) =>
                  setTableTab(
                    typeof e === "string" ? e : e?.value ?? "purchases"
                  )
                }
              >
                {/* Figma: tabs spread evenly in a white strip (r8, #F1E3D9);
                    37px pills, 11/600, active #FFF5ED / #C95C18. */}
                <Tabs.List
                  mb="16px"
                  flexWrap={{ base: "wrap", md: "nowrap" }}
                  gap="8px"
                  p="8px"
                  bg="white"
                  borderWidth="1px"
                  borderColor="app.border"
                  borderRadius="8px"
                  _before={{ display: "none" }}
                >
                  {[
                    ["purchases", "Purchases"],
                    ["purchase_return", "Purchase Return"],
                    ["purchase_return_by_buyers", "Purchase Return by Buyers"],
                    ["job_worksheet", "Job Worksheet"],
                    ["repack_entry", "Repack Entry"],
                  ].map(([v, label]) => (
                    <Tabs.Trigger
                      key={v}
                      value={v}
                      flex={{ md: "1" }}
                      justifyContent="center"
                      h="37px"
                      px="16px"
                      borderRadius="8px"
                      fontSize="11px"
                      fontWeight="600"
                      color="fg.muted"
                      _selected={{ bg: "#FFF5ED", color: "#C95C18" }}
                      _before={{ display: "none" }}
                    >
                      {label}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>

                <Tabs.Content value="purchases">
                  <PurchasesTabContent
                    rowData={filteredPurchaseAcknowledgments}
                    columnDefs={columnDefs}
                    onRowClick={setSelectedAck}
                  />
                </Tabs.Content>

                <Tabs.Content value="purchase_return">
                  <PurchaseReturnTabContent
                    purchaseReturnBuyerFilter={purchaseReturnBuyerFilter}
                    purchaseReturnBuyerOptions={purchaseReturnBuyerOptions}
                    setPurchaseReturnBuyerFilter={setPurchaseReturnBuyerFilter}
                    filteredPurchaseReturnSupplierRows={
                      filteredPurchaseReturnSupplierRows
                    }
                    purchaseReturnColDefs={purchaseReturnColDefs}
                    onRowClick={setSelectedPurchaseReturnSupplier}
                  />
                </Tabs.Content>

                <Tabs.Content value="purchase_return_by_buyers">
                  <PurchaseReturnByBuyersTabContent
                    purchaseReturnBuyerFilter={purchaseReturnBuyerFilter}
                    purchaseReturnBuyerOptions={purchaseReturnBuyerOptions}
                    setPurchaseReturnBuyerFilter={setPurchaseReturnBuyerFilter}
                    filteredPurchaseReturnByBuyer={
                      filteredPurchaseReturnByBuyer
                    }
                    purchaseReturnSupplierItemsColDefs={
                      purchaseReturnSupplierItemsColDefs
                    }
                  />
                </Tabs.Content>

                <Tabs.Content value="job_worksheet">
                  <WorksheetTableCard
                    title="Job Worksheet"
                    isActive={tableTab === "job_worksheet"}
                    rows={jobWorksheetTableRows}
                    columnDefs={jobWorksheetFigmaColDefs}
                    tableKey="job-worksheet-details"
                    statusFilterModel={{
                      filterType: "badge",
                      values: [purchaseAckStatusBadgeLabel("job_entry_in_progress")],
                    }}
                    supervisor={selectedJobSupervisor}
                    onClearSupervisor={() => setSelectedJobSupervisor(null)}
                    onRowClick={setSelectedAck}
                  />
                </Tabs.Content>

                <Tabs.Content value="repack_entry">
                  <WorksheetTableCard
                    title="Repack Entry"
                    isActive={tableTab === "repack_entry"}
                    rows={repackEntryTableRows}
                    columnDefs={repackEntryFigmaColDefs}
                    tableKey="repack-entry-details"
                    statusFilterModel={{
                      filterType: "badge",
                      values: [purchaseAckStatusBadgeLabel("repack_entry_in_progress")],
                    }}
                    supervisor={selectedRepackSupervisor}
                    onClearSupervisor={() => setSelectedRepackSupervisor(null)}
                    onRowClick={setSelectedAck}
                  />
                </Tabs.Content>
              </Tabs.Root>
            </Box>
          </Box>
        </Stack>

        <CustomDrawer
          title={
            selectedAck
              ? `Purchase Ack #${selectedAck.purchase_acknowledgment_id} - Progress`
              : "Purchase Ack Progress"
          }
          isOpen={!!selectedAck}
          setIsOpen={(open) => {
            if (!open) setSelectedAck(null);
          }}
          content={
            selectedAck ? <StatusTimelineContent ack={selectedAck} /> : null
          }
          footer={null}
          size="sm"
        >
          <Box display="none" />
        </CustomDrawer>

        <CustomDrawer
          title={
            selectedPurchaseReturnSupplier
              ? `Purchase Return - ${selectedPurchaseReturnSupplier.supplier_name}`
              : "Purchase Return"
          }
          isOpen={!!selectedPurchaseReturnSupplier}
          setIsOpen={(open) => {
            if (!open) setSelectedPurchaseReturnSupplier(null);
          }}
          content={
            selectedPurchaseReturnSupplier ? (
              <CustomContainer title="Pending Items" fullWidth>
                {(selectedPurchaseReturnSupplier.items || []).length === 0 ? (
                  <Flex minH="180px" align="center" justify="center">
                    <Text color="gray.500">No pending items.</Text>
                  </Flex>
                ) : (
                  <AgGrid
                    rowData={selectedPurchaseReturnSupplier.items || []}
                    columnDefs={purchaseReturnItemsColDefs}
                    tableKey="purchase-return-supplier-items"
                    defaultRows={10}
                  />
                )}
              </CustomContainer>
            ) : null
          }
          size="full"
        >
          <Box display="none" />
        </CustomDrawer>
      </Box>
    </GlobalWrapper>
  );
}

export default Dashboard;
