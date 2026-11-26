"use client";

import React, { useEffect, useRef } from "react";
import { Box, Flex, IconButton, Text } from "@chakra-ui/react";
import MonthCard from "./MonthCard";

function MonthsList({
  title = "Payroll Months",
  months = [],
  monthlyStats = {},
  selectedPayrollId,
  onSelectPayrollId,
  maxH, // kept for backward compat; not used in horizontal mode
  maxW = "100%",
  scrollStep = 220,
}) {
  const scrollRef = useRef(null);
  const itemRefs = useRef({});

  const canScroll = months.length > 0;

  useEffect(() => {
    if (!selectedPayrollId) return;
    const el = itemRefs.current?.[String(selectedPayrollId)];
    if (!el) return;
    // Ensure the selected month is visible (center-ish)
    el.scrollIntoView?.({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selectedPayrollId, months.length]);

  return (
    <Box>
      <Flex align="center" justify="space-between" mb={2}>
        <Text fontSize="sm" fontWeight="medium">
          {title}
        </Text>
        <Flex gap={2}>
          <IconButton
            aria-label="Scroll months left"
            size="sm"
            variant="outline"
            disabled={!canScroll}
            onClick={() => {
              scrollRef.current?.scrollBy({
                left: -scrollStep,
                behavior: "smooth",
              });
            }}
          >
            <i className="fa fa-chevron-left" />
          </IconButton>
          <IconButton
            aria-label="Scroll months right"
            size="sm"
            variant="outline"
            disabled={!canScroll}
            onClick={() => {
              scrollRef.current?.scrollBy({
                left: scrollStep,
                behavior: "smooth",
              });
            }}
          >
            <i className="fa fa-chevron-right" />
          </IconButton>
        </Flex>
      </Flex>

      <Box
        ref={scrollRef}
        maxW={maxW}
        overflowX="auto"
        overflowY="hidden"
        pb={2}
        css={{
          scrollBehavior: "smooth",
          // Hide scrollbar visuals but keep scrolling enabled
          scrollbarWidth: "none", // Firefox
          msOverflowStyle: "none", // IE/Edge legacy
        }}
        sx={{
          "&::-webkit-scrollbar": {
            display: "none",
          },
        }}
      >
        <Flex direction="row" gap={3} wrap="nowrap">
          {months.map((month) => {
            const stats = month.payroll_id
              ? monthlyStats[month.payroll_id]
              : null;
            const isActive = month.payroll_id === selectedPayrollId;
            const isDisabled = !month.hasData;

            return (
              <Box
                key={month.monthKey}
                ref={(node) => {
                  if (!month.payroll_id) return;
                  if (node) itemRefs.current[String(month.payroll_id)] = node;
                }}
              >
                <MonthCard
                  month={month.monthDate}
                  stats={stats}
                  isActive={isActive}
                  isDisabled={isDisabled}
                  onClick={() => {
                    if (month.payroll_id) onSelectPayrollId?.(month.payroll_id);
                  }}
                />
              </Box>
            );
          })}
        </Flex>
      </Box>
    </Box>
  );
}

export default MonthsList;
