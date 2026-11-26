"use client";

import React, { memo, useMemo } from "react";
import { Box, Center, Flex, Text } from "@chakra-ui/react";
import CustomContainer from "@/components/CustomContainer";
import DashboardBarChart from "@/components/dashboard/DashboardBarChart";
import { formatShorthandNumber } from "@/utils/string";

function BarChartCard({
  title,
  data,
  color = "secondary",
  onBarClick,
  valueFormatter,
  legendValueFormatter,
  showPctInTooltip = false,
}) {
  const chartData = (data || []).filter((entry) => Number(entry.value) > 0);
  const yAxisPadding = useMemo(() => {
    const maxVal = Math.max(0, ...chartData.map((d) => Number(d.value) || 0));
    if (maxVal <= 0) return 2;
    return Math.max(maxVal * 0.08, 1);
  }, [chartData]);

  const formatLegendValue =
    legendValueFormatter ?? ((v) => formatShorthandNumber(v ?? 0));
  const formatBarLabel =
    valueFormatter ??
    ((v) => (v === 0 || v == null ? "" : formatShorthandNumber(v)));

  return (
    <CustomContainer title={title} size="sm" color={color} fullWidth>
      {chartData.length === 0 ? (
        <Center minH="240px">
          <Text color="gray.500" fontSize="sm">
            No data available
          </Text>
        </Center>
      ) : (
        <DashboardBarChart
          data={chartData}
          xDataKey="name"
          bars={[{ dataKey: "value", perBarColor: true }]}
          legendItems={chartData.map((d) => ({
            name: d.name,
            value: legendValueFormatter
              ? legendValueFormatter(d.value, d)
              : formatLegendValue(d.displayValue ?? d.value),
            fill: d.fill,
          }))}
          legendColumns={2}
          height="240px"
          hideYAxisLabels
          marginTop={16}
          barLabelOffset={6}
          yAxisMaxPadding={yAxisPadding}
          barCategoryGap={8}
          valueFormatter={formatBarLabel}
          onBarClick={onBarClick}
          tooltipContent={(payload) => {
            if (!payload?.length) return null;
            const row = payload[0]?.payload;
            const name = row?.name ?? payload[0]?.name;
            const value = row?.displayValue ?? row?.value;
            const fill = row?.fill ?? payload[0]?.color;
            return (
              <Flex
                bg="white"
                borderRadius="md"
                boxShadow="md"
                px={3}
                py={2}
                borderWidth="1px"
                borderColor="gray.100"
                align="center"
                gap={2}
                fontSize="sm"
              >
                <Box
                  w="8px"
                  h="8px"
                  minW="8px"
                  minH="8px"
                  borderRadius="2px"
                  bg={fill || "gray.400"}
                  flexShrink={0}
                />
                <Text>
                  {name} ({formatBarLabel(value)}
                  {showPctInTooltip && row?.pct != null ? ` · ${row.pct}%` : ""})
                </Text>
              </Flex>
            );
          }}
        />
      )}
    </CustomContainer>
  );
}

export default memo(BarChartCard);
