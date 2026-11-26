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
        color: "green.500",
        bgColor: "green.100",
        borderColor: "green.300",
        label: "Has payroll",
      };
    }
    return {
      status: "pending",
      color: "gray.500",
      bgColor: "gray.100",
      borderColor: "gray.300",
      label: "No payroll",
    };
  };

  const isSelected = (monthIndex) => {
    if (!selectedMonth) return false;
    const m = moment(selectedMonth);
    return m.year() === selectedYear && m.month() === monthIndex;
  };

  return (
    <VStack align="stretch" spacing={4}>
      <Flex gap={4} align="center" wrap="wrap">
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb="8px">
            Year
          </Text>
          <NativeSelect.Root width="120px">
            <NativeSelect.Field
              value={String(selectedYear)}
              onChange={(e) => onYearChange(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>
        <Box flex="1" minW="200px">
          <Text fontSize="sm" fontWeight="medium" mb="8px">
            Month
          </Text>
          <Flex gap={2} wrap="wrap">
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
                    width="36px"
                    height="36px"
                    borderRadius="6px"
                    backgroundColor={status.bgColor}
                    color={status.color}
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{
                      borderColor: status.color,
                    }}
                    borderWidth={selected ? "2px" : "1px"}
                    borderColor={selected ? status.color : status.borderColor}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    onClick={() => {
                      const date = new Date(selectedYear, monthIndex, 1);
                      onMonthClick?.(date);
                    }}
                  >
                    <Text
                      fontSize="xs"
                      fontWeight={selected ? "bold" : "medium"}
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

      <HStack spacing={4} fontSize="sm" mt="8px">
        <HStack spacing={2}>
          <Box
            width="16px"
            height="16px"
            borderRadius="4px"
            backgroundColor="green.100"
            borderWidth="1px"
            borderColor="green.300"
          />
          <Text fontSize="xs">Has payroll</Text>
        </HStack>
        <HStack spacing={2}>
          <Box
            width="16px"
            height="16px"
            borderRadius="4px"
            backgroundColor="gray.100"
            borderWidth="1px"
            borderColor="gray.300"
          />
          <Text fontSize="xs">No payroll</Text>
        </HStack>
      </HStack>
    </VStack>
  );
};

export default PayrollMonthCalendar;
