"use client";

import React, { forwardRef } from "react";
import DatePicker from "react-datepicker";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import DashboardChartLegend from "@/components/dashboard/DashboardChartLegend";
import { Box, Flex, Grid, Input, Text } from "@chakra-ui/react";
import CustomSelect from "@/components/CustomSelect";
import { LuChevronDown, LuSearch } from "react-icons/lu";

/*
 * Shared dashboard building blocks, measured from the Figma
 * "A1mart/Dashboard" frames (Concept C · Pearl Orange).
 *
 *   Filter panel   white, radius 10, padding 16, 16px row/column gaps
 *   Filter label   12/500 #637188, line 18, 6px above the control
 *   Control        40px tall, radius 8, 1px #F1E3D9, 12px side padding, 12px text
 *   Metric card    112px, radius 14, padding 16/20, gap 12, 1px #F1E3D9
 *   Card           radius 14, padding 20, gap 16, title 16/600 #202938
 *   Tabs           37px, radius 8, padding 12/16, 11/600, active #FFF5ED/#C95C18
 */

const BASE_CONTROL = {
  h: "40px",
  px: "12px",
  borderRadius: "8px",
  borderWidth: "1px",
  borderColor: "border",
  bg: "white",
  fontSize: "12px",
  lineHeight: "18px",
  color: "fg",
  _placeholder: { color: "fg.muted" },
  _focusVisible: {
    borderColor: "brand.400",
    outline: "none",
    boxShadow: "0 0 0 3px rgba(244, 119, 33, 0.14)",
  },
};

function FieldLabel({ children, weight = "500" }) {
  return (
    <Text fontSize="12px" fontWeight={weight} lineHeight="18px" color="fg.muted">
      {children}
    </Text>
  );
}

const DateButton = forwardRef(function DateButton(
  { value, onClick, placeholder, ariaLabel, height = "40px" },
  ref
) {
  return (
    <Flex
      as="button"
      type="button"
      ref={ref}
      onClick={onClick}
      aria-label={ariaLabel}
      align="center"
      justify="space-between"
      gap="8px"
      w="100%"
      textAlign="left"
      cursor="pointer"
      {...BASE_CONTROL}
      h={height}
      color={value ? "fg" : "fg.muted"}
    >
      <Text as="span" truncate>
        {value || placeholder}
      </Text>
      <LuChevronDown size={14} color="#C95C18" />
    </Flex>
  );
});

/**
 * One filter control. field = {
 *   key, label, type: "search" | "select" | "date",
 *   value, onChange(value), placeholder, options: [{ value, label }],
 *   dateFormat (date only, default dd/MM/yyyy)
 * }
 */
export function DashboardFilterField({ field, size = "md" }) {
  const { type = "select", label, value, onChange, placeholder } = field;
  const lg = size === "lg";
  const CONTROL = lg ? { ...BASE_CONTROL, h: "44px" } : BASE_CONTROL;
  // A field may supply its own control (e.g. permission-aware BranchFilter).
  if (field.render) return <Box minW={0}>{field.render}</Box>;

  let control;
  if (type === "search") {
    control = (
      <Box position="relative">
        <Input
          {...CONTROL}
          pr="34px"
          value={value ?? ""}
          placeholder={placeholder ?? "Search…"}
          onChange={(e) => onChange?.(e.target.value)}
          aria-label={label ?? placeholder}
        />
        <Box
          position="absolute"
          right="12px"
          top="50%"
          transform="translateY(-50%)"
          color="fg.muted"
          pointerEvents="none"
        >
          <LuSearch size={14} />
        </Box>
      </Box>
    );
  } else if (type === "date") {
    control = (
      <DatePicker
        selected={value ?? null}
        onChange={(d) => onChange?.(d)}
        dateFormat={field.dateFormat ?? "dd/MM/yyyy"}
        placeholderText={placeholder}
        isClearable={Boolean(field.clearable)}
        portalId="root-portal"
        wrapperClassName="a1-dashboard-date"
        customInput={
          <DateButton placeholder={placeholder} ariaLabel={label} height={CONTROL.h} />
        }
      />
    );
  } else {
    const hasValue = value !== undefined && value !== null && value !== "";
    control = (
      <CustomSelect
        h={CONTROL.h}
        fontSize={CONTROL.fontSize}
        borderRadius={CONTROL.borderRadius}
        value={hasValue ? String(value) : ""}
        onChange={(v) => onChange?.(v)}
        allowEmpty={placeholder !== false}
        placeholder={placeholder === false ? undefined : placeholder ?? "All"}
        options={field.options ?? []}
        ariaLabel={label ?? placeholder}
      />
    );
  }

  return (
    <Flex direction="column" gap={lg ? "8px" : "6px"} minW={0} w={field.width}>
      {label && <FieldLabel weight={lg ? "400" : "500"}>{label}</FieldLabel>}
      {control}
    </Flex>
  );
}

