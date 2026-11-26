"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import DatePicker from "react-datepicker";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import { CustomDateTimeInput } from "@/components/CustomInput";
import AgGrid from "@/components/AgGrid";
import useAttendance from "@/api/customHooks/useAttendance";
import useEmployee from "@/api/customHooks/useEmployee";
import useEmployeeAllocations from "@/api/customHooks/useEmployeeAllocations";
import useBranches from "@/api/customHooks/useBranches";
import BranchFilter from "@/components/BranchFilter";
import {
  Box,
  Flex,
  Text,
  Spinner,
  Grid,
  GridItem,
  Tabs,
  Button,
  IconButton,
  Checkbox,
} from "@chakra-ui/react";
import DashboardBarChart from "@/components/dashboard/DashboardBarChart";
import AttendanceHistoryDrawer from "@/components/dashboard/attendance/AttendanceHistoryDrawer";
import useLatestApiCallTime from "@/api/customHooks/useLatestApiCallTime";
import usePermission from "@/customHooks/usePermission";
import DashboardChartLegend from "@/components/dashboard/DashboardChartLegend";
import DashboardPageTitle, {
  DashboardTitleSection,
} from "@/components/dashboard/DashboardPageTitle";
import DesignationEmployeesModal from "@/components/dashboard/attendance/DesignationEmployeesModal";
import { Tooltip } from "@/components/ui/tooltip";
import { employeeColDefs } from "@/colDefs/employee";
import {
  buildRestDayPieChartData,
  REST_DAY_BADGE_COLOR_BY_NAME,
  getRestDayBadgeValue,
  REST_DAY_PIE_FULL_LABEL,
  REST_DAY_PIE_SHORT_LABEL,
} from "@/utils/restDayBadges";
import RestDayDistributionPie from "@/components/dashboard/attendance/RestDayDistributionPie";

