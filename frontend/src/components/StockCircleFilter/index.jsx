"use client";

import React, { useMemo } from "react";
import { Flex, Text, VStack } from "@chakra-ui/react";
import CustomInput from "@/components/CustomInput";
import {
  formatStockCircleDepartments,
  getPeriod,
} from "@/app/stock/circle/page";
import { capitalizeWords } from "@/utils/string";

function circleKey(c) {
  return c?.id ?? c?.stock_circle_id;
}

function circleOptionLabel(c) {
  const dept = formatStockCircleDepartments(c);
  const period = getPeriod(c) ?? "";
  const parts = [
    capitalizeWords(c.branch_name || ""),
    dept && dept !== "—" ? dept : null,
    period ? String(period).slice(0, 40) : null,
  ].filter(Boolean);
  return parts.join(" · ") || `Circle ${circleKey(c)}`;
}

/**
 * Multi-select stock circle filter. Layout matches {@link BranchFilter} (label + control).
 * Uses {@link CustomInput} `multiple-dropdown`.
 * Empty selection means all circles; once the user picks any circle, filtering applies to that set.
 */
function StockCircleFilter({
  circles = [],
  value,
  onChange,
  label = "Circle",
  placeholder = "All circles — select to narrow",
  width = { base: "100%", md: "310px" },
  disabled = false,
}) {
  const options = useMemo(
    () =>
      (circles || []).map((c) => {
        const id = circleKey(c);
        const lbl = circleOptionLabel(c);
        const dept = formatStockCircleDepartments(c);
        const period = getPeriod(c);
        return {
          value: id,
          label: lbl,
          searchText: `${lbl} ${id} ${dept} ${period ?? ""}`.toLowerCase(),
          circle: c,
        };
      }),
    [circles]
  );

  const renderCircleOption = (item) => {
    const c = item.circle;
    if (!c) {
      return (
        <Text fontSize="sm" textAlign="left">
          {item.label}
        </Text>
      );
    }
    const id = circleKey(c);
    const period = getPeriod(c);
    const deptLine = formatStockCircleDepartments(c);
    return (
      <VStack align="start" gap={0} py={0.5} w="100%">
        <Text fontSize="sm" fontWeight="medium" lineClamp={1} w="100%">
          {capitalizeWords(c.branch_name || "")}{" "}
          <Text as="span" fontWeight="normal" color="gray.500">
            (ID {id})
          </Text>
        </Text>
        {deptLine && deptLine !== "—" ? (
          <Text fontSize="xs" color="gray.600" lineClamp={2} w="100%">
            {deptLine}
          </Text>
        ) : null}
        {period ? (
          <Text fontSize="xs" color="gray.500" lineClamp={2} w="100%">
            {period}
          </Text>
        ) : null}
      </VStack>
    );
  };

  const handleChange = (next) => {
    const arr = Array.isArray(next) ? next : [];
    onChange?.(arr);
  };

  return (
    <Flex direction="column" gap="7px" w={width} minW={0}>
      <Text fontSize="10px" lineHeight="12px" fontWeight="500" color="fg.muted">
        {label}
      </Text>
      <CustomInput
        name="stock_circle_dashboard_circles"
        method="multiple-dropdown"
        label=" "
        placeholder={circles.length ? placeholder : "No circles"}
        options={options}
        value={value}
        onChange={handleChange}
        disabled={disabled || circles.length === 0}
        labelStyle={{
          display: "none",
          height: 0,
          margin: 0,
          padding: 0,
          overflow: "hidden",
        }}
        customRender={renderCircleOption}
        h="40px"
        fontSize="12px"
      />
    </Flex>
  );
}

export default StockCircleFilter;
export { circleKey, circleOptionLabel };
