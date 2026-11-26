"use client";

import React, { useState } from "react";
import {
  Box,
  Flex,
  Grid,
  GridItem,
  IconButton,
  Text,
  Button,
} from "@chakra-ui/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import CustomContainer from "@/components/CustomContainer";
import {
  XAxisTick,
  YAxisTick,
  wrapLabelLines,
  CHART_MARGIN,
  BAR_CATEGORY_GAP,
  X_AXIS_HEIGHT,
  Y_AXIS_WIDTH,
} from "@/components/dashboard/DashboardBarChart";

const BAR_COLORS = [
  "#3182CE",
  "#38A169",
  "#ECC94B",
  "#ED8936",
  "#9F7AEA",
  "#4A5568",
];

// XAxisTick with word-wrap for long labels (shared logic with DashboardBarChart)
const XAxisTickWrapped = (props) => {
  const { x, y, payload } = props;
  const value = String(payload?.value ?? "");
  const lines = wrapLabelLines(value, 12);

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill="#4A5568"
      style={{ fontSize: 10 }}
    >
      {lines.map((line, index) => (
        <tspan key={index} x={x} dy={index === 0 ? 10 : 11}>
          {line}
        </tspan>
      ))}
    </text>
  );
};

function BarChartCard({
  title,
  data,
  showCountsInLegend = true,
  onBarClick,
  hideLabels = false,
  onReset,
  stacked = false,
  stackKeys = [],
  stackColors = {},
  grouped = false,
  groupKeys = [],
  groupColors = {},
}) {
  const [legendExpanded, setLegendExpanded] = useState(false);
  const renderTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    // Friendly labels for common stack keys
    const stackLabelMap = {
      pending: "Pending",
      doneToday: "Done",
    };

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
        gap={3}
        fontSize="sm"
        flexDirection="column"
        alignItems="flex-start"
      >
        {payload
          .sort((a, b) => b.value - a.value)
          .map((item, index) => {
            const color = item.color || BAR_COLORS[index % BAR_COLORS.length];
            let name = stacked ? item.name : item.payload.name;

            // For stacked charts, map stack keys to friendly labels (Pending / Done)
            if (stacked && item.name && stackLabelMap[item.name]) {
              name = stackLabelMap[item.name];
            }

            return (
              <Flex key={`${name}-${index}`} align="center" gap={1}>
                <Box w="8px" h="8px" borderRadius="2px" bg={color} />
                <Text>
                  {name} {item.value ? "(" + item.value + ")" : ""}
                </Text>
              </Flex>
            );
          })}
      </Flex>
    );
  };

  // If grouped, render multiple bars (one per employee) for each X-axis category
  // If stacked, data should have employee names and stack keys
  // Otherwise, use the original format
  const renderBars = () => {
    if (grouped && groupKeys.length > 0) {
      // Custom label function to show value on top of grouped bars
      const renderGroupedBarLabel = (props) => {
        const { x, y, width, value } = props;
        if (!value || value === 0) return null;

        return (
          <text
            x={x + width / 2}
            y={y - 5}
            fill="#4A5568"
            textAnchor="middle"
            style={{ fontSize: 10 }}
            fontWeight="medium"
          >
            {value}
          </text>
        );
      };

      // Render one Bar component per employee
      return groupKeys.map((employeeKey, index) => (
        <Bar
          key={employeeKey}
          dataKey={employeeKey}
          fill={
            groupColors[employeeKey] || BAR_COLORS[index % BAR_COLORS.length]
          }
          radius={[3, 3, 0, 0]}
          maxBarSize={40}
          // Prevent focus outline when clicking bars
          style={{ outline: "none" }}
          tabIndex={-1}
        >
          <LabelList content={renderGroupedBarLabel} />
        </Bar>
      ));
    }

    if (stacked && stackKeys.length > 0) {
      // For stacked bars we precompute a `total` field in the data (one per X-axis category).
      // We render the stack normally, and attach a LabelList to the TOP bar in the stack,
      // using `dataKey="total"`, so there is exactly ONE label per stacked bar.
      const topIndex = stackKeys.length - 1;

      return stackKeys.map((key, index) => (
        <Bar
          key={key}
          dataKey={key}
          stackId="stack"
          fill={stackColors[key] || BAR_COLORS[index % BAR_COLORS.length]}
          radius={index === topIndex ? [3, 3, 0, 0] : [0, 0, 0, 0]}
          maxBarSize={40}
          // Prevent focus outline when clicking bars
          style={{ outline: "none" }}
          tabIndex={-1}
          onClick={(data) => {
            // data.payload contains the original row for this X-axis value
            if (onBarClick && data && data.payload) {
              onBarClick(data.payload);
            }
          }}
        >
          {index === topIndex && (
            <LabelList
              dataKey="total"
              position="top"
              fill="#4A5568"
              style={{ fontSize: 12 }}
              formatter={(value) => (value === 0 ? "" : value)}
            />
          )}
        </Bar>
      ));
    }

    // Original single bar format
    const renderSingleBarLabel = (props) => {
      const { x, y, width, value } = props;
      if (!value || value === 0) return null;

      return (
        <text
          x={x + width / 2}
          y={y - 5}
          fill="#4A5568"
          textAnchor="middle"
          style={{ fontSize: 12 }}
          fontWeight="medium"
        >
          {value}
        </text>
      );
    };

    return (
      <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={40}>
        <LabelList content={renderSingleBarLabel} />
        {data.map((entry, index) => (
          <Cell
            key={`cell-${index}`}
            fill={entry.color || BAR_COLORS[index % BAR_COLORS.length]}
            onClick={() => onBarClick && onBarClick(entry)}
            style={{
              cursor: onBarClick ? "pointer" : "default",
              outline: "none",
            }}
            tabIndex={-1}
          />
        ))}
      </Bar>
    );
  };

  // Helper to render legend with row limiting + "More" toggle
  const renderLegendItems = (items) => {
    if (!items || items.length === 0) return null;

    const itemsPerRow = 2;
    const maxRowsWithoutMore = 3;
    const maxItemsWithoutMore = itemsPerRow * maxRowsWithoutMore; // 6 items

    const needsMore = items.length > maxItemsWithoutMore;

    // When collapsed and too many rows, show only 2 rows
    const visibleItemsCount =
      needsMore && !legendExpanded ? itemsPerRow * 2 : items.length;

    const visibleItems = items.slice(0, visibleItemsCount);

    return (
      <>
        <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap="6px" mt={2}>
          {visibleItems}
        </Grid>
        {needsMore && (
          <Box>
            <Button
              size="2xs"
              variant="ghost"
              onClick={() => setLegendExpanded((prev) => !prev)}
            >
              {legendExpanded
                ? "Show less"
                : `+ ${items.length - visibleItemsCount} more`}
            </Button>
          </Box>
        )}
      </>
    );
  };

  // Legend for grouped or stacked charts
  const renderLegend = () => {
    if (grouped && groupKeys.length > 0) {
      const items = groupKeys.map((employeeKey, index) => {
        const color =
          groupColors[employeeKey] || BAR_COLORS[index % BAR_COLORS.length];
        // Calculate total for this employee across all categories
        const total = data.reduce(
          (sum, item) => sum + (item[employeeKey] || 0),
          0
        );
        return (
          <GridItem key={employeeKey}>
            <Flex align="center" fontSize="xs" h="24px">
              <Box w="10px" h="10px" borderRadius="2px" bg={color} mr={2} />
              <Text>
                {showCountsInLegend ? `${employeeKey} (${total})` : employeeKey}
              </Text>
            </Flex>
          </GridItem>
        );
      });

      return renderLegendItems(items);
    }

    if (stacked && stackKeys.length > 0) {
      const items = stackKeys.map((key, index) => {
        const color = stackColors[key] || BAR_COLORS[index % BAR_COLORS.length];
        // Calculate total for this stack key across all categories
        const total = data.reduce((sum, item) => sum + (item[key] || 0), 0);
        // Friendly labels for common stack keys
        const labelMap = {
          pending: "Pending",
          doneToday: "Done",
        };
        const label = labelMap[key] || key;
        return (
          <GridItem key={key}>
            <Flex align="center" fontSize="xs" h="24px">
              <Box w="10px" h="10px" borderRadius="2px" bg={color} mr={2} />
              <Text>{showCountsInLegend ? `${label} (${total})` : label}</Text>
            </Flex>
          </GridItem>
        );
      });

      return renderLegendItems(items);
    }

    // Original legend format
    const items = data
      .map((item, index) => {
        if (!item.name) return null;
        return (
          <GridItem key={`${item.name}-${index}`}>
            <Flex align="center" fontSize="xs" h="24px">
              <Box
                w="10px"
                h="10px"
                borderRadius="2px"
                bg={item.color || BAR_COLORS[index % BAR_COLORS.length]}
                mr={2}
              />
              <Text>
                {showCountsInLegend && typeof item.value === "number"
                  ? `${item.name} (${item.value})`
                  : item.name}
              </Text>
            </Flex>
          </GridItem>
        );
      })
      .filter(Boolean);

    return renderLegendItems(items);
  };

  return (
    <CustomContainer
      title={title}
      size="sm"
      fullWidth
      rightSection={
        onReset ? (
          <IconButton
            aria-label="Reset status sort"
            size="xs"
            variant="ghost"
            onClick={onReset}
          >
            <i className="fa fa-refresh" aria-hidden="true" />
          </IconButton>
        ) : null
      }
    >
      <Box height={{ base: "240px", md: "300px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barCategoryGap={BAR_CATEGORY_GAP}
            margin={CHART_MARGIN}
          >
            <XAxis
              dataKey="name"
              tick={hideLabels ? false : <XAxisTickWrapped />}
              interval={0}
              tickLine={false}
              height={X_AXIS_HEIGHT}
            />
            <YAxis
              tick={<YAxisTick />}
              allowDecimals={false}
              width={Y_AXIS_WIDTH}
              domain={[0, (dataMax) => dataMax + 2]}
            />
            <RechartsTooltip
              content={renderTooltip}
              cursor={{ fill: "transparent" }}
            />
            {renderBars()}
          </BarChart>
        </ResponsiveContainer>
      </Box>

      <Box
        w="calc(100% + 44px)"
        h="1px"
        bgColor="brand100"
        ml="-22px"
        mt="22px"
        mb="22px"
      />

      {renderLegend()}
    </CustomContainer>
  );
}

export default BarChartCard;
