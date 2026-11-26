"use client";

import React from "react";
import { Box, Flex, Grid, Text, NativeSelect } from "@chakra-ui/react";
import moment from "moment";
import CustomContainer from "@/components/CustomContainer";
import { formatCurrency } from "@/utils/string";
import ComparisonRow from "./ComparisonRow";

function PayrollComparisonCard({
  selectedStats,
  comparisonStats,
  months,
  comparisonPayrollId,
  onComparisonChange,
}) {
  const getValue = (stats, label) => {
    if (!stats) return "-";
    if (label === "Employees") return stats.employeeCount;
    if (label === "Gross Pay") return formatCurrency(stats.totalGross);
    if (label === "Total Deductions")
      return formatCurrency(stats.totalDeductions);
    return formatCurrency(stats.totalNet);
  };

  return (
    <CustomContainer
      title="Payroll Comparison"
      size="sm"
      rightSection={
        months.length > 1 && (
          <Flex align="center" gap={2}>
            <Text fontSize="xs" color="brand.600">
              Compare With
            </Text>
            <NativeSelect.Root width="160px" size="xs">
              <NativeSelect.Field
                value={comparisonPayrollId || ""}
                onChange={(e) => onComparisonChange(e.target.value || null)}
              >
                {months.map((m) => (
                  <option key={m.payroll_id} value={m.payroll_id}>
                    {moment(m.payroll_month).format("MMM YYYY")}
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
          </Flex>
        )
      }
    >
      <Box borderWidth="1px" borderRadius="md" overflow="hidden">
        <Grid
          templateColumns={{ base: "1.5fr 1fr 1fr", md: "2fr 1fr 1fr" }}
          bg="gray.50"
          borderBottomWidth="1px"
          px={3}
          py={2}
          alignItems="center"
        >
          <Text fontSize="xs" fontWeight="semibold" color="gray.700">
            Metric
          </Text>
          <Box>
            <Text fontSize="xs" fontWeight="semibold" color="gray.700">
              Current Month
            </Text>
            <Text fontSize="xs" color="gray.500">
              {selectedStats
                ? moment(selectedStats.payroll_month).format("MMM YYYY")
                : "-"}
            </Text>
          </Box>
          <Box>
            <Text fontSize="xs" fontWeight="semibold" color="gray.700">
              Selected Month
            </Text>
            <Text fontSize="xs" color="gray.500">
              {comparisonStats
                ? moment(comparisonStats.payroll_month).format("MMM YYYY")
                : "-"}
            </Text>
          </Box>
        </Grid>

        {["Employees", "Gross Pay", "Total Deductions", "Net Pay"].map(
          (label, idx) => (
            <ComparisonRow
              key={label}
              label={label}
              currentValue={getValue(selectedStats, label)}
              comparisonValue={getValue(comparisonStats, label)}
              isEven={idx % 2 === 0}
            />
          )
        )}
      </Box>
    </CustomContainer>
  );
}

export default PayrollComparisonCard;
