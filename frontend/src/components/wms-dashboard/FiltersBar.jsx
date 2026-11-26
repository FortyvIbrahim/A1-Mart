"use client";

import React from "react";
import { Flex, Button, Text, NativeSelect, Box } from "@chakra-ui/react";
import DatePicker from "react-datepicker";
import { CustomDateTimeInput } from "@/components/CustomInput";

function FiltersBar({
  dateRange,
  setDateRange,
  selectedBranchId,
  setSelectedBranchId,
  branchOptions = [],
  branchDisabled = false,
}) {
  return (
    <Flex
      w={{ base: "100%", md: "auto" }}
      justifyContent={{ base: "flex-start", md: "flex-end" }}
      flexShrink={0}
    >
      <Flex
        gap={4}
        width={{ base: "100%", md: "auto" }}
        alignItems={{ base: "flex-start", md: "center" }}
        flexDirection={{ base: "column", md: "row" }}
        flexWrap={{ base: "nowrap", md: "wrap" }}
      >
        <Text width="fit-content" textWrap="nowrap" fontSize="sm" fontWeight="medium" color="brand700">Pending Date : </Text>
        <Flex
          gap={2}
          align="center"
          flexDirection={{ base: "column", md: "row" }}
          w={{ base: "100%", md: "auto" }}
        >
          <Box w={{ base: "100%", md: "170px" }}>
            <DatePicker
              selected={dateRange.startDate}
              onChange={(date) =>
                setDateRange((prev) => ({ ...prev, startDate: date }))
              }
              selectsStart
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              customInput={
                <CustomDateTimeInput format="DD/MM/YYYY" placeholder="From Date" />
              }
              dateFormat="dd/MM/yyyy"
              isClearable
              portalId="root-portal"
            />
          </Box>
          <Box w={{ base: "100%", md: "170px" }}>
            <DatePicker
              selected={dateRange.endDate}
              onChange={(date) =>
                setDateRange((prev) => ({ ...prev, endDate: date }))
              }
              selectsEnd
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              minDate={dateRange.startDate}
              customInput={
                <CustomDateTimeInput format="DD/MM/YYYY" placeholder="To Date" />
              }
              dateFormat="dd/MM/yyyy"
              isClearable
              portalId="root-portal"
            />
          </Box>
        </Flex>
        <Box minW={{ base: "100%", md: "220px" }}>
          <NativeSelect.Root size="sm" disabled={branchDisabled}>
            <NativeSelect.Field
              value={selectedBranchId ?? ""}
              onChange={(e) => setSelectedBranchId?.(e.target.value || "")}
            >
              <option value="">All Branches</option>
              {branchOptions.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>

        <Button
          size="sm"
          variant="outline"
          width={{ base: "100%", md: "fit-content" }}
          onClick={() => setDateRange({ startDate: null, endDate: null })}
        >
          Clear
        </Button>
      </Flex>
    </Flex>
  );
}

export default FiltersBar;

