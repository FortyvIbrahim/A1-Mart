"use client";

import React from "react";
import { Grid, Text } from "@chakra-ui/react";

/** Figma comparison row: 36px, 12px padding, 11/400 #202938, striped #FFFBF8. */
function ComparisonRow({ label, currentValue, comparisonValue, isEven }) {
  return (
    <Grid
      templateColumns="1.2fr 1fr 1fr"
      px="12px"
      minH="36px"
      bg={isEven ? "white" : "#FFFBF8"}
      alignItems="center"
      fontSize="11px"
      lineHeight="13px"
      color="fg"
    >
      <Text>{label}</Text>
      <Text textAlign="right">{currentValue}</Text>
      <Text textAlign="right">{comparisonValue}</Text>
    </Grid>
  );
}

export default ComparisonRow;
