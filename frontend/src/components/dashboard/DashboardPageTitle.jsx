"use client";

import { Box, Text } from "@chakra-ui/react";
import React from "react";

/** Header band for dashboards (title + filters) — Figma spacing, no rule. */
export function DashboardTitleSection({ children, pb = 4 }) {
  return (
    <Box w="100%" pb={pb}>
      {children}
    </Box>
  );
}

/** Known dashboard subtitles from the Figma screens. */
const SUBTITLES = {
  "Accounts Dashboard": "Sales, billing and user performance across branches.",
  "Employee Dashboard": "Headcount, demographics and team distribution.",
  "Payroll Dashboard": "Monthly payroll, payments and comparisons.",
  "Attendance Dashboard": "Daily attendance, rest days and history.",
  "Stock Circle Dashboard": "Circle progress, checkers and deadlines.",
  "Checklist Dashboard": "Checklist completion across branches and forms.",
  "Outstanding Dashboard": "Supplier outstanding and invoice ageing.",
  "Stock Dashboard": "Stock movement and availability overview.",
  "Stock Holding Dashboard": "Holding, availability and sales by stock window.",
  "WMS Dashboard": "Purchases, repacking and returns across the warehouse.",
};

/** Page title for dashboards — large heading with an optional subtitle. */
export default function DashboardPageTitle({ title, subtitle }) {
  if (!title) return null;
  const sub = subtitle ?? SUBTITLES[title];

  return (
    <Box flexShrink={0} minW={0}>
      <Text
        as="h1"
        fontSize={{ base: "22px", md: "30px" }}
        fontWeight="600"
        letterSpacing="-0.02em"
        lineHeight="1.15"
        color="gray.800"
      >
        {title}
      </Text>
      {sub && (
        <Text mt="4px" fontSize={{ base: "12.5px", md: "13px" }} color="gray.500">
          {sub}
        </Text>
      )}
    </Box>
  );
}
