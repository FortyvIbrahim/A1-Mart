"use client";

import useBranches from "@/api/customHooks/useBranches";
import useEmployee from "@/api/customHooks/useEmployee";
import {
  getChecklistFormsWithSubmissionAnswers,
  getChecklistFormsWithSubmissionStats,
} from "@/api/helpers/checklist_forms";
import AgGrid from "@/components/AgGrid";
import ChecklistDashboardChartsGrid from "@/components/Checklist/ChecklistDashboardChartsGrid";
import ChecklistPendingQuestionsModal from "@/components/Checklist/ChecklistPendingQuestionsModal";
import {
  DashboardCard,
  DashboardFilterPanel,
} from "@/components/dashboard/DashboardUI";
import GlobalWrapper from "@/components/GlobalWrapper";
import DashboardPageTitle, {
  DashboardTitleSection,
} from "@/components/dashboard/DashboardPageTitle";
import CustomInput, { CustomDateTimeInput } from "@/components/CustomInput";
import usePermission from "@/customHooks/usePermission";
import { useUser } from "@/contexts/UserContext";
import { DASHBOARD_ROUTES } from "@/constants/routes/index";
import { buildChecklistDashboardFormsColumnDefs } from "@/utils/checklistResponseTableColDefs";
import {
  aggregateAnsweredAndPendingAcrossRange,
  aggregateBranchStackedSlotsForFormRange,
  aggregateContributorsStackedAnswerCounts,
  eachDayInclusiveYmd,
} from "@/utils/checklistDashboardMetrics";
import {
  normalizeChecklistBranchCatalog,
  syntheticBranchStatNoSubmission,
} from "@/utils/checklistBranchCatalog";
import {
  filterPendingSectionsByBranchIds,
  loadChecklistPendingDetailRows,
} from "@/utils/checklistPendingDetail";
import {
  formCreatedOnOrBeforeDate,
  isCalendarFutureDate,
  submissionStatsEntriesForFormDate,
  submissionStatsKeyForYmd,
} from "@/utils/checklistSubmissionStatsCalendar";
import { Box, Button, Flex, NativeSelect, Text } from "@chakra-ui/react";
import { LuChevronDown } from "react-icons/lu";
import moment from "moment";
import { useRouter } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";

const PIE_COLORS = {
  "On time": "#11976A",
  Late: "#E7474D",
  Pending: "#E3B63E",
};

/** Figma page-heading filter label (10/500, 7px above a 40px control). */
function HeadLabel({ children }) {
  return (
    <Text fontSize="10px" lineHeight="12px" fontWeight="500" color="fg.muted" mb="7px">
      {children}
    </Text>
  );
}

function toYmd(d) {
  return moment(d).format("YYYY-MM-DD");
}

