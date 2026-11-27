"use client";

import React, { forwardRef } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import CustomSelect from "@/components/CustomSelect";
import DatePicker from "react-datepicker";
import moment from "moment";
import { LuCalendar } from "react-icons/lu";

/*
 * Figma "WMS Dashboard" heading filters: one "Date" range field (calendar
 * icon) and an "All Branches" select — 40px, radius 8, 1px #F1E3D9, 12px text.
 */
const FIELD = {
  h: "40px",
  px: "12px",
  borderWidth: "1px",
  borderColor: "border",
  borderRadius: "8px",
  bg: "white",
  fontSize: "12px",
};

const RangeButton = forwardRef(function RangeButton({ onClick, start, end }, ref) {
  const label =
    start || end
      ? `${start ? moment(start).format("DD/MM/YYYY") : "…"} – ${end ? moment(end).format("DD/MM/YYYY") : "…"}`
      : "Date";
  return (
    <Flex
      as="button"
      type="button"
      ref={ref}
      onClick={onClick}
      align="center"
      justify="space-between"
      gap="8px"
      w="100%"
      cursor="pointer"
      color={start || end ? "fg" : "fg.muted"}
      {...FIELD}
    >
      <Text as="span" truncate>
        {label}
      </Text>
      <Box color="#C95C18" display="flex">
        <LuCalendar size={14} />
      </Box>
    </Flex>
  );
});

function FiltersBar({
  dateRange,
  setDateRange,
  selectedBranchId,
  setSelectedBranchId,
  branchOptions = [],
  branchDisabled = false,
}) {
  return (
    <Flex gap="12px" align="center" wrap="wrap" w={{ base: "100%", md: "auto" }}>
      <Box w={{ base: "100%", md: "200px" }}>
        <DatePicker
          selectsRange
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={([startDate, endDate]) => setDateRange({ startDate, endDate })}
          isClearable
          dateFormat="dd/MM/yyyy"
          portalId="root-portal"
          wrapperClassName="a1-dashboard-date"
          customInput={<RangeButton start={dateRange.startDate} end={dateRange.endDate} />}
        />
      </Box>
      <Box w={{ base: "100%", md: "200px" }}>
        <CustomSelect
          h="40px"
          fontSize="12px"
          disabled={branchDisabled}
          value={selectedBranchId ?? ""}
          emptyLabel="All Branches"
          onChange={(val) => setSelectedBranchId?.(val || "")}
          ariaLabel="Branch"
          options={branchOptions}
        />
      </Box>
    </Flex>
  );
}

export default FiltersBar;
