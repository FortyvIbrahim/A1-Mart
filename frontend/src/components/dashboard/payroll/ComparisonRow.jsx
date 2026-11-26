"use client";

import React from "react";
import { Grid, Text } from "@chakra-ui/react";
import { formatCurrency } from "@/utils/string";

function ComparisonRow({
  label,
  currentValue,
  comparisonValue,
  isEven,
}) {
  return (
    <Grid
      templateColumns={{ base: "1.5fr 1fr 1fr", md: "2fr 1fr 1fr" }}
      px={3}
      py={2}
      bg={isEven ? "white" : "gray.50"}
      borderTopWidth="1px"
      alignItems="center"
    >
      <Text fontSize="xs" color="gray.700">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="medium">
        {currentValue}
      </Text>
      <Text fontSize="sm" fontWeight="medium">
        {comparisonValue}
      </Text>
    </Grid>
  );
}

export default ComparisonRow;
