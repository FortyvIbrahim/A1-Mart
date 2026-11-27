"use client";

import React from "react";
import { Flex, NativeSelect, Text } from "@chakra-ui/react";
import { LuChevronDown } from "react-icons/lu";

/** Figma page-heading filter "Year": 10/500 label, 7px gap, 130×40 select. */
function YearSelector({ selectedYear, availableYears, onChange }) {
  if (!availableYears || availableYears.length === 0) return null;

  return (
    <Flex direction="column" gap="7px">
      <Text fontSize="10px" lineHeight="12px" fontWeight="500" color="fg.muted">
        Year
      </Text>
      <NativeSelect.Root width="130px">
        <NativeSelect.Field
          h="40px"
          ps="12px"
          fontSize="12px"
          borderRadius="8px"
          borderColor="border"
          color="fg"
          value={String(selectedYear)}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Year"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator right="12px" color="#C95C18">
          <LuChevronDown size={14} />
        </NativeSelect.Indicator>
      </NativeSelect.Root>
    </Flex>
  );
}

export default YearSelector;
