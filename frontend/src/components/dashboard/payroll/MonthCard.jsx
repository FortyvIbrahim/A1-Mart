"use client";

import React from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { LuClock } from "react-icons/lu";
import moment from "moment";
import { formatCurrency } from "@/utils/string";

/*
 * Figma "Card / April 2026": 211×188, radius 14, padding 20, 16px gap.
 * Rows: label 10/400 + amount 12/600 (Paid green, On Hold blue, Unpaid red),
 * 14px apart. Status pill radius 5 (Pending/Completed) or 8 (Upcoming).
 * Selected month: #FFF5ED fill with a #F47721 border.
 */
const ROWS = [
  { key: "totalPaidNet", label: "Paid", labelColor: "#147D52", color: "#11976A" },
  { key: "totalOnHoldNet", label: "On Hold", labelColor: "#946200", color: "#526FA8" },
  { key: "totalUnpaidNet", label: "Unpaid", labelColor: "#E7474D", color: "#E7474D" },
];

const STATUS = {
  Completed: { bg: "#E8F6EF", color: "#147D52", r: "5px" },
  Pending: { bg: "#FFF4DB", color: "#946200", r: "5px" },
  Upcoming: { bg: "#FFF5ED", color: "#C95C18", r: "8px" },
};

function MonthCard({ month, stats, isActive, isDisabled, onClick }) {
  const isCompleted =
    stats && stats.employeeCount > 0 && stats.paidEmployeesCount === stats.employeeCount;
  const statusLabel = stats ? (isCompleted ? "Completed" : "Pending") : "Upcoming";
  const status = STATUS[statusLabel];

  return (
    <Flex
      direction="column"
      gap="16px"
      w="211px"
      minH="188px"
      p="20px"
      borderWidth="1px"
      borderRadius="14px"
      bg={isActive ? "#FFF5ED" : "white"}
      borderColor={isActive ? "#F47721" : "border"}
      cursor={isDisabled ? "default" : "pointer"}
      onClick={isDisabled ? undefined : onClick}
      _hover={isDisabled || isActive ? undefined : { borderColor: "brand.300" }}
      transition="border-color 0.15s"
    >
      <Text fontSize="16px" fontWeight="600" lineHeight="19px" color="fg">
        {moment(month).format("MMMM YYYY")}
      </Text>

      {stats ? (
        <Flex direction="column" gap="14px">
          {ROWS.map((r) => {
            const amount = stats?.[r.key] ?? 0;
            return (
              <Flex key={r.key} justify="space-between" align="center" gap="16px">
                <Text fontSize="10px" lineHeight="12px" color={r.labelColor}>
                  {r.label}
                </Text>
                <Text fontSize="12px" fontWeight="600" lineHeight="15px" color={r.color}>
                  {amount > 0 ? formatCurrency(amount) : "—"}
                </Text>
              </Flex>
            );
          })}
        </Flex>
      ) : (
        <Flex align="center" gap="12px" minH="73px">
          <Box color="#C95C18" display="flex">
            <LuClock size={18} />
          </Box>
          <Text fontSize="12px" color="fg.muted">
            No data
          </Text>
        </Flex>
      )}

      <Box>
        <Text
          as="span"
          display="inline-block"
          px="8px"
          py="5px"
          borderRadius={status.r}
          bg={status.bg}
          color={status.color}
          fontSize="10px"
          fontWeight="500"
          lineHeight="12px"
        >
          {statusLabel}
        </Text>
      </Box>
    </Flex>
  );
}

export default MonthCard;
