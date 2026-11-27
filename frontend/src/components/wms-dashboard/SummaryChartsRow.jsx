"use client";

import React, { useMemo } from "react";
import { Box, Flex, Grid, IconButton, Text, useBreakpointValue } from "@chakra-ui/react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import DashboardBarChart from "@/components/dashboard/DashboardBarChart";
import DashboardChartLegend from "@/components/dashboard/DashboardChartLegend";
import { DashboardCard } from "@/components/dashboard/DashboardUI";

/*
 * Figma "WMS Dashboard / Purchases": By Status (donut + two-column legend)
 * beside Pending Stats (Job worksheet | Repacking panels), then Purchase
 * Return Pending across the full width. Titles sit inside the cards.
 */
const JOB = { pending: "#E3B63E", done: "#11976A" };
const REPACK = { pending: "#F47721", done: "#526FA8" };
const PR_COLORS = ["#F47721", "#11976A", "#526FA8", "#E3B63E", "#9AAAC1", "#E7474D"];

function Panel({ title, children }) {
  return (
    <Flex direction="column" flex="1" minW={0} borderWidth="1px" borderColor="border" borderRadius="8px">
      <Text px="12px" py="8px" fontSize="11px" fontWeight="500" color="fg" borderBottomWidth="1px" borderColor="border">
        {title}
      </Text>
      <Box px="12px" py="8px">
        {children}
      </Box>
    </Flex>
  );
}

function SummaryChartsRow({
  byStatus,
  jobSummary,
  repackSummary,
  purchaseReturnSummary,
  onStatusClick,
  onResetStatus,
  onJobBarClick,
  onRepackBarClick,
  onPurchaseReturnBarClick,
}) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  const statusRows = useMemo(
    () => (byStatus ?? []).filter((r) => Number(r.value) > 0),
    [byStatus]
  );

  const sum = (rows, key) => (rows ?? []).reduce((s, r) => s + Number(r[key] || 0), 0);

  const jobLegendItems = [
    { name: "Job Pending", value: sum(jobSummary, "pending"), fill: JOB.pending },
    { name: "Job Done", value: sum(jobSummary, "doneToday"), fill: JOB.done },
  ];
  const repackLegendItems = [
    { name: "Repack Pending", value: sum(repackSummary, "pending"), fill: REPACK.pending },
    { name: "Repack Done", value: sum(repackSummary, "doneToday"), fill: REPACK.done },
  ];

  const prData = useMemo(
    () =>
      (purchaseReturnSummary ?? []).map((r, i) => ({
        ...r,
        fill: PR_COLORS[i % PR_COLORS.length],
      })),
    [purchaseReturnSummary]
  );

  const stacked = (stackId, colors) => [
    { dataKey: "pending", fill: colors.pending, stackId },
    { dataKey: "doneToday", fill: colors.done, stackId, labelOnTop: true, labelDataKey: "total" },
  ];

  return (
    <Flex direction="column" gap="16px">
      <Grid templateColumns={{ base: "minmax(0,1fr)", lg: "minmax(0,1fr) minmax(0,2.2fr)" }} gap="16px">
        <DashboardCard
          title="By Status"
          rightSection={
            onResetStatus ? (
              <IconButton aria-label="Reset status filter" size="2xs" variant="ghost" color="#C95C18" onClick={onResetStatus}>
                <i className="fa fa-refresh" aria-hidden="true" />
              </IconButton>
            ) : null
          }
        >
          {statusRows.length === 0 ? (
            <Flex h="150px" align="center" justify="center">
              <Text fontSize="12px" color="fg.muted">
                No data to display
              </Text>
            </Flex>
          ) : (
            <Box>
              <Box h="150px" w="150px" mx="auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusRows}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={72}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {statusRows.map((r) => (
                        <Cell
                          key={r.code ?? r.name}
                          fill={r.color ?? r.fill}
                          cursor="pointer"
                          onClick={() => onStatusClick?.(r)}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v, n) => [`${v}`, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <DashboardChartLegend
                columns={2}
                items={statusRows.map((r) => ({
                  name: `${r.name} · ${r.value}`,
                  fill: r.color ?? r.fill,
                  onClick: () => onStatusClick?.(r),
                }))}
              />
            </Box>
          )}
        </DashboardCard>

        <DashboardCard title="Pending Stats">
          <Flex direction={{ base: "column", md: "row" }} gap="12px">
            <Panel title="Job worksheet">
              <DashboardBarChart
                data={jobSummary ?? []}
                xDataKey="name"
                bars={stacked("job", JOB)}
                showLegend={false}
                height="150px"
                hideXAxisLabels={isMobile}
                emptyMessage="No data to display"
                onBarClick={(entry) => entry?.name && onJobBarClick?.(entry)}
                tooltipLabelMap={{ pending: "Job Pending", doneToday: "Job Done" }}
              />
            </Panel>
            <Panel title="Repacking">
              <DashboardBarChart
                data={repackSummary ?? []}
                xDataKey="name"
                bars={stacked("repack", REPACK)}
                showLegend={false}
                height="150px"
                hideXAxisLabels={isMobile}
                emptyMessage="No data to display"
                onBarClick={(entry) => entry?.name && onRepackBarClick?.(entry)}
                tooltipLabelMap={{ pending: "Repack Pending", doneToday: "Repack Done" }}
              />
            </Panel>
          </Flex>
          <Grid templateColumns="repeat(2, minmax(0,1fr))" columnGap="12px" mt="-16px">
            <DashboardChartLegend columns={1} items={jobLegendItems} />
            <DashboardChartLegend columns={1} items={repackLegendItems} />
          </Grid>
        </DashboardCard>
      </Grid>

      <DashboardCard title="Purchase Return Pending">
        <DashboardBarChart
          data={prData}
          xDataKey="name"
          bars={[{ dataKey: "value", perBarColor: true }]}
          showLegend={true}
          legendColumns={Math.min(Math.max(prData.length, 1), 6)}
          height="160px"
          emptyMessage="No data to display"
          onBarClick={onPurchaseReturnBarClick}
        />
      </DashboardCard>
    </Flex>
  );
}

export default SummaryChartsRow;
