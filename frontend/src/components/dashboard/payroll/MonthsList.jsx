"use client";

import React, { useEffect, useRef } from "react";
import { Box, Flex, IconButton, Text } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import MonthCard from "./MonthCard";

function MonthsList({
  title = "Payroll Months",
  months = [],
  monthlyStats = {},
  selectedPayrollId,
  onSelectPayrollId,
  maxH, // kept for backward compat; not used in horizontal mode
  maxW = "100%",
  scrollStep = 227,
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
      {/* Figma "Payroll Months / Heading and navigation": 48px row, 16/600 title,
          48px arrows (previous: white + #FFD6B8 border, next: #FFE1C8 fill). */}
      <Flex align="center" justify="space-between" minH="48px" mb="24px">
        <Text fontSize="16px" fontWeight="600" lineHeight="19px" color="fg">
          {title}
        </Text>
        <Flex gap="16px">
          <IconButton
            aria-label="Scroll months left"
            w="48px"
            h="48px"
            minW="48px"
            borderRadius="6px"
            bg="white"
            borderWidth="1px"
            borderColor="#FFD6B8"
            color="#C95C18"
            _hover={{ bg: "#FFF5ED" }}
            disabled={!canScroll}
            onClick={() => {
              scrollRef.current?.scrollBy({ left: -scrollStep, behavior: "smooth" });
            }}
          >
            <LuChevronLeft size={20} />
          </IconButton>
          <IconButton
            aria-label="Scroll months right"
            w="48px"
            h="48px"
            minW="48px"
            borderRadius="6px"
            bg="#FFE1C8"
            color="#C95C18"
            _hover={{ bg: "#FFD6B8" }}
            disabled={!canScroll}
            onClick={() => {
              scrollRef.current?.scrollBy({ left: scrollStep, behavior: "smooth" });
            }}
          >
            <LuChevronRight size={20} />
          </IconButton>
        </Flex>
      </Flex>

      <Box
        ref={scrollRef}
        maxW={maxW}
        overflowX="auto"
        overflowY="hidden"
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
        <Flex direction="row" gap="16px" wrap="nowrap">
          {months.map((month) => {
            const stats = month.payroll_id
              ? monthlyStats[month.payroll_id]
              : null;
            const isActive =
              Boolean(month.payroll_id) && month.payroll_id === selectedPayrollId;
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
