"use client";

import React from "react";
import { Badge, Button, VStack, Wrap, Box, Text } from "@chakra-ui/react";
import CustomDialog from "@/components/CustomDialog";

export default function NotFoundDialog({
  open,
  onOpenChange,
  suppliersNotFound = [],
  buyersNotFound = [],
  onClose,
}) {
  return (
    <CustomDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Not found in master data"
      maxW="md"
      maxH="85vh"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <VStack align="stretch" gap={4}>
        {suppliersNotFound.length > 0 && (
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
              Suppliers not found ({suppliersNotFound.length})
            </Text>
            <Wrap gap={2}>
              {suppliersNotFound.map((name) => (
                <Badge
                  key={name}
                  colorPalette="red"
                  variant="subtle"
                  size="sm"
                >
                  {name}
                </Badge>
              ))}
            </Wrap>
          </Box>
        )}
        {buyersNotFound.length > 0 && (
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
              Buyers not found ({buyersNotFound.length})
            </Text>
            <Wrap gap={2}>
              {buyersNotFound.map((name) => (
                <Badge
                  key={name}
                  colorPalette="red"
                  variant="subtle"
                  size="sm"
                >
                  {name}
                </Badge>
              ))}
            </Wrap>
          </Box>
        )}
        {suppliersNotFound.length === 0 && buyersNotFound.length === 0 && (
          <Text fontSize="sm" color="gray.500">
            All suppliers and buyers are mapped.
          </Text>
        )}
      </VStack>
    </CustomDialog>
  );
}
