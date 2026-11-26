"use client";

import React from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import CustomContainer from "@/components/CustomContainer";
import DashboardBarChart from "@/components/dashboard/DashboardBarChart";

function PayrollDetailsCard({ selectedStats, paymentFilter, onFilterChange }) {
  const employees = selectedStats?.employees || [];

  let paidCount = 0;
  let onHoldCount = 0;
  let unpaidCount = 0;

  employees.forEach((emp) => {
    const s = emp.payment_details?.status?.toLowerCase();
    const done = s === "processed" || s === "done";
    const isOnHold = emp.on_hold == true;

    if (done) {
      paidCount += 1;
    } else if (isOnHold) {
      onHoldCount += 1;
    } else {
      unpaidCount += 1;
    }
  });

  const data = [
    { name: "Paid", value: paidCount, color: "#38A169" },
    { name: "On Hold", value: onHoldCount, color: "#3182CE" },
    { name: "Unpaid", value: unpaidCount, color: "#E53E3E" },
  ];

  return (
    <CustomContainer title="Payroll Details" size="sm">
      <Box>
        <DashboardBarChart
          data={data}
          xDataKey="name"
          bars={[{ dataKey: "value", perBarColor: true }]}
          showLegend={false}
          height={{ base: "200px", md: "180px" }}
          emptyMessage="No data to display"
          onBarClick={(entry) => {
            const name = entry?.name;
            if (!name) return;
            onFilterChange((prev) => (prev === name ? null : name));
          }}
        />

        <Flex mt={3} gap={4} fontSize="xs" align="center" wrap="wrap">
          <Flex align="center" gap={1}>
            <Box w="10px" h="10px" borderRadius="2px" bg="#38A169" />
            <Text>Paid ({paidCount})</Text>
          </Flex>
          <Flex align="center" gap={1}>
            <Box w="10px" h="10px" borderRadius="2px" bg="#3182CE" />
            <Text>On Hold ({onHoldCount})</Text>
          </Flex>
          <Flex align="center" gap={1}>
            <Box w="10px" h="10px" borderRadius="2px" bg="#E53E3E" />
            <Text>Unpaid ({unpaidCount})</Text>
          </Flex>
        </Flex>
      </Box>
    </CustomContainer>
  );
}

export default PayrollDetailsCard;
