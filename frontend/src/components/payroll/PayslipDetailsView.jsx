"use client";

import React from "react";
import CustomContainer from "@/components/CustomContainer";
import { Box, Flex, Grid, Tabs, Text, VStack } from "@chakra-ui/react";
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

function fmtOrDash(val) {
  const n = num(val);
  if (n == null || n === 0 && val == null) return "-";
  return fmtCurrency(n);
}

function DetailCell({ label, value }) {
  return (
    <Flex direction="column" gap="4px">
      <Text fontSize="11.5px" lineHeight="15px" color="fg.muted" fontWeight="400">
        {label}
      </Text>
      <Text fontSize="14px" lineHeight="20px" color="#202938" fontWeight="600">
        {value}
      </Text>
    </Flex>
  );
}

export default function PayslipDetailsView({ selectedRow, onBack }) {
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

  return (
    <CustomContainer
      headerBand
      onBack={onBack}
      title={
        <Flex align="baseline" gap="10px" flexWrap="wrap">
          <Text as="span">{`${employeeLabel} · ${monthLabel}`}</Text>
          <Text as="span" fontSize="12.5px" fontWeight="400" color="fg.muted">
            Payslip details
          </Text>
        </Flex>
      }
      rightSection={
        <Flex align="baseline" gap="10px">
          <Text fontSize="12px" color="fg.muted" fontWeight="500">
            Net Pay
          </Text>
          <Text fontSize="22px" lineHeight="26px" fontWeight="700" color="#147D52">
            {fmtCurrency(netPay)}
          </Text>
        </Flex>
      }
    >
      <Tabs.Root defaultValue="breakdown" variant="line" colorPalette="brand">
        <Tabs.List
          borderBottomWidth="1px"
          borderColor="#E5E7EB"
          gap="24px"
          mb="22px"
        >
          <Tabs.Trigger
            value="breakdown"
            px="10px"
            py="10px"
            fontSize="13px"
            fontWeight="500"
            color="fg.muted"
            _selected={{
              color: "#C95C18",
              borderBottomWidth: "2px",
              borderColor: "#F47721",
            }}
          >
            Salary Breakdown
          </Tabs.Trigger>
          <Tabs.Trigger
            value="payment"
            px="10px"
            py="10px"
            fontSize="13px"
            fontWeight="500"
            color="fg.muted"
            _selected={{
              color: "#C95C18",
              borderBottomWidth: "2px",
              borderColor: "#F47721",
            }}
          >
            Payment Details
          </Tabs.Trigger>
          <Tabs.Trigger
            value="calculation"
            px="10px"
            py="10px"
            fontSize="13px"
            fontWeight="500"
            color="fg.muted"
            _selected={{
              color: "#C95C18",
              borderBottomWidth: "2px",
              borderColor: "#F47721",
            }}
          >
            Salary Calculation
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="breakdown" pt={0}>
          <Grid
            templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
            columnGap="24px"
            rowGap="24px"
          >
            <DetailCell label="Actual Pay" value={fmtCurrency(row.actual_pay)} />
            <DetailCell
              label="No. of Working Days"
              value={
                row.no_of_working_days != null
                  ? String(parseFloat(row.no_of_working_days))
                  : "-"
              }
            />
            <DetailCell label="Days in Month" value={String(daysPerMonth)} />

            <DetailCell label="Incentive" value={fmtCurrency(row.incentive)} />
            <DetailCell
              label="Overtime Amount"
              value={fmtCurrency(row.overtime_amt)}
            />
            <DetailCell
              label="Lateness Amount"
              value={fmtCurrency(row.lateness_amt)}
            />

            <DetailCell label="Advance" value={fmtCurrency(row.advance)} />
            <DetailCell label="Penalty" value={fmtCurrency(row.penalty)} />
            <DetailCell
              label="Employee ESI"
              value={fmtOrDash(row.employee_esi)}
            />

            <DetailCell
              label="Employee EPF"
              value={fmtOrDash(row.employee_epf)}
            />
            <DetailCell
              label="Employer ESI"
              value={fmtOrDash(row.employer_esi)}
            />
            <DetailCell
              label="Employer EPF"
              value={fmtOrDash(row.employer_epf)}
            />

            <DetailCell label="LOP Days" value={String(lopDays)} />
            <DetailCell
              label="Per Day Salary"
              value={fmtCurrency(perDaySalary)}
            />
            <DetailCell label="Gross Pay" value={fmtCurrency(grossPay)} />

            <DetailCell label="LOP Amount" value={fmtCurrency(lopAmount)} />
            <DetailCell label="Net Pay" value={fmtCurrency(netPay)} />
          </Grid>
        </Tabs.Content>

        <Tabs.Content value="payment" pt={0}>
          {row.payment_details ? (
            <Grid
              templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
              columnGap="24px"
              rowGap="24px"
            >
              <DetailCell
                label="Account Number"
                value={
                  row.payment_details.account_no != null
                    ? String(row.payment_details.account_no)
                    : "-"
                }
              />
              <DetailCell
                label="IFSC Code"
                value={row.payment_details.ifsc_code ?? "-"}
              />
              <DetailCell label="PF UAN" value={row.employee?.pf_uan ?? "-"} />

              <DetailCell
                label="Beneficiary"
                value={row.payment_details.beneficiary ?? "-"}
              />
              <DetailCell
                label="Payment Date"
                value={
                  row.payment_details.payment_date
                    ? moment(row.payment_details.payment_date).format(
                        "DD/MM/YYYY"
                      )
                    : "-"
                }
              />
              <DetailCell
                label="Status"
                value={row.payment_details.status ?? "-"}
              />

              <DetailCell
                label="UTR"
                value={
                  row.payment_details.utr != null
                    ? String(row.payment_details.utr)
                    : "-"
                }
              />
            </Grid>
          ) : (
            <Text fontSize="13px" color="fg.muted">
              No payment details available for this payslip.
            </Text>
          )}
        </Tabs.Content>

        <Tabs.Content value="calculation" pt={0}>
          <VStack
            align="stretch"
            gap="14px"
            fontSize="13.5px"
            color="#30384B"
            lineHeight="1.7"
          >
            <Box
              p="14px 16px"
              borderRadius="8px"
              bg="#FFFBF8"
              borderWidth="1px"
              borderColor="#F1E3D9"
            >
              <Text>
                <Text as="span" fontWeight="600" color="#C95C18">
                  Step 1 — Days:
                </Text>{" "}
                In {monthLabel} there were{" "}
                <Text as="span" fontWeight="600">
                  {daysPerMonth} days
                </Text>
                . You worked{" "}
                <Text as="span" fontWeight="600">
                  {noOfWorkingDays} days
                </Text>
                , so the number of days not worked (leave or absent) is{" "}
                <Text as="span" fontWeight="600">
                  {daysPerMonth} − {noOfWorkingDays} = {lopDays} days
                </Text>
                .
              </Text>
            </Box>

            <Box
              p="14px 16px"
              borderRadius="8px"
              bg="#FFFBF8"
              borderWidth="1px"
              borderColor="#F1E3D9"
            >
              <Text>
                <Text as="span" fontWeight="600" color="#C95C18">
                  Step 2 — Salary per day:
                </Text>{" "}
                Your monthly salary ({fmtCurrency(actualPay)}) ÷ {daysPerMonth}{" "}
                days ={" "}
                <Text as="span" fontWeight="600">
                  {fmtCurrency(perDaySalary)} per day
                </Text>
                .
              </Text>
            </Box>

            <Box
              p="14px 16px"
              borderRadius="8px"
              bg="#FFFBF8"
              borderWidth="1px"
              borderColor="#F1E3D9"
            >
              <Text>
                <Text as="span" fontWeight="600" color="#C95C18">
                  Step 3 — Gross pay (before deductions):
                </Text>{" "}
                Monthly salary + incentive ({fmtCurrency(incentive)}) + overtime
                ({fmtCurrency(overtimeAmt)}) ={" "}
                <Text as="span" fontWeight="600">
                  {fmtCurrency(grossPay)}
                </Text>
                .
              </Text>
            </Box>

            <Box
              p="14px 16px"
              borderRadius="8px"
              bg="#FFFBF8"
              borderWidth="1px"
              borderColor="#F1E3D9"
            >
              <Text>
                <Text as="span" fontWeight="600" color="#C95C18">
                  Step 4 — Loss of Pay (LOP) deduction:
                </Text>{" "}
                For {lopDays} days not worked: {fmtCurrency(perDaySalary)} ×{" "}
                {lopDays} ={" "}
                <Text as="span" fontWeight="600">
                  {fmtCurrency(lopAmount)}
                </Text>
                .
              </Text>
            </Box>

            <Box
              p="14px 16px"
              borderRadius="8px"
              bg="#FFFBF8"
              borderWidth="1px"
              borderColor="#F1E3D9"
            >
              <Text>
                <Text as="span" fontWeight="600" color="#C95C18">
                  Step 5 — Other deductions:
                </Text>{" "}
                Lateness ({fmtCurrency(latenessAmt)}) + Advance (
                {fmtCurrency(advance)}) + Penalty ({fmtCurrency(penalty)}) + ESI
                ({fmtCurrency(employeeEsi)}) + EPF ({fmtCurrency(employeeEpf)}).
              </Text>
            </Box>

            <Box
              p="14px 16px"
              borderRadius="8px"
              bg="#E8F6EF"
              borderWidth="1px"
              borderColor="#C6E7D5"
            >
              <Text>
                <Text as="span" fontWeight="600" color="#147D52">
                  Step 6 — Your take-home (net pay):
                </Text>{" "}
                Gross {fmtCurrency(grossPay)} − LOP {fmtCurrency(lopAmount)} −
                all other deductions ={" "}
                <Text as="span" fontWeight="700" color="#147D52">
                  {fmtCurrency(netPay)}
                </Text>
                .
              </Text>
            </Box>
          </VStack>
        </Tabs.Content>
      </Tabs.Root>
    </CustomContainer>
  );
}