/** Figma "Record filters / Search and reporting scope" panel. */
export function DashboardFilterPanel({ fields = [], columns = 4 }) {
  return (
    <Box bg="white" borderRadius="10px" p="16px">
      <Grid
        templateColumns={{
          base: "minmax(0, 1fr)",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: `repeat(${columns}, minmax(0, 1fr))`,
        }}
        gap="16px"
      >
        {fields.map((f) => (
          <DashboardFilterField key={f.key} field={f} />
        ))}
      </Grid>
    </Box>
  );
}

/** Tinted metric cards (Figma warehouse dashboards: orange / blue / purple). */
const METRIC_TONES = {
  orange: { bg: "#FFF5ED", border: "#FBE3D2", icon: "#C95C18" },
  blue: { bg: "#EEF3FC", border: "#DCE6F7", icon: "#526FA8" },
  purple: { bg: "#F4F1FD", border: "#E6E0F8", icon: "#7C5CC4" },
  green: { bg: "#E8F6EF", border: "#CDEBDC", icon: "#147D52" },
  red: { bg: "#FDECEE", border: "#F7D5D9", icon: "#BC3745" },
  amber: { bg: "#FFF4DB", border: "#F6E4B8", icon: "#946200" },
};

/** Figma "Metric / …" summary card. `tone` + `icon` give the tinted variant. */
export function DashboardMetricCard({ label, value, caption, onClick, active, tone, icon }) {
  const t = tone ? METRIC_TONES[tone] : null;
  return (
    <Flex
      as={onClick ? "button" : "div"}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      direction="column"
      gap="12px"
      minH="112px"
      px="20px"
      pt="16px"
      pb="14px"
      bg={t ? t.bg : "white"}
      borderWidth="1px"
      borderColor={active ? "brand.300" : t ? t.border : "border"}
      borderRadius={t ? "10px" : "14px"}
      textAlign="left"
      cursor={onClick ? "pointer" : "default"}
      minW={0}
      _hover={onClick ? { borderColor: "brand.200" } : undefined}
    >
      {icon && (
        <Box color={t?.icon ?? "fg.muted"} fontSize="16px" lineHeight="16px" mb="-4px">
          {icon}
        </Box>
      )}
      <Text fontSize="12px" fontWeight="500" lineHeight="15px" color="fg.muted">
        {label}
      </Text>
      <Text
        fontSize="25px"
        fontWeight="600"
        lineHeight="30px"
        color="fg"
        truncate
      >
        {value}
      </Text>
      {caption && (
        <Text fontSize="10px" lineHeight="12px" color="fg.muted">
          {caption}
        </Text>
      )}
    </Flex>
  );
}

/** Row of metric cards — 16px gap, equal columns. */
export function DashboardMetricRow({ children, columns = 4 }) {
  return (
    <Grid
      templateColumns={{
        base: "minmax(0, 1fr)",
        sm: "repeat(2, minmax(0, 1fr))",
        lg: `repeat(${columns}, minmax(0, 1fr))`,
      }}
      gap="16px"
    >
      {children}
    </Grid>
  );
}

/** Figma "Card / …": white, radius 14, padding 20, gap 16. */
export function DashboardCard({
  title,
  subtitle,
  rightSection,
  children,
  ...rest
}) {
  return (
    <Flex
      direction="column"
      gap="16px"
      p="20px"
      bg="white"
      borderWidth="1px"
      borderColor="border"
      borderRadius="14px"
      minW={0}
      {...rest}
    >
      {(title || rightSection) && (
        <Flex direction="column" gap="16px">
          <Flex align="center" justify="space-between" gap="12px" wrap="wrap">
            {title && (
              <Text fontSize="16px" fontWeight="600" lineHeight="19px" color="fg">
                {title}
              </Text>
            )}
            {rightSection}
          </Flex>
          {subtitle && (
            <Text fontSize="10px" lineHeight="12px" color="fg.muted">
              {subtitle}
            </Text>
          )}
        </Flex>
      )}
      {children}
    </Flex>
  );
}

