"use client";

import { capitalizeWords } from "@/utils/string";
import { Box, Text, VStack } from "@chakra-ui/react";
import { useMemo } from "react";

function FormErrors({ errors, isViewMode = false, mt = "24px" }) {
  // Helper function to collect all form errors
  const getAllErrors = () => {
    const errorMessages = [];

    // Helper to recursively collect errors
    const collectErrors = (errorObj, prefix = "") => {
      if (!errorObj) return;

      Object.keys(errorObj).forEach((key) => {
        const fieldPath = prefix ? `${prefix}.${key}` : key;
        const errorValue = errorObj[key];

        if (typeof errorValue === "string") {
          // It's a direct error message
          errorMessages.push({
            field: fieldPath,
            message: errorValue,
          });
        } else if (Array.isArray(errorValue)) {
          // It's an array of errors (like items array)
          errorValue.forEach((itemError, index) => {
            if (itemError && typeof itemError === "object") {
              collectErrors(itemError, `${fieldPath}.${index}`);
            } else if (itemError) {
              errorMessages.push({
                field: `${fieldPath}.${index}`,
                message: itemError,
              });
            }
          });
        } else if (typeof errorValue === "object" && errorValue !== null) {
          // It's a nested object
          collectErrors(errorValue, fieldPath);
        }
      });
    };

    collectErrors(errors);
    return errorMessages;
  };

  const allErrors = useMemo(() => getAllErrors(), [errors]);

  // Don't show errors in view mode or if there are no errors
  if (isViewMode || allErrors.length === 0) {
    return null;
  }

  return (
    <Box
      mt={mt}
      p={4}
      bg="red.50"
      border="1px solid"
      borderColor="red.200"
      borderRadius="md"
    >
      <Text fontSize="sm" fontWeight="semibold" color="red.700" mb={2}>
        Please fix the following errors:
      </Text>
      <VStack align="stretch" spacing={1}>
        {allErrors.map((error, index) => (
          <Text
            key={index}
            fontSize="sm"
            color="red.600"
            pl={4}
            position="relative"
            _before={{
              content: '"•"',
              position: "absolute",
              left: 0,
              color: "red.600",
            }}
          >
            {error.field && (
              <span style={{ fontWeight: "bold" }}>
                {capitalizeWords(error.field.replaceAll("_", " "))} :{" "}
              </span>
            )}
            {error.message}
          </Text>
        ))}
      </VStack>
    </Box>
  );
}

export default FormErrors;
