"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import React from "react";

/** Header band for dashboards (title + optional right-side controls). */
export function DashboardTitleSection({ children, pb = 4 }) {
  return (
    <Box w="100%" pb={pb}>
      {children}
    </Box>
  );
}

/** Dashboard subtitles, copied from the Figma "Page heading" frames. */
const SUBTITLES = {
  "Accounts Dashboard": "Sales, billing and user performance across branches.",
  "Employee Dashboard": "Understand your workforce and open employee records.",
  "Payroll Dashboard": "Track monthly payroll, payments and employee totals.",
  "Attendance Dashboard":
    "Review daily presence, timeliness and staffing allocation.",
  "Stock Circle Dashboard":
    "Monitor circle completion, stock checking and deadlines.",
  "Checklist Dashboard":
    "Monitor submissions, contributors and pending checklists.",
  "Outstanding Dashboard": "Supplier outstanding and invoice ageing.",
  "Stock Dashboard": "Stock movement and availability overview.",
  "Stock Holding Dashboard": "Holding, availability and sales by stock window.",
  "WMS Dashboard": "Purchases, repacking and returns across the warehouse.",
};

/**
 * Figma "Page heading": title 30/600 #202938, 7px gap, subtitle 12/400
 * #637188. Optional `rightSection` sits at the end of the row (16px gap).
 */
export default function DashboardPageTitle({ title, subtitle, rightSection, size = "lg" }) {
  if (!title) return null;
  const sub = subtitle ?? SUBTITLES[title];

  const heading = (
    <Flex direction="column" gap="7px" flexShrink={0} minW={0}>
      <Text
        as="h1"
        fontSize={size === "sm" ? "22px" : { base: "22px", md: "30px" }}
        fontWeight="600"
        lineHeight={size === "sm" ? "28px" : { base: "28px", md: "36px" }}
        color="fg"
      >
        {title}
      </Text>
      {sub && (
        <Text fontSize="12px" lineHeight="15px" color="fg.muted">
          {sub}
        </Text>
      )}
    </Flex>
  );

  if (!rightSection) return heading;

  return (
    <Flex
      w="100%"
      gap="16px"
      align={{ base: "flex-start", md: "flex-end" }}
      justify="space-between"
      wrap="wrap"
    >
      {heading}
      <Flex gap="12px" align="flex-end" wrap="wrap">
        {rightSection}
      </Flex>
    </Flex>
  );
}
