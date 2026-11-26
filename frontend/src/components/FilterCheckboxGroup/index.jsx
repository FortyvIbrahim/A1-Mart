import React from "react";
import { Box, Text, VStack, Checkbox } from "@chakra-ui/react";

function FilterCheckboxGroup({
  title,
  values,
  selectedValues,
  onSelectionChange,
  formatValue = (value) => value,
  colorScheme = "brand",
}) {
  return (
    <VStack align="start" spacing={2} minW="200px">
      <Text fontSize="sm" fontWeight="medium" color="brand700">
        {title} (
        {selectedValues.length > 0
          ? `${selectedValues.length} selected`
          : "All"}
        )
      </Text>
      <Box maxH="200px" overflowY="auto" w="100%">
        <VStack align="start" spacing={1}>
          {values.map((value) => (
            <Checkbox.Root
              key={value}
              checked={selectedValues.includes(value)}
              onClick={(e) => {
                e.preventDefault();
                const isCurrentlySelected = selectedValues.includes(value);
                console.log("Checkbox clicked:", {
                  value,
                  isCurrentlySelected,
                  selectedValues,
                });
                if (isCurrentlySelected) {
                  onSelectionChange(
                    selectedValues.filter((item) => item !== value)
                  );
                } else {
                  onSelectionChange([...selectedValues, value]);
                }
              }}
              size="sm"
              colorScheme={colorScheme}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Label>
                <Text fontSize="sm" fontWeight="normal">
                  {formatValue(value)}
                </Text>
              </Checkbox.Label>
            </Checkbox.Root>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
}

export default FilterCheckboxGroup;
