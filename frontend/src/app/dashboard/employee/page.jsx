"use client";

import useEmployee from "@/api/customHooks/useEmployee";
import useBranches from "@/api/customHooks/useBranches";
import usePermission from "@/customHooks/usePermission";
import { Center, Flex, Grid, Spinner, Text, Button } from "@chakra-ui/react";
import React, { useCallback, useMemo, useState } from "react";
import ReligionPieChart from "@/components/dashboard/employee/ReligionPieChart";
import GenderPieChart from "@/components/dashboard/employee/GenderPieChart";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import DashboardPageTitle, {
  DashboardTitleSection,
} from "@/components/dashboard/DashboardPageTitle";
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

  const { branches } = useBranches();
  const canAccessAllBranches = usePermission("access_all_branches");

  const allowAdd = usePermission("add_employees");
  const allowMFAToggle = usePermission("toggle_mfa_employees");

  const [religionFilter, setReligionFilter] = useState(null);
  const [genderFilter, setGenderFilter] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState("");

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

  const handleReligionFilterChange = useCallback((value) => {
    setReligionFilter((prev) => (prev === value ? null : value));
  }, []);

  const handleGenderFilterChange = useCallback((value) => {
    setGenderFilter((prev) => (prev === value ? null : value));
  }, []);

  const handleClearFilters = () => {
    setSelectedBranch("");
    setReligionFilter(null);
    setGenderFilter(null);
  };

  if (loading) {
    return (
      <Center py={10}>
        <Spinner />
      </Center>
    );
  }

  const hasActiveFilter = Boolean(
    (selectedBranch != null && selectedBranch !== "") ||
      religionFilter ||
      genderFilter
  );

  return (
    <GlobalWrapper permissionKey="view_employee_dashboard">
      <DashboardTitleSection>
        <Flex
          w="100%"
          gap={3}
          flexWrap="wrap"
          alignItems={{ base: "stretch", md: "center" }}
          justifyContent="space-between"
        >
          <DashboardPageTitle title="Employee Dashboard" />
          {canAccessAllBranches ? (
            <BranchFilter
              value={selectedBranch}
              onChange={(v) => setSelectedBranch(v ?? "")}
              label="Branch"
              allLabel="All Branches"
            />
          ) : null}
        </Flex>
      </DashboardTitleSection>

      <Grid
        templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
        gap={6}
        mb={6}
        mt={6}
      >
        <ReligionPieChart
          employees={filteredEmployees}
          onFilterChange={handleReligionFilterChange}
        />
        <GenderPieChart
          employees={filteredEmployees}
          onFilterChange={handleGenderFilterChange}
        />
      </Grid>

      <CustomContainer
        title="Employees"
        rightSection={
          <Flex gap={4} align="center">
            {hasActiveFilter && (
              <Text fontSize="sm" color="brand600" fontWeight="medium">
                Filters:
                {selectedBranch != null &&
                selectedBranch !== "" &&
                branches?.length
                  ? ` Branch = ${
                      branches.find(
                        (b) => String(b.branch_id) === String(selectedBranch)
                      )?.branch_name ?? selectedBranch
                    }`
                  : ""}
                {religionFilter ? ` Religion = ${religionFilter}` : ""}
                {genderFilter ? ` Gender = ${genderFilter}` : ""}
              </Text>
            )}

            {hasActiveFilter && (
              <Button size="sm" variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
          </Flex>
        }
      >
        <AgGrid
          rowData={filteredEmployees}
          columnDefs={colDefs}
          tableKey="employee-dashboard-employees"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default EmployeeDashboard;
