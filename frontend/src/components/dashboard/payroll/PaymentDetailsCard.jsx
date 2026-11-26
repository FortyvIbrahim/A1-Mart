"use client";

import React from "react";
import { Box, Grid, Text } from "@chakra-ui/react";
import CustomContainer from "@/components/CustomContainer";
import { formatCurrency } from "@/utils/string";

function PaymentDetailsCard({ selectedStats }) {
  const employees = selectedStats?.employees || [];

  let totalPaid = 0;
  let totalOnHold = 0;
  let totalUnpaid = 0;

  employees.forEach((emp) => {
    const net = parseFloat(emp.net_pay) || 0;
    const s = emp.payment_details?.status?.toLowerCase();
    const done = s === "processed" || s === "done";
    const isOnHold = emp.on_hold == true;

    if (done) {
      totalPaid += net;
    } else if (isOnHold) {
      totalOnHold += net;
    } else {
      totalUnpaid += net;
    }
  });

  return (
    <CustomContainer title="Payment Details" size="sm">
      <Grid templateColumns={{ base: "1fr", md: "1fr" }} gap={4}>
        <Box>
          <Text fontSize="xs" color="gray.600">
            Total Paid
          </Text>
          <Text fontSize="xl" fontWeight="bold">
            {selectedStats ? formatCurrency(totalPaid) : "-"}
          </Text>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.600">
            Total On Hold
          </Text>
          <Text fontSize="xl" fontWeight="bold">
            {selectedStats ? formatCurrency(totalOnHold) : "-"}
          </Text>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.600">
            Total Unpaid
          </Text>
          <Text fontSize="xl" fontWeight="bold" color="brand600">
            {selectedStats ? formatCurrency(totalUnpaid) : "-"}
          </Text>
        </Box>
      </Grid>
    </CustomContainer>
  );
}

export default PaymentDetailsCard;