function formatDuration(ms) {
  if (ms == null || ms < 0 || !Number.isFinite(ms)) return "-";
  const totalMins = Math.round(ms / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/**
 * Group records by date then by employee. First punch = IN, second = OUT, etc.
 */
function buildAttendanceByDate(records) {
  const byDate = {};
  records.forEach((r) => {
    const dt = r.clock_date_time ? moment(r.clock_date_time) : null;
    if (!dt || !dt.isValid()) return;
    const dateStr = dt.format("YYYY-MM-DD");
    if (!byDate[dateStr]) byDate[dateStr] = {};
    const empCode = r.employee_code || "?";
    if (!byDate[dateStr][empCode]) {
      byDate[dateStr][empCode] = {
        employee: r.employee,
        employee_code: empCode,
        punches: [],
        sessions: [],
        breaks: [],
        totalClockedInMs: 0,
      };
    }
    byDate[dateStr][empCode].punches.push({
      clock_date_time: r.clock_date_time,
      moment: dt,
    });
  });

  Object.keys(byDate).forEach((dateStr) => {
    Object.keys(byDate[dateStr]).forEach((empCode) => {
      const row = byDate[dateStr][empCode];
      row.punches.sort((a, b) => a.moment.valueOf() - b.moment.valueOf());
      const punches = row.punches;
      for (let i = 0; i < punches.length; i += 2) {
        const inPunch = punches[i];
        const outPunch = punches[i + 1];
        if (outPunch) {
          const durationMs =
            outPunch.moment.valueOf() - inPunch.moment.valueOf();
          row.sessions.push({
            in: inPunch.moment,
            out: outPunch.moment,
            durationMs,
          });
          row.totalClockedInMs += durationMs;
          if (i + 2 < punches.length) {
            row.breaks.push({
              durationMs:
                punches[i + 2].moment.valueOf() - outPunch.moment.valueOf(),
            });
          }
        } else {
          row.sessions.push({
            in: inPunch.moment,
            out: null,
            durationMs: null,
          });
        }
      }
    });
  });
  return byDate;
}

function SessionsCellRenderer(props) {
  const list = props.data?.sessionsList;
  if (!list || list.length === 0) {
    return (
      <Text as="span" fontSize="xs" color="gray.500">
        {props.data?.status === "Absent" ? "—" : "—"}
      </Text>
    );
  }
  return (
    <Flex flexDirection="column" gap={0.5} py={0.5} fontSize="xs">
      {list.map((item, idx) => (
        <Flex key={idx} direction="column" gap={0.25}>
          <Flex align="center" gap={1.5} flexWrap="wrap">
            <Box as="span" color="green.600" title="Clock in">
              <i className="fa fa-sign-in-alt" style={{ marginRight: "4px" }} />
            </Box>
            <Text as="span" color="gray.700" fontWeight="medium">
              {item.inStr}
            </Text>
            <Box as="span" color="gray.400">
              <i className="fa fa-arrow-right" style={{ fontSize: "10px" }} />
            </Box>
            {item.isOpen ? (
              <Text as="span" color="orange.600" fontWeight="semibold">
                Till now
              </Text>
            ) : (
              <>
                <Box as="span" color="red.500" title="Clock out">
                  <i
                    className="fa fa-sign-out-alt"
                    style={{ marginRight: "4px" }}
                  />
                </Box>
                <Text as="span" color="gray.700">
                  {item.outStr}
                </Text>
              </>
            )}
            <Text as="span" color="green.600" fontWeight="semibold">
              ({item.durationStr})
            </Text>
          </Flex>
          {item.breakAfterStr && (
            <Flex
              align="center"
              gap={1}
              flexWrap="wrap"
              lineHeight="1"
              color="secondary.500"
              marginBlock="4px"
            >
              <Box as="span" title="Break">
                <i className="fa fa-pause" style={{ marginRight: "4px" }} />
              </Box>
              <Text as="span">Break {item.breakAfterStr}</Text>
            </Flex>
          )}
        </Flex>
      ))}
    </Flex>
  );
}

function AttendanceDashboard() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [detailsTab, setDetailsTab] = useState("list");
  const [detailsFilters, setDetailsFilters] = useState({
    status: null, // "Present" | "Rest Day - P" | "Absent" | "Rest Day" | null
    designation: null, // string | null
    restDay: null, // 1–7 (Sun–Sat) | "unset" | null
    timeliness: null, // "late" | "early" | null
  });
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState(null);
  const [selectedDesignationModalContext, setSelectedDesignationModalContext] =
    useState(null);
  const [hoveredRestDayDesignation, setHoveredRestDayDesignation] =
    useState(null);
  const [showAllocationFilled, setShowAllocationFilled] = useState(false);

  const dateStr = moment(selectedDate).format("YYYY-MM-DD");
  const fromDate = moment(selectedDate).startOf("month").format("YYYY-MM-DD");
  const toDate = moment(selectedDate).endOf("month").format("YYYY-MM-DD");

  // (Kept for backward compatibility with older computations in this file)
  const monthStart = useMemo(() => moment(fromDate, "YYYY-MM-DD"), [fromDate]);
  const monthEnd = useMemo(() => moment(toDate, "YYYY-MM-DD"), [toDate]);

  const {
    records,
    processedAttendanceByEmployeeCode,
    loading: loadingAttendance,
    sync: syncAttendance,
    isSyncing,
  } = useAttendance({
    fromDate,
    toDate,
  });
  const { employees: activeEmployees, loading: loadingEmployees } = useEmployee(
    {
      filterInactive: true,
      allBranches: true,
    }
  );
  const { allocations, loading: loadingAllocations } = useEmployeeAllocations();
  const { branches } = useBranches();

  const canSyncAttendance = usePermission("sync_attendance");
  const allowAddEmployees = usePermission("add_employees");
  const allowMFAToggle = usePermission("allow_mfa_toggle");

  const {
    latestCall: latestAttendanceSync,
    loading: loadingAttendanceSync,
    refetch: refetchLatestAttendanceSync,
  } = useLatestApiCallTime({
    api_type: "DIGISME",
    secondary_type: "ATTENDANCE",
  });

  const byDate = useMemo(() => buildAttendanceByDate(records), [records]);

  const empCodeToDesignation = useMemo(() => {
    const map = {};
    (activeEmployees || []).forEach((e) => {
      const name = e.designation_name ?? e.designation?.designation_name ?? "";
      map[e.employee_code] = name || "—";
    });
    return map;
  }, [activeEmployees]);

  const empCodeToBranch = useMemo(() => {
    const map = {};
    (activeEmployees || []).forEach((e) => {
      const id = e.branch_id ?? e.branch?.branch_id;
      const name = e.branch_name ?? e.branch?.branch_name ?? "";
      map[e.employee_code] = { branch_id: id, branch_name: name || "—" };
    });
    return map;
  }, [activeEmployees]);

  /** Active employees in the same branch scope as the attendance grid. */
  const employeesForAttendanceScope = useMemo(() => {
    const list = activeEmployees || [];
    if (!selectedBranchId) return list;
    return list.filter(
      (e) =>
        String(e.branch_id ?? e.branch?.branch_id ?? "") ===
        String(selectedBranchId)
    );
  }, [activeEmployees, selectedBranchId]);

  const restDayPieData = useMemo(
    () => buildRestDayPieChartData(employeesForAttendanceScope),
    [employeesForAttendanceScope]
  );

  useEffect(() => {
    if (isSyncing) return;
    refetchLatestAttendanceSync();
  }, [isSyncing]);

  const dayData = useMemo(() => {
    const day = byDate[dateStr];
    if (!day) return [];
    return Object.keys(day)
      .map((code) => ({ ...day[code], employee_code: code }))
      .sort(
        (a, b) =>
          (a.punches[0]?.moment?.valueOf() ?? 0) -
          (b.punches[0]?.moment?.valueOf() ?? 0)
      );
  }, [byDate, dateStr]);

  const presentCodes = useMemo(
    () => new Set(dayData.map((e) => e.employee_code)),
    [dayData]
  );

  // Get day of week for selected date (1=Sunday, 7=Saturday)
  const selectedDayOfWeek = useMemo(() => {
    const momentDay = moment(selectedDate).day(); // 0=Sunday, 6=Saturday
    return momentDay === 0 ? 1 : momentDay + 1; // Convert to 1=Sunday, 7=Saturday
  }, [selectedDate]);

  const gridRows = useMemo(() => {
    const presentRows = dayData.map((emp) => {
      const empMaster = (activeEmployees || []).find(
        (e) => String(e.employee_code) === String(emp.employee_code)
      );
      const restDay = Number(empMaster?.rest_day) || 0;
      const isRestDay = restDay > 0 && restDay === selectedDayOfWeek;

      const hasOpenSession = emp.sessions.some((s) => !s.out);
      const openMs = hasOpenSession
        ? moment().valueOf() -
          (emp.sessions.find((s) => !s.out)?.in?.valueOf() ?? 0)
        : 0;
      const totalMs = emp.totalClockedInMs + openMs;
      const sessionsList = emp.sessions.map((s, idx) => {
        const dur = s.out
          ? s.durationMs
          : s.in
          ? moment().valueOf() - s.in.valueOf()
          : null;
        const breakAfter = emp.breaks[idx];
        return {
          inStr: s.in.format("h:mm A"),
          outStr: s.out ? s.out.format("h:mm A") : null,
          durationStr: formatDuration(dur),
          isOpen: !s.out,
          breakAfterStr: breakAfter
            ? formatDuration(breakAfter.durationMs)
            : null,
        };
      });
      const totalHours = totalMs / (1000 * 60 * 60);
      return {
        employee_code: emp.employee_code,
        employee_name: emp.employee?.employee_name ?? emp.employee_code,
        profile_img_url: emp.employee?.profile_img_url ?? null,
        designation: empCodeToDesignation[emp.employee_code] ?? "—",
        branch_name: empCodeToBranch[emp.employee_code]?.branch_name ?? "—",
        rest_day: Number(empMaster?.rest_day) || 0,
        status: isRestDay ? "Rest Day - P" : "Present",
        is_late:
          processedAttendanceByEmployeeCode
            .get(String(emp.employee_code))
            ?.get(dateStr)?.is_late ?? false,
        is_early:
          processedAttendanceByEmployeeCode
            .get(String(emp.employee_code))
            ?.get(dateStr)?.is_early ?? false,
        sessionsList,
        total: formatDuration(totalMs),
        totalHours: Math.round(totalHours * 100) / 100,
      };
    });

    const absentRows = (activeEmployees || [])
      .filter((e) => !presentCodes.has(e.employee_code))
      .map((e) => {
        const restDay = Number(e.rest_day) || 0;
        const isRestDay = restDay > 0 && restDay === selectedDayOfWeek;
        return {
          employee_code: e.employee_code,
          employee_name: e.employee_name ?? e.employee_code,
          profile_img_url: e.profile_img_url ?? null,
          designation: empCodeToDesignation[e.employee_code] ?? "—",
          branch_name: empCodeToBranch[e.employee_code]?.branch_name ?? "—",
          rest_day: Number(e.rest_day) || 0,
          status: isRestDay ? "Rest Day" : "Absent",
          is_late: false,
          is_early: false,
          sessionsList: [],
          total: "—",
          totalHours: null,
        };
      })
      .sort((a, b) =>
        (a.employee_name || "").localeCompare(b.employee_name || "")
      );

    return [...presentRows, ...absentRows];
  }, [
    dayData,
    activeEmployees,
    presentCodes,
    empCodeToDesignation,
    empCodeToBranch,
    selectedDayOfWeek,
    processedAttendanceByEmployeeCode,
  ]);

  const filteredGridRows = useMemo(() => {
    if (!selectedBranchId) return gridRows;
    return gridRows.filter(
      (r) =>
        String(empCodeToBranch[r.employee_code]?.branch_id) ===
        String(selectedBranchId)
    );
  }, [gridRows, selectedBranchId, empCodeToBranch]);

  const filteredAllocations = useMemo(() => {
    if (!selectedBranchId) return allocations ?? [];
    return (allocations ?? []).filter(
      (a) => String(a.branch_id) === String(selectedBranchId)
    );
  }, [allocations, selectedBranchId]);

  const presentAbsentData = useMemo(() => {
    const present = filteredGridRows.filter(
      (r) => r.status === "Present"
    ).length;
    const restDayPresent = filteredGridRows.filter(
      (r) => r.status === "Rest Day - P"
    ).length;
    const absent = filteredGridRows.filter((r) => r.status === "Absent").length;
    const restDay = filteredGridRows.filter(
      (r) => r.status === "Rest Day"
    ).length;
    const chartData = [
      { name: "Present", count: present, fill: "#38A169" },
      ...(restDayPresent > 0
        ? [
            {
              name: "Rest Day - P",
              count: restDayPresent,
              fill: "#2C7A7B",
            },
          ]
        : []),
      { name: "Rest Day", count: restDay, fill: "#ED8936" },
      { name: "Absent", count: absent, fill: "#718096" },
    ];
    return chartData;
  }, [filteredGridRows]);

  const attendanceStatsData = useMemo(() => {
    const presentRows = filteredGridRows.filter(
      (r) => r.status === "Present" || r.status === "Rest Day - P"
    );
    const late = presentRows.filter((r) => r.is_late).length;
    const early = presentRows.filter((r) => r.is_early).length;
    return [
      { name: "Late", count: late, fill: "#E53E3E" },
      { name: "Early", count: early, fill: "#D69E2E" },
    ];
  }, [filteredGridRows]);

  const allocationByDesignationData = useMemo(() => {
    const byName = {};
    (filteredAllocations || []).forEach((a) => {
      const name = a.designation_name ?? "—";
      if (!byName[name]) byName[name] = { name, filled: 0, unfilled: 0 };
      const filled = Number(a.existing_count) || 0;
      const required = Number(a.required_count) || 0;
      byName[name].filled += filled;
      byName[name].unfilled += Math.max(0, required - filled);
    });
    return Object.values(byName).map((r) => ({
      ...r,
      total: r.filled + r.unfilled,
    }));
  }, [filteredAllocations]);

  const allocationChartData = useMemo(() => {
    if (!allocationByDesignationData?.length) return [];
    if (showAllocationFilled) return allocationByDesignationData;
    return allocationByDesignationData.filter((r) => (r.unfilled ?? 0) > 0);
  }, [allocationByDesignationData, showAllocationFilled]);

  const getBranchName = (branchId) => {
    if (branchId == null || branchId === "") return "—";
    const b = (branches || []).find(
      (x) => String(x.branch_id) === String(branchId)
    );
    return b?.branch_name ?? String(branchId);
  };

  const designationSummary = useMemo(() => {
    const key = (des, branchId) => `${des}|${branchId ?? ""}`;
    const byKey = {};
    filteredGridRows.forEach((r) => {
      const des = empCodeToDesignation[r.employee_code] ?? "—";
      const bid = empCodeToBranch[r.employee_code]?.branch_id ?? null;
      const k = key(des, bid);
      if (!byKey[k]) {
        byKey[k] = {
          designation: des,
          branch_id: bid,
          branch_name: getBranchName(bid),
          present: 0,
          rest_day_present: 0,
          absent: 0,
          rest_day_absent: 0,
          filled: 0,
          unfilled: 0,
          required: 0,
        };
      }
      if (r.status === "Present" || r.status === "Rest Day - P")
        byKey[k].present += 1;
      else if (r.status === "Rest Day" || r.status === "Absent")
        byKey[k].absent += 1;
      if (r.status === "Rest Day - P") byKey[k].rest_day_present += 1;
      if (r.status === "Rest Day") byKey[k].rest_day_absent += 1;
    });
    filteredAllocations.forEach((a) => {
      const name = a.designation_name ?? "—";
      const bid = a.branch_id ?? null;
      const k = key(name, bid);
      if (!byKey[k]) {
        byKey[k] = {
          designation: name,
          branch_id: bid,
          branch_name: a.branch_name ?? getBranchName(bid),
          present: 0,
          rest_day_present: 0,
          absent: 0,
          rest_day_absent: 0,
          filled: 0,
          unfilled: 0,
          required: 0,
        };
      }
      const filled = Number(a.existing_count) || 0;
      const required = Number(a.required_count) || 0;
      byKey[k].filled += filled;
      byKey[k].unfilled += Math.max(0, required - filled);
      byKey[k].required += required;
    });

    // When there is no allocation data (required = 0 and filled = 0),
    // still show how many employees are actually in that designation
    // by using attendance-based headcount (present + absent).
    Object.values(byKey).forEach((row) => {
      if ((row.required ?? 0) === 0 && (row.filled ?? 0) === 0) {
        const headcount = (row.present ?? 0) + (row.absent ?? 0);
        if (headcount > 0) {
          row.filled = headcount;
          row.unfilled = 0;
        }
      }
    });

    return Object.values(byKey).sort((a, b) => {
      const c = (a.designation || "").localeCompare(b.designation || "");
      if (c !== 0) return c;
      return (a.branch_name || "").localeCompare(b.branch_name || "");
    });
  }, [
    filteredGridRows,
    filteredAllocations,
    empCodeToDesignation,
    empCodeToBranch,
    branches,
  ]);

  const allocationLegendItems = useMemo(() => {
    if (!allocationChartData?.length) return [];
    const unfilled = allocationChartData.reduce((s, r) => s + r.unfilled, 0);
    if (!showAllocationFilled) {
      return [{ name: "Unfilled", value: unfilled, fill: "#E53E3E" }];
    }
    const filled = allocationChartData.reduce((s, r) => s + r.filled, 0);
    return [
      { name: "Filled", value: filled, fill: "#38A169" },
      { name: "Unfilled", value: unfilled, fill: "#E53E3E" },
    ];
  }, [allocationChartData, showAllocationFilled]);

  const allocationChartHeight = useMemo(() => {
    const count = allocationChartData?.length ?? 0;
    const rowHeight = 28;
    const minHeight = 280;
    const axisAndMargin = 80;
    const maxHeight = 1200;
    return Math.min(
      maxHeight,
      Math.max(minHeight, count * rowHeight + axisAndMargin)
    );
  }, [allocationChartData?.length]);

  const listRows = useMemo(() => {
    let rows = filteredGridRows;

    if (detailsFilters.status) {
      rows = rows.filter((r) => r.status === detailsFilters.status);
    }

    if (detailsFilters.designation) {
      rows = rows.filter(
        (r) => (r.designation ?? "—") === detailsFilters.designation
      );
    }

    if (detailsFilters.restDay != null) {
      const key = detailsFilters.restDay;
      rows = rows.filter((r) => {
        const n = Number(r.rest_day);
        if (key === "unset") {
          return !Number.isFinite(n) || n < 1 || n > 7;
        }
        return Number.isFinite(n) && n === Number(key);
      });
    }

    if (detailsFilters.timeliness === "late") {
      rows = rows.filter((r) => Boolean(r.is_late));
    } else if (detailsFilters.timeliness === "early") {
      rows = rows.filter((r) => Boolean(r.is_early));
    }

    return rows;
  }, [
    filteredGridRows,
    detailsFilters.status,
    detailsFilters.designation,
    detailsFilters.restDay,
    detailsFilters.timeliness,
  ]);

  const designationTableRows = useMemo(() => {
    let rows = designationSummary;

    if (detailsFilters.designation) {
      rows = rows.filter(
        (r) => (r.designation ?? "") === detailsFilters.designation
      );
    }

    if (
      detailsFilters.status === "Present" ||
      detailsFilters.status === "Rest Day - P"
    ) {
      rows = rows.filter((r) => (r.present ?? 0) > 0);
    } else if (detailsFilters.status === "Absent") {
      rows = rows.filter((r) => (r.absent ?? 0) > 0);
    }

    return rows;
  }, [designationSummary, detailsFilters.status, detailsFilters.designation]);

  const restDayDesignationStats = useMemo(() => {
    const order = [1, 2, 3, 4, 5, 6, 7];
    const groups = {};
    const designationLimitMap = {};
    const hasSelectedBranchScope = Boolean(selectedBranchId);

    if (hasSelectedBranchScope) {
      (filteredAllocations || []).forEach((a) => {
        const designation = a?.designation_name ?? "—";
        const existing = Number(a?.existing_count);
        const workingDays = Number(a?.working_days);
        if (!Number.isFinite(existing) || !Number.isFinite(workingDays)) return;
        if (workingDays <= 0) return;
        const limit = Math.ceil(existing / workingDays);
        if (!Number.isFinite(limit)) return;
        designationLimitMap[designation] =
          (designationLimitMap[designation] ?? 0) + limit;
      });
    }
    order.forEach((key) => {
      groups[key] = {
        restDayKey: key,
        restDayLabel: REST_DAY_PIE_FULL_LABEL[key] ?? String(key),
        total: 0,
        byDesignation: {},
      };
    });

    (employeesForAttendanceScope || []).forEach((emp) => {
      const n = Number(emp?.rest_day);
      const key = Number.isFinite(n) && n >= 1 && n <= 7 ? n : "unset";
      const designation =
        emp?.designation_name ?? emp?.designation?.designation_name ?? "—";
      const group = groups[key];
      if (!group) return;
      group.total += 1;
      group.byDesignation[designation] =
        (group.byDesignation[designation] ?? 0) + 1;
    });

    const filteredOrder =
      detailsFilters.restDay != null
        ? order.filter(
            (key) =>
              groups[key] != null &&
              String(key) === String(detailsFilters.restDay)
          )
        : order;

    return filteredOrder
      .map((key) => groups[key])
      .filter(Boolean)
      .filter((group) => group.total > 0)
      .map((group) => ({
        ...group,
        colorScheme: REST_DAY_BADGE_COLOR_BY_NAME[group.restDayLabel] ?? "gray",
        designationRows: Object.entries(group.byDesignation)
          .map(([designation, count]) => {
            const maxAllowedRestDayCount = designationLimitMap[designation];
            const hasLimit =
              hasSelectedBranchScope && Number.isFinite(maxAllowedRestDayCount);
            const extraCount = hasLimit ? count - maxAllowedRestDayCount : null;
            return {
              designation,
              count,
              showLimit: hasSelectedBranchScope,
              maxAllowedRestDayCount: hasLimit ? maxAllowedRestDayCount : null,
              extraCount,
              isOverLimit: hasLimit ? count > maxAllowedRestDayCount : false,
            };
          })
          .sort((a, b) => {
            const diff = Number(b.count) - Number(a.count);
            if (diff !== 0) return diff;
            return String(a.designation).localeCompare(String(b.designation));
          }),
      }));
  }, [
    employeesForAttendanceScope,
    detailsFilters.restDay,
    filteredAllocations,
    selectedBranchId,
  ]);

  const hasDetailsFilter = Boolean(
    detailsFilters.status ||
      detailsFilters.designation ||
      detailsFilters.restDay != null ||
      detailsFilters.timeliness
  );

  const handleClearDetailsFilters = useCallback(() => {
    setDetailsFilters({
      status: null,
      designation: null,
      restDay: null,
      timeliness: null,
    });
  }, []);

  const toggleStatusFilter = useCallback((status) => {
    setDetailsFilters((prev) => ({
      ...prev,
      status: prev.status === status ? null : status,
    }));
  }, []);

  const toggleDesignationFilter = useCallback((designation) => {
    setDetailsFilters((prev) => ({
      ...prev,
      designation: prev.designation === designation ? null : designation,
    }));
  }, []);

  const toggleRestDayFilter = useCallback((restDayKey) => {
    setDetailsFilters((prev) => ({
      ...prev,
      restDay: prev.restDay === restDayKey ? null : restDayKey,
    }));
  }, []);

  const toggleTimelinessFilter = useCallback((mode) => {
    setDetailsFilters((prev) => ({
      ...prev,
      timeliness: prev.timeliness === mode ? null : mode,
    }));
  }, []);

  const allocationBars = useMemo(
    () =>
      showAllocationFilled
        ? [
            {
              dataKey: "unfilled",
              fill: "#E53E3E",
              stackId: "stack",
            },
            {
              dataKey: "filled",
              fill: "#38A169",
              stackId: "stack",
              labelOnTop: true,
              labelDataKey: "total",
            },
          ]
        : [
            {
              dataKey: "unfilled",
              fill: "#E53E3E",
              labelOnTop: true,
              labelDataKey: "unfilled",
            },
          ],
    [showAllocationFilled]
  );

  const presentAbsentBars = useMemo(
    () => [{ dataKey: "count", perBarColor: true }],
    []
  );

  const attendanceStatsBars = useMemo(
    () => [{ dataKey: "count", perBarColor: true }],
    []
  );

  const handleAllocationBarClick = useCallback(
    (entry) => {
      toggleDesignationFilter(entry.name);
    },
    [toggleDesignationFilter]
  );

  const handlePresentAbsentBarClick = useCallback(
    (entry) => {
      toggleStatusFilter(entry.name);
      setDetailsTab("list");
    },
    [toggleStatusFilter]
  );

  const handleAttendanceStatsBarClick = useCallback(
    (entry) => {
      if (!entry?.name) return;
      if (entry.name === "Late" || entry.name === "Early") {
        toggleTimelinessFilter(entry.name.toLowerCase());
      } else {
        return;
      }
      setDetailsTab("list");
    },
    [toggleTimelinessFilter]
  );

  const designationColumnDefs = useMemo(
    () => [
      {
        field: "designation",
        headerName: "Designation",
        flex: 1,
        minWidth: 120,
      },
      { field: "branch_name", headerName: "Branch", flex: 1, minWidth: 120 },
      {
        field: "present",
        headerName: "Present",
        width: 90,
        type: "number",
        valueGetter: (params) => {
          const present = params.data?.present ?? 0;
          const restDayPresent = params.data?.rest_day_present ?? 0;
          return present - restDayPresent;
        },
      },
      {
        field: "rest_day_present",
        headerName: "Rest Day Present",
        width: 140,
        type: "number",
      },
      {
        field: "absent",
        headerName: "Absent",
        width: 90,
        type: "number",
        valueGetter: (params) => {
          const absent = params.data?.absent ?? 0;
          const restDayAbsent = params.data?.rest_day_absent ?? 0;
          return absent - restDayAbsent;
        },
      },
      {
        field: "rest_day_absent",
        headerName: "Rest Day Absent",
        width: 140,
        type: "number",
      },
      { field: "required", headerName: "Required", width: 90, type: "number" },
      {
        field: "to_be_filled",
        headerName: "To Be Filled",
        type: "number",
        valueGetter: (params) => {
          const required = params.data?.required ?? 0;
          const filled = params.data?.filled ?? 0;
          return required - filled;
        },
        cellRenderer: (params) => {
          const value = params.value;
          let color = "gray.500";
          if (value > 0) color = "green.500";
          else if (value < 0) color = "red.500";
          return <Text color={color}>{value ?? "-"}</Text>;
        },
      },
      {
        field: "filled",
        headerName: "Filled",
        type: "number",
        hideByDefault: true,
      },
      {
        field: "unfilled",
        headerName: "Unfilled",
        type: "number",
        hideByDefault: true,
      },
      {
        field: "actions",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => [
          {
            label: "View Employees",
            value: "view-employees",
            onClick: () =>
              setSelectedDesignationModalContext({
                designation: params.data?.designation ?? "—",
                branch_id: params.data?.branch_id ?? null,
                branch_name: params.data?.branch_name ?? "—",
                restDayKey: null,
                restDayLabel: null,
              }),
          },
        ],
      },
    ],
    []
  );

  const branchGroupedColumnDefs = useMemo(
    () => [
      {
        field: "designation",
        headerName: "Designation",
        flex: 1,
        minWidth: 140,
      },
      {
        field: "branch_name",
        headerName: "Branch",
        flex: 1,
        minWidth: 140,
      },
      {
        field: "required",
        headerName: "Required",
        width: 100,
        type: "number",
      },
      {
        field: "filled",
        headerName: "Filled",
        width: 100,
        type: "number",
      },
      {
        field: "unfilled",
        headerName: "Unfilled",
        width: 100,
        type: "number",
      },
    ],
    []
  );

  const columnDefs = useMemo(
    () => [
      { field: "employee_code", headerName: "Code", type: "id" },
      {
        field: "profile_img_url",
        headerName: "Image",
        type: "image",
        imageSettings: { objectFit: "contain" },
      },
      {
        field: "employee_name",
        headerName: "Employee",
        type: "capitalize",
      },
      {
        field: "designation",
        headerName: "Designation",
        type: "capitalize",
      },
      {
        field: "branch_name",
        headerName: "Branch",
        type: "capitalize",
      },
      {
        field: "rest_day",
        headerName: "Rest Day",
        type: "badge-column",
        valueGetter: (params) => getRestDayBadgeValue(params.data?.rest_day),
      },
      {
        field: "status",
        headerName: "Status",
        type: "badge-column",
        valueGetter: (params) => {
          const status = params.data.status;
          let colorScheme = "gray";
          if (status === "Present") {
            colorScheme = "green";
          } else if (status === "Rest Day - P") {
            colorScheme = "pink";
          } else if (status === "Rest Day") {
            colorScheme = "orange";
          }
          return {
            label: status,
            colorScheme,
          };
        },
      },
      {
        field: "timeliness",
        headerName: "Timeliness",
        minWidth: 160,
        type: "badge-column",
        valueGetter: (params) => {
          const isLate = Boolean(params.data?.is_late);
          const isEarly = Boolean(params.data?.is_early);
          if (!isLate && !isEarly) {
            return null;
          }
          if (isLate && isEarly) {
            return { label: "Late, Early", colorScheme: "orange" };
          }
          return isLate
            ? { label: "Late", colorScheme: "red" }
            : { label: "Early", colorScheme: "yellow" };
        },
      },
      {
        field: "sessionsList",
        headerName: "Sessions",
        flex: 2,
        minWidth: 280,
        autoHeight: true,
        wrapText: false,
        cellRenderer: SessionsCellRenderer,
      },
      { field: "total", headerName: "Total", width: 85 },
      {
        field: "actions",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => [
          {
            label: "View Details",
            value: "view-details",
            onClick: () => setSelectedEmployeeCode(params.data.employee_code),
          },
        ],
      },
    ],
    []
  );

  const selectedEmployeeMeta = useMemo(() => {
    if (!selectedEmployeeCode) return null;

    const empRow = (filteredGridRows || []).find(
      (r) => String(r.employee_code) === String(selectedEmployeeCode)
    );
    const empMaster = (activeEmployees || []).find(
      (e) => String(e.employee_code) === String(selectedEmployeeCode)
    );

    return {
      employee_code: selectedEmployeeCode,
      employee_name:
        empRow?.employee_name ??
        empMaster?.employee_name ??
        String(selectedEmployeeCode),
      designation: empCodeToDesignation[selectedEmployeeCode] ?? "—",
      branch_name:
        empRow?.branch_name ??
        empMaster?.branch_name ??
        empCodeToBranch[selectedEmployeeCode]?.branch_name ??
        "—",
    };
  }, [
    selectedEmployeeCode,
    filteredGridRows,
    activeEmployees,
    empCodeToDesignation,
    empCodeToBranch,
  ]);

  const designationEmployeeRows = useMemo(() => {
    if (!selectedDesignationModalContext) return [];
    const selectedDesignation =
      selectedDesignationModalContext.designation ?? "—";
    const selectedBranchId = selectedDesignationModalContext.branch_id ?? null;
    const selectedRestDayKey = selectedDesignationModalContext.restDayKey;
    const shouldFilterByBranch =
      selectedBranchId !== null &&
      selectedBranchId !== undefined &&
      selectedBranchId !== "";
    return (employeesForAttendanceScope || [])
      .filter((emp) => {
        const designation =
          emp.designation_name ?? emp.designation?.designation_name ?? "—";
        const empBranchId = emp.branch_id ?? emp.branch?.branch_id ?? null;
        if (String(designation || "—") !== String(selectedDesignation))
          return false;
        if (
          shouldFilterByBranch &&
          String(empBranchId ?? "") !== String(selectedBranchId ?? "")
        ) {
          return false;
        }
        if (selectedRestDayKey == null) return true;
        const restDay = Number(emp?.rest_day);
        return (
          Number.isFinite(restDay) && restDay === Number(selectedRestDayKey)
        );
      })
      .sort((a, b) =>
        (a.employee_name || "").localeCompare(b.employee_name || "")
      );
  }, [selectedDesignationModalContext, employeesForAttendanceScope]);

  const attendanceStatusByEmployeeCode = useMemo(
    () =>
      new Map(
        (filteredGridRows || []).map((row) => [
          String(row.employee_code),
          row.status,
        ])
      ),
    [filteredGridRows]
  );

  const designationEmployeeColDefs = useMemo(() => {
    const baseDefs = employeeColDefs({
      allowAdd: allowAddEmployees,
      allowMFAToggle,
    });
    const attendanceStatusCol = {
      field: "attendance_status",
      headerName: "Status",
      type: "badge-column",
      valueGetter: (params) => {
        const status =
          attendanceStatusByEmployeeCode.get(
            String(params.data?.employee_code ?? "")
          ) ?? "Absent";
        if (status === "Rest Day - P") {
          return {
            label: "Rest Day - P",
            colorScheme: "pink",
          };
        }
        if (status === "Rest Day") {
          return {
            label: "Rest Day",
            colorScheme: "orange",
          };
        }
        return {
          label: status === "Present" ? "Present" : "Absent",
          colorScheme: status === "Present" ? "green" : "red",
        };
      },
    };
    return baseDefs.flatMap((col) =>
      col.field === "rest_day" ? [col, attendanceStatusCol] : [col]
    );
  }, [allowAddEmployees, allowMFAToggle, attendanceStatusByEmployeeCode]);

  const monthDays = useMemo(() => {
    const days = [];
    const d = monthStart.clone().startOf("day");
    const end = monthEnd.clone().startOf("day");
    while (d.isSameOrBefore(end, "day")) {
      days.push(d.clone());
      d.add(1, "day");
    }
    return days;
  }, [monthStart, monthEnd]);

  const employeeMonth = useMemo(() => {
    if (!selectedEmployeeCode) return null;

    const minutesOfDay = (m) => m.hours() * 60 + m.minutes();
    const todayStr = moment().format("YYYY-MM-DD");

    let presentDays = 0;
    let totalMs = 0;
    let sumCheckInMin = 0;
    let cntCheckIn = 0;
    let sumCheckOutMin = 0;
    let cntCheckOut = 0;

    const days = monthDays.map((day) => {
      const dateStr = day.format("YYYY-MM-DD");
      const row = byDate?.[dateStr]?.[selectedEmployeeCode];
      if (!row) {
        return {
          dateStr,
          day,
          status: "Absent",
          sessions: [],
          firstIn: null,
          lastOut: null,
          totalMs: 0,
        };
      }

      presentDays += 1;

      const sessions = (row.sessions || []).map((s) => {
        const start = s.in ? moment(s.in) : null;
        const end =
          s.out != null
            ? moment(s.out)
            : dateStr === todayStr && start
            ? moment()
            : null;
        const dur =
          end && start ? Math.max(0, end.valueOf() - start.valueOf()) : 0;
        return { start, end, durationMs: dur };
      });

      const firstIn = sessions.find((x) => x.start)?.start ?? null;
      const lastOut = [...sessions].reverse().find((x) => x.end)?.end ?? null;

      const dayTotalMs = sessions.reduce((s, x) => s + (x.durationMs || 0), 0);
      totalMs += dayTotalMs;

      if (firstIn) {
        sumCheckInMin += minutesOfDay(firstIn);
        cntCheckIn += 1;
      }
      if (lastOut) {
        sumCheckOutMin += minutesOfDay(lastOut);
        cntCheckOut += 1;
      }

      return {
        dateStr,
        day,
        status: "Present",
        sessions,
        firstIn,
        lastOut,
        totalMs: dayTotalMs,
      };
    });

    const totalDays = days.length;
    const absentDays = Math.max(0, totalDays - presentDays);

    const avgCheckInMin = cntCheckIn
      ? Math.round(sumCheckInMin / cntCheckIn)
      : null;
    const avgCheckOutMin = cntCheckOut
      ? Math.round(sumCheckOutMin / cntCheckOut)
      : null;

    const formatAvgTime = (mins) => {
      if (mins == null) return "-";
      return moment().startOf("day").add(mins, "minutes").format("h:mm A");
    };

    return {
      days,
      totalDays,
      presentDays,
      absentDays,
      totalMs,
      totalHours: Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100,
      avgCheckIn: formatAvgTime(avgCheckInMin),
      avgCheckOut: formatAvgTime(avgCheckOutMin),
    };
  }, [selectedEmployeeCode, monthDays, byDate, monthStart, monthEnd]);

  return (
    <GlobalWrapper permissionKey="view_attendance_dashboard">
      <Flex flexDirection="column" gap="22px">
        <DashboardTitleSection>
          <Flex
            w="100%"
            align={{ base: "flex-start", md: "center" }}
            justify="space-between"
            gap={3}
            flexWrap="wrap"
            rowGap={3}
          >
            <DashboardPageTitle title="Attendance Dashboard" />
            <Flex
              align="flex-end"
              gap={3}
              flexWrap="wrap"
              w={{ base: "100%", md: "auto" }}
              justify={{ base: "flex-start", md: "flex-end" }}
              flex={{ md: 1 }}
              minW={0}
            >
              <Flex
                align="flex-end"
                gap={3}
                flexWrap="wrap"
                flex={{ base: "1 1 100%", md: "0 1 auto" }}
                minW={0}
              >
                <Box>
                  <Text fontSize="xs" mb={1} color="gray.500">
                    Date
                  </Text>
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date ?? new Date())}
                    customInput={
                      <CustomDateTimeInput
                        placeholder="DD/MM/YYYY"
                        type="date"
                      />
                    }
                    portalId="root-portal"
                  />
                </Box>
                <BranchFilter
                  value={selectedBranchId}
                  onChange={setSelectedBranchId}
                  label="Branch"
                  allLabel="All Branches"
                />
              </Flex>
              <Box
                display={{ base: "none", sm: "block" }}
                w="1px"
                alignSelf="stretch"
                minH="36px"
                my="auto"
                bg="gray.200"
                mt="24px"
                _dark={{ bg: "gray.600" }}
                flexShrink={0}
                aria-hidden
              />
              <Flex align="flex-end" gap={3} flexWrap="nowrap" flexShrink={0}>
                {canSyncAttendance ? (
                  <IconButton
                    onClick={syncAttendance}
                    aria-label="Sync Attendance"
                    variant="outline"
                    size="sm"
                    disabled={isSyncing}
                  >
                    <i className={`fa fa-sync ${isSyncing ? "fa-spin" : ""}`} />
                  </IconButton>
                ) : null}

                <Box>
                  <Text fontSize="xs" mb={1} color="gray.500">
                    Last sync
                  </Text>
                  <Text fontSize="sm" color="gray.700">
                    {loadingAttendanceSync
                      ? "Loading..."
                      : latestAttendanceSync?.formatted || "No sync data"}
                  </Text>
                </Box>
              </Flex>
            </Flex>
          </Flex>
        </DashboardTitleSection>

        {loadingAttendance || loadingEmployees || loadingAllocations ? (
          <Flex justify="center" py={8}>
            <Spinner size="sm" />
          </Flex>
        ) : gridRows.length === 0 ? (
          <Text color="gray.500" fontSize="sm">
            No active employees to show.
          </Text>
        ) : (
          <>
            <Grid
              templateColumns={{ base: "1fr", md: "1fr 2fr 1fr 2fr" }}
              gap="22px"
            >
              <GridItem minW={0}>
                <CustomContainer title="Rest Day Stats" size="sm">
                  <RestDayDistributionPie
                    data={restDayPieData}
                    height={270}
                    emptyMessage="No employees in scope"
                    onSliceClick={(entry) => {
                      const key = entry?.restDayKey;
                      if (key === undefined || key === null) return;
                      toggleRestDayFilter(key);
                      setDetailsTab("list");
                    }}
                  />
                </CustomContainer>
              </GridItem>

              <CustomContainer
                title="Present vs Absent"
                size="sm"
                containerStyle={{ height: "100%" }}
              >
                <DashboardBarChart
                  data={presentAbsentData}
                  xDataKey="name"
                  bars={presentAbsentBars}
                  showLegend={true}
                  emptyMessage="No data to display"
                  onBarClick={handlePresentAbsentBarClick}
                  legendColumns={3}
                />
              </CustomContainer>

              <GridItem minW={0}>
                <CustomContainer
                  title="Attendance Stats"
                  size="sm"
                  containerStyle={{ height: "100%" }}
                >
                  <DashboardBarChart
                    barCategoryGap={8}
                    data={attendanceStatsData}
                    xDataKey="name"
                    bars={attendanceStatsBars}
                    showLegend={true}
                    legendColumns={2}
                    emptyMessage="No data to display"
                    onBarClick={handleAttendanceStatsBarClick}
                  />
                </CustomContainer>
              </GridItem>

              <CustomContainer
                title="Allocation by Designation"
                size="sm"
                containerStyle={{ height: "100%" }}
                rightSection={
                  <Flex align="center">
                    <Checkbox.Root
                      size="xs"
                      checked={showAllocationFilled}
                      onCheckedChange={(e) =>
                        setShowAllocationFilled(e.checked ?? false)
                      }
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label fontSize="xs" color="brand700">
                        Show Filled
                      </Checkbox.Label>
                    </Checkbox.Root>
                  </Flex>
                }
              >
                <DashboardBarChart
                  data={allocationChartData}
                  xDataKey="name"
                  layout="horizontal"
                  yAxisWidth={140}
                  barCategoryGap={4}
                  scrollable
                  graphHeight={`${allocationChartHeight}px`}
                  bars={allocationBars}
                  legendItems={allocationLegendItems}
                  showLegend={true}
                  emptyMessage="No allocation data"
                  onBarClick={handleAllocationBarClick}
                />
              </CustomContainer>
            </Grid>

            <CustomContainer
              title="Attendance Details"
              size="sm"
              rightSection={
                <Flex gap={3} align="center">
                  {hasDetailsFilter && (
                    <Text fontSize="sm" color="brand600" fontWeight="medium">
                      Filters:
                      {detailsFilters.status
                        ? ` Status = ${detailsFilters.status}`
                        : ""}
                      {detailsFilters.designation
                        ? ` Designation = ${detailsFilters.designation}`
                        : ""}
                      {detailsFilters.restDay != null
                        ? ` Rest day = ${
                            detailsFilters.restDay === "unset"
                              ? REST_DAY_PIE_SHORT_LABEL.unset
                              : REST_DAY_PIE_SHORT_LABEL[
                                  detailsFilters.restDay
                                ] ?? detailsFilters.restDay
                          }`
                        : ""}
                      {detailsFilters.timeliness
                        ? ` Timeliness = ${
                            detailsFilters.timeliness === "late"
                              ? "Late"
                              : "Early"
                          }`
                        : ""}
                    </Text>
                  )}
                  {hasDetailsFilter && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearDetailsFilters}
                    >
                      Clear Filters
                    </Button>
                  )}
                </Flex>
              }
            >
              <Tabs.Root
                value={detailsTab}
                onValueChange={(e) => {
                  const next =
                    typeof e === "string" ? e : e?.value ?? e?.target?.value;
                  setDetailsTab(next ?? "list");
                }}
              >
                <Tabs.List>
                  <Tabs.Trigger value="list">List</Tabs.Trigger>
                  <Tabs.Trigger value="by_designation">
                    Grouped By Designation
                  </Tabs.Trigger>
                  <Tabs.Trigger value="by_branch">
                    Grouped by Branch
                  </Tabs.Trigger>
                  <Tabs.Trigger value="rest_day_stats">
                    Rest Day Stats
                  </Tabs.Trigger>
                </Tabs.List>
                <Tabs.Content value="list">
                  <Box w="100%" minH="200px" pt={2}>
                    <AgGrid
                      tableKey="attendance-dashboard"
                      rowData={listRows}
                      columnDefs={columnDefs}
                    />
                  </Box>
                </Tabs.Content>
                <Tabs.Content value="by_designation">
                  <Box w="100%" minH="200px" pt={2}>
                    <AgGrid
                      tableKey="attendance-dashboard-by-designation"
                      rowData={designationTableRows}
                      columnDefs={designationColumnDefs}
                    />
                  </Box>
                </Tabs.Content>
                <Tabs.Content value="by_branch">
                  <Box w="100%" minH="200px" pt={2}>
                    <AgGrid
                      tableKey="attendance-dashboard-by-branch"
                      rowData={designationTableRows}
                      columnDefs={branchGroupedColumnDefs}
                    />
                  </Box>
                </Tabs.Content>
                <Tabs.Content value="rest_day_stats">
                  <Box w="100%" minH="200px" pt={2}>
                    {restDayDesignationStats.length === 0 ? (
                      <Text fontSize="sm" color="gray.500">
                        No rest day assignments found for employees in scope.
                      </Text>
                    ) : (
                      <Grid
                        templateColumns={Array.from(
                          { length: restDayDesignationStats.length },
                          (_, i) => i + 1
                        )
                          .map(() => "1fr")
                          .join(" ")}
                        gap={3}
                      >
                        {restDayDesignationStats.map((group) => (
                          <Box
                            key={String(group.restDayKey)}
                            borderWidth="1px"
                            borderColor={`${group.colorScheme}.200`}
                            borderRadius="md"
                            overflow="hidden"
                            bg="white"
                          >
                            <Flex
                              px={3}
                              py={2}
                              borderBottomWidth="1px"
                              borderBottomColor={`${group.colorScheme}.200`}
                              align="center"
                              justify="space-between"
                              bg={`${group.colorScheme}.50`}
                            >
                              <Text
                                fontSize="sm"
                                fontWeight="semibold"
                                color={`${group.colorScheme}.800`}
                              >
                                {group.restDayLabel}
                              </Text>
                              <Text
                                fontSize="xs"
                                color={`${group.colorScheme}.700`}
                                fontWeight="semibold"
                                px={2}
                                py={0.5}
                                borderRadius="full"
                                bg={`${group.colorScheme}.100`}
                              >
                                Total: {group.total}
                              </Text>
                            </Flex>
                            <Box px={2.5} py={2}>
                              <Grid templateColumns={"1fr"} gap={1}>
                                {group.designationRows.map((row) => (
                                  <Flex
                                    key={`${group.restDayKey}-${row.designation}`}
                                    align="center"
                                    justify="space-between"
                                    gap={2}
                                    px={2}
                                    py={1}
                                    borderRadius="sm"
                                    bg={
                                      row.isOverLimit
                                        ? "red.50"
                                        : hoveredRestDayDesignation &&
                                          hoveredRestDayDesignation ===
                                            row.designation
                                        ? `${group.colorScheme}.100`
                                        : "gray.50"
                                    }
                                    borderWidth={
                                      row.isOverLimit ? "1px" : "0px"
                                    }
                                    borderColor={
                                      row.isOverLimit
                                        ? "red.200"
                                        : `${group.colorScheme}.300`
                                    }
                                    cursor="pointer"
                                    transition="background-color 120ms ease, border-color 120ms ease"
                                    onMouseEnter={() =>
                                      setHoveredRestDayDesignation(
                                        row.designation
                                      )
                                    }
                                    onMouseLeave={() =>
                                      setHoveredRestDayDesignation(null)
                                    }
                                    onClick={() =>
                                      setSelectedDesignationModalContext({
                                        designation: row.designation,
                                        branch_id: selectedBranchId || null,
                                        branch_name: selectedBranchId
                                          ? getBranchName(selectedBranchId)
                                          : "All Branches",
                                        restDayKey: group.restDayKey,
                                        restDayLabel: group.restDayLabel,
                                      })
                                    }
                                  >
                                    <Text
                                      fontSize="xs"
                                      color={
                                        row.isOverLimit ? "red.700" : "gray.700"
                                      }
                                      minW={0}
                                      flex={1}
                                      fontWeight={
                                        hoveredRestDayDesignation &&
                                        hoveredRestDayDesignation ===
                                          row.designation
                                          ? "semibold"
                                          : "medium"
                                      }
                                      lineClamp={1}
                                      title={row.designation}
                                    >
                                      {row.designation}
                                    </Text>
                                    <Flex
                                      align="center"
                                      gap={1.5}
                                      flexShrink={0}
                                      whiteSpace="nowrap"
                                    >
                                      {row.showLimit ? (
                                        <>
                                          <Text fontSize="2xs" color="gray.600">
                                            Curr.:{" "}
                                            <Text
                                              as="span"
                                              fontWeight="semibold"
                                              color="gray.700"
                                            >
                                              {row.count}
                                            </Text>
                                          </Text>
                                          <Text fontSize="2xs" color="gray.600">
                                            Max:{" "}
                                            <Text
                                              as="span"
                                              fontWeight="semibold"
                                              color="gray.700"
                                            >
                                              {row.maxAllowedRestDayCount !=
                                              null
                                                ? row.maxAllowedRestDayCount
                                                : "-"}
                                            </Text>
                                          </Text>
                                          <Tooltip
                                            content={
                                              row.extraCount == null
                                                ? "Extra cannot be calculated for this designation."
                                                : row.extraCount > 0
                                                ? `${row.extraCount} people are extra.`
                                                : row.extraCount < 0
                                                ? `Need ${Math.abs(
                                                    row.extraCount
                                                  )} people.`
                                                : "Balanced."
                                            }
                                          >
                                            <Text
                                              as="span"
                                              fontSize="2xs"
                                              fontWeight="semibold"
                                              px={1.5}
                                              py={0.5}
                                              borderRadius="full"
                                              color={
                                                row.extraCount == null
                                                  ? "gray.700"
                                                  : row.extraCount > 0
                                                  ? "red.700"
                                                  : row.extraCount < 0
                                                  ? "green.700"
                                                  : "gray.700"
                                              }
                                              bg={
                                                row.extraCount == null
                                                  ? "gray.100"
                                                  : row.extraCount > 0
                                                  ? "red.100"
                                                  : row.extraCount < 0
                                                  ? "green.100"
                                                  : "gray.100"
                                              }
                                              cursor="help"
                                            >
                                              {row.extraCount == null
                                                ? "-"
                                                : row.extraCount > 0
                                                ? `+${row.extraCount}`
                                                : row.extraCount < 0
                                                ? row.extraCount
                                                : "-"}
                                            </Text>
                                          </Tooltip>
                                        </>
                                      ) : (
                                        <Text fontSize="2xs" color="gray.600">
                                          <Text
                                            as="span"
                                            fontWeight="semibold"
                                            color="gray.700"
                                          >
                                            {row.count}
                                          </Text>
                                        </Text>
                                      )}
                                    </Flex>
                                  </Flex>
                                ))}
                              </Grid>
                            </Box>
                          </Box>
                        ))}
                      </Grid>
                    )}
                  </Box>
                </Tabs.Content>
              </Tabs.Root>
            </CustomContainer>

            <AttendanceHistoryDrawer
              employeeCode={selectedEmployeeCode}
              isOpen={!!selectedEmployeeCode}
              onClose={() => setSelectedEmployeeCode(null)}
              fromDate={fromDate}
              toDate={toDate}
              byDate={byDate}
              activeEmployees={activeEmployees}
              filteredGridRows={filteredGridRows}
              empCodeToDesignation={empCodeToDesignation}
              empCodeToBranch={empCodeToBranch}
            />

            <DesignationEmployeesModal
              open={!!selectedDesignationModalContext}
              onClose={() => setSelectedDesignationModalContext(null)}
              title={
                selectedDesignationModalContext
                  ? `Employees - ${
                      selectedDesignationModalContext.designation ?? "—"
                    } (${selectedDesignationModalContext.branch_name ?? "—"})${
                      selectedDesignationModalContext.restDayLabel
                        ? ` - ${selectedDesignationModalContext.restDayLabel}`
                        : ""
                    }`
                  : "Employees"
              }
              tableKey={`attendance-designation-employees-${
                selectedDesignationModalContext?.designation ?? "x"
              }-${selectedDesignationModalContext?.branch_id ?? "x"}-${
                selectedDesignationModalContext?.restDayKey ?? "all"
              }`}
              rowData={designationEmployeeRows}
              columnDefs={designationEmployeeColDefs}
            />
          </>
        )}
      </Flex>
    </GlobalWrapper>
  );
}

export default AttendanceDashboard;
