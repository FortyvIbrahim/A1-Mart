"use client";

import React from "react";
import { Box, NativeSelect } from "@chakra-ui/react";

function YearSelector({ selectedYear, availableYears, onChange }) {
  if (!availableYears || availableYears.length === 0) return null;

  return (
    <Box>
      <NativeSelect.Root width={{ base: "120px", md: "140px" }}>
        <NativeSelect.Field
          value={String(selectedYear)}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </Box>
  );
}

export default YearSelector;
