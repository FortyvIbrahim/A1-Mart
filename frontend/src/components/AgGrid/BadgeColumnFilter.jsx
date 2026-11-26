"use client";

import React, { useState, useEffect } from "react";
import { Box, VStack, Checkbox, Text, Badge, Flex } from "@chakra-ui/react";

/**
 * Custom AG Grid filter component for badge-column type
 * Follows AG Grid's new filter component pattern
 * Reference: https://www.ag-grid.com/react-data-grid/component-filter/
 */
const BadgeColumnFilter = ({ model, onModelChange, getValue, column, api }) => {
  const [uniqueBadges, setUniqueBadges] = useState([]);
  const selectedLabels = model?.values || [];

  // Extract unique badge values from the data
  useEffect(() => {
    if (!api || !column) return;

    const extractUniqueBadges = () => {
      const colDef = column.getColDef();
      const field = column.getColId();
      const valueGetter = colDef.valueGetter;
      const badges = new Map();

      // Use forEachNode to get all rows (not just filtered ones)
      api.forEachNode((node) => {
        if (!node || !node.data) return;

        let value;
        if (valueGetter) {
          // Use valueGetter if provided
          value = valueGetter({
            data: node.data,
            value: node.data?.[field],
            node: node,
            api: api,
            columnApi: null,
            context: null,
            colDef: colDef,
            column: column,
          });
        } else {
          // Fall back to field value
          value = node.data?.[field];
        }

        if (value && typeof value === "object" && value.label) {
          const label = value.label;
          if (!badges.has(label)) {
            badges.set(label, {
              label: label,
              colorScheme: value.colorScheme || "gray",
              sortOrder:
                typeof value.sortOrder === "number" &&
                Number.isFinite(value.sortOrder)
                  ? value.sortOrder
                  : null,
            });
          }
        }
      });

      // Sort badges by optional sortOrder first, then label.
      const sortedBadges = Array.from(badges.values()).sort((a, b) => {
        const aHasOrder = a.sortOrder !== null;
        const bHasOrder = b.sortOrder !== null;

        if (aHasOrder && bHasOrder) {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return a.label.localeCompare(b.label);
        }
        if (aHasOrder) return -1;
        if (bHasOrder) return 1;
        return a.label.localeCompare(b.label);
      });

      setUniqueBadges(sortedBadges);
    };

    // Extract unique badges initially
    extractUniqueBadges();

    // Update when data changes
    const onModelUpdated = () => {
      extractUniqueBadges();
    };

    api.addEventListener("filterChanged", onModelUpdated);
    api.addEventListener("rowDataUpdated", onModelUpdated);

    return () => {
      api.removeEventListener("filterChanged", onModelUpdated);
      api.removeEventListener("rowDataUpdated", onModelUpdated);
    };
  }, [api, column]);

  const handleLabelToggle = (label) => {
    const newSelectedLabels = selectedLabels.includes(label)
      ? selectedLabels.filter((l) => l !== label)
      : [...selectedLabels, label];

    // Update model - null means no filter, otherwise pass the values
    const newModel =
      newSelectedLabels.length === 0
        ? null
        : {
            filterType: "badge",
            values: newSelectedLabels,
          };

    // Call onModelChange - this triggers the filter
    onModelChange(newModel);
  };

  const handleSelectAll = () => {
    if (selectedLabels.length === uniqueBadges.length) {
      // Clear all
      onModelChange(null);
    } else {
      // Select all
      const allLabels = uniqueBadges.map((badge) => badge.label);
      onModelChange({
        filterType: "badge",
        values: allLabels,
      });
    }
  };

  return (
    <Box p={3} minW="250px" maxW="350px" bg="white">
      <VStack align="stretch" spacing={3}>
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Text fontSize="sm" fontWeight="semibold">
            Filter by{" "}
            {column?.getColDef()?.headerName || column?.getColId() || "Badge"}
          </Text>
          <Text
            fontSize="xs"
            color="gray.600"
            cursor="pointer"
            onClick={handleSelectAll}
            _hover={{ color: "brand.600" }}
          >
            {selectedLabels.length === uniqueBadges.length
              ? "Clear All"
              : "Select All"}
          </Text>
        </Flex>

        {/* Badge checkboxes */}
        <Box maxH="300px" overflowY="auto">
          <VStack align="stretch" spacing={2}>
            {uniqueBadges.length === 0 ? (
              <Text fontSize="sm" color="gray.500" textAlign="center" py={2}>
                No badges found
              </Text>
            ) : (
              uniqueBadges.map((badge) => (
                <Checkbox.Root
                  key={badge.label}
                  checked={selectedLabels.includes(badge.label)}
                  onCheckedChange={() => handleLabelToggle(badge.label)}
                  size="sm"
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Label>
                    <Flex align="center" gap={2}>
                      <Badge colorPalette={badge.colorScheme} size="sm">
                        {badge.label}
                      </Badge>
                    </Flex>
                  </Checkbox.Label>
                </Checkbox.Root>
              ))
            )}
          </VStack>
        </Box>

        {/* Selected count */}
        {selectedLabels.length > 0 && (
          <Text fontSize="xs" color="gray.600" textAlign="center">
            {selectedLabels.length} of {uniqueBadges.length} selected
          </Text>
        )}
      </VStack>
    </Box>
  );
};

/**
 * Filter handler that implements the filtering logic
 * Reference: https://www.ag-grid.com/react-data-grid/component-filter/#filter-handler
 */
export const badgeFilterHandler = (params) => {
  // Store column and colDef from the handler params
  const column = params.column;
  const colDef = params.colDef;
  const field = column.getColId();
  const valueGetter = colDef.valueGetter;

  // Store current model - will be updated via refresh()
  // Initialize with the model from params (could be null initially)
  let currentModel = params.model || null;

  return {
    // Called when the model changes
    refresh(newParams) {
      currentModel = newParams.model;
    },

    doesFilterPass(filterParams) {
      // If no model or no values selected, show all rows
      if (
        !currentModel ||
        !currentModel.values ||
        currentModel.values.length === 0
      ) {
        return true;
      }

      const node = filterParams.node;

      if (!node || !node.data) {
        return false;
      }

      let value;
      if (valueGetter) {
        // Use valueGetter if provided
        value = valueGetter({
          data: node.data,
          value: node.data?.[field],
          node: node,
          api: params.api,
          columnApi: params.columnApi,
          context: params.context,
          colDef: colDef,
          column: column,
        });
      } else {
        // Fall back to field value
        value = node.data?.[field];
      }

      if (!value || typeof value !== "object" || !value.label) {
        return false;
      }

      return currentModel.values.includes(value.label);
    },

    getModelAsString() {
      if (
        !currentModel ||
        !currentModel.values ||
        currentModel.values.length === 0
      ) {
        return "";
      }
      return currentModel.values.join(", ");
    },
  };
};

BadgeColumnFilter.displayName = "BadgeColumnFilter";

export default BadgeColumnFilter;
