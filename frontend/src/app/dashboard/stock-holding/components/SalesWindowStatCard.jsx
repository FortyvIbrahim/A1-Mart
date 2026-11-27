"use client";

import React from "react";
import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import { LuChartLine } from "react-icons/lu";
import { formatCurrency } from "@/utils/string";
import { formatDeltaDisplay } from "@/utils/salesDashboard";

// Figma sales window cards: tinted fill per period.
const TONES = {
  orange: { bg: "#FFF5ED", border: "#FBE3D2", icon: "#C95C18" },
  blue: { bg: "#EEF3FC", border: "#DCE6F7", icon: "#526FA8" },
  purple: { bg: "#F4F1FD", border: "#E6E0F8", icon: "#7C5CC4" },
  green: { bg: "#E8F6EF", border: "#CDEBDC", icon: "#147D52" },
  teal: { bg: "#EEF3FC", border: "#DCE6F7", icon: "#526FA8" },
  cyan: { bg: "#EAF6FB", border: "#D3EAF4", icon: "#2B7FA8" },
};

function Metric({ label, value, deltaValue, deltaPct, formatValue }) {
  const delta = formatDeltaDisplay(value, deltaValue, deltaPct);
  const color =
    delta.direction === "up" ? "#147D52" : delta.direction === "down" ? "#BC3745" : "fg.muted";
  return (
    <Flex direction="column" gap="4px" minW={0}>
      <Text fontSize="10px" lineHeight="12px" color="fg.muted">
        {label}
      </Text>
      <Text fontSize="16px" lineHeight="20px" fontWeight="600" color="fg" truncate>
        {formatValue(value)}
      </Text>
      <Text fontSize="10px" lineHeight="12px" color={color}>
        {delta.pctLabel || (delta.delta === 0 ? "No change" : "—")}
      </Text>
    </Flex>
  );
}

/**
 * Figma "Sales Dashboard" window card: icon + period ("Today", "Last 7 days"),
 * then Qty sold | Value sold side by side with their change vs the prior period.
 */
export default function SalesWindowStatCard({ days, windowSummary, color = "orange", periodLabel }) {
  const t = TONES[color] ?? TONES.orange;
  const current = windowSummary?.current ?? {};
  const label = periodLabel ?? (days != null ? `Last ${days} days` : "Today");

  return (
    <Flex
      direction="column"
      gap="12px"
      p="16px"
      bg={t.bg}
      borderWidth="1px"
      borderColor={t.border}
      borderRadius="10px"
      h="100%"
      minW={0}
    >
      <Flex align="center" gap="8px">
        <Box color={t.icon} fontSize="14px">
          <LuChartLine />
        </Box>
        <Text fontSize="12px" fontWeight="500" color="fg">
          {label}
        </Text>
      </Flex>
      <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap="12px">
        <Metric
          label="Qty sold"
          value={current.sold_qty}
          deltaValue={windowSummary?.delta_qty}
          deltaPct={windowSummary?.delta_qty_pct}
          formatValue={(v) => Number(v ?? 0).toLocaleString()}
        />
        <Metric
          label="Value sold"
          value={current.sold_value}
          deltaValue={windowSummary?.delta_value}
          deltaPct={windowSummary?.delta_value_pct}
          formatValue={formatCurrency}
        />
      </Grid>
    </Flex>
  );
}
