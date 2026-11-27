"use client";

import React from "react";
import { Flex, Text } from "@chakra-ui/react";
import CustomSelect from "@/components/CustomSelect";

/** Figma page-heading filter "Year": 10/500 label, 7px gap, 130×40 select. */
function YearSelector({ selectedYear, availableYears, onChange }) {
  if (!availableYears || availableYears.length === 0) return null;

  return (
    <Flex direction="column" gap="7px">
      <Text fontSize="10px" lineHeight="12px" fontWeight="500" color="fg.muted">
        Year
      </Text>
      <CustomSelect
        width="130px"
        h="40px"
        fontSize="12px"
        allowEmpty={false}
        value={String(selectedYear)}
        onChange={(val) => onChange(Number(val))}
        ariaLabel="Year"
        options={availableYears.map((y) => ({
          value: String(y),
          label: String(y),
        }))}
      />
    </Flex>
  );
}

export default YearSelector;