/** Figma "Local navigation" tabs. */
export function DashboardTabs({ tabs = [], value, onChange }) {
  return (
    <Flex gap="4px" wrap="wrap" role="tablist">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <Box
            key={t.value}
            as="button"
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(t.value)}
            px="16px"
            py="12px"
            borderRadius="8px"
            bg={active ? "app.tableHeader" : "transparent"}
            color={active ? "#C95C18" : "fg.muted"}
            fontSize="11px"
            fontWeight="600"
            lineHeight="13px"
            _hover={active ? undefined : { color: "fg" }}
          >
            {t.label}
          </Box>
        );
      })}
    </Flex>
  );
}

/** Two cards side by side — Figma chart rows use a 20px gap. */
export function DashboardTwoColumn({ children }) {
  return (
    <Grid
      templateColumns={{ base: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }}
      gap="20px"
    >
      {children}
    </Grid>
  );
}

/**
 * Figma doughnut: 220px ring (110/80 radius) with the total in the centre
 * (25/600 + "total" 10px) and a dot legend to the right, 40px apart.
 * data = [{ name, value, color, labelColor? }]
 */
export function DashboardDonut({
  data = [],
  centerValue,
  legendColumns = 1,
  onItemClick,
  emptyMessage = "No data to display",
}) {
  const rows = data.filter((d) => (Number(d.value) || 0) > 0);
  if (!rows.length) {
    return (
      <Flex minH="220px" align="center" justify="center">
        <Text fontSize="12px" color="fg.muted">
          {emptyMessage}
        </Text>
      </Flex>
    );
  }
  const total = rows.reduce((s, d) => s + (Number(d.value) || 0), 0);
  return (
    <Flex align="center" gap="40px" direction={{ base: "column", sm: "row" }} minW={0}>
      <Box position="relative" w="220px" h="220px" flexShrink={0}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              innerRadius={80}
              outerRadius={110}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {rows.map((d) => (
                <Cell
                  key={d.name}
                  fill={d.color}
                  cursor={onItemClick ? "pointer" : "default"}
                  onClick={onItemClick ? () => onItemClick(d.name) : undefined}
                />
              ))}
            </Pie>
            <RechartsTooltip formatter={(v, n) => [`${v}`, n]} />
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
            {centerValue ?? total}
          </Text>
          <Text fontSize="10px" lineHeight="12px" color="fg.muted">
            total
          </Text>
        </Flex>
      </Box>
      <Box flex="1" minW={0} w="100%" mt="-16px">
        <DashboardChartLegend
          columns={legendColumns}
          items={data.map((d) => ({
            name: d.name,
            value: d.value,
            fill: d.color,
            labelColor: d.labelColor,
            onClick: onItemClick ? () => onItemClick(d.name) : undefined,
          }))}
        />
      </Box>
    </Flex>
  );
}

/**
 * Figma warehouse dashboards: section tabs spread evenly across a white strip
 * (r8, #F1E3D9, p8) — 37px pills, 11/600, active #FFF5ED / #C95C18.
 */
export function DashboardStripTabs({ tabs = [], value, onChange }) {
  return (
    <Flex
      role="tablist"
      gap="8px"
      p="8px"
      bg="white"
      borderWidth="1px"
      borderColor="border"
      borderRadius="8px"
      wrap={{ base: "wrap", md: "nowrap" }}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <Box
            as="button"
            type="button"
            role="tab"
            aria-selected={active}
            key={t.value}
            onClick={() => onChange?.(t.value)}
            flex={{ md: "1" }}
            h="37px"
            px="16px"
            borderRadius="8px"
            fontSize="11px"
            fontWeight="600"
            whiteSpace="nowrap"
            color={active ? "#C95C18" : "fg.muted"}
            bg={active ? "#FFF5ED" : "transparent"}
            _hover={active ? undefined : { color: "fg" }}
          >
            {t.label}
          </Box>
        );
      })}
    </Flex>
  );
}
