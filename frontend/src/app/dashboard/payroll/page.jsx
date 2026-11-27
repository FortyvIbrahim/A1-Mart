"use client";

import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Flex, Grid, Stack, Text, Spinner } from "@chakra-ui/react";
import {
  DashboardCard,
  DashboardFilterPanel,
} from "@/components/dashboard/DashboardUI";
import AgGrid from "@/components/AgGrid";
import usePayrolls from "@/api/customHooks/usePayrolls";
import { getPayrollById } from "@/api/helpers/payroll";
import useEmployee from "@/api/customHooks/useEmployee";
import YearSelector from "@/components/dashboard/payroll/YearSelector";
import PayrollDetailsCard from "@/components/dashboard/payroll/PayrollDetailsCard";
import PaymentDetailsCard from "@/components/dashboard/payroll/PaymentDetailsCard";
import PayrollComparisonCard from "@/components/dashboard/payroll/PayrollComparisonCard";
import MonthsList from "@/components/dashboard/payroll/MonthsList";
import DashboardPageTitle, {
  DashboardTitleSection,
} from "@/components/dashboard/DashboardPageTitle";

function PayrollDashboard() {
  const { payrolls, loading: loadingPayrolls } = usePayrolls();
  const { employees, loading: loadingEmployees } = useEmployee({
    allBranches: true,
    filterInactive: true,
  });

  const [monthlyStats, setMonthlyStats] = useState({});
  const [selectedPayrollId, setSelectedPayrollId] = useState(null);
  const [comparisonPayrollId, setComparisonPayrollId] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState(null); // "Paid" | "Unpaid" | "On Hold" | null
  const [selectedYear, setSelectedYear] = useState(() => moment().year());
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("net_pay");

  // Fetch per-month aggregates (gross, net, deductions, employee count and payment buckets)
  useEffect(() => {
    if (!payrolls || payrolls.length === 0) return;

    let cancelled = false;

    const fetchAll = async () => {
      try {
        setLoadingStats(true);
        const results = await Promise.all(
          payrolls.map(async (p) => {
            try {
              const res = await getPayrollById(p.payroll_id);
              if (res.code !== 200 || !res.data?.employees) return null;
              const employees = res.data.employees || [];

              let totalGross = 0;
              let totalNet = 0;
              let paidEmployeesCount = 0;
              let onHoldEmployeesCount = 0;
              let unpaidEmployeesCount = 0;
              let totalPaidNet = 0;
              let totalOnHoldNet = 0;
              let totalUnpaidNet = 0;

              employees.forEach((emp) => {
                const gross = parseFloat(emp.gross_pay) || 0;
                const net = parseFloat(emp.net_pay) || 0;
                totalGross += gross;
                totalNet += net;

                const s = emp.payment_details?.status?.toLowerCase();
                const done = s === "processed" || s === "done";
                const isOnHold = emp.on_hold == true;

                if (done) {
                  paidEmployeesCount += 1;
                  totalPaidNet += net;
                } else if (isOnHold) {
                  onHoldEmployeesCount += 1;
                  totalOnHoldNet += net;
                } else {
                  unpaidEmployeesCount += 1;
                  totalUnpaidNet += net;
                }
              });
              const totalDeductions = totalGross - totalNet;

              return {
                payroll_id: p.payroll_id,
                payroll_month: p.payroll_month,
                employeeCount: employees.length,
                totalGross,
                totalNet,
                totalDeductions,
                paidEmployeesCount,
                onHoldEmployeesCount,
                unpaidEmployeesCount,
                totalPaidNet,
                totalOnHoldNet,
                totalUnpaidNet,
                employees,
              };
            } catch (err) {
              console.error("Error loading payroll", p.payroll_id, err);
              return null;
            }
          })
        );

        if (cancelled) return;
        const stats = {};
        results.forEach((entry) => {
          if (!entry) return;
          stats[entry.payroll_id] = entry;
        });
        setMonthlyStats(stats);
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [payrolls]);

  // Build month list sorted by payroll_month
  const allMonths = useMemo(() => {
    if (!payrolls || payrolls.length === 0) return [];
    return [...payrolls]
      .filter((p) => p.payroll_month)
      .sort(
        (a, b) =>
          new Date(a.payroll_month).getTime() -
          new Date(b.payroll_month).getTime()
      );
  }, [payrolls]);

  const availableYears = useMemo(() => {
    const years = new Set();
    allMonths.forEach((p) => {
      years.add(moment(p.payroll_month).year());
    });
    // Always include current year
    years.add(moment().year());
    return Array.from(years).sort((a, b) => a - b);
  }, [allMonths]);

  // Create a map of payroll_id by month string (YYYY-MM) for quick lookup
  const payrollByMonth = useMemo(() => {
    const map = {};
    allMonths.forEach((p) => {
      const monthKey = moment(p.payroll_month).format("YYYY-MM");
      map[monthKey] = p;
    });
    return map;
  }, [allMonths]);

  // Generate all 12 months for the selected year
  const months = useMemo(() => {
    const yearMonths = [];
    for (let month = 0; month < 12; month++) {
      const monthDate = moment({ year: selectedYear, month, day: 1 });
      const monthKey = monthDate.format("YYYY-MM");
      const payroll = payrollByMonth[monthKey];

      yearMonths.push({
        monthDate: monthDate.toDate(),
        monthKey,
        payroll_id: payroll?.payroll_id || null,
        payroll_month: payroll?.payroll_month || monthDate.format("YYYY-MM-DD"),
        hasData: !!payroll,
      });
    }
    return yearMonths;
  }, [selectedYear, payrollByMonth]);

  // Determine current month payroll (matching today's month/year) or latest in selected year
  const currentPayrollId = useMemo(() => {
    const today = moment();
    const currentMonth = months.find((m) =>
      today.isSame(moment(m.monthDate), "month")
    );
    if (currentMonth?.payroll_id) return currentMonth.payroll_id;

    // Find latest month with data
    const monthsWithData = months.filter((m) => m.hasData);
    if (monthsWithData.length > 0) {
      return monthsWithData[monthsWithData.length - 1].payroll_id;
    }
    return null;
  }, [months]);

  // Initialize selected and comparison months when data ready
  useEffect(() => {
    if (!months.length) return;
    setSelectedPayrollId((prev) => {
      // Only keep previous selection if it still exists and has data
      if (prev && months.some((m) => m.payroll_id === prev && m.hasData)) {
        return prev;
      }
      return currentPayrollId;
    });
    // default comparison to previous month if exists
    const monthsWithData = months.filter((m) => m.hasData);
    if (monthsWithData.length > 1) {
      const currentIndex = monthsWithData.findIndex(
        (m) => m.payroll_id === currentPayrollId
      );
      const prev =
        currentIndex > 0
          ? monthsWithData[currentIndex - 1]
          : monthsWithData[monthsWithData.length - 1];
      setComparisonPayrollId((prevId) =>
        prevId && monthsWithData.some((m) => m.payroll_id === prevId)
          ? prevId
          : prev.payroll_id
      );
    }
  }, [months, currentPayrollId]);

  const selectedStats =
    (selectedPayrollId && monthlyStats[selectedPayrollId]) || null;
  const currentStats =
    (currentPayrollId && monthlyStats[currentPayrollId]) || null;
  const comparisonStats =
    (comparisonPayrollId && monthlyStats[comparisonPayrollId]) || null;

  const totalEmployees = employees?.length ?? 0;

  const selectedEmployees = selectedStats?.employees || [];

  const filteredEmployees = useMemo(() => {
    if (!selectedEmployees || selectedEmployees.length === 0) return [];
    const q = search.trim().toLowerCase();
    const rows = selectedEmployees.filter((emp) => {
      if (paymentFilter) {
        const s = emp.payment_details?.status?.toLowerCase();
        const done = s === "processed" || s === "done";
        const isOnHold = emp.on_hold == true;
        const status = isOnHold ? "On Hold" : done ? "Paid" : "Unpaid";
        if (status !== paymentFilter) return false;
      }
      if (q) {
        const name = emp.employee_name ?? emp.employee?.employee_name ?? "";
        if (!`${name} ${emp.employee_code ?? ""}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    const num = (v) => parseFloat(v) || 0;
    if (sortBy === "name") {
      rows.sort((a, b) =>
        String(a.employee_name ?? a.employee?.employee_name ?? "").localeCompare(
          String(b.employee_name ?? b.employee?.employee_name ?? "")
        )
      );
    } else if (sortBy === "gross_pay") {
      rows.sort((a, b) => num(b.gross_pay) - num(a.gross_pay));
    } else {
      rows.sort((a, b) => num(b.net_pay) - num(a.net_pay));
    }
    return rows;
  }, [selectedEmployees, paymentFilter, search, sortBy]);

  const isLoading = loadingPayrolls || loadingEmployees || loadingStats;

  // Get months with data for comparison dropdown
  const monthsWithData = useMemo(() => {
    return months
      .filter((m) => m.hasData)
      .map((m) => ({
        payroll_id: m.payroll_id,
        payroll_month: m.payroll_month,
      }));
  }, [months]);

  if (isLoading && !months.length) {
    return (
      <GlobalWrapper permissionKey="view_payroll_dashboard">
        <Stack gap={6}>
          <DashboardTitleSection>
            <DashboardPageTitle title="Payroll Dashboard" />
          </DashboardTitleSection>
          <Flex justifyContent="center" py={10}>
            <Spinner />
          </Flex>
        </Stack>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey="view_payroll_dashboard">
      <Stack gap="24px">
        <DashboardPageTitle
          title="Payroll Dashboard"
          rightSection={
            availableYears.length > 0 ? (
              <YearSelector
                selectedYear={selectedYear}
                availableYears={availableYears}
                onChange={setSelectedYear}
              />
            ) : null
          }
        />

        <DashboardFilterPanel
          columns={3}
          fields={[
            {
              key: "search",
              type: "search",
              label: "Search",
              placeholder: "Search employee name or code…",
              value: search,
              onChange: setSearch,
            },
            {
              key: "payment",
              label: "Payment Status",
              placeholder: "All payment statuses",
              value: paymentFilter ?? "",
              onChange: (v) => setPaymentFilter(v || null),
              options: [
                { value: "Paid", label: "Paid" },
                { value: "On Hold", label: "On Hold" },
                { value: "Unpaid", label: "Unpaid" },
              ],
            },
            {
              key: "sortBy",
              label: "Sort by",
              placeholder: false,
              value: sortBy,
              onChange: setSortBy,
              options: [
                { value: "net_pay", label: "Net Pay" },
                { value: "gross_pay", label: "Gross Pay" },
                { value: "name", label: "Employee name" },
              ],
            },
          ]}
        />

        <MonthsList
          months={months}
          monthlyStats={monthlyStats}
          selectedPayrollId={selectedPayrollId}
          onSelectPayrollId={setSelectedPayrollId}
        />

        <Grid
          templateColumns={{ base: "1fr", lg: "311px 324px minmax(0, 1fr)" }}
          gap="16px"
          alignItems="stretch"
        >
          <PayrollDetailsCard
            selectedStats={selectedStats}
            paymentFilter={paymentFilter}
            onFilterChange={setPaymentFilter}
          />

          <PaymentDetailsCard selectedStats={selectedStats} />

          <PayrollComparisonCard
            selectedStats={selectedStats}
            comparisonStats={comparisonStats}
            months={monthsWithData}
            comparisonPayrollId={comparisonPayrollId}
            onComparisonChange={setComparisonPayrollId}
          />
        </Grid>

        {/* Figma "Card / Payroll Employees" with the employee-count pill. */}
        <DashboardCard
          title="Payroll Employees"
          subtitle="Pay, deductions and payment status for each employee."
          rightSection={
            <Text
              as="span"
              px="12px"
              py="6px"
              borderRadius="8px"
              bg="app.tableHeader"
              color="#C95C18"
              fontSize="12px"
              fontWeight="500"
            >
              {filteredEmployees.length} employees
            </Text>
          }
        >
          <AgGrid
            bare
            rowData={filteredEmployees}
            columnDefs={[
            {
              field: "employee_code",
              headerName: "Employee Code",
              type: "id",
            },
            {
              field: "employee_name",
              headerName: "Employee Name",
              valueGetter: (params) =>
                params.data?.employee_name ??
                params.data?.employee?.employee_name ??
                "-",
            },
            {
              field: "gross_pay",
              headerName: "Gross Pay",
              type: "currency",
              valueGetter: (params) => parseFloat(params.data?.gross_pay) || 0,
            },
            {
              field: "total_deductions",
              headerName: "Total Deductions",
              type: "currency",
              valueGetter: (params) => {
                const gross = parseFloat(params.data?.gross_pay) || 0;
                const net = parseFloat(params.data?.net_pay) || 0;
                return gross - net;
              },
            },
            {
              field: "net_pay",
              headerName: "Net Pay",
              type: "currency",
              valueGetter: (params) => parseFloat(params.data?.net_pay) || 0,
            },
            {
              field: "payment_status",
              headerName: "Payment Status",
              type: "badge-column",
              valueGetter: (params) => {
                const s = params.data?.payment_details?.status?.toLowerCase();
                const done = s === "processed" || s === "done";
                const isOnHold = params.data?.on_hold == true;
                const isPaid = done && !isOnHold;

                if (isOnHold) {
                  return {
                    label: "On Hold",
                    colorScheme: "orange",
                  };
                }

                return {
                  label: isPaid ? "Paid" : "Unpaid",
                  colorScheme: isPaid ? "green" : "red",
                };
              },
            },
            ]}
            tableKey="payroll-dashboard-employees"
            defaultRows={50}
          />
        </DashboardCard>
      </Stack>
    </GlobalWrapper>
  );
}

export default PayrollDashboard;
