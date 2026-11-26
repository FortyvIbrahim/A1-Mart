import React from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import moment from "moment";
import { Tooltip } from "../ui/tooltip";

const TONE_STYLES = {
  green: {
    bg: "green.100",
    color: "green.500",
    border: "green.100",
    hoverBorder: "green.500",
  },
  yellow: {
    bg: "yellow.100",
    color: "yellow.700",
    border: "yellow.200",
    hoverBorder: "yellow.600",
  },
  gray: {
    bg: "gray.100",
    color: "gray.500",
    border: "gray.200",
    hoverBorder: "gray.400",
  },
  red: {
    bg: "red.100",
    color: "red.500",
    border: "red.100",
    hoverBorder: "red.500",
  },
};

const CalendarDots = ({
  startDate,
  endDate,
  records = [],
  title = "Calendar View",
  /** `YYYY-MM-DD` — highlights the selected day when set */
  selectedDate = null,
  /** Called with `YYYY-MM-DD` when a day cell is clicked */
  onDateSelect,
  /**
   * Optional per-day styling (checklist: green = all complete, yellow = gaps, gray = no forms yet).
   * When present for a date, overrides `records`-based red/green.
   */
  dayOverrides = null,
}) => {
  // Generate all dates in the range
  const generateDateRange = () => {
    if (!startDate || !endDate) return [];

    const dates = [];
    const start = moment(startDate);
    const end = moment(endDate);

    let current = start.clone();
    while (current.isSameOrBefore(end, "day")) {
      dates.push(current.clone());
      current.add(1, "day");
    }

    return dates;
  };

  // Check if a date has records
  const hasRecordsForDate = (date) => {
    return records.some((record) => moment(record.date).isSame(date, "day"));
  };

  // Get count of records for a specific date
  const getRecordCountForDate = (date) => {
    return records.filter((record) => moment(record.date).isSame(date, "day"))
      .length;
  };

  const dates = generateDateRange();

  if (dates.length === 0) {
    return <Text>-</Text>;
  }

  return (
    <Box>
      <Flex gap={2} wrap="wrap" align="center">
        {dates.map((date, index) => {
          const ymd = date.format("YYYY-MM-DD");
          const override = dayOverrides?.[ymd];
          const hasRecords = hasRecordsForDate(date);
          const recordCount = getRecordCountForDate(date);

          let tooltipText;
          let toneKey;
          if (override) {
            tooltipText = override.tooltip;
            toneKey = override.tone;
          } else {
            tooltipText = `${date.format("DD/MM/YYYY")} - ${
              hasRecords
                ? `${recordCount} record${recordCount > 1 ? "s" : ""}`
                : "No records"
            }`;
            toneKey = hasRecords ? "green" : "red";
          }

          const tone = TONE_STYLES[toneKey] ?? TONE_STYLES.red;
          const isSelected =
            selectedDate &&
            moment(selectedDate, "YYYY-MM-DD", true).isSame(date, "day");
          const interactive = Boolean(onDateSelect);
          const ariaHas =
            override?.tone === "green"
              ? ", all complete"
              : override?.tone === "yellow"
                ? ", incomplete forms"
                : override?.tone === "gray"
                  ? ", before forms existed"
                  : hasRecords
                    ? ", has records"
                    : ", no records";

          return (
            <Tooltip key={index} content={tooltipText} placement="top">
              <Box
                as={interactive ? "button" : "div"}
                type={interactive ? "button" : undefined}
                width="32px"
                height="32px"
                borderRadius="6px"
                backgroundColor={tone.bg}
                color={tone.color}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{
                  borderColor: tone.hoverBorder,
                }}
                borderWidth={isSelected ? "2px" : "0.5px"}
                borderColor={
                  isSelected ? "secondary.600" : tone.border
                }
                display="flex"
                alignItems="center"
                justifyContent="center"
                position="relative"
                p={0}
                onClick={
                  interactive ? () => onDateSelect(ymd) : undefined
                }
                aria-pressed={interactive ? isSelected : undefined}
                aria-label={`${date.format("DD MMMM YYYY")}${ariaHas}`}
              >
                <Text
                  fontSize="xs"
                  fontWeight="bold"
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
  );
};

export default CalendarDots;
