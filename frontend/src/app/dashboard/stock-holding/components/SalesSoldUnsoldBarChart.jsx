"use client";

import React, { memo, useMemo } from "react";
import { Box, Center, Flex, Text } from "@chakra-ui/react";
import CustomContainer from "@/components/CustomContainer";
import DashboardBarChart from "@/components/dashboard/DashboardBarChart";
import { formatShorthandNumber } from "@/utils/string";
import {
  SALES_SOLD_STATUS_KEYS,
  soldStatusFromBarName,
} from "@/utils/salesDashboard";

function SalesSoldUnsoldBarChart({
  data = [],
  title = "Products Sold vs Unsold",
  activeFilter = SALES_SOLD_STATUS_KEYS.ALL,
  onBarClick,
}) {
  const chartData = useMemo(
    () => (data || []).filter((entry) => Number(entry.value) > 0),
    [data]
  );

  const yAxisPadding = useMemo(() => {
    const maxVal = Math.max(0, ...chartData.map((d) => Number(d.value) || 0));
    if (maxVal <= 0) return 2;
    return Math.max(maxVal * 0.12, 1);
  }, [chartData]);

  const formatValue = (v) =>
    v === 0 || v == null ? "" : formatShorthandNumber(v);

  const handleBarClick = (entry) => {
    onBarClick?.(entry);
  };

  return (
    <CustomContainer title={title} size="sm" color="secondary" fullWidth>
      {chartData.length === 0 ? (
        <Center minH="140px">
          <Text color="gray.500" fontSize="sm">
            No product data for the selected date.
          </Text>
        </Center>
      ) : (
        <DashboardBarChart
          data={chartData}
          xDataKey="name"
          bars={[{ dataKey: "value", perBarColor: true }]}
          showLegend={false}
          height="140px"
          hideYAxisLabels
          marginTop={8}
          barLabelOffset={4}
          yAxisMaxPadding={yAxisPadding}
          barCategoryGap={12}
          valueFormatter={formatValue}
          onBarClick={onBarClick ? handleBarClick : undefined}
          tooltipContent={(payload) => {
            if (!payload?.length) return null;
            const row = payload[0]?.payload;
            const name = row?.name ?? payload[0]?.name;
            const value = row?.value;
            const fill = row?.fill ?? payload[0]?.color;
            const barStatus = soldStatusFromBarName(name);
            const isActive =
              activeFilter !== SALES_SOLD_STATUS_KEYS.ALL &&
              activeFilter === barStatus;
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
                flexDirection="column"
                alignItems="flex-start"
              >
                <Flex align="center" gap={2}>
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
                    {name}: {Number(value ?? 0).toLocaleString()} products
                  </Text>
                </Flex>
                {onBarClick ? (
                  <Text fontSize="xs" color="gray.500">
                    {isActive ? "Click to clear filter" : "Click to filter"}
                  </Text>
                ) : null}
              </Flex>
            );
          }}
        />
      )}
    </CustomContainer>
  );
}

export default memo(SalesSoldUnsoldBarChart);
