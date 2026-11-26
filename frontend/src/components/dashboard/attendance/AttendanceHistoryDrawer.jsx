"use client";

import React, { useMemo } from "react";
import moment from "moment";
import Image from "next/image";
import { Box, Flex, Grid, Spinner, Text } from "@chakra-ui/react";
import CustomDrawer from "@/components/CustomDrawer";
import { Tooltip } from "@/components/ui/tooltip";
import { formatRestDayName } from "@/utils/restDay";

function formatDuration(ms) {
  if (ms == null || ms < 0 || !Number.isFinite(ms)) return "-";
  const totalMins = Math.round(ms / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function AttendanceHistoryDrawer({
  employeeCode,
  isOpen,
  onClose,
  fromDate,
  toDate,
  byDate,
  activeEmployees,
  filteredGridRows,
  empCodeToDesignation,
  empCodeToBranch,
}) {
  const monthStart = useMemo(
    () => moment(fromDate, "YYYY-MM-DD").startOf("day"),
    [fromDate]
  );
  const monthEnd = useMemo(
    () => moment(toDate, "YYYY-MM-DD").startOf("day"),
    [toDate]
  );

  const selectedEmployeeMeta = useMemo(() => {
    if (!employeeCode) return null;

    const empRow = (filteredGridRows || []).find(
      (r) => String(r.employee_code) === String(employeeCode)
    );
    const empMaster = (activeEmployees || []).find(
      (e) => String(e.employee_code) === String(employeeCode)
    );

    return {
      employee_code: employeeCode,
      employee_name:
        empRow?.employee_name ??
        empMaster?.employee_name ??
        String(employeeCode),
      designation: empCodeToDesignation?.[employeeCode] ?? "—",
      branch_name:
        empRow?.branch_name ??
        empMaster?.branch_name ??
        empCodeToBranch?.[employeeCode]?.branch_name ??
        "—",
      profile_img_url: empMaster?.profile_img_url ?? null,
      rest_day: Number(empMaster?.rest_day) || 0,
    };
  }, [
    employeeCode,
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
    if (!employeeCode) return null;
    const minutesOfDay = (m) => m.hours() * 60 + m.minutes();
    const todayStr = moment().format("YYYY-MM-DD");

    let presentDays = 0;
    let totalMs = 0;
    let sumCheckInMin = 0;
    let cntCheckIn = 0;
    let sumCheckOutMin = 0;
    let cntCheckOut = 0;

    const empMaster = (activeEmployees || []).find(
      (e) => String(e.employee_code) === String(employeeCode)
    );
    const restDay = Number(empMaster?.rest_day) || 0;

    const days = monthDays.map((day) => {
      const dateStr = day.format("YYYY-MM-DD");
      const row = byDate?.[dateStr]?.[employeeCode];
      if (!row) {
        // Check if this day is a rest day
        const dayOfWeek = day.day(); // 0=Sunday, 6=Saturday
        const restDayValue = dayOfWeek === 0 ? 1 : dayOfWeek + 1; // Convert to 1=Sunday, 7=Saturday
        const isRestDay = restDay > 0 && restDay === restDayValue;
        return {
          dateStr,
          day,
          status: isRestDay ? "Rest Day" : "Absent",
          sessions: [],
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
        totalMs: dayTotalMs,
      };
    });

    const totalDays = days.length;
    const restDays = days.filter((d) => d.status === "Rest Day").length;
    const absentDays = Math.max(0, totalDays - presentDays - restDays);

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
      restDays,
      totalMs,
      totalHours: Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100,
      avgCheckIn: formatAvgTime(avgCheckInMin),
      avgCheckOut: formatAvgTime(avgCheckOutMin),
    };
  }, [employeeCode, monthDays, byDate, activeEmployees]);

  const content = useMemo(() => {
    if (!selectedEmployeeMeta || !employeeMonth) {
      return (
        <Flex justify="center" py={8}>
          <Spinner size="sm" />
        </Flex>
      );
    }

    const minutesOfDay = (m) => m.hours() * 60 + m.minutes();

    const DEFAULT_START = 8 * 60;
    const DEFAULT_END = 20 * 60;
    let minCheckInMin = null;
    let maxCheckOutMin = null;
    for (const d of employeeMonth.days) {
      if (d.status !== "Present" || !d.sessions?.length) continue;
      for (const s of d.sessions) {
        if (s.start)
          minCheckInMin =
            minCheckInMin == null
              ? minutesOfDay(s.start)
              : Math.min(minCheckInMin, minutesOfDay(s.start));
        if (s.end)
          maxCheckOutMin =
            maxCheckOutMin == null
              ? minutesOfDay(s.end)
              : Math.max(maxCheckOutMin, minutesOfDay(s.end));
      }
    }
    const startMin =
      minCheckInMin != null
        ? Math.floor(minCheckInMin / 60) * 60
        : DEFAULT_START;
    let endMin =
      maxCheckOutMin != null
        ? Math.ceil(maxCheckOutMin / 60) * 60 + 60
        : DEFAULT_END;
    endMin = Math.min(endMin, 24 * 60);
    if (endMin <= startMin) endMin = startMin + 60;

    const hourHeight = 36;
    const pxPerMin = hourHeight / 60;
    const timeAxisW = 44;
    const gridH = Math.round((endMin - startMin) * pxPerMin);

    const tickMins = [];
    for (let m = startMin; m <= endMin; m += 60) tickMins.push(m);
    if (tickMins[tickMins.length - 1] !== endMin) tickMins.push(endMin);

    // For current month, don't include future days in attendance %
    const today = moment().startOf("day");
    const isCurrentMonth = monthStart.isSame(today, "month");
    const cutoffDay = isCurrentMonth ? moment.min(today, monthEnd) : monthEnd;
    const daysForPct = (employeeMonth.days || []).filter((d) =>
      d.day.isSameOrBefore(cutoffDay, "day")
    );
    const totalDaysForPct = daysForPct.length;
    const presentDaysForPct = daysForPct.filter(
      (d) => d.status === "Present"
    ).length;
    const restDaysForPct = daysForPct.filter(
      (d) => d.status === "Rest Day"
    ).length;
    const absentDaysForPct = daysForPct.filter(
      (d) => d.status === "Absent"
    ).length;
    const presentPct = totalDaysForPct
      ? Math.round((presentDaysForPct / totalDaysForPct) * 100)
      : 0;
    const restDayPct = totalDaysForPct
      ? Math.round((restDaysForPct / totalDaysForPct) * 100)
      : 0;
    const absentPct = totalDaysForPct
      ? Math.round((absentDaysForPct / totalDaysForPct) * 100)
      : 0;

    return (
      <Flex direction="column" gap={4}>
        <Flex justify="space-between" gap={4} flexWrap="wrap">
          <Flex align="center" gap={3}>
            {selectedEmployeeMeta.profile_img_url ? (
              <Box
                w="64px"
                h="64px"
                borderRadius="lg"
                overflow="hidden"
                position="relative"
                flexShrink={0}
              >
                <Image
                  src={selectedEmployeeMeta.profile_img_url}
                  alt={selectedEmployeeMeta.employee_name}
                  fill
                  style={{ objectFit: "cover" }}
                />
              </Box>
            ) : null}
            <Box>
              <Text fontWeight="semibold">
                {selectedEmployeeMeta.employee_name}
              </Text>
              <Text fontSize="xs" color="gray.600">
                {selectedEmployeeMeta.designation} ·{" "}
                {selectedEmployeeMeta.branch_name}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {monthStart.format("MMM D")} - {monthEnd.format("MMM D, YYYY")}
              </Text>
            </Box>
          </Flex>

          <Grid
            templateColumns={{
              base: "repeat(2, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
            }}
            gap={4}
            minW={{ base: "100%", md: "520px" }}
          >
            <Box>
              <Text fontSize="xs" color="gray.500">
                Total Attendance
              </Text>
              <Text fontWeight="semibold">
                {employeeMonth.presentDays} days
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500">
                Total Hours
              </Text>
              <Text fontWeight="semibold">
                {employeeMonth.totalHours} hours
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500">
                Avg check in
              </Text>
              <Text fontWeight="semibold">{employeeMonth.avgCheckIn}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500">
                Avg check out
              </Text>
              <Text fontWeight="semibold">{employeeMonth.avgCheckOut}</Text>
            </Box>
          </Grid>
        </Flex>

        <Flex gap={2} flexWrap="wrap" fontSize="xs">
          <Flex
            align="center"
            gap={2}
            px={3}
            py={1.5}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="full"
          >
            <Box w="6px" h="6px" borderRadius="full" bg="#38A169" />
            <Text>Present {presentPct}%</Text>
          </Flex>
          {selectedEmployeeMeta.rest_day > 0 && (
            <Flex
              align="center"
              gap={2}
              px={3}
              py={1.5}
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="full"
            >
              <Box w="6px" h="6px" borderRadius="full" bg="#ED8936" />
              <Text>
                Rest Day: {formatRestDayName(selectedEmployeeMeta.rest_day)} (
                {restDayPct}%)
              </Text>
            </Flex>
          )}
          <Flex
            align="center"
            gap={2}
            px={3}
            py={1.5}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="full"
          >
            <Box w="6px" h="6px" borderRadius="full" bg="#718096" />
            <Text>Absent {absentPct}%</Text>
          </Flex>
        </Flex>

        <Box
          borderWidth="1px"
          borderColor="gray.100"
          borderRadius="md"
          overflow="hidden"
          w="100%"
        >
          <Box overflow="auto" maxH="560px" w="100%">
            <Flex direction="column" w="100%" minW={0} px={2} py={2}>
              {/* Sticky Header row */}
              <Flex
                position="sticky"
                top={0}
                zIndex={3}
                bg="white"
                pt={1}
                pb={2}
                w="100%"
                minW={0}
              >
                <Box
                  w={`${timeAxisW}px`}
                  flexShrink={0}
                  position="sticky"
                  left={0}
                  zIndex={4}
                  bg="white"
                />
                <Flex flex={1} minW={0}>
                  {employeeMonth.days.map((d) => (
                    <Box
                      key={d.dateStr}
                      flex={1}
                      minW={0}
                      textAlign="center"
                      fontSize="2xs"
                      color="gray.600"
                    >
                      <Text fontWeight="semibold" color="gray.700">
                        {d.day.format("D")}
                      </Text>
                      <Text>{d.day.format("dd")}</Text>
                    </Box>
                  ))}
                </Flex>
              </Flex>

              {/* Timeline grid */}
              <Flex mt={2} w="100%" minW={0}>
                {/* Sticky Time axis */}
                <Box
                  w={`${timeAxisW}px`}
                  flexShrink={0}
                  position="sticky"
                  left={0}
                  zIndex={2}
                  bg="white"
                  h={`${gridH}px`}
                >
                  <Box position="relative" h="100%">
                    {tickMins.map((m) => {
                      const top = (m - startMin) * pxPerMin - 8;
                      return (
                        <Box
                          key={m}
                          position="absolute"
                          top={`${Math.max(0, top)}px`}
                          right="4px"
                        >
                          <Text fontSize="2xs" color="gray.500">
                            {moment()
                              .startOf("day")
                              .add(m, "minutes")
                              .format("h A")}
                          </Text>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>

                {/* Day columns */}
                <Flex flex={1} minW={0}>
                  {employeeMonth.days.map((d) => {
                    const dayStartMin = startMin;
                    const dayEndMin = endMin;

                    return (
                      <Box
                        key={d.dateStr}
                        flex={1}
                        minW={0}
                        position="relative"
                        h={`${gridH}px`}
                        borderLeftWidth="1px"
                        borderColor="gray.100"
                        bg={
                          d.status === "Absent"
                            ? "gray.50"
                            : d.status === "Rest Day"
                            ? "orange.50"
                            : "white"
                        }
                      >
                        {/* time grid lines */}
                        {tickMins.map((m) => (
                          <Box
                            key={m}
                            position="absolute"
                            top={`${(m - startMin) * pxPerMin}px`}
                            left={0}
                            right={0}
                            borderTopWidth="1px"
                            borderColor="gray.100"
                          />
                        ))}

                        {d.status === "Absent" ? (
                          <Flex
                            position="absolute"
                            inset={0}
                            direction="column"
                            align="center"
                            justify="center"
                            color="gray.400"
                            fontSize="2xs"
                          >
                            <Text>Abs</Text>
                          </Flex>
                        ) : d.status === "Rest Day" ? (
                          <Flex
                            position="absolute"
                            inset={0}
                            direction="column"
                            align="center"
                            justify="center"
                            color="orange.500"
                            fontSize="2xs"
                            fontWeight="medium"
                          >
                            <Text>Rest</Text>
                          </Flex>
                        ) : (
                          <>
                            {d.sessions.map((s, idx) => {
                              if (!s.start || !s.end) return null;
                              const startMin = minutesOfDay(s.start);
                              const endMin = minutesOfDay(s.end);
                              const clampedStart = Math.max(
                                dayStartMin,
                                startMin
                              );
                              const clampedEnd = Math.min(dayEndMin, endMin);
                              if (clampedEnd <= clampedStart) return null;

                              const top =
                                (clampedStart - dayStartMin) * pxPerMin;
                              const height =
                                (clampedEnd - clampedStart) * pxPerMin;

                              return (
                                <Tooltip
                                  key={idx}
                                  content={
                                    <Box px={2} py={1.5}>
                                      <Text
                                        fontSize="xs"
                                        fontWeight="semibold"
                                        color="gray.800"
                                      >
                                        {d.day.format("ddd, MMM D")}
                                      </Text>
                                      <Text
                                        fontSize="xs"
                                        color="blue.600"
                                        mt={0.5}
                                      >
                                        In: {s.start.format("h:mm A")}
                                      </Text>
                                      <Text fontSize="xs" color="red.600">
                                        Out: {s.end.format("h:mm A")}
                                      </Text>
                                      <Text
                                        fontSize="xs"
                                        color="gray.600"
                                        mt={0.5}
                                      >
                                        Total: {formatDuration(s.durationMs)}
                                      </Text>
                                    </Box>
                                  }
                                  contentProps={{ padding: "0px" }}
                                >
                                  <Box
                                    position="absolute"
                                    left="4px"
                                    right="4px"
                                    top={`${top}px`}
                                    h={`${height}px`}
                                    bg="blue.100"
                                    borderColor="blue.300"
                                    borderWidth="1px"
                                    borderRadius="md"
                                  />
                                </Tooltip>
                              );
                            })}

                            <Box
                              position="absolute"
                              bottom="4px"
                              left="2px"
                              right="2px"
                            >
                              <Text
                                fontSize="10px"
                                color="gray.500"
                                textAlign="center"
                                pl="4px"
                                pr="4px"
                              >
                                {formatDuration(d.totalMs)}
                              </Text>
                            </Box>
                          </>
                        )}
                      </Box>
                    );
                  })}
                </Flex>
              </Flex>
            </Flex>
          </Box>
        </Box>
      </Flex>
    );
  }, [selectedEmployeeMeta, employeeMonth, monthStart, monthEnd]);

  return (
    <CustomDrawer
      title={
        selectedEmployeeMeta
          ? `Attendance history - ${selectedEmployeeMeta.employee_name}`
          : "Attendance history"
      }
      isOpen={isOpen}
      setIsOpen={(open) => {
        if (!open) onClose?.();
      }}
      size="full"
      content={content}
      footer={null}
    >
      <Box display="none" />
    </CustomDrawer>
  );
}

export default AttendanceHistoryDrawer;
