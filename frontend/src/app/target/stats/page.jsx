"use client";

import useTargetBranches from "@/api/customHooks/useTargetBranches";
import useTargetDepartments from "@/api/customHooks/useTargetDepartments";
import useTargetEntries from "@/api/customHooks/useTargetEntries";
import useTargetSections from "@/api/customHooks/useTargetSections";
import useBranches from "@/api/customHooks/useBranches";
import CustomContainer from "@/components/CustomContainer";
import CustomSelect from "@/components/CustomSelect";
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
  Spinner,
  Tabs,
  Text,
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
      <CustomContainer headerBand title="Target Statistics">
        {/* Top Filter Card inside Target Statistics */}
        <Box
          bg="white"
          borderWidth="1px"
          borderColor="border"
          borderRadius="12px"
          p={{ base: "14px", md: "16px 20px" }}
        >
          <Grid
            templateColumns={{
              base: "1fr",
              md: canAccessAllBranches ? "repeat(2, minmax(0, 260px))" : "minmax(0, 260px)",
            }}
            gap="16px"
            alignItems="end"
          >
            {canAccessAllBranches && (
              <Box>
                <Text fontSize="12px" fontWeight="500" color="fg.muted" mb="6px">
                  Branch
                </Text>
                <CustomSelect
                  w="100%"
                  h="44px"
                  value={selectedBranch || ""}
                  emptyLabel="All Branches"
                  onChange={(v) => setSelectedBranch(v || null)}
                  options={branches.map((item) => ({
                    value: String(item.branch_id),
                    label: item.branch_name,
                  }))}
                />
              </Box>
            )}

            <Box css={{ "& .react-datepicker-wrapper": { width: "100%" } }}>
              <Text fontSize="12px" fontWeight="500" color="fg.muted" mb="6px">
                Month
              </Text>
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
          </Grid>
        </Box>

        {/* Overall Statistics Cards */}
        <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap="16px">
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
                "—"
              )
            }
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
                "—"
              )
            }
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
                "—"
              )
            }
          />
          <StatsCard
            title="Achievement %"
            value={
              overallStats.achievementPerc
                ? Math.round(overallStats.achievementPerc) + "%"
                : "—"
            }
            color={
              overallStats.achievementPerc
                ? getPercentageColor(overallStats.achievementPerc)
                : "fg"
            }
          />
        </Grid>

        {/* Tabs for View Selection matching Figma pill buttons */}
        <Tabs.Root defaultValue="branch" variant="plain">
          <Tabs.List
            bg="white"
            borderWidth="1px"
            borderColor="border"
            borderRadius="10px"
            p="4px"
            gap="4px"
            mb="16px"
            display="grid"
            gridTemplateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
          >
            {[
              { value: "branch", label: "Branch" },
              { value: "department", label: "Department" },
              { value: "section", label: "Section" },
              { value: "employee", label: "Employee" },
            ].map((tab) => (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                justifyContent="center"
                h="38px"
                borderRadius="8px"
                fontSize="13px"
                fontWeight="500"
                color="fg.muted"
                _selected={{
                  bg: "#FFF5ED",
                  color: "#C95C18",
                  fontWeight: "600",
                }}
                _hover={{ bg: "#FFFBF8", color: "fg" }}
              >
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="branch" pt="0">
            <BranchStats
              branchTargets={filteredBranchTargets}
              entryTargets={filteredEntryTargets}
            />
          </Tabs.Content>

          <Tabs.Content value="department" pt="0">
            <DepartmentStats
              departmentTargets={filteredDepartmentTargets}
              entryTargets={filteredEntryTargets}
            />
          </Tabs.Content>

          <Tabs.Content value="section" pt="0">
            <SectionStats
              sectionTargets={filteredSectionTargets}
              entryTargets={filteredEntryTargets}
            />
          </Tabs.Content>

          <Tabs.Content value="employee" pt="0">
            <EmployeeStats entryTargets={filteredEntryTargets} />
          </Tabs.Content>
        </Tabs.Root>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default StatsPage;
