"use client";

import React, { useMemo } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import CustomContainer from "@/components/CustomContainer";
import { formatCurrency, formatShorthandNumber } from "@/utils/string";

const TICK_FILL = "#637188";
const TICK_FONT_SIZE = 7;
const LINE_COLOR = "#526FA8";
const GRADIENT_ID = "salesValueAreaGradient";
const CHART_MARGIN = { top: 12, right: 12, left: 4, bottom: 4 };

function formatAxisDate(value) {
  if (!value) return "";
  const dt = new Date(`${value}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatYAxisValue(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "";
  if (num === 0) return "₹0";
  return `₹${formatShorthandNumber(num)}`;
}

function SalesXAxisTick({ x, y, payload }) {
  return (
    <text
      x={x}
      y={y}
      dy={12}
      fill={TICK_FILL}
      fontSize={TICK_FONT_SIZE}
      textAnchor="middle"
    >
      {formatAxisDate(payload?.value)}
    </text>
  );
}

function SalesYAxisTick({ x, y, payload }) {
  return (
    <text
      x={x}
      y={y}
      dx={-2}
      dy={3}
      textAnchor="end"
      fill={TICK_FILL}
      fontSize={TICK_FONT_SIZE}
    >
      {formatYAxisValue(payload?.value)}
    </text>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};

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
      fontSize="xs"
      minW="140px"
    >
      <Text fontWeight="semibold" color="gray.700">
        {formatAxisDate(label)}
      </Text>
      <Flex align="center" gap={2}>
        <Box
          w="8px"
          h="8px"
          minW="8px"
          borderRadius="full"
          bg={LINE_COLOR}
          flexShrink={0}
        />
        <Text color="gray.600">
          Value: {formatCurrency(row.sold_value ?? 0)}
        </Text>
      </Flex>
      <Text color="gray.500" pl={4}>
        Qty: {Number(row.sold_qty ?? 0).toLocaleString("en-IN")}
      </Text>
    </Flex>
  );
}

export default function SalesLineChartCard({ data = [], title = "Daily Sales" }) {
  const chartData = useMemo(() => data || [], [data]);

  const yDomain = useMemo(
    () => [
      0,
      (dataMax) =>
        dataMax != null && dataMax > 0
          ? Math.ceil(dataMax * 1.1)
          : 1,
    ],
    []
  );

  return (
    <CustomContainer title={title} size="sm" color="secondary">
      <Box h={{ base: "280px", md: "300px" }} w="100%">
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={CHART_MARGIN}>
              <defs>
                <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={LINE_COLOR} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#F1E3D9"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={<SalesXAxisTick />}
                tickLine={false}
                axisLine={false}
                minTickGap={16}
                height={28}
              />
              <YAxis
                tick={<SalesYAxisTick />}
                tickLine={false}
                axisLine={false}
                width={38}
                domain={yDomain}
                allowDecimals={false}
              />
              <RechartsTooltip
                content={<ChartTooltip />}
                cursor={{
                  stroke: LINE_COLOR,
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />
              <Area
                type="monotone"
                dataKey="sold_value"
                stroke="none"
                fill={`url(#${GRADIENT_ID})`}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="sold_value"
                stroke={LINE_COLOR}
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: LINE_COLOR,
                  stroke: "#fff",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <Text fontSize="sm" color="gray.500" py={8} textAlign="center">
            No sales data for the selected period.
          </Text>
        )}
      </Box>
    </CustomContainer>
  );
}
