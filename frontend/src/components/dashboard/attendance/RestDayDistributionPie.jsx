"use client";

import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Text as RechartsSvgText,
} from "recharts";

function PieTooltip(props) {
  const { active, payload } = props;
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const p = item?.payload ?? item;
  const fullName = p?.fullName ?? p?.name;
  const value = item?.value;
  const color = p?.color ?? "#718096";
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
      <Box w="8px" h="8px" borderRadius="2px" bg={color} flexShrink={0} />
      <Text>
        {fullName} ({value})
      </Text>
    </Flex>
  );
}

const RADIAN = Math.PI / 180;

/** Count only, centered inside the donut ring (white, compact). */
function RestDayPieInsideCount({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  value,
  percent,
}) {
  if (percent < 0.02 || value == null) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <RechartsSvgText
      x={x}
      y={y}
      textAnchor="middle"
      verticalAnchor="middle"
      fill="#FFFFFF"
      pointerEvents="none"
      stroke="rgba(0,0,0,0.35)"
      strokeWidth={0.35}
      style={{
        fontSize: "9px",
        fontWeight: 800,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        paintOrder: "stroke fill",
      }}
    >
      {value}
    </RechartsSvgText>
  );
}

/**
 * Donut chart: employee counts per rest day + unset (counts drawn inside slices only).
 * @param {Array<{ name: string, fullName?: string, value: number, color: string, restDayKey?: number | string }>} data
 * @param {(entry: object) => void} [onSliceClick] — receives the data row for the clicked slice
 */
export default function RestDayDistributionPie({
  data = [],
  height = 200,
  emptyMessage = "No employees in scope",
  onSliceClick,
}) {
  if (!data.length) {
    return (
      <Flex minH={`${height}px`} align="center" justify="center">
        <Text fontSize="sm" color="gray.500">
          {emptyMessage}
        </Text>
      </Flex>
    );
  }

  return (
    <>
      <Box height={`${height}px`} w="100%">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="42%"
              outerRadius="72%"
              paddingAngle={1}
              label={RestDayPieInsideCount}
              labelLine={false}
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
                <Cell
                  key={`${entry.name}-${index}`}
                  fill={entry.color}
                  stroke="var(--chakra-colors-white)"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <RechartsTooltip
              content={PieTooltip}
              cursor={{ fill: "transparent" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>

      <Box
        w="calc(100% + 44px)"
        h="1px"
        bgColor="brand100"
        ml="-22px"
        mt={3}
        mb={3}
      />

      <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap="6px">
        {data.map((item, index) => (
          <GridItem key={`${item.name}-${index}`}>
            <Flex
              align="center"
              fontSize="xs"
              h="22px"
              minW={0}
              cursor={onSliceClick ? "pointer" : "default"}
              onClick={() => onSliceClick?.(item)}
            >
              <Box
                w="10px"
                h="10px"
                borderRadius="2px"
                bg={item.color}
                mr={2}
                flexShrink={0}
              />
              <Text
                lineClamp={1}
                title={`${item.fullName ?? item.name} (${item.value})`}
              >
                {item.name} ({item.value})
              </Text>
            </Flex>
          </GridItem>
        ))}
      </Grid>
    </>
  );
}
