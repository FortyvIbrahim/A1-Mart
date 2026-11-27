"use client";

import React, { useMemo } from "react";
import { Box, Flex, Text, VStack, HStack } from "@chakra-ui/react";
import { NativeSelect } from "@chakra-ui/react";
import moment from "moment";
import { Tooltip } from "../ui/tooltip";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const PayrollMonthCalendar = ({
  payrollsByMonth,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthClick,
}) => {
  const years = useMemo(() => {
    const currentYear = moment().year();
    const start = currentYear - 5;
    const end = currentYear + 1;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, []);

  const getMonthStatus = (monthIndex) => {
    const key = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    const payroll = payrollsByMonth[key];
    if (payroll) {
      return {
        status: "uploaded",
        color: "#C95C18",
        bgColor: "#E8F6EF",
        borderColor: "#F1E3D9",
        label: "Has payroll",
      };
    }
    return {
      status: "pending",
      color: "#C95C18",
      bgColor: "#FFFBF8",
      borderColor: "#F1E3D9",
      label: "No payroll",
    };
  };

  const isSelected = (monthIndex) => {
    if (!selectedMonth) return false;
    const m = moment(selectedMonth);
    return m.year() === selectedYear && m.month() === monthIndex;
  };

  return (
    <VStack align="stretch" gap="16px">
      <Flex gap="16px" align="flex-end" wrap="wrap">
        <Box>
          <Text fontSize="12px" fontWeight="500" color="fg.muted" mb="8px">
            Year
          </Text>
          <NativeSelect.Root width="120px">
            <NativeSelect.Field
              h="44px"
              ps="12px"
              fontSize="12px"
              value={String(selectedYear)}
              onChange={(e) => onYearChange(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator color="#C95C18" />
          </NativeSelect.Root>
        </Box>
        <Box flex="1" minW="200px">
          <Text fontSize="12px" fontWeight="500" color="fg.muted" mb="8px">
            Month
          </Text>
          <Flex gap="8px" wrap="wrap">
            {MONTH_LABELS.map((label, monthIndex) => {
              const status = getMonthStatus(monthIndex);
              const selected = isSelected(monthIndex);

              return (
                <Tooltip
                  key={monthIndex}
                  content={`${label} ${selectedYear} - ${status.label}`}
                  placement="top"
                >
                  <Box
                    width="64px"
                    height="40px"
                    borderRadius="8px"
                    backgroundColor={status.bgColor}
                    color={status.color}
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{
                      borderColor: status.color,
                    }}
                    borderWidth="1px"
                    borderColor={selected ? "#F47721" : status.borderColor}
                    boxShadow={selected ? "0 0 0 1px #F47721" : undefined}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    onClick={() => {
                      const date = new Date(selectedYear, monthIndex, 1);
                      onMonthClick?.(date);
                    }}
                  >
                    <Text
                      fontSize="12px"
                      fontWeight={selected ? "600" : "500"}
                      textAlign="center"
                      lineHeight="1"
                    >
                      {label}
                    </Text>
                  </Box>
                </Tooltip>
              );
            })}
          </Flex>
        </Box>
      </Flex>

      {/* Figma legend: plain text, "Has payroll" green 12/500, "No payroll" muted. */}
      <HStack gap="16px">
        <Text fontSize="12px" fontWeight="500" color="#147D52">
          Has payroll
        </Text>
        <Text fontSize="12px" color="fg.muted">
          No payroll
        </Text>
      </HStack>
    </VStack>
  );
};

export default PayrollMonthCalendar;
