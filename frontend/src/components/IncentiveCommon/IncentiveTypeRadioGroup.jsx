"use client";

import React from "react";
import { Box, Flex, RadioGroup } from "@chakra-ui/react";

export const INCENTIVE_TYPE_OPTIONS = [
  { value: "single_percentage", label: "Single Percentage" },
  { value: "ranged_percentage", label: "Ranged Percentage" },
  { value: "fixed", label: "Fixed" },
  { value: "ranged_fixed", label: "Ranged Fixed" },
];

/**
 * Horizontal radio selector for incentive calculation types matching Figma.
 */
export default function IncentiveTypeRadioGroup({
  value,
  onChange,
  disabled = false,
  options = INCENTIVE_TYPE_OPTIONS,
}) {
  return (
    <Box>
      <RadioGroup.Root
        colorPalette="brand"
        variant="solid"
        disabled={disabled}
        value={value}
        onValueChange={(details) => {
          if (disabled) return;
          onChange?.(details.value);
        }}
      >
        <Flex gap="24px" flexWrap="wrap" align="center" py="4px">
          {options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <RadioGroup.Item
                key={opt.value}
                value={opt.value}
                cursor={disabled ? "default" : "pointer"}
                display="inline-flex"
                alignItems="center"
                gap="8px"
              >
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemIndicator
                  w="18px"
                  h="18px"
                  borderRadius="full"
                  borderWidth="1.5px"
                  borderColor={isSelected ? "#F47721" : "#CBD5E1"}
                  bg={isSelected ? "#F47721" : "white"}
                  color="white"
                  boxShadow="none"
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  css={{ "&::before, &::after": { display: "none" } }}
                  _checked={{
                    borderColor: "#F47721",
                    bg: "#F47721",
                    color: "white",
                    boxShadow: "none",
                  }}
                >
                  {isSelected && (
                    <Box w="6px" h="6px" borderRadius="full" bg="white" />
                  )}
                </RadioGroup.ItemIndicator>
                <RadioGroup.ItemText
                  fontSize="13px"
                  lineHeight="18px"
                  fontWeight={isSelected ? "600" : "500"}
                  color={isSelected ? "#C95C18" : "#202938"}
                >
                  {opt.label}
                </RadioGroup.ItemText>
              </RadioGroup.Item>
            );
          })}
        </Flex>
      </RadioGroup.Root>
    </Box>
  );
}
