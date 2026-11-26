"use client";

import { getChecklistFormsWithSubmissionStats } from "@/api/helpers/checklist_forms";
import AgGrid from "@/components/AgGrid";
import CalendarDots from "@/components/CalendarDots";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import { CHECKLIST_RESPONSE_ROUTES } from "@/constants/routes";
import { buildChecklistResponsesColumnDefs } from "@/utils/checklistResponseTableColDefs";
import {
  buildChecklistCalendarDayOverrides,
  formCreatedOnOrBeforeDate,
  isCalendarFutureDate,
  submissionStatsEntriesForFormDate,
  submissionStatsKeyForYmd,
} from "@/utils/checklistSubmissionStatsCalendar";
import { Box, Flex, NativeSelect, Text, VStack } from "@chakra-ui/react";
import moment from "moment";
import { useRouter } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function yearOptions(anchorYear, span = 4) {
  const ys = [];
  for (let y = anchorYear - span; y <= anchorYear + span; y++) ys.push(y);
  return ys;
}

function monthRangeIso(year, monthIndex0) {
  const start = moment({ year, month: monthIndex0, day: 1 });
  const end = moment({ year, month: monthIndex0 }).endOf("month");
  return {
    startIso: start.format("YYYY-MM-DD"),
    endIso: end.format("YYYY-MM-DD"),
  };
}

/**
 * Listing: Daily Records Calendar (same shell as UserDetailsPanel) + grid of forms
 * with stats for the selected date.
 */
export default function ChecklistResponseListing() {
  const router = useRouter();
  const gridRef = useRef(null);
  const anchorYear = useMemo(() => new Date().getFullYear(), []);

  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [calYear, setCalYear] = useState(() => moment().year());
  const [calMonth0, setCalMonth0] = useState(() => moment().month());
  const [selectedYmd, setSelectedYmd] = useState(() =>
    moment().format("YYYY-MM-DD")
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

  /**
   * One grid row per (form × branch) for the selected day when the API returns
   * multiple branch submissions; otherwise one row per form.
   */
  const tableRowsForSelectedDate = useMemo(() => {
    if (isCalendarFutureDate(selectedYmd)) return [];
    const statsKey = submissionStatsKeyForYmd(selectedYmd);
    const out = [];
    for (const f of rowData) {
      if (!formCreatedOnOrBeforeDate(f, selectedYmd)) continue;
      if (!statsKey) {
        out.push({
          ...f,
          _responseBranchKey: `${f.id}-na`,
          _branchStat: null,
        });
        continue;
      }
      const entries = submissionStatsEntriesForFormDate(f, selectedYmd);
      if (entries.length === 0) {
        out.push({
          ...f,
          _responseBranchKey: `${f.id}-none`,
          _branchStat: null,
        });
      } else {
        for (const stat of entries) {
          const bid =
            stat.branch_id != null && stat.branch_id !== ""
              ? String(stat.branch_id)
              : "x";
          out.push({
            ...f,
            _responseBranchKey: `${f.id}-${bid}`,
            _branchStat: stat,
          });
        }
      }
    }
    return out;
  }, [rowData, selectedYmd]);

  const calendarDayOverrides = useMemo(
    () => buildChecklistCalendarDayOverrides(rowData, calYear, calMonth0),
    [rowData, calYear, calMonth0]
  );

  const { startIso, endIso } = useMemo(
    () => monthRangeIso(calYear, calMonth0),
    [calYear, calMonth0]
  );

  const years = useMemo(() => yearOptions(anchorYear, 4), [anchorYear]);

  const snapSelectionToVisibleMonth = useCallback((year, month0) => {
    const start = moment({ year, month: month0, day: 1 });
    const end = moment({ year, month: month0 }).endOf("month");
    setSelectedYmd((prev) => {
      const sel = moment(prev, "YYYY-MM-DD", true);
      if (
        !sel.isValid() ||
        sel.isBefore(start, "day") ||
        sel.isAfter(end, "day")
      ) {
        return start.format("YYYY-MM-DD");
      }
      return prev;
    });
  }, []);

  const colDefs = useMemo(
    () => buildChecklistResponsesColumnDefs(router, selectedYmd),
    [router, selectedYmd]
  );

  const selectedLabel = useMemo(
    () =>
      moment(selectedYmd, "YYYY-MM-DD", true).isValid()
        ? moment(selectedYmd, "YYYY-MM-DD").format("DD MMMM YYYY")
        : selectedYmd,
    [selectedYmd]
  );

  return (
    <GlobalWrapper
      permissionKey={CHECKLIST_RESPONSE_ROUTES.listing.permissionKey}
    >
      <CustomContainer title={CHECKLIST_RESPONSE_ROUTES.listing.title}>
        <VStack align="stretch" gap={6}>
          <CustomContainer
            title="Daily Records Calendar"
            color="secondary"
            size="sm"
          >
            <Flex flexWrap="wrap" gap={4} align="flex-end" mb={4}>
              <Box>
                <Text fontSize="xs" color="gray.600" mb={1}>
                  Year
                </Text>
                <NativeSelect.Root size="sm" width="100px">
                  <NativeSelect.Field
                    value={String(calYear)}
                    onChange={(e) => {
                      const y = Number(e.target.value);
                      setCalYear(y);
                      snapSelectionToVisibleMonth(y, calMonth0);
                    }}
                    borderRadius="md"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.600" mb={1}>
                  Month
                </Text>
                <NativeSelect.Root size="sm" width="140px">
                  <NativeSelect.Field
                    value={String(calMonth0)}
                    onChange={(e) => {
                      const m0 = Number(e.target.value);
                      setCalMonth0(m0);
                      snapSelectionToVisibleMonth(calYear, m0);
                    }}
                    borderRadius="md"
                  >
                    {MONTHS.map((name, i) => (
                      <option key={name} value={i}>
                        {name}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Box>
            </Flex>
            <CalendarDots
              startDate={startIso}
              endDate={endIso}
              records={[]}
              title=""
              selectedDate={selectedYmd}
              onDateSelect={setSelectedYmd}
              dayOverrides={calendarDayOverrides}
            />
          </CustomContainer>

          <CustomContainer
            title={`Responses - ${selectedLabel}`}
            color="secondary"
            size="sm"
          >
            <AgGrid
              ref={gridRef}
              rowData={loading ? [] : tableRowsForSelectedDate}
              columnDefs={colDefs}
              tableKey={`checklist-responses-${selectedYmd}`}
              gridOptions={{
                getRowId: (p) =>
                  p.data?._responseBranchKey != null
                    ? String(p.data._responseBranchKey)
                    : String(p.data?.id ?? ""),
              }}
            />
          </CustomContainer>
        </VStack>
      </CustomContainer>
    </GlobalWrapper>
  );
}
