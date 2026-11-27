"use client";

import React, { memo } from "react";
import { Box, Center, Text } from "@chakra-ui/react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import DashboardChartLegend from "@/components/dashboard/DashboardChartLegend";
import { DashboardCard } from "@/components/dashboard/DashboardUI";

// Figma chart palette.
const PALETTE = ["#F47721", "#11976A", "#526FA8", "#E3B63E", "#9AAAC1", "#E7474D", "#C95C18", "#637188"];

/**
 * Figma "Stock Holding" chart cards: 150px donut centred, legend in up to
 * three columns underneath ("PT · 21802"). Slices/legend items are clickable.
 */
function DonutChartCard({ title, data, onSliceClick, valueFormatter = (v) => v, legendColumns = 3 }) {
  const rows = (data || []).filter((d) => Number(d.value) > 0);
  const colorOf = (d, i) => PALETTE[i % PALETTE.length];

  return (
    <DashboardCard title={title}>
      {rows.length === 0 ? (
        <Center minH="150px">
          <Text color="fg.muted" fontSize="12px">
            No data available
          </Text>
        </Center>
      ) : (
        <>
          <Box h="150px" w="150px" mx="auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={72}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {rows.map((d, i) => (
                    <Cell
                      key={`${d.name}-${i}`}
                      fill={colorOf(d, i)}
                      cursor={onSliceClick ? "pointer" : undefined}
                      onClick={() => onSliceClick?.(d)}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [valueFormatter(v), n]} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <DashboardChartLegend
            columns={Math.min(legendColumns, rows.length)}
            items={rows.map((d, i) => ({
              name: `${d.name} · ${valueFormatter(d.value)}`,
              fill: colorOf(d, i),
              onClick: onSliceClick ? () => onSliceClick(d) : undefined,
            }))}
          />
        </>
      )}
    </DashboardCard>
  );
}

export default memo(DonutChartCard);
