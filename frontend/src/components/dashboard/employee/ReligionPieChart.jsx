"use client";

import React, { useMemo } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardUI";
import DashboardBarChart from "@/components/dashboard/DashboardBarChart";

const mapReligion = (value) => {
  if (!value) return "Unset";
  const v = String(value).toLowerCase();
  if (v.includes("hind")) return "Hindu";
  if (v.includes("muslim") || v.includes("islam")) return "Muslim";
  if (v.includes("christ")) return "Christian";
  return "Unset";
};

/** Figma "Employees by Religion": always four bars, fixed colours. */
const RELIGION_COLORS = {
  Hindu: "#F47721",
  Muslim: "#11976A",
  Christian: "#E3B63E",
  Unset: "#9AAAC1",
};

function ReligionPieChart({ employees, onFilterChange }) {
  const data = useMemo(() => {
    const counts = { Hindu: 0, Muslim: 0, Christian: 0, Unset: 0 };
    (employees || []).forEach((emp) => {
      const key = mapReligion(emp.religion);
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: RELIGION_COLORS[name],
    }));
  }, [employees]);

  return (
    <DashboardCard title="Employees by Religion">
      <DashboardBarChart
        data={data}
        height="216px"
        xDataKey="name"
        bars={[{ dataKey: "value", perBarColor: true }]}
        showLegend={true}
        legendColumns={2}
        valueFormatter={(v) => v}
        emptyMessage="No data to display"
        onBarClick={(entry) =>
          onFilterChange && entry?.name && onFilterChange(entry.name)
        }
      />
    </DashboardCard>
  );
}

export default ReligionPieChart;
