"use client";

import useAccountsSheet from "@/api/customHooks/useAccountsSheet";
import GlobalWrapper from "@/components/GlobalWrapper";
import DashboardPageTitle from "@/components/dashboard/DashboardPageTitle";
import {
  Box,
  Text,
  Grid,
  Flex,
  Button,
} from "@chakra-ui/react";
import CustomSelect from "@/components/CustomSelect";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import moment from "moment";
import { CustomDateTimeInput } from "@/components/CustomInput";
import UserDetailsPanel from "@/components/UserDetailsPanel";
import useBranches from "@/api/customHooks/useBranches";
import useDesignations from "@/api/customHooks/useDesignations";
import usePermission from "@/customHooks/usePermission";

ModuleRegistry.registerModules([AllCommunityModule]);

export default function Home() {
  // Set default date range to yesterday
  const getYesterdayRange = () => {
    const yesterday = moment().subtract(1, "days").startOf("day");
    const startDate = yesterday.toDate();
    const endDate = yesterday.clone().endOf("day").toDate();

    return {
      startDate,
      endDate,
    };
  };

  const [dateRange, setDateRange] = useState(getYesterdayRange());
  const [selectedUser, setSelectedUser] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedDesignation, setSelectedDesignation] = useState(null);

  const accountsSheetFromDate = useMemo(
    () =>
      dateRange.startDate
        ? moment(dateRange.startDate).format("YYYY-MM-DD")
        : undefined,
    [dateRange.startDate]
  );
  const accountsSheetToDate = useMemo(
    () =>
      dateRange.endDate
        ? moment(dateRange.endDate).format("YYYY-MM-DD")
        : undefined,
    [dateRange.endDate]
  );

  const { accountSheets } = useAccountsSheet({
    fromDate: accountsSheetFromDate,
    toDate: accountsSheetToDate,
  });

  const { branches } = useBranches();
  const { designations } = useDesignations();
  const canAccessAllBranches = usePermission("access_all_branches");

  // Get unique designations from accountSheets
  const uniqueDesignations = useMemo(() => {
    if (!accountSheets || accountSheets.length === 0) return [];

    // Get unique designation_ids from accountSheets
    const uniqueDesignationIds = [
      ...new Set(
        accountSheets
          .map((sheet) => sheet.designation_id)
          .filter((id) => id != null && id !== undefined)
      ),
    ];

    // Map to designation objects with name
    return uniqueDesignationIds
      .map((designationId) => {
        const designation = designations.find(
          (d) => d.designation_id === designationId
        );
        return designation
          ? {
            designation_id: designationId,
            designation_name: designation.designation_name,
          }
          : null;
      })
      .filter((d) => d !== null)
      .sort((a, b) => a.designation_name.localeCompare(b.designation_name));
  }, [accountSheets, designations]);

  const filteredAccountSheets = useMemo(() => {
    if (!accountSheets) return [];

    return accountSheets.filter((sheet) => {
      if (selectedBranch) {
        if (sheet.branch_id != selectedBranch) {
          return false;
        }
      }

      if (selectedDesignation) {
        if (sheet.designation_id != selectedDesignation) {
          return false;
        }
      }

      return true;
    });
  }, [accountSheets, selectedBranch, selectedDesignation]);

  const groupedByUser = useMemo(() => {
    if (!filteredAccountSheets) return {};

    return filteredAccountSheets.reduce((acc, curr) => {
      const employeeId = curr.employee_id;

      if (!acc[employeeId]) {
        acc[employeeId] = {
          data: [],
          total_sales: 0,
          total_no_of_bills: 0,
          total_no_of_items: 0,
          employee_name: curr.employee_name,
          designation_name: curr.designation_name,
          cash_sales: 0,
          card_sales: 0,
          paytm_sales: 0,
          excess_cash: 0,
          short_cash: 0,
          excess_card: 0,
          short_card: 0,
          excess_paytm: 0,
          short_paytm: 0,
        };
      }

      acc[employeeId].data.push(curr);
      acc[employeeId].total_sales += parseFloat(curr.total_sales);
      acc[employeeId].total_no_of_bills += curr.no_of_bills;
      acc[employeeId].total_no_of_items += curr.no_of_items;
      acc[employeeId].cash_sales += parseFloat(curr.cash_sales);
      acc[employeeId].card_sales += parseFloat(curr.card_sales);
      acc[employeeId].paytm_sales += parseFloat(curr.paytm_sales);

      if (curr.cash_type === "excess") acc[employeeId].excess_cash++;
      if (curr.cash_type === "short") acc[employeeId].short_cash++;
      if (curr.card_type === "excess") acc[employeeId].excess_card++;
      if (curr.card_type === "short") acc[employeeId].short_card++;
      if (curr.paytm_type === "excess") acc[employeeId].excess_paytm++;
      if (curr.paytm_type === "short") acc[employeeId].short_paytm++;

      return acc;
    }, {});
  }, [filteredAccountSheets]);

  const overallStats = useMemo(() => {
    const users = Object.values(groupedByUser);

    // Find highest and lowest sales and bills
    const highestSales = Math.max(...users.map((user) => user.total_sales), 0);
    const highestBills = Math.max(
      ...users.map((user) => user.total_no_of_bills),
      0
    );
    const lowestSales =
      users.length > 0 ? Math.min(...users.map((user) => user.total_sales)) : 0;
    const lowestBills =
      users.length > 0
        ? Math.min(...users.map((user) => user.total_no_of_bills))
        : 0;

    return {
      total_users: users.length,
      total_sales: users.reduce((sum, user) => sum + user.total_sales, 0),
      total_bills: users.reduce((sum, user) => sum + user.total_no_of_bills, 0),
      total_items: users.reduce((sum, user) => sum + user.total_no_of_items, 0),
      avg_sales_per_user:
        users.length > 0
          ? users.reduce((sum, user) => sum + user.total_sales, 0) /
          users.length
          : 0,
      highestSales,
      highestBills,
      lowestSales,
      lowestBills,
    };
  }, [groupedByUser]);

  const handleUserCardClick = (userId, userData) => {
    setSelectedUser({ userId, userData });
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setSelectedUser(null);
  };

  const isEmpty = filteredAccountSheets.length === 0;

  const sortedUsers = useMemo(() => {
    const getPriority = (user) => {
      if (user.total_sales === overallStats.highestSales && overallStats.highestSales > 0)
        return 1;
      if (
        user.total_no_of_bills === overallStats.highestBills &&
        overallStats.highestBills > 0
      )
        return 2;
      if (user.total_sales === overallStats.lowestSales) return 3;
      if (user.total_no_of_bills === overallStats.lowestBills) return 4;
      return 5;
    };
    return Object.entries(groupedByUser).sort(([, a], [, b]) => {
      const diff = getPriority(a) - getPriority(b);
      if (diff !== 0) return diff;
      return b.total_sales - a.total_sales;
    });
  }, [groupedByUser, overallStats]);

  const flagsFor = (userData) => ({
    isHighestSales:
      userData?.total_sales === overallStats.highestSales && overallStats.highestSales > 0,
    isHighestBills:
      userData?.total_no_of_bills === overallStats.highestBills &&
      overallStats.highestBills > 0,
    isLowestSales: userData?.total_sales === overallStats.lowestSales,
    isLowestBills: userData?.total_no_of_bills === overallStats.lowestBills,
  });

  const formatINR = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);

  const statCards = [
    { label: "Total Users", value: isEmpty ? "-" : overallStats.total_users.toLocaleString("en-IN"), big: true },
    { label: "Total Sales", value: isEmpty ? "-" : formatINR(overallStats.total_sales) },
    { label: "Total Bills", value: isEmpty ? "-" : overallStats.total_bills.toLocaleString("en-IN"), big: true },
    { label: "Avg Sales/User", value: isEmpty ? "-" : formatINR(overallStats.avg_sales_per_user) },
    {
      label: "Avg Bill Value",
      value:
        isEmpty || !overallStats.total_bills
          ? "-"
          : formatINR(overallStats.total_sales / overallStats.total_bills),
    },
  ];

  const periodLabel = (() => {
    const { startDate, endDate } = dateRange;
    if (!startDate && !endDate) return "All dates";
    const fmt = (d) => moment(d).format("D MMMM YYYY");
    if (startDate && endDate && moment(startDate).isSame(endDate, "day")) return fmt(startDate);
    if (startDate && endDate) return `${fmt(startDate)} – ${fmt(endDate)}`;
    return startDate ? `From ${fmt(startDate)}` : `Until ${fmt(endDate)}`;
  })();

  const filterLabel = (text) => (
    <Text fontSize="12px" fontWeight="500" color="gray.600" mb="6px">
      {text}
    </Text>
  );

  return (
    <GlobalWrapper permissionKey="view_dashboard">
      <Flex gap="22px" flexDirection="column">
        <DashboardPageTitle title="Accounts Dashboard" />

        {/* Filters */}
        <Grid
          templateColumns={{
            base: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: canAccessAllBranches
              ? "repeat(4, minmax(0, 1fr)) auto"
              : "repeat(3, minmax(0, 1fr)) auto",
          }}
          gap="14px"
          alignItems="end"
        >
          {canAccessAllBranches ? (
            <Box>
              {filterLabel("Branch")}
              <CustomSelect
                h="42px"
                value={selectedBranch || ""}
                placeholder="All Branches"
                onChange={(val) => setSelectedBranch(val || null)}
                options={branches.map((item) => ({
                  value: item.branch_id,
                  label: item.branch_name,
                }))}
              />
            </Box>
          ) : null}

          <Box>
            {filterLabel("Designation")}
            <CustomSelect
              h="42px"
              value={selectedDesignation || ""}
              placeholder="All Designations"
              onChange={(val) => setSelectedDesignation(val || null)}
              options={uniqueDesignations.map((item) => ({
                value: item.designation_id,
                label: item.designation_name,
              }))}
            />
          </Box>

          <Box>
            {filterLabel("From date")}
            <DatePicker
              selected={dateRange.startDate}
              onChange={(date) => setDateRange((prev) => ({ ...prev, startDate: date }))}
              selectsStart
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              customInput={<CustomDateTimeInput format="DD/MM/YYYY" placeholder="From Date" />}
              dateFormat="dd/MM/yyyy"
              isClearable
              portalId="root-portal"
            />
          </Box>
          <Box>
            {filterLabel("To date")}
            <DatePicker
              selected={dateRange.endDate}
              onChange={(date) => setDateRange((prev) => ({ ...prev, endDate: date }))}
              selectsEnd
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              minDate={dateRange.startDate}
              customInput={<CustomDateTimeInput format="DD/MM/YYYY" placeholder="To Date" />}
              dateFormat="dd/MM/yyyy"
              isClearable
              portalId="root-portal"
            />
          </Box>
          <Button
            h="42px"
            px="18px"
            variant="subtle"
            colorPalette="brand"
            onClick={() => {
              setDateRange({ startDate: null, endDate: null });
              setSelectedBranch(null);
              setSelectedDesignation(null);
            }}
          >
            Clear
          </Button>
        </Grid>

        {/* Overall Statistics */}
        <Box>
          <Text fontSize="17px" fontWeight="700" color="gray.800" mb="12px">
            Overall Statistics
          </Text>
          <Grid
            templateColumns={{
              base: "repeat(2, minmax(0, 1fr))",
              md: "repeat(3, minmax(0, 1fr))",
              xl: "repeat(5, minmax(0, 1fr))",
            }}
            gap="14px"
          >
            {statCards.map((card) => (
              <Box
                key={card.label}
                bg="white"
                borderWidth="1px"
                borderColor="border"
                borderRadius="14px"
                px="18px"
                py="16px"
                minW={0}
              >
                <Text fontSize="12.5px" color="gray.600" fontWeight="500">
                  {card.label}
                </Text>
                <Text
                  mt="8px"
                  fontSize={card.big ? "26px" : "19px"}
                  lineHeight="1.2"
                  fontWeight="700"
                  color="gray.800"
                  truncate
                >
                  {card.value}
                </Text>
                <Text mt="6px" fontSize="11.5px" color="gray.500">
                  Selected period
                </Text>
              </Box>
            ))}
          </Grid>
        </Box>

        {/* Performance + sales share */}
        <Grid templateColumns={{ base: "1fr", xl: "minmax(0, 1fr) 320px" }} gap="18px" alignItems="start">
          <EmployeePerformanceTable
            rows={sortedUsers}
            flagsFor={flagsFor}
            formatINR={formatINR}
            onSelect={handleUserCardClick}
          />
          <SalesShareCard rows={sortedUsers} total={overallStats.total_sales} formatINR={formatINR} isEmpty={isEmpty} />
        </Grid>

        {/* Reporting period */}
        <Box bg="white" borderWidth="1px" borderColor="border" borderRadius="14px" px="20px" py="16px">
          <Text fontSize="13px" fontWeight="600" color="gray.700">
            Selected reporting period
          </Text>
          <Text fontSize="17px" fontWeight="700" color="brand.600" mt="4px">
            {periodLabel}
          </Text>
          <Text fontSize="12px" color="gray.500" mt="2px">
            {isEmpty
              ? "No account sheets found for the selected filters."
              : `${overallStats.total_users} users · ${overallStats.total_bills.toLocaleString("en-IN")} bills · ${overallStats.total_items.toLocaleString("en-IN")} items in this period.`}
          </Text>
        </Box>

        {/* User Details Panel */}
        <UserDetailsPanel
          isOpen={isPanelOpen}
          onClose={handleClosePanel}
          userData={selectedUser?.userData}
          userId={selectedUser?.userId}
          dateRange={dateRange}
          {...flagsFor(selectedUser?.userData)}
        />
      </Flex>
    </GlobalWrapper>
  );
}

