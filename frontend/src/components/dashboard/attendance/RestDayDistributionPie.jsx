"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import DashboardChartLegend from "@/components/dashboard/DashboardChartLegend";

function PieTooltip(props) {
  const { active, payload } = props;
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const p = item?.payload ?? item;
  const fullName = p?.fullName ?? p?.name;
  const value = item?.value;
  const color = p?.color ?? "#637188";
  return (
    <Flex
      bg="white"
      borderRadius="8px"
      boxShadow="0 6px 20px rgba(46, 36, 26, 0.08)"
      px="10px"
      py="6px"
      borderWidth="1px"
      borderColor="border"
      align="center"
      gap="6px"
      fontSize="11px"
    >
      <Box w="7px" h="7px" borderRadius="full" bg={color} flexShrink={0} />
      <Text color="fg">
        {fullName} ({value})
      </Text>
    </Flex>
  );
}

/** Figma "Rest Day Stats": 220px donut, total in the centre, legend at the side. */
const DONUT_SIZE = 220;

/**
 * Donut chart: employee counts per rest day + unset.
 * @param {Array<{ name: string, fullName?: string, value: number, color: string, restDayKey?: number | string }>} data
 * @param {(entry: object) => void} [onSliceClick] — receives the data row for the clicked slice
 */
export default function RestDayDistributionPie({
  data = [],
  emptyMessage = "No employees in scope",
  onSliceClick,
}) {
  if (!data.length) {
    return (
      <Flex minH={`${DONUT_SIZE}px`} align="center" justify="center">
        <Text fontSize="12px" color="fg.muted">
          {emptyMessage}
        </Text>
      </Flex>
    );
  }

  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const legendItems = data.map((d) => ({
    name: d.restDayKey === "unset" ? "Unset" : d.fullName ?? d.name,
    value: d.value,
    fill: d.color,
    onClick: onSliceClick ? () => onSliceClick(d) : undefined,
  }));

  return (
    <Flex
      align="center"
      gap="36px"
      direction={{ base: "column", sm: "row" }}
      minW={0}
    >
      <Box
        position="relative"
        w={`${DONUT_SIZE}px`}
        h={`${DONUT_SIZE}px`}
        flexShrink={0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={80}
              outerRadius={110}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
              cursor={onSliceClick ? "pointer" : "default"}
              onClick={(slice, index) => {
                if (!onSliceClick) return;
                const entry =
                  slice && typeof slice === "object" && slice.restDayKey != null
                    ? slice
                    : typeof index === "number"
                    ? data[index]
                    : null;
                if (entry) onSliceClick(entry);
              }}
            >
              {data.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip
              content={PieTooltip}
              cursor={{ fill: "transparent" }}
            />
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
          <Text fontSize="25px" fontWeight="600" lineHeight="30px" color="fg">
            {total}
          </Text>
          <Text fontSize="10px" lineHeight="12px" color="fg.muted">
            total
          </Text>
        </Flex>
      </Box>
      <Box flex="1" minW={0} w="100%" mt="-16px">
        <DashboardChartLegend items={legendItems} columns={2} />
      </Box>
    </Flex>
  );
}
