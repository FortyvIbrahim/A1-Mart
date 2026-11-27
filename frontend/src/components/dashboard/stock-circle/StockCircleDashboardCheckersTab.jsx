"use client";

import React, { useMemo } from "react";
import { Box, Flex, Text, VStack } from "@chakra-ui/react";
import { DashboardCard } from "@/components/dashboard/DashboardUI";
import CustomInput from "@/components/CustomInput";
import AgGrid from "@/components/AgGrid";
import { capitalizeWords } from "@/utils/string";

export default function StockCircleDashboardCheckersTab({
  checkerEmployeeOptions,
  selectedCheckerRowKeys,
  onSelectedCheckerRowKeysChange,
  displayedCheckerRows,
  onViewCheckerDetails,
}) {
  const checkerColDefs = useMemo(
    () => [
      {
        field: "employee_name",
        headerName: "Name",
        type: "capitalized",
      },
      { field: "employee_code", headerName: "Code", type: "capitalized" },
      {
        field: "products_checked",
        headerName: "Checked",
        type: "number",
      },
      {
        field: "checked_value",
        headerName: "Checked Value",
        type: "currency",
        minWidth: 150,
      },
      {
        headerName: "Action",
        type: "action-column",
        maxWidth: 120,
        minWidth: 120,
        valueGetter: (props) => [
          {
            label: "View details",
            value: "details",
            onClick: () => onViewCheckerDetails(props.data),
          },
        ],
      },
    ],
    [onViewCheckerDetails]
  );

  return (
    <DashboardCard
      title="Products checked by employee"
      subtitle="Employees and the products they checked."
    >
      <VStack align="stretch" gap={4}>
        <Box maxW={{ base: "100%", md: "440px" }} w="100%">
          <CustomInput
            name="stock_circle_checker_employees"
            method="multiple-dropdown"
            label="Filter by employee"
            placeholder="All employees"
            h="40px"
            options={checkerEmployeeOptions}
            value={selectedCheckerRowKeys}
            onChange={(ids) => onSelectedCheckerRowKeysChange(ids ?? [])}
            labelStyle={{ color: "#637188" }}
            customRender={(item) => (
              <Flex
                flex={1}
                align="center"
                gap={3}
                flexWrap="wrap"
                justify="flex-start"
                textAlign="left"
              >
                <Text
                  fontSize="xs"
                  color="gray.600"
                  fontFamily="mono"
                  flexShrink={0}
                >
                  {item.employee_code}
                </Text>
                <Text fontSize="sm" flex={1} minW={0}>
                  {capitalizeWords(
                    String(item.employee_name ?? "").trim() || "-"
                  )}
                </Text>
              </Flex>
            )}
          />
        </Box>
        <Box minH="200px">
          <AgGrid
            bare
            rowData={displayedCheckerRows}
            colDefs={checkerColDefs}
            tableKey="stock-circle-dashboard-checkers"
          />
        </Box>
      </VStack>
    </DashboardCard>
  );
}
