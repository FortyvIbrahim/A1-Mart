"use client";

import React from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
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
import DashboardChartLegend from "@/components/dashboard/DashboardChartLegend";

const DEFAULT_BAR_COLORS = [
  "#3182CE",
  "#38A169",
  "#ECC94B",
  "#ED8936",
  "#9F7AEA",
  "#4A5568",
];

// Shared axis tick styles for dashboard uniformity (align with wms-dashboard/BarChartCard)
const TICK_FILL = "#4A5568";
const TICK_FONT_SIZE = 10;
const CHART_MARGIN = { top: 12, right: 8, left: 0, bottom: -20 };
const BAR_CATEGORY_GAP = 16;
const Y_AXIS_WIDTH = 28;
const X_AXIS_HEIGHT = 40;
const LABEL_FONT_SIZE = 12;
const TICK_LINE_HEIGHT = 11;

/**
 * Split a category label onto multiple lines (prefer word breaks; hard-break long tokens).
 * Used by axis ticks to avoid overlapping labels when many categories share one row.
 */
export function wrapLabelLines(value, maxCharsPerLine) {
  const text = String(value ?? "").trim();
  if (!text) return [""];
  if (!maxCharsPerLine || maxCharsPerLine < 1) return [text];

  const lines = [];
  let current = "";

  const flush = () => {
    if (current) lines.push(current);
    current = "";
  };

  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      continue;
    }
    flush();
    if (word.length <= maxCharsPerLine) {
      current = word;
    } else {
      for (let i = 0; i < word.length; i += maxCharsPerLine) {
        lines.push(word.slice(i, i + maxCharsPerLine));
      }
    }
  }
  flush();
  return lines.length ? lines : [""];
}