const PIE_COLORS = ["#F47721", "#5B6CB5", "#F8B483", "#94A3C8", "#FBD2B3", "#C7CCE4", "#E9DDD3"];

function initialsOf(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function PerfBadge({ children, tone }) {
  const tones = {
    green: { bg: "#3E8E5E", color: "white" },
    blue: { bg: "#4461B8", color: "white" },
    red: { bg: "#D9534F", color: "white" },
    orange: { bg: "#D9772F", color: "white" },
  };
  return (
    <Box
      as="span"
      display="inline-flex"
      px="10px"
      py="4px"
      borderRadius="6px"
      fontSize="11px"
      fontWeight="600"
      whiteSpace="nowrap"
      {...tones[tone]}
    >
      {children}
    </Box>
  );
}

function EmployeePerformanceTable({ rows, flagsFor, formatINR, onSelect }) {
  const th = {
    fontSize: "12.5px",
    fontWeight: "500",
    color: "gray.600",
    py: "10px",
    px: "12px",
    textAlign: "left",
    whiteSpace: "nowrap",
  };
  return (
    <Box bg="white" borderWidth="1px" borderColor="border" borderRadius="14px" overflow="hidden">
      <Text fontSize="17px" fontWeight="700" color="gray.800" px="18px" pt="16px" pb="6px">
        Employee Performance
      </Text>
      {rows.length === 0 ? (
        <Text px="18px" pb="22px" pt="8px" fontSize="13px" color="gray.500">
          No performance data for the selected filters.
        </Text>
      ) : (
        <Box overflowX="auto" px="6px" pb="8px">
          <Box as="table" w="100%" minW="720px" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <Box as="thead">
              <Box as="tr">
                <Box as="th" {...th}>Employee</Box>
                <Box as="th" {...th} textAlign="right">Total Sales</Box>
                <Box as="th" {...th} textAlign="center">Total Bills</Box>
                <Box as="th" {...th}>Records</Box>
                <Box as="th" {...th}>Items</Box>
                <Box as="th" {...th}>Performance</Box>
              </Box>
            </Box>
            <Box as="tbody">
              {rows.map(([userId, user], index) => {
                const f = flagsFor(user);
                return (
                  <Box
                    as="tr"
                    key={userId}
                    cursor="pointer"
                    bg={index % 2 === 1 ? "app.rowAlt" : "white"}
                    _hover={{ bg: "brand.50" }}
                    onClick={() => onSelect(userId, user)}
                  >
                    <Box as="td" px="12px" py="12px">
                      <Flex alignItems="center" gap="10px">
                        <Flex
                          w="30px"
                          h="30px"
                          borderRadius="8px"
                          bg="brand.100"
                          color="brand.600"
                          fontSize="11px"
                          fontWeight="700"
                          alignItems="center"
                          justifyContent="center"
                          flexShrink={0}
                        >
                          {initialsOf(user.employee_name)}
                        </Flex>
                        <Box minW={0}>
                          <Text fontSize="13.5px" fontWeight="600" color="gray.800" truncate>
                            {user.employee_name}
                          </Text>
                          <Text fontSize="11px" color="gray.500" textTransform="uppercase" truncate>
                            {user.designation_name}
                          </Text>
                        </Box>
                      </Flex>
                    </Box>
                    <Box as="td" px="12px" textAlign="right" fontSize="13px" fontWeight="600" color="brand.600" whiteSpace="nowrap">
                      {formatINR(user.total_sales)}
                    </Box>
                    <Box as="td" px="12px" textAlign="center" fontSize="13px" fontWeight="700" color="secondary.600">
                      {user.total_no_of_bills.toLocaleString("en-IN")}
                    </Box>
                    <Box as="td" px="12px" fontSize="12.5px" color="gray.600" whiteSpace="nowrap">
                      {user.data.length} records
                    </Box>
                    <Box as="td" px="12px" fontSize="12.5px" color="gray.600" whiteSpace="nowrap">
                      {user.total_no_of_items.toLocaleString("en-IN")} items
                    </Box>
                    <Box as="td" px="12px">
                      <Flex gap="6px" flexWrap="wrap">
                        {f.isHighestSales && <PerfBadge tone="green">Highest Sales</PerfBadge>}
                        {f.isHighestBills && <PerfBadge tone="blue">Highest Bills</PerfBadge>}
                        {f.isLowestSales && !f.isHighestSales && <PerfBadge tone="red">Lowest Sales</PerfBadge>}
                        {f.isLowestBills && !f.isHighestBills && <PerfBadge tone="orange">Lowest Bills</PerfBadge>}
                      </Flex>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

function SalesShareCard({ rows, total, formatINR, isEmpty }) {
  const top = rows
    .map(([id, u]) => ({ id, name: u.employee_name, value: u.total_sales }))
    .sort((a, b) => b.value - a.value);
  const head = top.slice(0, 6);
  const restValue = top.slice(6).reduce((s, r) => s + r.value, 0);
  const data = restValue > 0 ? [...head, { id: "rest", name: "Others", value: restValue }] : head;

  return (
    <Box bg="white" borderWidth="1px" borderColor="border" borderRadius="14px" px="18px" py="16px">
      <Text fontSize="13px" fontWeight="500" color="gray.600">
        Total Sales
      </Text>
      <Text fontSize="24px" fontWeight="700" color="brand.600" mt="6px" truncate>
        {isEmpty ? "-" : formatINR(total)}
      </Text>

      <Box position="relative" h="210px" mt="10px">
        {data.length > 0 && total > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={1.5}
                stroke="none"
                isAnimationActive={false}
              >
                {data.map((d, i) => (
                  <Cell key={d.id} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(v) => formatINR(v)} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Flex h="100%" alignItems="center" justifyContent="center">
            <Box w="150px" h="150px" borderRadius="full" border="22px solid" borderColor="brand.50" />
          </Flex>
        )}
        <Flex
          position="absolute"
          inset={0}
          direction="column"
          alignItems="center"
          justifyContent="center"
          pointerEvents="none"
        >
          <Text fontSize="24px" fontWeight="700" color="gray.800" lineHeight="1">
            {rows.length}
          </Text>
          <Text fontSize="11px" color="gray.500" mt="4px">
            employees
          </Text>
        </Flex>
      </Box>

      <Flex direction="column" gap="7px" mt="12px">
        {data.map((d, i) => (
          <Flex key={d.id} alignItems="center" gap="8px" fontSize="12px">
            <Box w="7px" h="7px" borderRadius="full" bg={PIE_COLORS[i % PIE_COLORS.length]} flexShrink={0} />
            <Text flex={1} color="gray.700" textTransform="uppercase" truncate>
              {d.name}
            </Text>
            <Text color="brand.600" fontWeight="600">
              {total > 0 ? `${((d.value / total) * 100).toFixed(1)}%` : "0%"}
            </Text>
          </Flex>
        ))}
      </Flex>
      {data.length > 0 && (
        <Text fontSize="11.5px" color="brand.600" mt="12px">
          Share of total sales · click a row for details
        </Text>
      )}
    </Box>
  );
}