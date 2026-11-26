"use client";

import { getNestedValue } from "@/utils/object";
import { Box, Button, Grid, Text } from "@chakra-ui/react";
import { useFormikContext } from "formik";
import React from "react";

/**
 * Large tap-friendly Yes / No cards (clearer than a compact segment).
 */
export default function ChecklistFillBooleanChoice({ name, disabled }) {
  const { values, setFieldValue } = useFormikContext();
  const v = getNestedValue(values, name);

  return (
    <Grid
      templateColumns={{ base: "1fr", sm: "1fr 1fr" }}
      gap={3}
      w="100%"
    >
      <Button
        type="button"
        variant="outline"
        h="auto"
        minH="72px"
        py={4}
        px={4}
        borderRadius="xl"
        borderWidth="2px"
        borderColor={v === true ? "brand.500" : "gray.200"}
        bg={v === true ? "brand.50" : "white"}
        color={v === true ? "brand.800" : "gray.700"}
        boxShadow={v === true ? "sm" : "none"}
        onClick={() => setFieldValue(name, true)}
        disabled={disabled}
        _hover={{
          borderColor: v === true ? "brand.500" : "gray.300",
          bg: v === true ? "brand.50" : "gray.50",
        }}
      >
        <Box textAlign="center" w="100%">
          <Text fontWeight="bold" fontSize="md" letterSpacing="-0.01em">
            Yes
          </Text>
          <Text fontSize="xs" color="gray.500" fontWeight="normal" mt={0.5}>
            Confirms
          </Text>
        </Box>
      </Button>
      <Button
        type="button"
        variant="outline"
        h="auto"
        minH="72px"
        py={4}
        px={4}
        borderRadius="xl"
        borderWidth="2px"
        borderColor={v === false ? "red.400" : "gray.200"}
        bg={v === false ? "red.50" : "white"}
        color={v === false ? "red.900" : "gray.700"}
        boxShadow={v === false ? "sm" : "none"}
        onClick={() => setFieldValue(name, false)}
        disabled={disabled}
        _hover={{
          borderColor: v === false ? "red.400" : "gray.300",
          bg: v === false ? "red.50" : "gray.50",
        }}
      >
        <Box textAlign="center" w="100%">
          <Text fontWeight="bold" fontSize="md" letterSpacing="-0.01em">
            No
          </Text>
          <Text fontSize="xs" color="gray.500" fontWeight="normal" mt={0.5}>
            Does not apply
          </Text>
        </Box>
      </Button>
    </Grid>
  );
}
