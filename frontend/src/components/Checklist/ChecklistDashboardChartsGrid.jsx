"use client";

import DashboardBarChart from "@/components/dashboard/DashboardBarChart";
import { DashboardCard } from "@/components/dashboard/DashboardUI";
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

/** Figma checklist colours: on time green, late red, pending amber. */
const PIE_COLORS = {
  "On time": "#11976A",
  Late: "#E7474D",
  Pending: "#E3B63E",
};

const CONTRIBUTOR_ON_TIME = PIE_COLORS["On time"];
const CONTRIBUTOR_LATE = PIE_COLORS.Late;
const BRANCH_PENDING = PIE_COLORS.Pending;

/** Figma status pill text colours ("On time · 0", "Late · 0", "Pending · 0"). */
const PILL = {
  "On time": { bg: "#FFF5ED", color: "#11976A" },
  Late: { bg: "#FFF5ED", color: "#E7474D" },
  Pending: { bg: "#FFF4DB", color: "#946200" },
};

function StatusPills({ items = [] }) {
  return (
    <Flex gap="8px" wrap="wrap">
      {items.map((it) => (
        <Text
          key={it.name}
          as="span"
          px="8px"
          py="5px"
          borderRadius="8px"
          bg={PILL[it.name]?.bg ?? "#FFF5ED"}
          color={PILL[it.name]?.color ?? "#C95C18"}
          fontSize="10px"
          fontWeight="500"
          lineHeight="12px"
        >
          {it.name} · {it.value ?? 0}
        </Text>
      ))}
    </Flex>
  );
}

/** Figma empty chart: 120px #F1E3D9 ring with "0" and the message beside it. */
function EmptyRing({ message }) {
  return (
    <Flex align="center" gap="16px" minH="120px">
      <Flex
        w="120px"
        h="120px"
        flexShrink={0}
        borderRadius="full"
        borderWidth="14px"
        borderColor="#F1E3D9"
        align="center"
        justify="center"
      >
        <Text fontSize="25px" fontWeight="600" color="fg">
          0
        </Text>
      </Flex>
      <Text fontSize="12px" lineHeight="18px" color="fg.muted">
        {message}
      </Text>
    </Flex>
  );
}

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
        lg: "minmax(0, 330fr) minmax(0, 378fr) minmax(0, 378fr)",
      }}
      gap="16px"
      alignItems="stretch"
    >
      <GridItem minW={0}>
        <DashboardCard
          title="Stats"
          h="100%"
          rightSection={
            pendingTotal > 0 ? <StatusPills items={[{ name: "Pending", value: pendingTotal }]} /> : null
          }
        >
          {loading ? (
            <Center minH="220px">
              <Spinner color="brand.500" />
            </Center>
          ) : pieData.length === 0 ? (
            <Text fontSize="12px" color="fg.muted">
              No question slots in range (only future days, or no eligible
              forms).
            </Text>
          ) : (
            <Flex direction="column" gap="16px">
              <Box position="relative" h="150px" w="150px" mx="auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={61}
                      outerRadius={75}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                      isAnimationActive={false}
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
                          fill={PIE_COLORS[entry.name] ?? entry.color ?? "#9AAAC1"}
                          style={{
                            cursor:
                              entry.name === "Pending" && pendingTotal > 0
                                ? "pointer"
                                : "default",
                          }}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value, name) => [`${value}`, name]} />
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
                  <Text fontSize="32px" fontWeight="600" lineHeight="38px" color="fg">
                    {pieData.reduce((sum, d) => sum + (Number(d.value) || 0), 0)}
                  </Text>
                  <Text fontSize="10px" lineHeight="12px" color="fg.muted">
                    total
                  </Text>
                </Flex>
              </Box>
              {pieData.map((d) => (
                <Flex
                  key={d.name}
                  as={d.name === "Pending" && pendingTotal > 0 ? "button" : "div"}
                  onClick={
                    d.name === "Pending" && pendingTotal > 0 ? () => void onPendingPieClick?.() : undefined
                  }
                  align="center"
                  justify="space-between"
                  gap="12px"
                  px="16px"
                  minH="60px"
                  borderRadius="10px"
                  bg="#FFF5ED"
                >
                  <Flex align="center" gap="10px">
                    <Box w="7px" h="7px" borderRadius="full" bg={PIE_COLORS[d.name] ?? d.color} />
                    <Text fontSize="12px" color={PILL[d.name]?.color ?? "fg"}>
                      {d.name}
                    </Text>
                  </Flex>
                  <Text fontSize="20px" fontWeight="600" color="fg">
                    {d.value} forms
                  </Text>
                </Flex>
              ))}
            </Flex>
          )}
        </DashboardCard>
      </GridItem>

      <GridItem minW={0}>
        <DashboardCard title="Contributors" h="100%">
          {formSelectControl}
          {!toYmdStr || !fromYmd ? (
            <Text fontSize="12px" color="fg.muted">
              Select From and To dates.
            </Text>
          ) : isCalendarFutureDate(toYmdStr) ? (
            <Text fontSize="12px" color="fg.muted">
              Pick a &quot;To&quot; date that is today or in the past.
            </Text>
          ) : !formsForBarSelect.length ? (
            <Text fontSize="12px" color="fg.muted">
              No forms exist for the selected &quot;To&quot; date.
            </Text>
          ) : barLoading ? (
            <Center minH="220px">
              <Spinner color="secondary.500" />
            </Center>
          ) : (
            contributorBarRows.length === 0 ? (
            <Flex direction="column" gap="16px">
              <EmptyRing message="No answered questions for this form in the selected range" />
              <StatusPills items={contributorLegendItems} />
            </Flex>
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
              <Box mt="16px">
                <StatusPills items={contributorLegendItems} />
              </Box>
            </Box>
            )
          )}
        </DashboardCard>
      </GridItem>

      <GridItem minW={0}>
        <DashboardCard title="Contributors (Branch)" h="100%">
          {formSelectControl}
          {!toYmdStr || !fromYmd ? (
            <Text fontSize="12px" color="fg.muted">
              Select From and To dates.
            </Text>
          ) : isCalendarFutureDate(toYmdStr) ? (
            <Text fontSize="12px" color="fg.muted">
              Pick a &quot;To&quot; date that is today or in the past.
            </Text>
          ) : !formsForBarSelect.length ? (
            <Text fontSize="12px" color="fg.muted">
              No forms exist for the selected &quot;To&quot; date.
            </Text>
          ) : loading ? (
            <Center minH="220px">
              <Spinner color="secondary.500" />
            </Center>
          ) : (
            branchBarRows.length === 0 ? (
            <Flex direction="column" gap="16px">
              <EmptyRing message="No branch submission stats for this form in the selected range" />
              <StatusPills items={branchLegendItems} />
            </Flex>
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
              <Box mt="16px">
                <StatusPills items={branchLegendItems} />
              </Box>
            </Box>
            )
          )}
        </DashboardCard>
      </GridItem>
    </Grid>
  );
}
