"use client";

import React from "react";
import { Flex, Text } from "@chakra-ui/react";
import { DashboardCard } from "@/components/dashboard/DashboardUI";
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

  // Figma "Card / Payment Details": label 11/400 #637188, amount 23/600
  // (paid #202938, on hold #526FA8, unpaid #C95C18), 12px gaps.
  const rows = [
    { label: "Total Paid", value: totalPaid, color: "fg" },
    { label: "Total On Hold", value: totalOnHold, color: "#526FA8" },
    { label: "Total Unpaid", value: totalUnpaid, color: "#C95C18" },
  ];

  return (
    <DashboardCard title="Payment Details" h="100%">
      <Flex direction="column" gap="12px">
        {rows.map((r, idx) => (
          <Flex key={r.label} direction="column" gap="28px" mt={idx ? "16px" : 0}>
            <Text fontSize="11px" lineHeight="13px" color="fg.muted">
              {r.label}
            </Text>
            <Text fontSize="23px" fontWeight="600" lineHeight="28px" color={r.color}>
              {selectedStats ? formatCurrency(r.value) : "—"}
            </Text>
          </Flex>
        ))}
      </Flex>
    </DashboardCard>
  );
}

export default PaymentDetailsCard;
