"use client";

import React from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { formatCurrency } from "@/utils/string";
import { formatDeltaDisplay } from "@/utils/salesDashboard";

function MetricBlock({
  title,
  value,
  deltaValue,
  deltaPct,
  color,
  formatValue,
  deltaLabel = "vs prev period",
}) {
  const delta = formatDeltaDisplay(value, deltaValue, deltaPct);

  return (
    <Box w="100%">
      <Text fontSize="xs" fontWeight="semibold" color={`${color}.700`}>
        {title}
      </Text>
      <Text
        fontSize="2xl"
        fontWeight="bold"
        color={`${color}.800`}
        lineHeight="1"
        mt={2}
      >
        {formatValue(value)}
      </Text>
      {delta.pctLabel ? (
        <Text
          fontSize="xs"
          fontWeight="medium"
          color={
            delta.direction === "up"
              ? "green.600"
              : delta.direction === "down"
                ? "red.600"
                : "gray.600"
          }
          mt={2}
        >
          {delta.pctLabel} {deltaLabel}
        </Text>
      ) : delta.delta === 0 ? (
        <Text fontSize="xs" color="gray.500" mt={2}>
          No change {deltaLabel}
        </Text>
      ) : (
        <Text fontSize="xs" color="gray.500" mt={2}>
          — {deltaLabel}
        </Text>
      )}
    </Box>
  );
}

export default function SalesWindowStatCard({
  days,
  windowSummary,
  color = "brand",
  periodLabel,
  deltaLabel,
}) {
  const current = windowSummary?.current ?? {};
  const label =
    periodLabel ?? (days != null ? `Last ${days} Days` : "Today");

  return (
    <Flex
      direction="column"
      align="flex-start"
      justify="center"
      p={5}
      borderWidth="1px"
      borderColor={`${color}.200`}
      borderRadius="10px"
      bg={`${color}.50`}
      h="100%"
      gap={5}
      w="100%"
    >
      <MetricBlock
        title={`Total Qty Sold (${label})`}
        value={current.sold_qty}
        deltaValue={windowSummary?.delta_qty}
        deltaPct={windowSummary?.delta_qty_pct}
        color={color}
        formatValue={(v) => Number(v ?? 0).toLocaleString()}
        deltaLabel={deltaLabel}
      />

      <MetricBlock
        title={`Total Value Sold (${label})`}
        value={current.sold_value}
        deltaValue={windowSummary?.delta_value}
        deltaPct={windowSummary?.delta_value_pct}
        color={color}
        formatValue={formatCurrency}
        deltaLabel={deltaLabel}
      />
    </Flex>
  );
}
