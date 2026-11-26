"use client";

import React, { useMemo } from "react";
import {
  Box,
  Flex,
  Grid,
  GridItem,
  Text,
  useBreakpointValue,
  IconButton,
} from "@chakra-ui/react";
import CustomContainer from "@/components/CustomContainer";
import DashboardBarChart from "@/components/dashboard/DashboardBarChart";
import DashboardChartLegend from "@/components/dashboard/DashboardChartLegend";

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

  const jobChartData = useMemo(() => jobSummary ?? [], [jobSummary]);

  const repackChartData = useMemo(() => repackSummary ?? [], [repackSummary]);

  const jobLegendItems = useMemo(() => {
    const rows = jobSummary ?? [];
    const pending = rows.reduce((s, r) => s + Number(r.pending || 0), 0);
    const done = rows.reduce((s, r) => s + Number(r.doneToday || 0), 0);
    return [
      { name: "Job Pending", value: pending, fill: "#ECC94B" },
      { name: "Job Done", value: done, fill: "#38A169" },
    ];
  }, [jobSummary]);

  const repackLegendItems = useMemo(() => {
    const rows = repackSummary ?? [];
    const pending = rows.reduce((s, r) => s + Number(r.pending || 0), 0);
    const done = rows.reduce((s, r) => s + Number(r.doneToday || 0), 0);
    return [
      { name: "Repack Pending", value: pending, fill: "#F6AD55" },
      { name: "Repack Done", value: done, fill: "#3182CE" },
    ];
  }, [repackSummary]);

  const jobBars = [
    { dataKey: "pending", fill: "#ECC94B", stackId: "job" },
    {
      dataKey: "doneToday",
      fill: "#38A169",
      stackId: "job",
      labelOnTop: true,
      labelDataKey: "total",
    },
  ];

  const repackBars = [
    { dataKey: "pending", fill: "#F6AD55", stackId: "repack" },
    {
      dataKey: "doneToday",
      fill: "#3182CE",
      stackId: "repack",
      labelOnTop: true,
      labelDataKey: "total",
    },
  ];

  const jobTooltipLabelMap = {
    pending: "Job Pending",
    doneToday: "Job Done",
  };

  const repackTooltipLabelMap = {
    pending: "Repack Pending",
    doneToday: "Repack Done",
  };

  return (
    <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap="22px">
      <GridItem colSpan={{ base: 1, md: 1 }}>
        <CustomContainer
          title="By Status"
          size="sm"
          fullWidth
          rightSection={
            onResetStatus ? (
              <IconButton
                aria-label="Reset status sort"
                size="xs"
                variant="ghost"
                onClick={onResetStatus}
              >
                <i className="fa fa-refresh" aria-hidden="true" />
              </IconButton>
            ) : null
          }
        >
          <DashboardBarChart
            data={byStatus ?? []}
            xDataKey="name"
            bars={[{ dataKey: "value", perBarColor: true }]}
            showLegend={true}
            hideXAxisLabels={isMobile}
            emptyMessage="No data to display"
            onBarClick={onStatusClick}
          />
        </CustomContainer>
      </GridItem>
      <CustomContainer title="Pending Stats" size="sm">
        <Flex direction="column" w="100%" gap={{ base: 3, md: 2 }}>
          <Box
            w="100%"
            borderWidth="1px"
            borderStyle="solid"
            borderColor="brand100"
            borderRadius="md"
            overflow="hidden"
          >
            <Flex
              direction={{ base: "column", md: "row" }}
              align="stretch"
              w="100%"
            >
              <Box
                flex="1"
                minW={0}
                borderBottom={{ base: "1px solid", md: "none" }}
                borderRight={{ md: "1px solid var(--chakra-colors-brand-100)" }}
              >
                <Box
                  px={3}
                  py={2}
                  borderBottom="1px solid"
                  borderColor="brand100"
                  bg="brand50"
                >
                  <Text
                    fontSize="xs"
                    fontWeight="medium"
                    color="brand800"
                    letterSpacing="-0.01em"
                  >
                    Job worksheet
                  </Text>
                </Box>
                <Box px={3} py={3}>
                  <DashboardBarChart
                    data={jobChartData}
                    xDataKey="name"
                    bars={jobBars}
                    legendItems={jobLegendItems}
                    showLegend={false}
                    height={"180px"}
                    yAxisMaxPadding={6}
                    hideXAxisLabels={isMobile}
                    emptyMessage="No data to display"
                    onBarClick={(entry) => {
                      if (entry?.name) onJobBarClick?.(entry);
                    }}
                    tooltipLabelMap={jobTooltipLabelMap}
                  />
                </Box>
              </Box>
              <Box flex="1" minW={0}>
                <Box
                  px={3}
                  py={2}
                  borderBottom="1px solid"
                  borderColor="brand100"
                  bg="brand50"
                >
                  <Text
                    fontSize="xs"
                    fontWeight="medium"
                    color="brand800"
                    letterSpacing="-0.01em"
                  >
                    Repacking
                  </Text>
                </Box>
                <Box px={3} py={3}>
                  <DashboardBarChart
                    data={repackChartData}
                    xDataKey="name"
                    bars={repackBars}
                    height={"180px"}
                    yAxisMaxPadding={6}
                    legendItems={repackLegendItems}
                    showLegend={false}
                    hideXAxisLabels={isMobile}
                    emptyMessage="No data to display"
                    onBarClick={(entry) => {
                      if (entry?.name) onRepackBarClick?.(entry);
                    }}
                    tooltipLabelMap={repackTooltipLabelMap}
                  />
                </Box>
              </Box>
            </Flex>
          </Box>
          <Flex
            direction={{ base: "column", md: "row" }}
            align="flex-start"
            gap={{ base: 3, md: 4 }}
            w="100%"
          >
            <Box flex="1" minW={0}>
              <DashboardChartLegend
                items={jobLegendItems}
                columns={1}
                showDivider
              />
            </Box>
            <Box flex="1" minW={0}>
              <DashboardChartLegend
                items={repackLegendItems}
                columns={1}
                showDivider
              />
            </Box>
          </Flex>
        </Flex>
      </CustomContainer>
      <CustomContainer title="Purchase Return Pending" size="sm">
        <DashboardBarChart
          data={purchaseReturnSummary ?? []}
          xDataKey="name"
          bars={[{ dataKey: "value", perBarColor: true }]}
          showLegend={true}
          emptyMessage="No data to display"
          onBarClick={onPurchaseReturnBarClick}
        />
      </CustomContainer>
    </Grid>
  );
}

export default SummaryChartsRow;
