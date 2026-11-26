"use client";

import { capitalizeWords, capitalizeWordsLatest } from "@/utils/string";
import { Badge, Box, Flex, FormatNumber, Text, VStack } from "@chakra-ui/react";
import React, { useCallback, useMemo } from "react";
import Image from "next/image";
import moment from "moment";
import Link from "next/link";
import { Virtuoso } from "react-virtuoso";
import CustomMenu from "../CustomMenu";
import EmptyImage from "../EmptyImage";

function MobileVirtualizedList({ rowData, colDefs }) {
  // Helper function to get nested field value
  const getNestedValue = useCallback((obj, path) => {
    if (!path) return null;
    return path.split(".").reduce((current, prop) => current?.[prop], obj);
  }, []);

  // Helper function to get cell value from colDef
  const getCellValue = useCallback(
    (rowData, colDef) => {
      if (colDef.valueGetter) {
        try {
          return colDef.valueGetter({ data: rowData });
        } catch (e) {
          console.error("Error in valueGetter:", e);
          return null;
        }
      }
      if (colDef.field) {
        // Handle nested fields like "category.category_name"
        if (colDef.field.includes(".")) {
          return getNestedValue(rowData, colDef.field);
        }
        return rowData[colDef.field];
      }
      return null;
    },
    [getNestedValue]
  );

  // Helper function to render cell content
  const renderCellContent = useCallback(
    (rowData, colDef) => {
      const value = getCellValue(rowData, colDef);

      if (colDef.type === "badge-column") {
        if (!value?.label) {
          return "-";
        }

        if (value && typeof value === "object" && value.colorScheme) {
          return <Badge colorPalette={value.colorScheme}>{value.label}</Badge>;
        }
        return value || "-";
      }

      if (colDef.type === "capitalized") {
        return value !== null && value !== "" ? capitalizeWords(value) : "-";
      }

      if (colDef.type === "new-capitalized") {
        return value !== null && value !== undefined && value !== ""
          ? capitalizeWordsLatest(value)
          : "-";
      }

      if (colDef.type === "id") {
        return value || "-";
      }

      if (colDef.type === "currency") {
        const isEmpty =
          value === null ||
          value === undefined ||
          value === "" ||
          (typeof value === "number" && Number.isNaN(value));
        if (isEmpty) return "-";
        return (
          <FormatNumber
            value={value}
            style="currency"
            currency="INR"
            minimumFractionDigits={0}
            maximumFractionDigits={2}
          />
        );
      }

      if (colDef.type === "image") {
        if (!value || typeof value !== "string") return <EmptyImage />;
        return (
          <Box
            position="relative"
            w="64px"
            h="64px"
            borderRadius="md"
            overflow="hidden"
            bg="gray.100"
          >
            <Image
              src={value}
              alt=""
              fill
              style={{ objectFit: "cover" }}
              unoptimized
            />
          </Box>
        );
      }

      if (colDef.type === "date") {
        if (!value) return "-";
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime())
          ? "-"
          : moment(date).format("DD MMM YYYY");
      }

      if (colDef.type === "datetime") {
        if (!value) return "-";
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime())
          ? "-"
          : moment(date).format("DD/MM/YYYY • hh:mm A");
      }

      if (colDef.type === "file") {
        if (!value || typeof value !== "string") return "-";
        return (
          <Link href={value} target="_blank" rel="noopener noreferrer">
            <Text fontSize="sm" color="brand.500" textDecoration="underline">
              Open File
            </Text>
          </Link>
        );
      }

      if (colDef.type === "action-column") {
        if (Array.isArray(value)) {
          return <CustomMenu items={value} />;
        }
        return null;
      }

      // Use custom cellRenderer if available
      if (colDef.cellRenderer && typeof colDef.cellRenderer === "function") {
        try {
          return colDef.cellRenderer({ value, data: rowData });
        } catch (e) {
          console.error("Error in cellRenderer:", e);
          return value ?? "-";
        }
      }

      return typeof value === "string" ? value ?? "-" : "-";
    },
    [getCellValue]
  );

  // Filter out action column and ID column for mobile cards (they'll be shown separately)
  const mobileColDefs = useMemo(() => {
    return colDefs.filter(
      (col) => col.type !== "action-column" && col.type !== "id"
    );
  }, [colDefs]);

  // Get action column and ID column separately
  const actionColDef = useMemo(() => {
    return colDefs.find((col) => col.type === "action-column");
  }, [colDefs]);

  const idColDef = useMemo(() => {
    return colDefs.find((col) => col.type === "id");
  }, [colDefs]);

  // Render a single card
  const renderCard = useCallback(
    (index, row) => {
      if (!row) return null;

      const idValue = idColDef ? getCellValue(row, idColDef) : null;
      const actionItems = actionColDef ? getCellValue(row, actionColDef) : null;

      return (
        <Box borderWidth="1px" borderRadius="md" p={4} bg="white" mb={4}>
          <Flex justify="space-between" align="flex-start" mb={3}>
            {idValue && (
              <Text fontSize="xs" color="gray.500" fontWeight="medium">
                #{idValue}
              </Text>
            )}
            {actionItems && Array.isArray(actionItems) && (
              <CustomMenu items={actionItems} />
            )}
          </Flex>
          <VStack spacing={3} align="stretch">
            {mobileColDefs.map((colDef, colIndex) => {
              if (!colDef.headerName && !colDef.field) return null;

              const value = getCellValue(row, colDef);
              if (colDef.headerName?.toLowerCase() === "image" && !value) {
                return null;
              }

              const isLastField = colIndex === mobileColDefs.length - 1;

              return (
                <Flex
                  key={colDef.field || colDef.headerName || colIndex}
                  direction="column"
                  gap={1}
                  pb={isLastField ? 0 : 3}
                  borderBottom={!isLastField ? "1px solid" : "none"}
                  borderBottomColor="gray.100"
                >
                  <Text fontSize="xs" color="brand700" fontWeight="medium">
                    {colDef.headerName || capitalizeWords(colDef.field || "")}:
                  </Text>
                  <Box minH="20px" fontSize="sm">
                    {renderCellContent(row, colDef)}
                  </Box>
                </Flex>
              );
            })}
          </VStack>
        </Box>
      );
    },
    [idColDef, actionColDef, mobileColDefs, getCellValue, renderCellContent]
  );

  if (!rowData || rowData.length === 0) {
    return (
      <Box textAlign="center" py={8} color="gray.500">
        <Text>No data available</Text>
      </Box>
    );
  }

  return (
    <Box
      h={{ base: "calc(100dvh - 200px)", md: "600px" }}
      w="100%"
      css={{
        "&::-webkit-scrollbar": {
          width: "6px",
        },
        "&::-webkit-scrollbar-track": {
          background: "transparent",
        },
        "&::-webkit-scrollbar-thumb": {
          background: "#cbd5e0",
          borderRadius: "3px",
        },
        "&::-webkit-scrollbar-thumb:hover": {
          background: "#a0aec0",
        },
      }}
    >
      <Virtuoso
        data={rowData}
        itemContent={(index, row) => renderCard(index, row)}
        style={{
          height: "100%",
          width: "100%",
        }}
        overscan={3}
      />
    </Box>
  );
}

export default MobileVirtualizedList;
