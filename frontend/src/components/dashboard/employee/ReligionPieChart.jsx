"use client";

import React, { useMemo } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import CustomContainer from "@/components/CustomContainer";
import DashboardBarChart from "@/components/dashboard/DashboardBarChart";

const mapReligion = (value) => {
  if (!value) return "Unset";
  const v = String(value).toLowerCase();

  if (v.includes("hind")) return "Hindu";
  if (v.includes("muslim") || v.includes("islam")) return "Muslim";
  if (v.includes("christ")) return "Christian";

  return "Unset";
};

function ReligionPieChart({ employees, onFilterChange }) {
  const data = useMemo(() => {
    const counts = {
      Hindu: 0,
      Muslim: 0,
      Christian: 0,
      Unset: 0,
    };

    (employees || []).forEach((emp) => {
      const key = mapReligion(emp.religion);
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [employees]);

  return (
    <>
      {(!data ||
        data.length === 0 ||
        data.every((item) => item.value === 0)) && (
        <Flex align="center" justify="center" minH="220px">
          <Text fontSize="sm" color="gray.500">
            No data to display
          </Text>
        </Flex>
      )}

      {data && data.some((item) => item.value > 0) && (
        <CustomContainer title="Employees by Religion" size="sm">
          <DashboardBarChart
            data={data}
            height={{ base: "240px", md: "300px" }}
            xDataKey="name"
            bars={[{ dataKey: "value", perBarColor: true }]}
            showLegend={true}
            emptyMessage="No data to display"
            onBarClick={(entry) =>
              onFilterChange && entry?.name && onFilterChange(entry.name)
            }
          />
        </CustomContainer>
      )}
    </>
  );
}

export default ReligionPieChart;