export default function ChecklistDashboardPage() {
  const router = useRouter();
  const gridRef = useRef(null);

  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(() => ({
    startDate: new Date(),
    endDate: new Date(),
  }));
  const [selectedBarFormId, setSelectedBarFormId] = useState(null);
  const [contributorAnswersForBar, setContributorAnswersForBar] = useState([]);
  const [barLoading, setBarLoading] = useState(false);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingModalLoading, setPendingModalLoading] = useState(false);
  const [pendingModalSections, setPendingModalSections] = useState([]);
  const [branchFilterIds, setBranchFilterIds] = useState([]);
  const [formSearch, setFormSearch] = useState("");
  const [formSort, setFormSort] = useState("progress");

  const { employees } = useEmployee({ allBranches: true });
  const { branches: branchesApi } = useBranches();
  const { employeeData } = useUser();
  const canAccessAllBranches = usePermission("access_all_branches");

  const branchCatalog = useMemo(
    () => normalizeChecklistBranchCatalog(branchesApi),
    [branchesApi]
  );

  const branchOptions = useMemo(
    () =>
      (branchesApi ?? []).map((b) => ({
        value: b.branch_id,
        label: b.branch_name,
      })),
    [branchesApi]
  );

  /** `null` = all branches; non-empty array = restrict to those ids. */
  const effectiveDashboardBranchIds = useMemo(() => {
    if (canAccessAllBranches) {
      if (!branchFilterIds?.length) return null;
      return branchFilterIds;
    }
    const bid = employeeData?.branch_id;
    return bid != null ? [bid] : null;
  }, [canAccessAllBranches, branchFilterIds, employeeData?.branch_id]);

  const employeesByCode = useMemo(() => {
    const m = new Map();
    for (const e of employees ?? []) {
      const c = e?.employee_code != null ? String(e.employee_code).trim() : "";
      if (c) m.set(c, e);
    }
    return m;
  }, [employees]);

  const fromYmd = useMemo(
    () => (dateRange.startDate ? toYmd(dateRange.startDate) : null),
    [dateRange.startDate]
  );
  const toYmdStr = useMemo(
    () => (dateRange.endDate ? toYmd(dateRange.endDate) : null),
    [dateRange.endDate]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getChecklistFormsWithSubmissionStats();
      if (res.code !== 200) {
        toast.error(res.message || "Failed to load checklist forms");
        setRowData([]);
        return;
      }
      const rows = (res.data ?? []).map((f) => ({
        ...f,
        submissions: f.submissions ?? {},
      }));
      setRowData(rows);
    } catch {
      toast.error("Failed to load checklist forms");
      setRowData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { onTimeAnsweredTotal, lateAnsweredTotal, pendingTotal } = useMemo(
    () =>
      fromYmd && toYmdStr
        ? aggregateAnsweredAndPendingAcrossRange(rowData, fromYmd, toYmdStr, {
            branchCatalog,
            branchIdsFilter: effectiveDashboardBranchIds,
          })
        : {
            onTimeAnsweredTotal: 0,
            lateAnsweredTotal: 0,
            pendingTotal: 0,
          },
    [rowData, fromYmd, toYmdStr, branchCatalog, effectiveDashboardBranchIds]
  );

  const pieData = useMemo(() => {
    const rows = [];
    if (onTimeAnsweredTotal > 0) {
      rows.push({
        name: "On time",
        value: onTimeAnsweredTotal,
        color: PIE_COLORS["On time"],
      });
    }
    if (lateAnsweredTotal > 0) {
      rows.push({
        name: "Late",
        value: lateAnsweredTotal,
        color: PIE_COLORS.Late,
      });
    }
    if (pendingTotal > 0) {
      rows.push({
        name: "Pending",
        value: pendingTotal,
        color: PIE_COLORS.Pending,
      });
    }
    return rows;
  }, [onTimeAnsweredTotal, lateAnsweredTotal, pendingTotal]);

  const formsTableRows = useMemo(() => {
    if (!fromYmd || !toYmdStr) return [];
    const branchIdAllow =
      effectiveDashboardBranchIds != null &&
      effectiveDashboardBranchIds.length > 0
        ? new Set(effectiveDashboardBranchIds.map((id) => String(id)))
        : null;
    const out = [];
    for (const ymd of eachDayInclusiveYmd(fromYmd, toYmdStr)) {
      if (isCalendarFutureDate(ymd)) continue;
      const statsKey = submissionStatsKeyForYmd(ymd);
      const dayForms = rowData.filter((f) => formCreatedOnOrBeforeDate(f, ymd));
      dayForms.sort((a, b) =>
        String(a.title ?? "").localeCompare(String(b.title ?? ""))
      );
      for (const form of dayForms) {
        if (!statsKey) {
          out.push({
            ...form,
            _responseYmd: ymd,
            _branchStat: null,
            dashboardRowKey: `${form.id}-${ymd}-na`,
          });
          continue;
        }
        const entries = submissionStatsEntriesForFormDate(form, ymd);
        const entriesByBranch = new Map();
        for (const e of entries) {
          const id = e?.branch_id != null ? Number(e.branch_id) : NaN;
          if (!Number.isNaN(id)) entriesByBranch.set(id, e);
        }

        if (branchCatalog.length > 0) {
          for (const br of branchCatalog) {
            if (branchIdAllow && !branchIdAllow.has(String(br.id))) continue;
            const stat = entriesByBranch.get(br.id);
            out.push({
              ...form,
              _responseYmd: ymd,
              _branchStat: stat ?? syntheticBranchStatNoSubmission(br),
              dashboardRowKey: `${form.id}-${ymd}-${br.id}`,
            });
          }
        } else if (entries.length === 0) {
          if (branchIdAllow) continue;
          out.push({
            ...form,
            _responseYmd: ymd,
            _branchStat: null,
            dashboardRowKey: `${form.id}-${ymd}-none`,
          });
        } else {
          for (const stat of entries) {
            const bid =
              stat.branch_id != null && stat.branch_id !== ""
                ? String(stat.branch_id)
                : "x";
            if (branchIdAllow && !branchIdAllow.has(bid)) continue;
            out.push({
              ...form,
              _responseYmd: ymd,
              _branchStat: stat,
              dashboardRowKey: `${form.id}-${ymd}-${bid}`,
            });
          }
        }
      }
    }
    return out;
  }, [rowData, fromYmd, toYmdStr, branchCatalog, effectiveDashboardBranchIds]);

  const formsTableTitleSuffix = useMemo(() => {
    if (!fromYmd || !toYmdStr) return "-";
    const a = moment(fromYmd, "YYYY-MM-DD", true);
    const b = moment(toYmdStr, "YYYY-MM-DD", true);
    if (!a.isValid() || !b.isValid()) return "-";
    if (a.isSame(b, "day")) return a.format("DD MMMM YYYY");
    return `${a.format("DD MMMM YYYY")} - ${b.format("DD MMMM YYYY")}`;
  }, [fromYmd, toYmdStr]);

  const colDefs = useMemo(
    () => buildChecklistDashboardFormsColumnDefs(router),
    [router]
  );

  const openPendingDetailModal = useCallback(async () => {
    if (!fromYmd || !toYmdStr || pendingTotal <= 0) return;
    setPendingModalOpen(true);
    setPendingModalLoading(true);
    setPendingModalSections([]);
    try {
      const result = await loadChecklistPendingDetailRows(
        rowData,
        fromYmd,
        toYmdStr,
        branchCatalog
      );
      if (!result.ok) {
        toast.error(result.message || "Could not load pending detail");
        setPendingModalSections([]);
      } else {
        setPendingModalSections(result.sections ?? []);
      }
    } catch {
      toast.error("Could not load pending detail");
      setPendingModalSections([]);
    } finally {
      setPendingModalLoading(false);
    }
  }, [rowData, fromYmd, toYmdStr, pendingTotal, branchCatalog]);

  const filteredPendingModalSections = useMemo(
    () =>
      filterPendingSectionsByBranchIds(
        pendingModalSections,
        effectiveDashboardBranchIds
      ),
    [pendingModalSections, effectiveDashboardBranchIds]
  );

  const formsForBarSelect = useMemo(() => {
    if (!toYmdStr || isCalendarFutureDate(toYmdStr)) return [];
    return rowData
      .filter((f) => formCreatedOnOrBeforeDate(f, toYmdStr))
      .slice()
      .sort((a, b) =>
        String(a.title ?? "").localeCompare(String(b.title ?? ""))
      );
  }, [rowData, toYmdStr]);

  useEffect(() => {
    setSelectedBarFormId((prev) => {
      const ids = formsForBarSelect.map((f) => Number(f.id));
      if (ids.length === 0) return null;
      if (prev != null && ids.includes(prev)) return prev;
      return ids[0];
    });
  }, [formsForBarSelect]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (
        selectedBarFormId == null ||
        Number.isNaN(selectedBarFormId) ||
        !fromYmd ||
        !toYmdStr ||
        isCalendarFutureDate(toYmdStr)
      ) {
        setContributorAnswersForBar([]);
        setBarLoading(false);
        return;
      }
      const form = rowData.find((f) => Number(f.id) === selectedBarFormId);
      if (!form || !formCreatedOnOrBeforeDate(form, toYmdStr)) {
        setContributorAnswersForBar([]);
        setBarLoading(false);
        return;
      }
      setBarLoading(true);
      try {
        const res = await getChecklistFormsWithSubmissionAnswers();
        if (cancelled) return;
        if (res.code !== 200) {
          toast.error(res.message || "Failed to load contributor answers");
          setContributorAnswersForBar([]);
          return;
        }
        const match = (res.data ?? []).find(
          (f) => Number(f.id) === selectedBarFormId
        );
        const todayStart = moment().startOf("day");
        const unionAnswers = [];
        for (const ymd of eachDayInclusiveYmd(fromYmd, toYmdStr)) {
          if (moment(ymd, "YYYY-MM-DD", true).isAfter(todayStart, "day")) {
            continue;
          }
          if (!formCreatedOnOrBeforeDate(form, ymd)) continue;
          const key = submissionStatsKeyForYmd(ymd);
          if (!key) continue;
          const rawSub = match?.submissions?.[key];
          const subsForDay =
            rawSub == null ? [] : Array.isArray(rawSub) ? rawSub : [rawSub];
          for (const sub of subsForDay) {
            const dayAnswers = sub?.answers ?? [];
            for (const row of dayAnswers) {
              unionAnswers.push({ ...row, _answerYmd: ymd });
            }
          }
        }
        if (!cancelled) {
          setContributorAnswersForBar(unionAnswers);
        }
      } catch {
        if (!cancelled) {
          toast.error("Failed to load contributor answers");
          setContributorAnswersForBar([]);
        }
      } finally {
        if (!cancelled) setBarLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedBarFormId, fromYmd, toYmdStr, rowData]);

  const contributorBarRows = useMemo(
    () =>
      aggregateContributorsStackedAnswerCounts(contributorAnswersForBar, {
        employeeByCode: employeesByCode,
      }),
    [contributorAnswersForBar, employeesByCode]
  );

  const selectedFormForBars = useMemo(
    () => rowData.find((f) => Number(f.id) === selectedBarFormId) ?? null,
    [rowData, selectedBarFormId]
  );

  const branchBarRows = useMemo(() => {
    if (!selectedFormForBars || !fromYmd || !toYmdStr) return [];
    return aggregateBranchStackedSlotsForFormRange(
      selectedFormForBars,
      fromYmd,
      toYmdStr,
      { branchIdsFilter: effectiveDashboardBranchIds }
    );
  }, [selectedFormForBars, fromYmd, toYmdStr, effectiveDashboardBranchIds]);

  const branchLegendItems = useMemo(() => {
    let onTime = 0;
    let late = 0;
    let pending = 0;
    for (const r of branchBarRows) {
      onTime += r.onTime ?? 0;
      late += r.late ?? 0;
      pending += r.pending ?? 0;
    }
    return [
      { name: "On time", value: onTime, fill: PIE_COLORS["On time"] },
      { name: "Late", value: late, fill: PIE_COLORS.Late },
      { name: "Pending", value: pending, fill: PIE_COLORS.Pending },
    ];
  }, [branchBarRows]);

  const branchGraphHeight = useMemo(() => {
    const n = branchBarRows.length;
    if (n <= 0) return undefined;
    return Math.min(560, Math.max(220, 36 + n * 52));
  }, [branchBarRows.length]);

  const contributorLegendItems = useMemo(() => {
    let onTime = 0;
    let late = 0;
    for (const r of contributorBarRows) {
      onTime += r.onTime ?? 0;
      late += r.late ?? 0;
    }
    return [
      { name: "On time", value: onTime, fill: PIE_COLORS["On time"] },
      { name: "Late", value: late, fill: PIE_COLORS.Late },
    ];
  }, [contributorBarRows]);

  const contributorGraphHeight = useMemo(() => {
    const n = contributorBarRows.length;
    if (n <= 0) return undefined;
    return Math.min(560, Math.max(220, 36 + n * 52));
  }, [contributorBarRows.length]);

  const visibleFormRows = useMemo(() => {
    const q = formSearch.trim().toLowerCase();
    const pct = (r) => {
      const st = r._branchStat;
      if (!st || st._noSubmission) return 0;
      const total = st.total_questions ?? r.questions_count ?? 0;
      return total > 0 ? (st.answered ?? 0) / total : 0;
    };
    const rows = formsTableRows.filter(
      (r) => !q || `${r.id ?? ""} ${r.title ?? ""}`.toLowerCase().includes(q)
    );
    if (formSort === "title") {
      return [...rows].sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? "")));
    }
    if (formSort === "date") {
      return [...rows].sort((a, b) => String(b._responseYmd ?? "").localeCompare(String(a._responseYmd ?? "")));
    }
    return [...rows].sort((a, b) => pct(a) - pct(b));
  }, [formsTableRows, formSearch, formSort]);

  const formSelectControl =
    formsForBarSelect.length > 0 ? (
      <NativeSelect.Root width="100%">
        <NativeSelect.Field
          h="40px"
          ps="12px"
          pe="34px"
          fontSize="12px"
          borderRadius="8px"
          borderColor="border"
          bg="white"
          color={selectedBarFormId != null ? "fg" : "fg.muted"}
          value={selectedBarFormId != null ? String(selectedBarFormId) : ""}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedBarFormId(v ? Number(v) : null);
          }}
          aria-label="Checklist form"
        >
          {formsForBarSelect.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title ?? `Form ${f.id}`}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator right="12px" color="#C95C18">
          <LuChevronDown size={14} />
        </NativeSelect.Indicator>
      </NativeSelect.Root>
    ) : null;

  return (
    <GlobalWrapper permissionKey={DASHBOARD_ROUTES.checklist.permissionKey}>
      <Flex
        flexDirection="column"
        gap="24px"
        w="100%"
        maxW="100%"
        overflow="hidden"
      >
        <DashboardTitleSection pb={0}>
          <Flex
            w="100%"
            justify="space-between"
            gap={3}
            flexWrap={{ base: "wrap", lg: "nowrap" }}
            rowGap={2}
            alignItems="flex-end"
          >
            <DashboardPageTitle title="Checklist Dashboard" />
            <Flex
              gap="10px"
              alignItems="flex-end"
              flexWrap="wrap"
              justifyContent={{ base: "flex-start", lg: "flex-end" }}
              flexShrink={{ lg: 1 }}
              minW={0}
              ml={{ base: 0, lg: "auto" }}
              w={{ base: "100%", lg: "auto" }}
            >
              {/* CustomDateTimeInput uses flex={1} on Input — constrain width so it cannot span the page */}
              <Box flex="0 0 auto" w="158px" maxW="calc(50% - 8px)">
                <HeadLabel>From</HeadLabel>
                <DatePicker
                  selected={dateRange.startDate}
                  onChange={(date) =>
                    setDateRange((prev) => ({ ...prev, startDate: date }))
                  }
                  selectsStart
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  customInput={
                    <CustomDateTimeInput
                      format="DD/MM/YYYY"
                      placeholder="From Date"
                    />
                  }
                  dateFormat="dd/MM/yyyy"
                  portalId="root-portal"
                />
              </Box>
              <Box flex="0 0 auto" w="158px" maxW="calc(50% - 8px)">
                <HeadLabel>To</HeadLabel>
                <DatePicker
                  selected={dateRange.endDate}
                  onChange={(date) =>
                    setDateRange((prev) => ({ ...prev, endDate: date }))
                  }
                  selectsEnd
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  minDate={dateRange.startDate}
                  customInput={
                    <CustomDateTimeInput
                      format="DD/MM/YYYY"
                      placeholder="To Date"
                    />
                  }
                  dateFormat="dd/MM/yyyy"
                  portalId="root-portal"
                />
              </Box>
              {canAccessAllBranches ? (
                <Box
                  flex="0 1 auto"
                  w={{ base: "min(100%, 280px)", lg: "190px" }}
                  minW="180px"
                  maxW="320px"
                >
                  <HeadLabel>Branch</HeadLabel>
                  <CustomInput
                    label=" "
                    labelStyle={{ display: "none" }}
                    h="40px"
                    name="checklist_dashboard_branch_ids"
                    method="multiple-dropdown"
                    placeholder="All branches"
                    options={branchOptions}
                    value={branchFilterIds}
                    onChange={(ids) => setBranchFilterIds(ids ?? [])}
                  />
                </Box>
              ) : null}
              <Button
                h="40px"
                px="16px"
                fontSize="12px"
                bg="#FFF5ED"
                color="#C95C18"
                _hover={{ bg: "#FDE9DA" }}
                flexShrink={0}
                onClick={() => {
                  const t = new Date();
                  setDateRange({ startDate: t, endDate: t });
                }}
              >
                Reset
              </Button>
            </Flex>
          </Flex>
        </DashboardTitleSection>

        <DashboardFilterPanel
          columns={2}
          fields={[
            {
              key: "search",
              type: "search",
              label: "Search",
              placeholder: "Search checklist id or title…",
              value: formSearch,
              onChange: setFormSearch,
            },
            {
              key: "sort",
              label: "Sort by",
              placeholder: false,
              value: formSort,
              onChange: setFormSort,
              options: [
                { value: "progress", label: "Progress" },
                { value: "date", label: "Date" },
                { value: "title", label: "Title" },
              ],
            },
          ]}
        />

        <ChecklistDashboardChartsGrid
          loading={loading}
          barLoading={barLoading}
          fromYmd={fromYmd}
          toYmdStr={toYmdStr}
          pieData={pieData}
          pendingTotal={pendingTotal}
          onPendingPieClick={openPendingDetailModal}
          formsForBarSelect={formsForBarSelect}
          contributorBarRows={contributorBarRows}
          contributorLegendItems={contributorLegendItems}
          contributorGraphHeight={contributorGraphHeight}
          branchBarRows={branchBarRows}
          branchLegendItems={branchLegendItems}
          branchGraphHeight={branchGraphHeight}
          formSelectControl={formSelectControl}
        />

        <DashboardCard
          title={`Forms — ${formsTableTitleSuffix}`}
          subtitle="Use search, filters and sorting to narrow records."
        >
          <AgGrid
            bare
            ref={gridRef}
            rowData={loading ? [] : visibleFormRows}
            columnDefs={colDefs}
            tableKey={`checklist-dashboard-forms-${fromYmd ?? "x"}-${
              toYmdStr ?? "x"
            }`}
            gridOptions={{
              getRowId: (p) =>
                p.data?.dashboardRowKey != null
                  ? String(p.data.dashboardRowKey)
                  : String(p.data?.id ?? ""),
            }}
          />
        </DashboardCard>

        <ChecklistPendingQuestionsModal
          open={pendingModalOpen}
          onOpenChange={(e) => {
            if (!e.open) setPendingModalOpen(false);
          }}
          loading={pendingModalLoading}
          sections={filteredPendingModalSections}
          fromYmd={fromYmd}
          toYmdStr={toYmdStr}
        />
      </Flex>
    </GlobalWrapper>
  );
}
