"use client";

import React, { useCallback, useMemo, useState } from "react";
import moment from "moment";
import GlobalWrapper from "@/components/GlobalWrapper";
import AgGrid from "@/components/AgGrid";
import useAttendance from "@/api/customHooks/useAttendance";
import useEmployee from "@/api/customHooks/useEmployee";
import useEmployeeAllocations from "@/api/customHooks/useEmployeeAllocations";
import BranchFilter from "@/components/BranchFilter";
import { Box, Flex, Text, Spinner, Checkbox } from "@chakra-ui/react";
import DashboardBarChart from "@/components/dashboard/DashboardBarChart";
import AttendanceHistoryDrawer from "@/components/dashboard/attendance/AttendanceHistoryDrawer";
import DashboardChartLegend from "@/components/dashboard/DashboardChartLegend";
import DashboardPageTitle from "@/components/dashboard/DashboardPageTitle";
import {
  DashboardCard,
  DashboardFilterPanel,
  DashboardMetricCard,
  DashboardMetricRow,
  DashboardTabs,
  DashboardTwoColumn,
} from "@/components/dashboard/DashboardUI";
import {
  buildRestDayPieChartData,
  REST_DAY_PIE_FULL_LABEL,
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

/**
 * Figma "Allocation by Designation": label (150px, 11/400 #637188), 8px track
 * (#F1E3D9, radius 4) with a red unfilled bar, value 11/600 at the end.
 * With "Show Filled" the filled part is drawn in green ahead of the red part.
 */
function AllocationBars({ rows, showFilled, activeDesignation, onSelect }) {
  if (!rows.length) {
    return (
      <Flex h="216px" align="center" justify="center">
        <Text fontSize="12px" color="fg.muted">
          No allocation data
        </Text>
      </Flex>
    );
  }
  const max = Math.max(
    1,
    ...rows.map((r) => (showFilled ? r.total : r.unfilled) || 0)
  );
  return (
    <Flex direction="column" gap="16px" maxH="216px" overflowY="auto" pr="4px">
      {rows.map((r) => {
        const active = activeDesignation === r.name;
        const filledPct = showFilled ? ((r.filled || 0) / max) * 100 : 0;
        const unfilledPct = ((r.unfilled || 0) / max) * 100;
        return (
          <Flex
            key={r.name}
            as="button"
            type="button"
            onClick={() => onSelect?.(r)}
            align="center"
            gap="12px"
            minH="13px"
            textAlign="left"
            cursor="pointer"
            opacity={activeDesignation && !active ? 0.55 : 1}
          >
            <Text
              w="150px"
              flexShrink={0}
              fontSize="11px"
              lineHeight="13px"
              color={active ? "fg" : "fg.muted"}
              fontWeight={active ? "600" : "400"}
              truncate
              title={r.name}
            >
              {r.name}
            </Text>
            <Flex flex="1" h="8px" bg="border" borderRadius="4px" overflow="hidden">
              {filledPct > 0 && (
                <Box w={`${filledPct}%`} h="100%" bg="#11976A" />
              )}
              {unfilledPct > 0 && (
                <Box
                  w={`${unfilledPct}%`}
                  h="100%"
                  bg="#E7474D"
                  borderRadius="4px"
                />
              )}
            </Flex>
            <Text
              w="24px"
              flexShrink={0}
              textAlign="right"
              fontSize="11px"
              fontWeight="600"
              lineHeight="13px"
              color="fg"
            >
              {showFilled ? r.total : r.unfilled}
            </Text>
          </Flex>
        );
      })}
    </Flex>
  );
}

function AttendanceDashboard() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("total");
  const [detailsFilters, setDetailsFilters] = useState({
    status: null, // "Present" | "Rest Day - P" | "Absent" | "Rest Day" | null
    designation: null, // string | null
    restDay: null, // 1–7 (Sun–Sat) | "unset" | null
    timeliness: null, // "late" | "early" | "ontime" | null
  });
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState(null);
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
    // Figma "Present vs Absent" bars (always all four).
    return [
      { name: "Present", status: "Present", count: present, fill: "#11976A" },
      {
        name: "Rest Day – P",
        status: "Rest Day - P",
        count: restDayPresent,
        fill: "#526FA8",
      },
      { name: "Rest Day", status: "Rest Day", count: restDay, fill: "#F47721" },
      { name: "Absent", status: "Absent", count: absent, fill: "#9AAAC1" },
    ];
  }, [filteredGridRows]);

  const attendanceStatsData = useMemo(() => {
    const presentRows = filteredGridRows.filter(
      (r) => r.status === "Present" || r.status === "Rest Day - P"
    );
    const late = presentRows.filter((r) => r.is_late).length;
    const early = presentRows.filter((r) => r.is_early).length;
    return [
      { name: "Late", count: late, fill: "#E7474D" },
      { name: "Early", count: early, fill: "#E3B63E" },
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
    } else if (detailsFilters.timeliness === "ontime") {
      rows = rows.filter(
        (r) =>
          (r.status === "Present" || r.status === "Rest Day - P") &&
          !r.is_late &&
          !r.is_early
      );
    }

    const q = searchText.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          String(r.employee_name ?? "").toLowerCase().includes(q) ||
          String(r.employee_code ?? "").toLowerCase().includes(q)
      );
    }

    const sorted = [...rows];
    if (sortBy === "employee") {
      sorted.sort((a, b) =>
        String(a.employee_name ?? "").localeCompare(String(b.employee_name ?? ""))
      );
    } else if (sortBy === "code") {
      sorted.sort((a, b) =>
        String(a.employee_code ?? "").localeCompare(
          String(b.employee_code ?? ""),
          undefined,
          { numeric: true }
        )
      );
    } else {
      sorted.sort((a, b) => (b.totalHours ?? -1) - (a.totalHours ?? -1));
    }
    return sorted;
  }, [
    searchText,
    sortBy,
    filteredGridRows,
    detailsFilters.status,
    detailsFilters.designation,
    detailsFilters.restDay,
    detailsFilters.timeliness,
  ]);

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
      toggleStatusFilter(entry.status ?? entry.name);
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
    },
    [toggleTimelinessFilter]
  );

  // Figma "Attendance Details" columns: Code · Image · Employee · Designation ·
  // Branch · Rest Day · Status · Timeliness · Sessions · Total · Action.
  const columnDefs = useMemo(
    () => [
      { field: "employee_code", headerName: "Code", type: "id", minWidth: 70, maxWidth: 90 },
      {
        field: "profile_img_url",
        headerName: "Image",
        type: "avatar",
        avatarSize: 28,
        width: 66,
      },
      { field: "employee_name", headerName: "Employee", minWidth: 120 },
      { field: "designation", headerName: "Designation", minWidth: 120 },
      { field: "branch_name", headerName: "Branch", minWidth: 150 },
      {
        field: "rest_day",
        headerName: "Rest Day",
        minWidth: 82,
        valueGetter: (params) => {
          const n = Number(params.data?.rest_day);
          return n >= 1 && n <= 7 ? REST_DAY_PIE_FULL_LABEL[n] : "—";
        },
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 78,
        type: "badge-column",
        valueGetter: (params) => {
          const status = params.data.status;
          const colorScheme =
            status === "Present"
              ? "green"
              : status === "Absent"
              ? "red"
              : status === "Rest Day - P"
              ? "teal"
              : "orange";
          return { label: status, colorScheme };
        },
      },
      {
        field: "timeliness",
        headerName: "Timeliness",
        minWidth: 94,
        valueGetter: (params) => {
          const r = params.data ?? {};
          if (r.status !== "Present" && r.status !== "Rest Day - P") return "—";
          if (r.is_late && r.is_early) return "Late, Early";
          if (r.is_late) return "Late";
          if (r.is_early) return "Early";
          return "On time";
        },
      },
      {
        field: "sessions",
        headerName: "Sessions",
        type: "number",
        minWidth: 82,
        valueGetter: (params) => params.data?.sessionsList?.length ?? 0,
      },
      { field: "total", headerName: "Total", type: "rightAligned", minWidth: 80 },
      {
        field: "actions",
        headerName: "Action",
        type: "action-column",
        width: 77,
        minWidth: 77,
        maxWidth: 77,
        valueGetter: (params) => [
          {
            label: "View",
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

  const statusCounts = useMemo(() => {
    const byStatus = Object.fromEntries(
      presentAbsentData.map((d) => [d.status, d.count])
    );
    return byStatus;
  }, [presentAbsentData]);

  const designationOptions = useMemo(() => {
    const names = new Set();
    (filteredGridRows || []).forEach((r) => {
      if (r.designation && r.designation !== "—") names.add(r.designation);
    });
    return [...names]
      .sort((a, b) => a.localeCompare(b))
      .map((n) => ({ value: n, label: n }));
  }, [filteredGridRows]);


  const setFilter = (key) => (value) =>
    setDetailsFilters((prev) => ({
      ...prev,
      [key]: value === "" || value === undefined ? null : value,
    }));

  // Figma "Record filters": two rows of four.
  const filterFields = [
    {
      key: "search",
      type: "search",
      label: "Search",
      placeholder: "Search employee name or code…",
      value: searchText,
      onChange: setSearchText,
    },
    {
      key: "date",
      type: "date",
      label: "Date / Period",
      placeholder: "Selected period",
      value: selectedDate,
      onChange: (d) => setSelectedDate(d ?? new Date()),
    },
    {
      key: "branch",
      render: (
        <BranchFilter
          variant="panel"
          width="100%"
          label="Branch"
          allLabel="All branches"
          value={selectedBranchId}
          onChange={setSelectedBranchId}
        />
      ),
    },
    {
      key: "designation",
      label: "Designation",
      placeholder: "All designations",
      value: detailsFilters.designation ?? "",
      onChange: setFilter("designation"),
      options: designationOptions,
    },
    {
      key: "status",
      label: "Status",
      placeholder: "All attendance statuses",
      value: detailsFilters.status ?? "",
      onChange: setFilter("status"),
      options: [
        { value: "Present", label: "Present" },
        { value: "Rest Day - P", label: "Rest Day – Present" },
        { value: "Rest Day", label: "Rest Day" },
        { value: "Absent", label: "Absent" },
      ],
    },
    {
      key: "timeliness",
      label: "Timeliness",
      placeholder: "All timeliness",
      value: detailsFilters.timeliness ?? "",
      onChange: setFilter("timeliness"),
      options: [
        { value: "ontime", label: "On time" },
        { value: "late", label: "Late" },
        { value: "early", label: "Early" },
      ],
    },
    {
      key: "restDay",
      label: "Rest Day",
      placeholder: "All rest days",
      value: detailsFilters.restDay ?? "",
      onChange: (v) =>
        setFilter("restDay")(v === "" ? null : v === "unset" ? "unset" : Number(v)),
      options: [
        ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({
          value: n,
          label: REST_DAY_PIE_FULL_LABEL[n],
        })),
        { value: "unset", label: "Unset" },
      ],
    },
    {
      key: "sortBy",
      label: "Sort by",
      placeholder: false,
      value: sortBy,
      onChange: setSortBy,
      options: [
        { value: "total", label: "Total" },
        { value: "employee", label: "Employee" },
        { value: "code", label: "Code" },
      ],
    },
  ];

  const presentAbsentLegend = presentAbsentData.map((d) => ({
    name: d.name,
    value: d.count,
    fill: d.status === "Absent" ? "#BC3745" : d.status === "Present" ? "#147D52" : d.fill,
    labelColor:
      d.status === "Present" ? "#147D52" : d.status === "Absent" ? "#BC3745" : undefined,
    onClick: () => toggleStatusFilter(d.status),
  }));

  const unfilledTotal = allocationByDesignationData.reduce(
    (sum, r) => sum + (r.unfilled || 0),
    0
  );

  const metricCards = [
    { status: "Present", label: "Present" },
    { status: "Rest Day - P", label: "Rest Day – Present" },
    { status: "Rest Day", label: "Rest Day" },
    { status: "Absent", label: "Absent" },
  ];

  const loading = loadingAttendance || loadingEmployees || loadingAllocations;

  return (
    <GlobalWrapper permissionKey="view_attendance_dashboard">
      <Flex direction="column" gap="24px">
        <DashboardPageTitle title="Attendance Dashboard" />

        <DashboardFilterPanel fields={filterFields} />

        {loading ? (
          <Flex justify="center" py={8}>
            <Spinner size="sm" />
          </Flex>
        ) : gridRows.length === 0 ? (
          <Text color="fg.muted" fontSize="12px">
            No active employees to show.
          </Text>
        ) : (
          <>
            <DashboardMetricRow>
              {metricCards.map((m) => (
                <DashboardMetricCard
                  key={m.status}
                  label={m.label}
                  value={statusCounts[m.status] ?? 0}
                  caption="Selected attendance date"
                  active={detailsFilters.status === m.status}
                  onClick={() => toggleStatusFilter(m.status)}
                />
              ))}
            </DashboardMetricRow>

            <DashboardTwoColumn>
              <DashboardCard title="Present vs Absent">
                <Box>
                  <DashboardBarChart
                    data={presentAbsentData}
                    xDataKey="name"
                    bars={presentAbsentBars}
                    height="216px"
                    showLegend={false}
                    emptyMessage="No data to display"
                    onBarClick={handlePresentAbsentBarClick}
                  />
                  <DashboardChartLegend items={presentAbsentLegend} columns={2} />
                </Box>
              </DashboardCard>

              <DashboardCard title="Allocation by Designation">
                <Flex align="center" justify="space-between" gap="16px">
                  <Text
                    as="span"
                    bg="app.tableHeader"
                    color="#C95C18"
                    fontSize="10px"
                    fontWeight="500"
                    lineHeight="12px"
                    px="8px"
                    py="5px"
                    borderRadius="8px"
                  >
                    Unfilled · {unfilledTotal}
                  </Text>
                  <Checkbox.Root
                    size="xs"
                    checked={showAllocationFilled}
                    onCheckedChange={(e) =>
                      setShowAllocationFilled(e.checked ?? false)
                    }
                    gap="7px"
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control
                      boxSize="12px"
                      borderRadius="2px"
                      borderColor="border"
                    />
                    <Checkbox.Label fontSize="11px" fontWeight="400" color="fg.muted">
                      Show Filled
                    </Checkbox.Label>
                  </Checkbox.Root>
                </Flex>
                <AllocationBars
                  rows={allocationChartData}
                  showFilled={showAllocationFilled}
                  activeDesignation={detailsFilters.designation}
                  onSelect={handleAllocationBarClick}
                />
              </DashboardCard>
            </DashboardTwoColumn>

            <DashboardTwoColumn>
              <DashboardCard title="Rest Day Stats">
                <RestDayDistributionPie
                  data={restDayPieData}
                  emptyMessage="No employees in scope"
                  onSliceClick={(entry) => {
                    const key = entry?.restDayKey;
                    if (key === undefined || key === null) return;
                    toggleRestDayFilter(key);
                  }}
                />
              </DashboardCard>

              <DashboardCard title="Attendance Stats">
                <Box>
                  <DashboardBarChart
                    data={attendanceStatsData}
                    xDataKey="name"
                    bars={attendanceStatsBars}
                    height="190px"
                    showLegend={true}
                    legendColumns={2}
                    emptyMessage="No data to display"
                    onBarClick={handleAttendanceStatsBarClick}
                  />
                </Box>
              </DashboardCard>
            </DashboardTwoColumn>

            <DashboardTabs
              tabs={[{ value: "list", label: "List" }]}
              value="list"
            />

            <DashboardCard
              title="Attendance Details"
              subtitle="Use search, filters and sorting to narrow records."
            >
              <AgGrid
                bare
                tableKey="attendance-dashboard"
                rowData={listRows}
                columnDefs={columnDefs}
              />
            </DashboardCard>

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
          </>
        )}
      </Flex>
    </GlobalWrapper>
  );
}

export default AttendanceDashboard;