/** X-axis category tick (vertical bar chart): optional rotation, else wrapped lines. */
function VerticalCategoryAxisTick(props) {
  const { x, y, payload, angle, dy, wrapMeta } = props;
  const value = String(payload?.value ?? "");
  const rotation = angle ?? 0;
  const offset = dy ?? wrapMeta?.offset ?? 6;
  const lineHeight = wrapMeta?.lineHeight ?? TICK_LINE_HEIGHT;
  const maxChars = wrapMeta?.maxChars ?? 12;

  if (rotation !== 0) {
    return (
      <text
        x={x}
        y={y}
        textAnchor="end"
        fill={TICK_FILL}
        dy={offset}
        transform={`rotate(${rotation}, ${x}, ${y})`}
        style={{ fontSize: TICK_FONT_SIZE }}
      >
        {value}
      </text>
    );
  }

  const lines = wrapLabelLines(value, maxChars);
  if (lines.length <= 1) {
    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        fill={TICK_FILL}
        dy={offset}
        style={{ fontSize: TICK_FONT_SIZE }}
      >
        {lines[0]}
      </text>
    );
  }

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill={TICK_FILL}
      style={{ fontSize: TICK_FONT_SIZE }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? offset : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/** Y-axis category tick (horizontal bar chart): wrapped, right-aligned. */
function HorizontalCategoryAxisTick(props) {
  const { x, y, payload, wrapMeta } = props;
  const value = String(payload?.value ?? "");
  const maxChars = wrapMeta?.maxChars ?? 12;
  const lineHeight = wrapMeta?.lineHeight ?? TICK_LINE_HEIGHT;
  const lines = wrapLabelLines(value, maxChars);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;

  return (
    <text
      x={x}
      y={startY}
      dx={-4}
      textAnchor="end"
      fill={TICK_FILL}
      style={{ fontSize: TICK_FONT_SIZE }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 3 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

const XAxisTick = (props) => {
  const { x, y, payload, angle, dy } = props;
  const value = String(payload?.value ?? "");
  const rotation = angle ?? 0;
  const offset = dy ?? 6;
  return (
    <text
      x={x}
      y={y}
      textAnchor={rotation !== 0 ? "end" : "middle"}
      fill={TICK_FILL}
      dy={offset}
      transform={rotation !== 0 ? `rotate(${rotation}, ${x}, ${y})` : undefined}
      style={{ fontSize: TICK_FONT_SIZE }}
    >
      {value}
    </text>
  );
};

const YAxisTick = (props) => {
  const { x, y, payload } = props;
  return (
    <text
      x={x}
      y={y}
      dx={-4}
      dy={3}
      textAnchor="end"
      fill={TICK_FILL}
      style={{ fontSize: TICK_FONT_SIZE }}
    >
      {payload?.value}
    </text>
  );
};

/**
 * Reusable bar chart. Use anywhere; wrap in CustomContainer when you need a titled card.
 * Supports single bar (with per-bar color) and stacked bars.
 *
 * @param {Object} props
 * @param {Array} props.data - Chart data (e.g. [{ name, count, fill }] or [{ name, filled, unfilled, total }])
 * @param {string} [props.xDataKey="name"] - Key for the category axis (X for vertical layout, Y for horizontal layout)
 * @param {Array<{ dataKey: string, fill?: string, stackId?: string, labelOnTop?: boolean, labelDataKey?: string, perBarColor?: boolean }>} props.bars - Bar config. Use perBarColor: true when each data item has a "fill" (or use defaultBarColors)
 * @param {boolean} [props.showLegend=true] - Show legend below chart (uses DashboardChartLegend)
 * @param {Array<{ name: string, value?: number, fill: string }>} [props.legendItems] - Legend entries. If not passed, derived from data for single-bar charts
 * @param {Object} [props.height] - Chart height (default: { base: "240px", md: "260px" })
 * @param {string} [props.emptyMessage] - Shown when data is empty
 * @param {function} [props.tooltipContent] - (payload, active) => ReactNode. Default: single payload item or list
 * @param {function} [props.valueFormatter] - (value) => string for bar labels (e.g. hide zeros)
 * @param {Array<string>} [props.defaultBarColors] - Colors for perBarColor when data item has no fill
 * @param {function} [props.onBarClick] - (dataEntry, dataKey) => void when a bar is clicked
 * @param {boolean} [props.hideXAxisLabels] - Hide X axis labels (e.g. on mobile)
 * @param {boolean} [props.hideYAxisLabels] - Hide Y axis tick labels (vertical layout)
 * @param {number} [props.marginTop] - Top chart margin (room for bar top labels)
 * @param {number} [props.barLabelOffset] - Offset for labels above bars (perBarColor / labelOnTop)
 * @param {Object} [props.tooltipLabelMap] - Optional map of dataKey -> display label for tooltip (e.g. { pending: "Pending", doneToday: "Done" })
 * @param {"vertical" | "horizontal"} [props.layout="vertical"] - Chart layout. "horizontal" uses horizontal bars with categories on Y axis.
 * @param {number} [props.yAxisWidth] - Optional override for Y axis width (useful for long category labels in horizontal layout)
 * @param {number} [props.xAxisAngle] - Rotation angle for X axis labels (e.g., -45 for diagonal)
 * @param {number} [props.xAxisDy] - Vertical offset for X axis labels
 * @param {boolean} [props.scrollable] - When true and graphHeight is set, the chart is in a scrollable container (height on parent, graphHeight on inner)
 * @param {string|number|Object} [props.graphHeight] - When set, used as the inner chart height; height is applied to the parent container which becomes scrollable (requires scrollable or is used with scrollable layout)
 * @param {number} [props.legendColumns] - Number of columns in the legend
 * @param {number} [props.yAxisMaxPadding=2] - Extra headroom above max numeric value (vertical chart Y-axis / horizontal chart X value axis)
 */
function DashboardBarChart({
  data = [],
  xDataKey = "name",
  bars = [],
  showLegend = true,
  legendItems,
  height = { base: "240px", md: "260px" },
  maxHeight = "unset",
  emptyMessage = "No data to display",
  tooltipContent,
  valueFormatter = (v) => (v === 0 ? "" : v),
  defaultBarColors = DEFAULT_BAR_COLORS,
  onBarClick,
  hideXAxisLabels = false,
  hideYAxisLabels = false,
  marginTop,
  barLabelOffset = 6,
  tooltipLabelMap,
  layout = "vertical",
  yAxisWidth,
  yAxisMaxPadding = 2,
  barCategoryGap = 16,
  xAxisAngle,
  xAxisDy,
  scrollable,
  graphHeight,
  legendColumns = 2,
}) {
  const useScrollableLayout =
    graphHeight != null && graphHeight !== "" && scrollable !== false;
  const isHorizontal = layout === "horizontal";

  const barColorByDataKey = React.useMemo(
    () =>
      (bars || []).reduce((acc, b) => {
        if (b.dataKey && b.fill) acc[b.dataKey] = b.fill;
        return acc;
      }, {}),
    [bars]
  );

  const defaultTooltip = (params) => {
    const { active, payload } = params;
    if (!active || !payload?.length) return null;
    if (tooltipContent) return tooltipContent(payload, active);
    if (payload.length === 1) {
      const p = payload[0].payload;
      const name = p[xDataKey] ?? payload[0].name;
      const value = payload[0].value;
      const fill =
        p.fill ??
        p.color ??
        payload[0].color ??
        barColorByDataKey[payload[0].dataKey];
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
            {name} ({value})
          </Text>
        </Flex>
      );
    }
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
        fontSize="sm"
      >
        {payload.map((p, i) => {
          const label =
            (tooltipLabelMap && p.dataKey && tooltipLabelMap[p.dataKey]) ??
            (tooltipLabelMap && p.name && tooltipLabelMap[p.name]) ??
            p.name;
          const color =
            p.color ??
            barColorByDataKey[p.dataKey] ??
            barColorByDataKey[p.name] ??
            "gray.400";
          return (
            <Flex key={i} align="center" gap={2}>
              <Box
                w="8px"
                h="8px"
                minW="8px"
                minH="8px"
                borderRadius="2px"
                bg={color}
                flexShrink={0}
              />
              <Text>
                {label}: {p.value}
              </Text>
            </Flex>
          );
        })}
      </Flex>
    );
  };

  const valueDomain = React.useMemo(
    () => [
      (dataMax) => 0,
      (dataMax) =>
        dataMax != null ? dataMax + yAxisMaxPadding : yAxisMaxPadding,
    ],
    [yAxisMaxPadding]
  );

  /** Wrapping for bottom-axis category names (vertical bars). */
  const verticalCategoryWrapMeta = React.useMemo(() => {
    const lineHeight = TICK_LINE_HEIGHT;
    const offset = xAxisDy ?? 6;
    const n = Math.max(1, data?.length ?? 1);
    const maxChars = Math.max(6, Math.min(14, Math.floor(48 / Math.sqrt(n))));
    let maxLines = 1;
    if (data?.length) {
      for (const row of data) {
        const lines = wrapLabelLines(String(row[xDataKey] ?? ""), maxChars);
        maxLines = Math.max(maxLines, lines.length);
      }
    }
    return { maxChars, maxLines, lineHeight, offset };
  }, [data, xDataKey, xAxisDy]);

  /** Wrapping for left-axis category names (horizontal bars). */
  const horizontalCategoryWrapMeta = React.useMemo(() => {
    const lineHeight = TICK_LINE_HEIGHT;
    const w = yAxisWidth ?? 120;
    const maxChars = Math.max(8, Math.min(24, Math.floor(w / 5.5)));
    let maxLines = 1;
    if (data?.length) {
      for (const row of data) {
        const lines = wrapLabelLines(String(row[xDataKey] ?? ""), maxChars);
        maxLines = Math.max(maxLines, lines.length);
      }
    }
    return { maxChars, maxLines, lineHeight };
  }, [data, xDataKey, yAxisWidth]);

  const innerChartContent = (
    <>
      {!data || data.length === 0 ? (
        <Flex
          h="100%"
          align="center"
          justify="center"
          color="gray.500"
          fontSize="sm"
        >
          {emptyMessage}
        </Flex>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={isHorizontal ? "vertical" : "horizontal"}
            barCategoryGap={barCategoryGap ?? BAR_CATEGORY_GAP}
            margin={{
              ...CHART_MARGIN,
              top: marginTop ?? CHART_MARGIN.top,
              bottom:
                xAxisAngle && !isHorizontal
                  ? CHART_MARGIN.bottom + 30
                  : CHART_MARGIN.bottom,
            }}
          >
            {isHorizontal ? (
              <>
                <XAxis
                  type="number"
                  tick={<XAxisTick />}
                  allowDecimals={false}
                  tickLine={false}
                  domain={valueDomain}
                />
                <YAxis
                  type="category"
                  dataKey={xDataKey}
                  tick={(props) => (
                    <HorizontalCategoryAxisTick
                      {...props}
                      wrapMeta={horizontalCategoryWrapMeta}
                    />
                  )}
                  width={yAxisWidth ?? 120}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={xDataKey}
                  tick={
                    hideXAxisLabels
                      ? false
                      : (props) => (
                          <VerticalCategoryAxisTick
                            {...props}
                            angle={xAxisAngle}
                            dy={xAxisDy}
                            wrapMeta={verticalCategoryWrapMeta}
                          />
                        )
                  }
                  interval={0}
                  tickLine={false}
                  height={
                    xAxisAngle && Math.abs(xAxisAngle) > 0
                      ? X_AXIS_HEIGHT +
                        Math.max(12, Math.abs(xAxisAngle) * 0.45)
                      : X_AXIS_HEIGHT +
                        (verticalCategoryWrapMeta.maxLines - 1) *
                          verticalCategoryWrapMeta.lineHeight
                  }
                />
                <YAxis
                  tick={hideYAxisLabels ? false : <YAxisTick />}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={
                    hideYAxisLabels ? 0 : yAxisWidth ?? Y_AXIS_WIDTH
                  }
                  domain={valueDomain}
                />
              </>
            )}
            <RechartsTooltip
              cursor={{ fill: "transparent" }}
              content={defaultTooltip}
            />
            {bars.map((barConfig) => {
              const {
                dataKey,
                fill,
                stackId,
                labelOnTop,
                labelDataKey,
                perBarColor,
              } = barConfig;
              if (perBarColor) {
                const barFill = (entry, idx) =>
                  entry.fill ??
                  entry.color ??
                  fill ??
                  defaultBarColors[idx % defaultBarColors.length];
                return (
                  <Bar
                    key={dataKey}
                    dataKey={dataKey}
                    radius={isHorizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]}
                    maxBarSize={40}
                  >
                    <LabelList
                      position={isHorizontal ? "right" : "top"}
                      offset={barLabelOffset}
                      fill={TICK_FILL}
                      style={{ fontSize: LABEL_FONT_SIZE }}
                      formatter={(value, _name, entry) => {
                        const displayLabel = entry?.payload?.displayLabel;
                        if (displayLabel != null && displayLabel !== "") {
                          return displayLabel;
                        }
                        return valueFormatter(value);
                      }}
                    />
                    {data.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={barFill(entry, idx)}
                        onClick={
                          onBarClick ? () => onBarClick(entry) : undefined
                        }
                        style={
                          onBarClick
                            ? { cursor: "pointer", outline: "none" }
                            : undefined
                        }
                      />
                    ))}
                  </Bar>
                );
              }
              return (
                <Bar
                  key={dataKey}
                  dataKey={dataKey}
                  stackId={stackId}
                  fill={fill}
                  radius={
                    stackId && !labelOnTop
                      ? [0, 0, 0, 0]
                      : isHorizontal
                      ? [0, 3, 3, 0]
                      : [3, 3, 0, 0]
                  }
                  maxBarSize={40}
                  onClick={
                    onBarClick
                      ? (e) => e?.payload && onBarClick(e.payload, dataKey)
                      : undefined
                  }
                  style={
                    onBarClick
                      ? { cursor: "pointer", outline: "none" }
                      : undefined
                  }
                >
                  {labelOnTop && (
                    <LabelList
                      dataKey={labelDataKey || dataKey}
                      position={isHorizontal ? "right" : "top"}
                      fill={TICK_FILL}
                      style={{ fontSize: LABEL_FONT_SIZE }}
                      formatter={valueFormatter}
                    />
                  )}
                </Bar>
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      )}
    </>
  );

  const chartContent = useScrollableLayout ? (
    <Box height={height} maxHeight={maxHeight} overflowY="auto">
      <Box height={graphHeight} minH={graphHeight}>
        {innerChartContent}
      </Box>
    </Box>
  ) : (
    <Box height={height} maxHeight={maxHeight}>
      {innerChartContent}
    </Box>
  );

  const derivedLegendItems = React.useMemo(() => {
    if (legendItems?.length) return legendItems;
    const singleBar = bars.find((b) => b.perBarColor);
    if (singleBar && data?.length)
      return data.map((d, idx) => ({
        name: d[xDataKey],
        value: d[singleBar.dataKey],
        fill:
          d.fill ??
          d.color ??
          singleBar.fill ??
          defaultBarColors[idx % defaultBarColors.length],
      }));
    return [];
  }, [legendItems, bars, data, xDataKey, defaultBarColors]);

  return (
    <>
      {chartContent}
      {showLegend && derivedLegendItems.length > 0 && (
        <DashboardChartLegend
          items={derivedLegendItems}
          columns={legendColumns}
        />
      )}
    </>
  );
}

export default React.memo(DashboardBarChart);
export {
  XAxisTick,
  YAxisTick,
  wrapLabelLines,
  TICK_FILL,
  TICK_FONT_SIZE,
  CHART_MARGIN,
  BAR_CATEGORY_GAP,
  Y_AXIS_WIDTH,
  X_AXIS_HEIGHT,
};
