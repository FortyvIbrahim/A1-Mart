"use client";

import CustomContainer from "@/components/CustomContainer";
import DashboardBarChart from "@/components/dashboard/DashboardBarChart";
import DashboardChartLegend from "@/components/dashboard/DashboardChartLegend";
import { isCalendarFutureDate } from "@/utils/checklistSubmissionStatsCalendar";
import {
  Box,
  Center,
  Flex,
  Grid,
  GridItem,
  Spinner,
  Text,
} from "@chakra-ui/react";
import {
  Cell,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

const PIE_COLORS = {
  "On time": "#38A169",
  Late: "#E53E3E",
  Pending: "#ECC94B",
};

const CONTRIBUTOR_ON_TIME = "#38A169";
const CONTRIBUTOR_LATE = "#E53E3E";
const BRANCH_PENDING = PIE_COLORS.Pending;

export default function ChecklistDashboardChartsGrid({
  loading,
  barLoading,
  fromYmd,
  toYmdStr,
  pieData,
  pendingTotal,
  onPendingPieClick,
  formsForBarSelect,
  contributorBarRows,
  contributorLegendItems,
  contributorGraphHeight,
  branchBarRows,
  branchLegendItems,
  branchGraphHeight,
  formSelectControl,
}) {
  return (
    <Grid
      templateColumns={{
        base: "1fr",
        lg: "minmax(0, 1.5fr) minmax(0, 2fr) minmax(0, 2fr)",
      }}
      gap={6}
      alignItems="stretch"
    >
      <GridItem minW={0}>
        <CustomContainer title="Stats" color="brand" size="sm" fullWidth>
          {loading ? (
            <Center minH="220px">
              <Spinner color="brand.500" />
            </Center>
          ) : pieData.length === 0 ? (
            <Text fontSize="sm" color="gray.500">
              No question slots in range (only future days, or no eligible
              forms).
            </Text>
          ) : (
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
                      onClick={(entry) => {
                        const name = entry?.name ?? entry?.payload?.name;
                        if (name === "Pending" && pendingTotal > 0) {
                          void onPendingPieClick?.();
                        }
                      }}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.name}-${index}`}
                          fill={
                            entry.color ?? PIE_COLORS[entry.name] ?? "#CBD5E0"
                          }
                          style={{
                            cursor:
                              entry.name === "Pending" && pendingTotal > 0
                                ? "pointer"
                                : "default",
                          }}
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
                  fill: d.color ?? PIE_COLORS[d.name] ?? "#CBD5E0",
                }))}
                columns={3}
              />
            </Box>
          )}
        </CustomContainer>
      </GridItem>

      <GridItem minW={0}>
        <CustomContainer
          title="Contributors"
          color="secondary"
          size="sm"
          fullWidth
          rightSection={formSelectControl}
        >
          {!toYmdStr || !fromYmd ? (
            <Text fontSize="sm" color="gray.500">
              Select From and To dates.
            </Text>
          ) : isCalendarFutureDate(toYmdStr) ? (
            <Text fontSize="sm" color="gray.500">
              Pick a &quot;To&quot; date that is today or in the past.
            </Text>
          ) : !formsForBarSelect.length ? (
            <Text fontSize="sm" color="gray.500">
              No forms exist for the selected &quot;To&quot; date.
            </Text>
          ) : barLoading ? (
            <Center minH="220px">
              <Spinner color="secondary.500" />
            </Center>
          ) : (
            <Box w="100%" minW={0}>
              <DashboardBarChart
                data={contributorBarRows}
                xDataKey="name"
                bars={[
                  {
                    dataKey: "onTime",
                    fill: CONTRIBUTOR_ON_TIME,
                    stackId: "contributors",
                  },
                  {
                    dataKey: "late",
                    fill: CONTRIBUTOR_LATE,
                    stackId: "contributors",
                    labelOnTop: true,
                    labelDataKey: "total",
                  },
                ]}
                showLegend={false}
                legendItems={contributorLegendItems}
                legendColumns={2}
                height={"250px"}
                graphHeight={contributorGraphHeight}
                scrollable={contributorBarRows.length > 4}
                xAxisDy={8}
                emptyMessage="No answered questions for this form in the selected range"
                valueFormatter={(v) => (v === 0 ? "" : String(v))}
                tooltipLabelMap={{
                  onTime: "On time",
                  late: "Late",
                }}
                tooltipContent={(payload) => {
                  if (!payload?.length) return null;
                  const person = payload[0]?.payload;
                  const emp = person?.name ?? "-";
                  return (
                    <Flex
                      bg="white"
                      borderRadius="md"
                      boxShadow="md"
                      px={3}
                      py={2}
                      borderWidth="1px"
                      borderColor="gray.100"
                      flexDirection="column"
                      gap={1}
                      fontSize="sm"
                    >
                      <Text fontWeight="semibold">{emp}</Text>
                      {payload.map((item, i) => {
                        const key = item.dataKey;
                        const label =
                          key === "late"
                            ? "Late"
                            : key === "onTime"
                            ? "On time"
                            : String(key ?? "");
                        const fill =
                          key === "late"
                            ? CONTRIBUTOR_LATE
                            : CONTRIBUTOR_ON_TIME;
                        const n = Number(item.value) || 0;
                        if (n === 0) return null;
                        return (
                          <Flex key={i} align="center" gap={2}>
                            <Box
                              w="8px"
                              h="8px"
                              minW="8px"
                              minH="8px"
                              borderRadius="2px"
                              bg={fill}
                              flexShrink={0}
                            />
                            <Text>
                              {label}: {n} {n === 1 ? "question" : "questions"}
                            </Text>
                          </Flex>
                        );
                      })}
                    </Flex>
                  );
                }}
              />
              <DashboardChartLegend
                items={contributorLegendItems}
                columns={2}
              />
            </Box>
          )}
        </CustomContainer>
      </GridItem>

      <GridItem minW={0}>
        <CustomContainer
          title="Contributors (Branch)"
          color="secondary"
          size="sm"
          fullWidth
          rightSection={formSelectControl}
        >
          {!toYmdStr || !fromYmd ? (
            <Text fontSize="sm" color="gray.500">
              Select From and To dates.
            </Text>
          ) : isCalendarFutureDate(toYmdStr) ? (
            <Text fontSize="sm" color="gray.500">
              Pick a &quot;To&quot; date that is today or in the past.
            </Text>
          ) : !formsForBarSelect.length ? (
            <Text fontSize="sm" color="gray.500">
              No forms exist for the selected &quot;To&quot; date.
            </Text>
          ) : loading ? (
            <Center minH="220px">
              <Spinner color="secondary.500" />
            </Center>
          ) : (
            <Box w="100%" minW={0}>
              <DashboardBarChart
                data={branchBarRows}
                xDataKey="name"
                bars={[
                  {
                    dataKey: "onTime",
                    fill: CONTRIBUTOR_ON_TIME,
                    stackId: "branch",
                  },
                  {
                    dataKey: "late",
                    fill: CONTRIBUTOR_LATE,
                    stackId: "branch",
                  },
                  {
                    dataKey: "pending",
                    fill: BRANCH_PENDING,
                    stackId: "branch",
                    labelOnTop: true,
                    labelDataKey: "stackLabel",
                  },
                ]}
                showLegend={false}
                legendItems={branchLegendItems}
                legendColumns={3}
                height={"250px"}
                graphHeight={branchGraphHeight}
                scrollable={branchBarRows.length > 4}
                xAxisDy={8}
                emptyMessage="No branch submission stats for this form in the selected range"
                valueFormatter={(v) => (v === 0 || v === "" ? "" : String(v))}
                tooltipLabelMap={{
                  onTime: "On time",
                  late: "Late",
                  pending: "Pending",
                }}
                tooltipContent={(payload) => {
                  if (!payload?.length) return null;
                  const row = payload[0]?.payload;
                  const label = row?.name ?? "-";
                  const pct =
                    row?.completionPct != null
                      ? `${row.completionPct}% complete`
                      : null;
                  return (
                    <Flex
                      bg="white"
                      borderRadius="md"
                      boxShadow="md"
                      px={3}
                      py={2}
                      borderWidth="1px"
                      borderColor="gray.100"
                      flexDirection="column"
                      gap={1}
                      fontSize="sm"
                    >
                      <Text fontWeight="semibold">{label}</Text>
                      {pct ? (
                        <Text fontSize="xs" color="gray.600">
                          {pct}
                        </Text>
                      ) : null}
                      {payload.map((item, i) => {
                        const key = item.dataKey;
                        const map = {
                          late: "Late",
                          onTime: "On time",
                          pending: "Pending",
                        };
                        const lbl = map[key] ?? String(key ?? "");
                        const fill =
                          key === "late"
                            ? CONTRIBUTOR_LATE
                            : key === "pending"
                            ? BRANCH_PENDING
                            : CONTRIBUTOR_ON_TIME;
                        const n = Number(item.value) || 0;
                        if (n === 0) return null;
                        const unit =
                          key === "pending"
                            ? n === 1
                              ? "slot"
                              : "slots"
                            : n === 1
                            ? "question"
                            : "questions";
                        return (
                          <Flex key={i} align="center" gap={2}>
                            <Box
                              w="8px"
                              h="8px"
                              minW="8px"
                              minH="8px"
                              borderRadius="2px"
                              bg={fill}
                              flexShrink={0}
                            />
                            <Text>
                              {lbl}: {n} {unit}
                            </Text>
                          </Flex>
                        );
                      })}
                    </Flex>
                  );
                }}
              />
              <DashboardChartLegend items={branchLegendItems} columns={3} />
            </Box>
          )}
        </CustomContainer>
      </GridItem>
    </Grid>
  );
}
