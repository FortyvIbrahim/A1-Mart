"use client";

import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import usePayslips from "@/api/customHooks/usePayslips";
import moment from "moment";
import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import { NativeSelect } from "@chakra-ui/react";
import React, { useMemo, useState } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { PayslipDetailsDrawer } from "@/components/payroll";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Display order: Dec → Jan (reverse chronological, like the screenshot)
// const MONTH_DISPLAY_ORDER = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const MONTH_DISPLAY_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function MyPayslipsPage() {
  const { payrolls, loading, handleGeneratePayslip } = usePayslips({
    type: "my_payslips",
  });

  const currentYear = moment().year();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  const years = useMemo(() => {
    const start = currentYear - 2;
    const end = currentYear + 1;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentYear]);

  const payslipsByYearMonth = useMemo(() => {
    const map = {};
    (payrolls || []).forEach((record) => {
      const month = record?.payroll?.payroll_month;
      if (!month) return;
      const m = moment(month);
      const year = m.year();
      const monthIndex = m.month();
      const key = `${year}-${monthIndex}`;
      if (!map[key]) {
        map[key] = record;
      }
    });
    return map;
  }, [payrolls]);

  const getRecordForMonth = (year, monthIndex) =>
    payslipsByYearMonth[`${year}-${monthIndex}`] ?? null;

  const handlePayslipClick = (record) => {
    if (!record) return;
    if (record.payslip_url) {
      window.open(record.payslip_url, "_blank");
    } else {
      handleGeneratePayslip(record.payroll_employee_id);
    }
  };

  return (
    <GlobalWrapper permissionKey="view_my_payslips">
      <CustomContainer headerBand title="Payslip">
        <Flex flexDirection="column" gap="22px">
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb="8px">
              Year
            </Text>
            <NativeSelect.Root width="120px">
              <NativeSelect.Field
                value={String(selectedYear)}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>

          <Grid
            templateColumns={{
              base: "repeat(2, 1fr)",
              sm: "repeat(3, 1fr)",
              md: "repeat(4, 1fr)",
              lg: "repeat(6, 1fr)",
            }}
            gap="16px"
            width="100%"
          >
            {MONTH_DISPLAY_ORDER.map((monthIndex) => {
              const record = getRecordForMonth(selectedYear, monthIndex);
              const monthName = MONTH_NAMES[monthIndex];
              const hasPayslip = record?.is_payslip_available;

              const content = (
                <Box
                  key={`${selectedYear}-${monthIndex}`}
                  minH="100px"
                  borderWidth="1px"
                  borderLeftWidth={hasPayslip ? "4px" : "1px"}
                  borderLeftColor={hasPayslip ? "brand.500" : undefined}
                  borderColor={hasPayslip ? "gray.200" : "gray.100"}
                  borderRadius="xl"
                  p="20px"
                  bg={hasPayslip ? "white" : "gray.50"}
                  _dark={{
                    bg: hasPayslip ? "gray.800" : "gray.900",
                    borderColor: hasPayslip ? "gray.600" : "gray.700",
                    borderLeftColor: hasPayslip ? "brand.400" : undefined,
                  }}
                  boxShadow={hasPayslip ? "sm" : "none"}
                  transition="all 0.2s ease"
                  _hover={{
                    shadow: hasPayslip ? "md" : "sm",
                    borderColor: hasPayslip ? "brand.400" : "gray.200",
                    _dark: {
                      borderColor: hasPayslip ? "brand.500" : "gray.600",
                    },
                  }}
                >
                  <Text
                    fontSize="md"
                    fontWeight="600"
                    color={hasPayslip ? "gray.800" : "gray.400"}
                    _dark={{
                      color: hasPayslip ? "gray.100" : "gray.500",
                    }}
                    mb="14px"
                  >
                    {monthName}
                  </Text>
                  <Flex gap="2" flexDirection="column">
                    <Button
                      size="xs"
                      colorPalette="gray"
                      variant="outline"
                      width="100%"
                      disabled={!record}
                      onClick={() => {
                        setSelectedPayslip(record);
                        setDetailsDrawerOpen(true);
                      }}
                      fontWeight="medium"
                    >
                      View details
                    </Button>
                    <Button
                      size="xs"
                      colorPalette="brand"
                      width="100%"
                      disabled={!hasPayslip}
                      cursor={!hasPayslip ? "not-allowed" : "pointer"}
                      onClick={() => handlePayslipClick(record)}
                      fontWeight="medium"
                    >
                      Download Payslip
                    </Button>
                  </Flex>
                </Box>
              );

              if (hasPayslip) {
                return content;
              }

              return (
                <Tooltip
                  key={`${selectedYear}-${monthIndex}`}
                  content="Payslip not available"
                >
                  <Box cursor="not-allowed">{content}</Box>
                </Tooltip>
              );
            })}
          </Grid>

          {loading && (
            <Text fontSize="sm" color="gray.500">
              Loading...
            </Text>
          )}
        </Flex>

        <PayslipDetailsDrawer
          isOpen={detailsDrawerOpen}
          onClose={() => {
            setDetailsDrawerOpen(false);
            setSelectedPayslip(null);
          }}
          selectedRow={selectedPayslip}
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default MyPayslipsPage;
