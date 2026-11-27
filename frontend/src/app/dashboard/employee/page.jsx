"use client";

import useEmployee from "@/api/customHooks/useEmployee";
import usePermission from "@/customHooks/usePermission";
import { Center, Flex, Spinner } from "@chakra-ui/react";
import React, { useCallback, useMemo, useState } from "react";
import ReligionPieChart from "@/components/dashboard/employee/ReligionPieChart";
import GenderPieChart from "@/components/dashboard/employee/GenderPieChart";
import GlobalWrapper from "@/components/GlobalWrapper";
import DashboardPageTitle from "@/components/dashboard/DashboardPageTitle";
import {
  DashboardCard,
  DashboardFilterPanel,
  DashboardTwoColumn,
} from "@/components/dashboard/DashboardUI";
import { REST_DAY_PIE_FULL_LABEL } from "@/utils/restDayBadges";
import AgGrid from "@/components/AgGrid";
import { employeeColDefs } from "@/colDefs/employee";
import BranchFilter from "@/components/BranchFilter";

const mapReligion = (value) => {
  if (!value) return "Unset";
  const v = String(value).toLowerCase();

  if (v.includes("hind")) return "Hindu";
  if (v.includes("muslim") || v.includes("islam")) return "Muslim";
  if (v.includes("christ")) return "Christian";

  return "Unset";
};

const mapGender = (value) => {
  if (!value) return "Unset";
  const v = String(value).toUpperCase();

  if (v === "M") return "Male";
  if (v === "F") return "Female";
  if (v === "O") return "Other";

  return "Unset";
};

function EmployeeDashboard() {
  const { employees, loading } = useEmployee({
    filterInactive: true,
  });

  const canAccessAllBranches = usePermission("access_all_branches");

  const allowAdd = usePermission("add_employees");
  const allowMFAToggle = usePermission("toggle_mfa_employees");

  const [religionFilter, setReligionFilter] = useState(null);
  const [genderFilter, setGenderFilter] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [search, setSearch] = useState("");
  const [designation, setDesignation] = useState("");
  const [restDay, setRestDay] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const colDefs = useMemo(
    () =>
      employeeColDefs({
        allowAdd,
      }),
    []
  );

  const filteredEmployees = useMemo(() => {
    if (!employees || employees.length === 0) return [];

    return employees.filter((emp) => {
      if (
        selectedBranch != null &&
        selectedBranch !== "" &&
        String(emp.branch_id) !== String(selectedBranch)
      ) {
        return false;
      }
      if (religionFilter && mapReligion(emp.religion) !== religionFilter) {
        return false;
      }
      if (genderFilter && mapGender(emp.gender) !== genderFilter) {
        return false;
      }
      return true;
    });
  }, [employees, selectedBranch, religionFilter, genderFilter]);

  const designationOptions = useMemo(() => {
    const names = new Set(
      (employees || []).map((e) => e.designation_name).filter(Boolean)
    );
    return [...names]
      .sort((a, b) => a.localeCompare(b))
      .map((n) => ({ value: n, label: n }));
  }, [employees]);

  // Search / designation / rest day / sort narrow the table only; the charts
  // follow branch and chart clicks, as before.
  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = filteredEmployees.filter((emp) => {
      if (designation && emp.designation_name !== designation) return false;
      if (restDay) {
        const n = Number(emp.rest_day);
        const set = Number.isFinite(n) && n >= 1 && n <= 7;
        if (restDay === "unset" ? set : !set || n !== Number(restDay)) return false;
      }
      if (q) {
        const hay = `${emp.employee_name ?? ""} ${emp.employee_code ?? ""} ${
          emp.mobile_number ?? ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const key = sortBy === "id" ? "employee_code" : "employee_name";
    return rows.sort((a, b) =>
      String(a[key] ?? "").localeCompare(String(b[key] ?? ""), undefined, {
        numeric: true,
      })
    );
  }, [filteredEmployees, search, designation, restDay, sortBy]);

  const handleReligionFilterChange = useCallback((value) => {
    setReligionFilter((prev) => (prev === value ? null : value));
  }, []);

  const handleGenderFilterChange = useCallback((value) => {
    setGenderFilter((prev) => (prev === value ? null : value));
  }, []);

  if (loading) {
    return (
      <Center py={10}>
        <Spinner />
      </Center>
    );
  }

  return (
    <GlobalWrapper permissionKey="view_employee_dashboard">
      <Flex direction="column" gap="24px">
        <DashboardPageTitle
          title="Employee Dashboard"
          rightSection={
            canAccessAllBranches ? (
              <BranchFilter
                value={selectedBranch}
                onChange={(v) => setSelectedBranch(v ?? "")}
                label="Branch"
                allLabel="All Branches"
                width={{ base: "100%", md: "256px" }}
              />
            ) : null
          }
        />

        <DashboardFilterPanel
          fields={[
            {
              key: "search",
              type: "search",
              label: "Search",
              placeholder: "Search employee name, id or mobile…",
              value: search,
              onChange: setSearch,
            },
            {
              key: "designation",
              label: "Designation",
              placeholder: "All designations",
              value: designation,
              onChange: setDesignation,
              options: designationOptions,
            },
            {
              key: "restDay",
              label: "Rest Day",
              placeholder: "All rest days",
              value: restDay,
              onChange: setRestDay,
              options: [
                ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({
                  value: String(n),
                  label: REST_DAY_PIE_FULL_LABEL[n],
                })),
                { value: "unset", label: "Unset" },
              ],
            },
            {
              key: "sortBy",
              label: "Sort by",
              placeholder: false,
              value: sortBy,
              onChange: setSortBy,
              options: [
                { value: "name", label: "Employee name" },
                { value: "id", label: "Employee ID" },
              ],
            },
          ]}
        />

        <DashboardTwoColumn>
          <ReligionPieChart
            employees={filteredEmployees}
            onFilterChange={handleReligionFilterChange}
          />
          <GenderPieChart
            employees={filteredEmployees}
            onFilterChange={handleGenderFilterChange}
          />
        </DashboardTwoColumn>

        <DashboardCard
          title="Employees"
          subtitle="Use search, filters and sorting to narrow records."
        >
          <AgGrid
            bare
            rowData={tableRows}
            columnDefs={colDefs}
            tableKey="employee-dashboard-employees"
          />
        </DashboardCard>
      </Flex>
    </GlobalWrapper>
  );
}

export default EmployeeDashboard;
