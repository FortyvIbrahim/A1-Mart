"use client";

import React, { useMemo } from "react";
import { DashboardCard, DashboardDonut } from "@/components/dashboard/DashboardUI";

const mapGender = (value) => {
  if (!value) return "Unset";
  const v = String(value).toUpperCase();
  if (v === "M") return "Male";
  if (v === "F") return "Female";
  if (v === "O") return "Other";
  return "Unset";
};

/** Figma "Employees by Gender" colours. */
const GENDER_COLORS = {
  Male: "#526FA8",
  Female: "#11976A",
  Other: "#E3B63E",
  Unset: "#9AAAC1",
};

function GenderPieChart({ employees, onFilterChange }) {
  const data = useMemo(() => {
    const counts = { Male: 0, Female: 0, Other: 0, Unset: 0 };
    (employees || []).forEach((emp) => {
      const key = mapGender(emp.gender);
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([name, value]) => value > 0 || name === "Male" || name === "Female")
      .map(([name, value]) => ({ name, value, color: GENDER_COLORS[name] }));
  }, [employees]);

  return (
    <DashboardCard title="Employees by Gender">
      <DashboardDonut data={data} onItemClick={onFilterChange} />
    </DashboardCard>
  );
}

export default GenderPieChart;
