"use client";

import React, { useMemo } from "react";
import { Flex, Text } from "@chakra-ui/react";
import EmployeeDonutCard from "./EmployeeDonutCard";

const mapGender = (value) => {
  if (!value) return "Unset";
  const v = String(value).toUpperCase();

  if (v === "M") return "Male";
  if (v === "F") return "Female";
  if (v === "O") return "Other";

  return "Unset";
};

function GenderPieChart({ employees, onFilterChange }) {
  const data = useMemo(() => {
    const counts = {
      Male: 0,
      Female: 0,
      Other: 0,
      Unset: 0,
    };

    (employees || []).forEach((emp) => {
      const key = mapGender(emp.gender);
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [employees]);

  return (
    <>
      {(!data || data.length === 0 || data.every((item) => item.value === 0)) && (
        <Flex align="center" justify="center" minH="220px">
          <Text fontSize="sm" color="gray.500">
            No data to display
          </Text>
        </Flex>
      )}

      {data && data.some((item) => item.value > 0) && (
        <EmployeeDonutCard
          title="Employees by Gender"
          data={data}
          onItemClick={onFilterChange}
        />
      )}
    </>
  );
}

export default GenderPieChart;
