"use client";

import { Box, Text, VStack } from "@chakra-ui/react";
import React from "react";

/**
 * Inline validation callout on checklist fill (compact copy).
 */
export default function ChecklistFillValidationMessages({ messages = [] }) {
  if (!messages.length) return null;

  return (
    <Box
      role="alert"
      borderRadius="md"
      borderLeftWidth="2px"
      borderLeftColor="red.400"
      bg="red.50"
      px={2.5}
      py={2}
    >
      <Text
        fontSize="10px"
        fontWeight="semibold"
        color="red.700"
        textTransform="uppercase"
        letterSpacing="0.04em"
        mb={1}
      >
        Fix to save
      </Text>
      <VStack align="stretch" gap={0.5}>
        {messages.map((m, i) => (
          <Text
            key={i}
            fontSize="xs"
            color="red.700"
            lineHeight="1.35"
          >
            {m}
          </Text>
        ))}
      </VStack>
    </Box>
  );
}
