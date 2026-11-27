import React, { useMemo, useState } from "react";
import { Box, Flex, Grid, Icon, Text, VStack, HStack } from "@chakra-ui/react";
import moment from "moment";
import { LuCheck } from "react-icons/lu";
import { Tooltip } from "../ui/tooltip";
import CustomSelect from "@/components/CustomSelect";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "uploaded", label: "Uploaded" },
  { value: "pending", label: "Pending" },
  { value: "missed", label: "Missed" },
];

const LEGEND_ITEMS = [
  {
    key: "uploaded",
    label: "Uploaded",
    boxBg: "#E8F6EE",
    boxBorder: "#86EFAC",
    checkColor: "#15803D",
    textColor: "#15803D",
  },
  {
    key: "pending",
    label: "Pending",
    boxBg: "#FFF5ED",
    boxBorder: "#FBD2B3",
    checkColor: "#C95C18",
    textColor: "fg.muted",
  },
  {
    key: "missed",
    label: "Missed",
    boxBg: "#FDECEC",
    boxBorder: "#FCA5A5",
    checkColor: "#DC2626",
    textColor: "#DC2626",
  },
];

const ALL_STATUSES = ["uploaded", "pending", "missed"];

const AccountsPreloadCalendar = ({
  dataByDate = {},
  currentMonth,
  onDateClick,
  selectedDate,
  onMonthChange,
}) => {
  const [selectedStatuses, setSelectedStatuses] = useState(ALL_STATUSES);

  const dropdownValue =
    selectedStatuses.length === 0 || selectedStatuses.length === ALL_STATUSES.length
      ? "all"
      : selectedStatuses.length === 1
        ? selectedStatuses[0]
        : "all";

  const toggleStatus = (key) => {
    setSelectedStatuses((prev) => {
      const exists = prev.includes(key);
      if (exists) {
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const handleDropdownChange = (val) => {
    if (!val || val === "all") {
      setSelectedStatuses(ALL_STATUSES);
    } else {
      setSelectedStatuses([val]);
    }
  };

  // Get start and end of the visible month
  const monthStart = useMemo(() => {
    return moment(currentMonth).startOf("month");
  }, [currentMonth]);

  const monthEnd = useMemo(() => {
    return moment(currentMonth).endOf("month");
  }, [currentMonth]);

  const today = moment();

  // Month options centered around available data + recent/next months
  const monthOptions = useMemo(() => {
    const map = new Map();
    const anchor = moment(currentMonth).startOf("month");
    for (let i = -6; i <= 2; i += 1) {
      const m = anchor.clone().add(i, "months");
      map.set(m.format("YYYY-MM"), m.format("MMM YYYY"));
    }
    Object.keys(dataByDate || {}).forEach((key) => {
      const m = moment(key, "YYYY-MM-DD", true).startOf("month");
      if (m.isValid()) {
        map.set(m.format("YYYY-MM"), m.format("MMM YYYY"));
      }
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [currentMonth, dataByDate]);

  // Generate all dates in the month with leading offset for Sun-Sat grid
  const { datesInMonth, leadingBlanks } = useMemo(() => {
    const dates = [];
    const start = monthStart.clone();
    const end = monthEnd.clone();

    let current = start.clone();
    while (current.isSameOrBefore(end, "day")) {
      dates.push(current.clone());
      current.add(1, "day");
    }

    return {
      datesInMonth: dates,
      leadingBlanks: start.day(),
    };
  }, [monthStart, monthEnd]);

  const hasUploadedData = (date) => {
    const dateKey = date.format("YYYY-MM-DD");
    return dataByDate[dateKey] && dataByDate[dateKey].length > 0;
  };

  const getDateStatus = (date) => {
    const hasData = hasUploadedData(date);
    const isPast = date.isBefore(today, "day");

    if (hasData) {
      return {
        status: "uploaded",
        color: "#1F2937",
        bgColor: "#E8F6EE",
        borderColor: "#E8F6EE",
        label: "Uploaded",
      };
    }
    if (isPast) {
      return {
        status: "missed",
        color: "#1F2937",
        bgColor: "#FDECEC",
        borderColor: "#FDECEC",
        label: "Missed",
      };
    }
    return {
      status: "pending",
      color: "#1F2937",
      bgColor: "#FFF5ED",
      borderColor: "#FFF5ED",
      label: "Pending",
    };
  };

  const getRecordCount = (date) => {
    const dateKey = date.format("YYYY-MM-DD");
    return dataByDate[dateKey] ? dataByDate[dateKey].length : 0;
  };

  return (
    <VStack align="stretch" gap="16px">
      {/* Month & Upload Status Filters */}
      <Grid templateColumns="repeat(2, 1fr)" gap="12px">
        <Box>
          <Text fontSize="12px" fontWeight="500" color="fg.muted" mb="6px">
            Month
          </Text>
          <CustomSelect
            h="40px"
            fontSize="12.5px"
            allowEmpty={false}
            value={monthStart.format("YYYY-MM")}
            options={monthOptions}
            onChange={(val) => {
              const nextMonth = moment(val, "YYYY-MM").toDate();
              onMonthChange?.(nextMonth);
            }}
          />
        </Box>
        <Box>
          <Text fontSize="12px" fontWeight="500" color="fg.muted" mb="6px">
            Upload Status
          </Text>
          <CustomSelect
            h="40px"
            fontSize="12.5px"
            allowEmpty={false}
            value={dropdownValue}
            options={STATUS_OPTIONS}
            onChange={handleDropdownChange}
          />
        </Box>
      </Grid>

      {/* Weekday Header + Day Grid */}
      <Box>
        <Grid templateColumns="repeat(7, 1fr)" gap="8px" mb="8px">
          {WEEKDAYS.map((day) => (
            <Text
              key={day}
              fontSize="11px"
              fontWeight="500"
              color="fg.muted"
              textAlign="center"
            >
              {day}
            </Text>
          ))}
        </Grid>

        <Grid templateColumns="repeat(7, 1fr)" gap="8px">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <Box key={`blank-${i}`} h="40px" />
          ))}

          {datesInMonth.map((date, index) => {
            const status = getDateStatus(date);
            const recordCount = getRecordCount(date);
            const isToday = date.isSame(today, "day");
            const isSelected = moment(selectedDate).isSame(date, "day");
            const matchesFilter =
              selectedStatuses.length === 0 ||
              selectedStatuses.includes(status.status);

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
                  h="40px"
                  borderRadius="8px"
                  backgroundColor={status.bgColor}
                  color={status.color}
                  cursor="pointer"
                  opacity={matchesFilter ? 1 : 0.28}
                  transition="all 0.15s ease"
                  _hover={{
                    borderColor: "#F47721",
                  }}
                  borderWidth={isSelected ? "2px" : "1px"}
                  borderColor={isSelected ? "#F47721" : status.borderColor}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  onClick={() => onDateClick && onDateClick(date.toDate())}
                >
                  <Text
                    fontSize="12.5px"
                    fontWeight={isSelected || isToday ? "600" : "500"}
                    textAlign="center"
                    lineHeight="1"
                  >
                    {date.format("D")}
                  </Text>
                </Box>
              </Tooltip>
            );
          })}
        </Grid>
      </Box>

      {/* Interactive colored tick-box legend matching Figma */}
      <HStack gap="16px" pt="4px" flexWrap="wrap">
        {LEGEND_ITEMS.map((item) => {
          const checked = selectedStatuses.includes(item.key);
          return (
            <Flex
              key={item.key}
              as="button"
              type="button"
              align="center"
              gap="8px"
              cursor="pointer"
              onClick={() => toggleStatus(item.key)}
              opacity={
                selectedStatuses.length === 0 || checked ? 1 : 0.45
              }
              _hover={{ opacity: 1 }}
            >
              <Flex
                w="18px"
                h="18px"
                borderRadius="4px"
                bg={item.boxBg}
                borderWidth="1.5px"
                borderColor={checked ? item.checkColor : item.boxBorder}
                align="center"
                justify="center"
                transition="all 0.15s ease"
              >
                {checked && (
                  <Icon as={LuCheck} boxSize="12px" color={item.checkColor} />
                )}
              </Flex>
              <Text fontSize="12px" fontWeight="500" color={item.textColor}>
                {item.label}
              </Text>
            </Flex>
          );
        })}
      </HStack>
    </VStack>
  );
};

export default AccountsPreloadCalendar;
