"use client";

import React from "react";
import CustomDrawer from "@/components/CustomDrawer";
import { Button, Flex, Text, VStack, Box } from "@chakra-ui/react";
import moment from "moment";
import { roundOff } from "@/utils/payroll";

function num(val) {
  if (val == null || val === "") return null;
  const n = parseFloat(val);
  return Number.isNaN(n) ? null : n;
}

function fmtCurrency(val) {
  const n = num(val);
  if (n == null) return "-";
  return `₹${roundOff(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Drawer that displays all calculated payslip values and the calculation logic.
 * Matches formulas in @/utils/payroll.js transformPayrollData.
 *
 * @param {boolean} isOpen - Whether the drawer is open
 * @param {Function} onClose - Called when the drawer should close
 * @param {Object|null} selectedRow - Payslip row (payroll_employee record with payroll, employee, payment_details)
 */
function PayslipDetailsDrawer({ isOpen, onClose, selectedRow }) {
  const row = selectedRow ?? {};
  const payrollMonth = row.payroll?.payroll_month;
  const daysPerMonth = payrollMonth ? moment(payrollMonth).daysInMonth() : 0;

  const actualPay = num(row.actual_pay) ?? 0;
  const noOfWorkingDays = num(row.no_of_working_days) ?? 0;
  const incentive = num(row.incentive) ?? 0;
  const overtimeAmt = num(row.overtime_amt) ?? 0;
  const latenessAmt = num(row.lateness_amt) ?? 0;
  const advance = num(row.advance) ?? 0;
  const penalty = num(row.penalty) ?? 0;
  const employeeEsi = num(row.employee_esi) ?? 0;
  const employeeEpf = num(row.employee_epf) ?? 0;

  const lopDays = daysPerMonth - noOfWorkingDays;
  const perDaySalary = daysPerMonth > 0 ? actualPay / daysPerMonth : 0;
  const grossPay = perDaySalary * daysPerMonth + incentive + overtimeAmt;
  const lopAmount = perDaySalary * lopDays;
  const netPay = roundOff(
    grossPay -
      lopAmount -
      latenessAmt -
      advance -
      penalty -
      employeeEsi -
      employeeEpf
  ).toFixed(0);

  const employeeLabel =
    row.employee?.employee_name ?? row.employee_code ?? "Employee";
  const monthLabel = payrollMonth
    ? moment(payrollMonth).format("MMM YYYY")
    : "-";

  const title = selectedRow
    ? `Payslip Details - ${employeeLabel} (${monthLabel})`
    : "Payslip Details";

  const Row = ({ label, value }) => (
    <Flex justify="space-between" gap="4" fontSize="sm">
      <Text color="gray.600">{label}</Text>
      <Text fontWeight="medium">{value}</Text>
    </Flex>
  );

  const content = selectedRow ? (
    <VStack align="stretch" gap="4" fontSize="sm">
      <Text fontWeight="semibold" color="gray.800" fontSize="sm">
        Your payslip at a glance
      </Text>
      <Row label="Actual Pay" value={fmtCurrency(row.actual_pay)} />
      <Row
        label="No. of Working Days"
        value={String(parseFloat(row.no_of_working_days) ?? "-")}
      />
      <Row label="Days in Month" value={String(daysPerMonth)} />
      <Row label="Incentive" value={fmtCurrency(row.incentive)} />
      <Row label="Overtime Amount" value={fmtCurrency(row.overtime_amt)} />
      <Row label="Lateness Amount" value={fmtCurrency(row.lateness_amt)} />
      <Row label="Advance" value={fmtCurrency(row.advance)} />
      <Row label="Penalty" value={fmtCurrency(row.penalty)} />
      <Row label="Employee ESI" value={fmtCurrency(row.employee_esi)} />
      <Row label="Employee EPF" value={fmtCurrency(row.employee_epf)} />
      <Row label="Employer ESI" value={fmtCurrency(row.employer_esi)} />
      <Row label="Employer EPF" value={fmtCurrency(row.employer_epf)} />

      <Box pt="2" borderTopWidth="1px" borderColor="gray.200" />
      <Row label="LOP Days" value={String(lopDays)} />
      <Row label="Per Day Salary" value={fmtCurrency(perDaySalary)} />
      <Row label="Gross Pay" value={fmtCurrency(grossPay)} />
      <Row label="LOP Amount" value={fmtCurrency(lopAmount)} />
      <Row label="Net Pay" value={fmtCurrency(netPay)} />

      {row.payment_details && (
        <>
          <Box pt="2" borderTopWidth="1px" borderColor="gray.200" />
          <Text fontWeight="semibold" color="gray.800" fontSize="sm">
            Payment details
          </Text>
          <Row
            label="Account Number"
            value={
              row.payment_details.account_no != null
                ? String(row.payment_details.account_no)
                : "-"
            }
          />
          <Row label="IFSC Code" value={row.payment_details.ifsc_code ?? "-"} />
          <Row label="PF UAN" value={row.employee?.pf_uan ?? "-"} />
          <Row
            label="Beneficiary"
            value={row.payment_details.beneficiary ?? "-"}
          />
          <Row
            label="Payment Date"
            value={
              row.payment_details.payment_date
                ? moment(row.payment_details.payment_date).format("DD/MM/YYYY")
                : "-"
            }
          />
          <Row label="Status" value={row.payment_details.status ?? "-"} />
          <Row
            label="UTR"
            value={
              row.payment_details.utr != null
                ? String(row.payment_details.utr)
                : "-"
            }
          />
        </>
      )}

      <Box pt="2" borderTopWidth="1px" borderColor="gray.200" />
      <Text fontWeight="semibold" color="gray.800" fontSize="sm">
        How your salary was calculated
      </Text>
      <VStack
        align="stretch"
        gap="3"
        fontSize="sm"
        color="gray.700"
        lineHeight="tall"
      >
        <Text>
          <Text as="span" fontWeight="medium" color="gray.800">
            Step 1 — Days:
          </Text>{" "}
          In {monthLabel} there were{" "}
          <Text as="span" fontWeight="semibold">
            {daysPerMonth} days
          </Text>
          . You worked{" "}
          <Text as="span" fontWeight="semibold">
            {noOfWorkingDays} days
          </Text>
          , so the number of days not worked (leave or absent) is{" "}
          <Text as="span" fontWeight="semibold">
            {daysPerMonth} − {noOfWorkingDays} = {lopDays} days
          </Text>
          .
        </Text>
        <Text>
          <Text as="span" fontWeight="medium" color="gray.800">
            Step 2 — Salary per day:
          </Text>{" "}
          Your monthly salary ({fmtCurrency(actualPay)}) ÷ {daysPerMonth} days ={" "}
          <Text as="span" fontWeight="semibold">
            {fmtCurrency(perDaySalary)} per day
          </Text>
          .
        </Text>
        <Text>
          <Text as="span" fontWeight="medium" color="gray.800">
            Step 3 — Gross pay (before deductions):
          </Text>{" "}
          We take your monthly salary, add incentive ({fmtCurrency(incentive)})
          and overtime ({fmtCurrency(overtimeAmt)}). So{" "}
          <Text as="span" fontWeight="semibold">
            {fmtCurrency(actualPay)} + {fmtCurrency(incentive)} +{" "}
            {fmtCurrency(overtimeAmt)} = {fmtCurrency(grossPay)}
          </Text>
          . This is your gross pay.
        </Text>
        <Text>
          <Text as="span" fontWeight="medium" color="gray.800">
            Step 4 — Loss of Pay (LOP) deduction:
          </Text>{" "}
          For the {lopDays} days you did not work, we deduct salary for those
          days: {fmtCurrency(perDaySalary)} × {lopDays} days ={" "}
          <Text as="span" fontWeight="semibold">
            {fmtCurrency(lopAmount)}
          </Text>
          .
        </Text>
        <Text>
          <Text as="span" fontWeight="medium" color="gray.800">
            Step 5 — Other deductions:
          </Text>{" "}
          We then subtract lateness ({fmtCurrency(latenessAmt)}), advance (
          {fmtCurrency(advance)}), penalty ({fmtCurrency(penalty)}), ESI (
          {fmtCurrency(employeeEsi)}), and EPF ({fmtCurrency(employeeEpf)}).
        </Text>
        <Text>
          <Text as="span" fontWeight="medium" color="gray.800">
            Step 6 — Your take-home (net pay):
          </Text>{" "}
          Gross {fmtCurrency(grossPay)} − LOP {fmtCurrency(lopAmount)} − all
          other deductions ={" "}
          <Text as="span" fontWeight="semibold" color="green.600">
            {fmtCurrency(netPay)}
          </Text>
          . This is the amount you receive.
        </Text>
      </VStack>
    </VStack>
  ) : (
    <Text color="gray.600">No payslip selected.</Text>
  );

  return (
    <CustomDrawer
      title={title}
      isOpen={isOpen}
      setIsOpen={(open) => {
        if (!open) onClose();
      }}
      size="md"
      content={content}
      footer={
        <Button size="sm" variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    />
  );
}

export default PayslipDetailsDrawer;
