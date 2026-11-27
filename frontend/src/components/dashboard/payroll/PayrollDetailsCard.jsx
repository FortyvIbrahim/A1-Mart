"use client";

import React from "react";
import { Box } from "@chakra-ui/react";
import { DashboardCard } from "@/components/dashboard/DashboardUI";
import DashboardChartLegend from "@/components/dashboard/DashboardChartLegend";
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
    { name: "Paid", value: paidCount, color: "#11976A", label: "#147D52" },
    { name: "On Hold", value: onHoldCount, color: "#526FA8", label: "#946200", dot: "#946200" },
    { name: "Unpaid", value: unpaidCount, color: "#E7474D", label: "#637188" },
  ];

  const toggle = (name) => onFilterChange((prev) => (prev === name ? null : name));

  return (
    <DashboardCard title="Payroll Details" h="100%">
      <Box>
        <DashboardBarChart
          data={data.map((d) => ({ ...d, fill: d.color }))}
          xDataKey="name"
          bars={[{ dataKey: "value", perBarColor: true }]}
          showLegend={false}
          height="200px"
          valueFormatter={(v) => v}
          emptyMessage="No data to display"
          onBarClick={(entry) => entry?.name && toggle(entry.name)}
        />
        <DashboardChartLegend
          columns={3}
          items={data.map((d) => ({
            name: d.name,
            value: d.value,
            fill: d.dot ?? d.color,
            labelColor: d.label,
            onClick: () => toggle(d.name),
          }))}
        />
      </Box>
    </DashboardCard>
  );
}

export default PayrollDetailsCard;
