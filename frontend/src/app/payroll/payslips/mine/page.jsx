"use client";

import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import usePayslips from "@/api/customHooks/usePayslips";
import moment from "moment";
import { Box, Button, Flex, Grid, IconButton, Text } from "@chakra-ui/react";
import CustomSelect from "@/components/CustomSelect";
import React, { useMemo, useState } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { PayslipDetailsView } from "@/components/payroll";
import { LuDownload } from "react-icons/lu";

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
      {selectedPayslip ? (
        <PayslipDetailsView
          selectedRow={selectedPayslip}
          onBack={() => setSelectedPayslip(null)}
        />
      ) : (
        <CustomContainer headerBand title="My Payslips">
          <Flex flexDirection="column" gap="22px">
            <Box>
              <Text fontSize="12px" fontWeight="500" color="#30384B" mb="7px">
                Year
              </Text>
              <CustomSelect
                w={{ base: "100%", sm: "240px" }}
                h="44px"
                allowEmpty={false}
                value={String(selectedYear)}
                onChange={(v) => setSelectedYear(Number(v))}
                options={years.map((y) => ({
                  value: String(y),
                  label: String(y),
                }))}
              />
            </Box>

            <Grid
              templateColumns={{
                base: "repeat(1, 1fr)",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(6, 1fr)",
              }}
              gap="16px"
              width="100%"
            >
              {MONTH_DISPLAY_ORDER.map((monthIndex) => {
                const record = getRecordForMonth(selectedYear, monthIndex);
                const monthName = MONTH_NAMES[monthIndex];
                const hasPayslip = record?.is_payslip_available;

                const card = (
                  <Flex
                    key={`${selectedYear}-${monthIndex}`}
                    direction="column"
                    justifyContent="space-between"
                    minH="96px"
                    borderWidth="1px"
                    borderColor={hasPayslip || record ? "#F1E3D9" : "#F3F4F6"}
                    borderRadius="10px"
                    p="14px 16px"
                    bg="white"
                    transition="all 0.2s ease"
                    _hover={
                      record
                        ? {
                            borderColor: "#F69350",
                            boxShadow: "0 2px 8px rgba(244, 119, 33, 0.08)",
                          }
                        : undefined
                    }
                  >
                    <Text
                      fontSize="14px"
                      fontWeight="600"
                      color={record ? "#202938" : "#9CA3AF"}
                    >
                      {monthName}
                    </Text>

                    <Flex
                      alignItems="center"
                      justifyContent="space-between"
                      mt="14px"
                    >
                      <Button
                        type="button"
                        variant="plain"
                        size="xs"
                        h="auto"
                        p="0"
                        minW="0"
                        fontSize="12.5px"
                        fontWeight="600"
                        color={record ? "#C95C18" : "#CBD5E1"}
                        disabled={!record}
                        cursor={record ? "pointer" : "not-allowed"}
                        _hover={record ? { color: "#F47721" } : undefined}
                        onClick={() => {
                          if (record) setSelectedPayslip(record);
                        }}
                      >
                        View
                      </Button>

                      <IconButton
                        type="button"
                        aria-label={`Download ${monthName} payslip`}
                        size="xs"
                        w="32px"
                        h="32px"
                        minW="32px"
                        borderRadius="8px"
                        variant="outline"
                        borderColor={hasPayslip ? "#F69350" : "#E5E7EB"}
                        color={hasPayslip ? "#C95C18" : "#CBD5E1"}
                        bg={hasPayslip ? "#FFFBF8" : "#F9FAFB"}
                        _hover={
                          hasPayslip
                            ? { bg: "#FFF5ED", borderColor: "#F47721" }
                            : undefined
                        }
                        disabled={!hasPayslip}
                        cursor={hasPayslip ? "pointer" : "not-allowed"}
                        onClick={() => handlePayslipClick(record)}
                      >
                        <LuDownload size={15} />
                      </IconButton>
                    </Flex>
                  </Flex>
                );

                if (hasPayslip) {
                  return card;
                }

                return (
                  <Tooltip
                    key={`${selectedYear}-${monthIndex}`}
                    content={
                      record
                        ? "Payslip PDF not generated yet"
                        : "Payslip not available"
                    }
                  >
                    <Box>{card}</Box>
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
        </CustomContainer>
      )}
    </GlobalWrapper>
  );
}

export default MyPayslipsPage;
