"use client";

import useTargetBranches from "@/api/customHooks/useTargetBranches";
import useTargetDepartments from "@/api/customHooks/useTargetDepartments";
import useTargetEntries from "@/api/customHooks/useTargetEntries";
import useTargetSections from "@/api/customHooks/useTargetSections";
import useBranches from "@/api/customHooks/useBranches";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import {
  BranchStats,
  DepartmentStats,
  EmployeeStats,
  SectionStats,
  StatsCard,
  getOverallStats,
  getPercentageColor,
} from "@/components/TargetStats";
import {
  Box,
  Flex,
  FormatNumber,
  Grid,
  NativeSelect,
  Spinner,
  Tabs,
} from "@chakra-ui/react";
import React, { useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import { CustomDateTimeInput } from "@/components/CustomInput";
import moment from "moment";
import usePermission from "@/customHooks/usePermission";

function StatsPage() {
  const { targets: branchTargets, loading: branchLoading } =
    useTargetBranches();
  const { targets: departmentTargets, loading: departmentLoading } =
    useTargetDepartments();
  const { targets: sectionTargets, loading: sectionLoading } =
    useTargetSections();
  const { targets: entryTargets, loading: entryLoading } = useTargetEntries();
  const { branches } = useBranches();
  const canAccessAllBranches = usePermission("access_all_branches");

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedBranch, setSelectedBranch] = useState(null);

  const loading =
    branchLoading || departmentLoading || sectionLoading || entryLoading;

  // Filter data based on selected month and branch
  const filteredBranchTargets = useMemo(() => {
    if (!branchTargets) return [];
    return branchTargets.filter((target) => {
      if (selectedBranch && target.branch_id != selectedBranch) {
        return false;
      }
      if (selectedMonth) {
        const targetMonth = moment(target.target_month);
        const selectedMonthMoment = moment(selectedMonth);
        if (
          !targetMonth.isSame(selectedMonthMoment, "month") ||
          !targetMonth.isSame(selectedMonthMoment, "year")
        ) {
          return false;
        }
      }
      return true;
    });
  }, [branchTargets, selectedBranch, selectedMonth]);

  const filteredDepartmentTargets = useMemo(() => {
    if (!departmentTargets) return [];
    return departmentTargets.filter((target) => {
      if (selectedBranch && target.branch_id != selectedBranch) {
        return false;
      }
      if (selectedMonth) {
        const targetDate = moment(target.target_date);
        const selectedMonthMoment = moment(selectedMonth);
        if (
          !targetDate.isSame(selectedMonthMoment, "month") ||
          !targetDate.isSame(selectedMonthMoment, "year")
        ) {
          return false;
        }
      }
      return true;
    });
  }, [departmentTargets, selectedBranch, selectedMonth]);

  const filteredSectionTargets = useMemo(() => {
    if (!sectionTargets) return [];
    return sectionTargets.filter((target) => {
      if (selectedBranch && target.branch_id != selectedBranch) {
        return false;
      }
      if (selectedMonth) {
        const targetDate = moment(target.target_date);
        const selectedMonthMoment = moment(selectedMonth);
        if (
          !targetDate.isSame(selectedMonthMoment, "month") ||
          !targetDate.isSame(selectedMonthMoment, "year")
        ) {
          return false;
        }
      }
      return true;
    });
  }, [sectionTargets, selectedBranch, selectedMonth]);

  const filteredEntryTargets = useMemo(() => {
    if (!entryTargets) return [];
    return entryTargets.filter((entry) => {
      if (selectedBranch && entry.branch_id != selectedBranch) {
        return false;
      }
      if (selectedMonth) {
        const entryDate = moment(entry.date);
        const selectedMonthMoment = moment(selectedMonth);
        if (
          !entryDate.isSame(selectedMonthMoment, "month") ||
          !entryDate.isSame(selectedMonthMoment, "year")
        ) {
          return false;
        }
      }
      return true;
    });
  }, [entryTargets, selectedBranch, selectedMonth]);

  const overallStats = getOverallStats(
    filteredBranchTargets,
    filteredDepartmentTargets,
    filteredSectionTargets,
    filteredEntryTargets
  );

  if (loading) {
    return (
      <GlobalWrapper>
        <Flex justifyContent="center" alignItems="center" minH="400px">
          <Spinner size="xl" />
        </Flex>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey="view_target_stats">
      <Flex
        gap={4}
        w="100%"
        flexDirection="row"
        justifyContent="flex-end"
        mb="22px"
      >
        {canAccessAllBranches && (
          <NativeSelect.Root width={{ base: "100%", md: "200px" }}>
            <NativeSelect.Field
              value={selectedBranch || ""}
              color={
                selectedBranch === "" || !selectedBranch ? "gray.400" : "black"
              }
              onChange={(e) => {
                setSelectedBranch(e.target.value || null);
              }}
            >
              <option value="">All Branches</option>
              {branches.map((item) => (
                <option key={item.branch_id} value={item.branch_id}>
                  {item.branch_name}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        )}

        <Box width={{ base: "100%", md: "200px" }}>
          <DatePicker
            selected={selectedMonth}
            onChange={(date) => setSelectedMonth(date)}
            showMonthYearPicker
            dateFormat="MMM yyyy"
            placeholderText="Select Month"
            isClearable
            customInput={
              <CustomDateTimeInput placeholder="Select Month" type="month" />
            }
            portalId="root-portal"
          />
        </Box>
      </Flex>

      <CustomContainer title="Target Statistics">
        {/* Overall Statistics Cards */}
        <Box mb={6}>
          <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
            <StatsCard
              title="Total Target"
              value={
                overallStats.totalTarget ? (
                  <FormatNumber
                    value={overallStats.totalTarget}
                    style="currency"
                    currency="INR"
                  />
                ) : (
                  "-"
                )
              }
              color="brand600"
            />
            <StatsCard
              title="Total Sales Made"
              value={
                overallStats.totalSales ? (
                  <FormatNumber
                    value={overallStats.totalSales}
                    style="currency"
                    currency="INR"
                  />
                ) : (
                  "-"
                )
              }
              color="green.600"
            />
            <StatsCard
              title="Target Left"
              value={
                overallStats.targetLeft ? (
                  <FormatNumber
                    value={overallStats.targetLeft}
                    style="currency"
                    currency="INR"
                  />
                ) : (
                  "-"
                )
              }
              color={overallStats.targetLeft > 0 ? "red.600" : "green.600"}
            />
            <StatsCard
              title="Achievement %"
              value={
                overallStats.achievementPerc
                  ? Math.round(overallStats.achievementPerc) + "%"
                  : "-"
              }
              color={getPercentageColor(overallStats.achievementPerc)}
            />
          </Grid>
        </Box>

        {/* Tabs for View Selection */}
        <Tabs.Root defaultValue="branch" variant="line">
          <Tabs.List>
            <Tabs.Trigger value="branch">Branch</Tabs.Trigger>
            <Tabs.Trigger value="department">Department</Tabs.Trigger>
            <Tabs.Trigger value="section">Section</Tabs.Trigger>
            <Tabs.Trigger value="employee">Employee</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="branch">
            <BranchStats
              branchTargets={filteredBranchTargets}
              entryTargets={filteredEntryTargets}
            />
          </Tabs.Content>

          <Tabs.Content value="department">
            <DepartmentStats
              departmentTargets={filteredDepartmentTargets}
              entryTargets={filteredEntryTargets}
            />
          </Tabs.Content>

          <Tabs.Content value="section">
            <SectionStats
              sectionTargets={filteredSectionTargets}
              entryTargets={filteredEntryTargets}
            />
          </Tabs.Content>

          <Tabs.Content value="employee">
            <EmployeeStats entryTargets={filteredEntryTargets} />
          </Tabs.Content>
        </Tabs.Root>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default StatsPage;
