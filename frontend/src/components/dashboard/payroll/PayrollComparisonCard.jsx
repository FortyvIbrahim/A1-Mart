"use client";

import React from "react";
import { Box, Grid, Text } from "@chakra-ui/react";
import CustomSelect from "@/components/CustomSelect";
import moment from "moment";
import { DashboardCard } from "@/components/dashboard/DashboardUI";
import { formatCurrency } from "@/utils/string";
import ComparisonRow from "./ComparisonRow";

const HEAD = { fontSize: "12px", fontWeight: "600", lineHeight: "20px", color: "fg.muted" };

/**
 * Figma "Card / Payroll Comparison": peach header row "Metric · <current> ·
 * <compared>", then Employees / Gross Pay / Deductions / Net Pay. The compared
 * month is picked from its own header cell.
 */
function PayrollComparisonCard({
  selectedStats,
  comparisonStats,
  months,
  comparisonPayrollId,
  onComparisonChange,
}) {
  const getValue = (stats, label) => {
    if (!stats) return "—";
    if (label === "Employees") return stats.employeeCount;
    if (label === "Gross Pay") return formatCurrency(stats.totalGross);
    if (label === "Deductions") return formatCurrency(stats.totalDeductions);
    return formatCurrency(stats.totalNet);
  };

  const fmt = (stats) => (stats ? moment(stats.payroll_month).format("MMM YYYY") : "—");

  return (
    <DashboardCard
      title="Payroll Comparison"
      subtitle="Use search, filters and sorting to narrow records."
      h="100%"
    >
      <Box>
        <Grid
          templateColumns="1.2fr 1fr 1fr"
          px="12px"
          minH="52px"
          bg="app.tableHeader"
          alignItems="center"
        >
          <Text {...HEAD}>Metric</Text>
          <Text {...HEAD} textAlign="right">
            {fmt(selectedStats)}
          </Text>
          {months.length > 1 ? (
            <Box justifySelf="end">
              <CustomSelect
                w="auto"
                minW="112px"
                h="32px"
                fontSize="12px"
                allowEmpty={false}
                value={comparisonPayrollId ? String(comparisonPayrollId) : ""}
                onChange={(val) => onComparisonChange(val || null)}
                ariaLabel="Compare with month"
                options={months.map((m) => ({
                  value: String(m.payroll_id),
                  label: moment(m.payroll_month).format("MMM YYYY"),
                }))}
              />
            </Box>
          ) : (
            <Text {...HEAD} textAlign="right">
              {fmt(comparisonStats)}
            </Text>
          )}
        </Grid>

        {["Employees", "Gross Pay", "Deductions", "Net Pay"].map((label, idx) => (
          <ComparisonRow
            key={label}
            label={label}
            currentValue={getValue(selectedStats, label)}
            comparisonValue={getValue(comparisonStats, label)}
            isEven={idx % 2 === 0}
          />
        ))}
      </Box>
    </DashboardCard>
  );
}

export default PayrollComparisonCard;
