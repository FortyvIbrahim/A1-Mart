import React, { useMemo } from "react";
import { Box, Flex, Text, VStack, HStack } from "@chakra-ui/react";
import moment from "moment";
import { Tooltip } from "../ui/tooltip";

const AccountsPreloadCalendar = ({
  dataByDate,
  currentMonth,
  onDateClick,
  selectedDate,
}) => {
  // Get start and end of the month
  const monthStart = useMemo(() => {
    return moment(currentMonth).startOf("month");
  }, [currentMonth]);

  const monthEnd = useMemo(() => {
    return moment(currentMonth).endOf("month");
  }, [currentMonth]);

  const today = moment();

  // Generate all dates in the month
  const datesInMonth = useMemo(() => {
    const dates = [];
    const start = monthStart.clone();
    const end = monthEnd.clone();

    let current = start.clone();
    while (current.isSameOrBefore(end, "day")) {
      dates.push(current.clone());
      current.add(1, "day");
    }

    return dates;
  }, [monthStart, monthEnd]);

  // Check if date has uploaded data
  const hasUploadedData = (date) => {
    const dateKey = date.format("YYYY-MM-DD");
    return dataByDate[dateKey] && dataByDate[dateKey].length > 0;
  };

  // Check if date is in the past
  const isPastDate = (date) => {
    return date.isBefore(today, "day");
  };

  // Check if date is in the future
  const isFutureDate = (date) => {
    return date.isAfter(today, "day");
  };

  // Get status for a date
  const getDateStatus = (date) => {
    const hasData = hasUploadedData(date);
    const isPast = isPastDate(date);
    const isFuture = isFutureDate(date);

    if (hasData) {
      return {
        status: "uploaded",
        color: "green.500",
        bgColor: "green.100",
        borderColor: "green.300",
        label: "Uploaded",
      };
    } else if (isPast) {
      return {
        status: "missed",
        color: "red.500",
        bgColor: "red.50",
        borderColor: "red.200",
        label: "Missed",
      };
    } else if (isFuture) {
      return {
        status: "pending",
        color: "gray.500",
        bgColor: "gray.100",
        borderColor: "gray.300",
        label: "Pending",
      };
    } else {
      // Today without data
      return {
        status: "pending",
        color: "gray.500",
        bgColor: "gray.100",
        borderColor: "gray.300",
        label: "Pending",
      };
    }
  };

  // Get count of records for a date
  const getRecordCount = (date) => {
    const dateKey = date.format("YYYY-MM-DD");
    return dataByDate[dateKey] ? dataByDate[dateKey].length : 0;
  };

  return (
    <VStack align="stretch" spacing={4}>
      <Box>
        <Flex gap={2} wrap="wrap" align="center">
          {datesInMonth.map((date, index) => {
            const status = getDateStatus(date);
            const recordCount = getRecordCount(date);
            const isToday = date.isSame(today, "day");
            const isSelected = moment(selectedDate).isSame(date, "day");

            return (
              <Tooltip
                key={index}
                content={`${date.format("DD/MM/YYYY")} - ${status.label}${
                  recordCount > 0
                    ? ` (${recordCount} record${recordCount > 1 ? "s" : ""})`
                    : ""
                }`}
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
                  borderWidth={isSelected ? "2px" : "1px"}
                  borderColor={
                    isSelected || isToday ? status.color : status.borderColor
                  }
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  onClick={() => onDateClick && onDateClick(date.toDate())}
                >
                  <Text
                    fontSize="xs"
                    fontWeight={isToday ? "bold" : "medium"}
                    textAlign="center"
                    lineHeight="1"
                  >
                    {date.format("D")}
                  </Text>
                </Box>
              </Tooltip>
            );
          })}
        </Flex>
      </Box>

      {/* Legend */}
      <HStack spacing={4} fontSize="sm" mt="22px">
        <HStack spacing={2}>
          <Box
            width="16px"
            height="16px"
            borderRadius="4px"
            backgroundColor="green.100"
            borderWidth="1px"
            borderColor="green.300"
          />
          <Text fontSize="xs">Uploaded</Text>
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
          <Text fontSize="xs">Pending</Text>
        </HStack>
        <HStack spacing={2}>
          <Box
            width="16px"
            height="16px"
            borderRadius="4px"
            backgroundColor="red.50"
            borderWidth="1px"
            borderColor="red.200"
          />
          <Text fontSize="xs">Missed</Text>
        </HStack>
      </HStack>
    </VStack>
  );
};

export default AccountsPreloadCalendar;
