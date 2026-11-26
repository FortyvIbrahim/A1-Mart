"use client";

import React from "react";
import { Box, Flex, Text, VStack } from "@chakra-ui/react";
import moment from "moment";
import { formatCurrency } from "@/utils/string";

const DATA_SECTION_HEIGHT = "108px";

const Row = ({ label, amount, color, bgTint, isDisabled, showBorder }) => (
  <Flex
    justify="space-between"
    align="center"
    py={2}
    pl={3}
    pr={3}
    borderTopWidth={showBorder ? "1px" : 0}
    borderColor="gray.100"
    bg={isDisabled ? "transparent" : bgTint}
    _hover={isDisabled ? {} : { bg: "blackAlpha.04" }}
    transition="background 0.1s"
  >
    <Flex align="center" gap={2}>
      <Box
        w="2"
        h="2"
        borderRadius="full"
        bg={isDisabled ? "gray.300" : color}
        flexShrink={0}
      />
      <Text
        fontSize="xs"
        fontWeight="medium"
        color={isDisabled ? "gray.400" : "gray.700"}
      >
        {label}
      </Text>
    </Flex>
    <Text
      fontSize="sm"
      fontWeight="bold"
      color={isDisabled ? "gray.400" : color}
      letterSpacing="tight"
    >
      {amount != null && amount > 0 ? formatCurrency(amount) : "-"}
    </Text>
  </Flex>
);

function MonthCard({ month, stats, isActive, isDisabled, onClick }) {
  const isCompleted =
    stats &&
    stats.employeeCount > 0 &&
    stats.paidEmployeesCount === stats.employeeCount;
  const statusLabel = stats
    ? isCompleted
      ? "Completed"
      : "Pending"
    : "Upcoming";
  const statusColor = stats
    ? isCompleted
      ? "green.500"
      : "orange.500"
    : "gray.400";

  const totalPaid = stats?.totalPaidNet ?? 0;
  const totalOnHold = stats?.totalOnHoldNet ?? 0;
  const totalUnpaid = stats?.totalUnpaidNet ?? 0;

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      p={0}
      minW="200px"
      cursor={isDisabled ? "not-allowed" : "pointer"}
      bg={isActive ? "brand50" : isDisabled ? "gray.50" : "white"}
      borderColor={isActive ? "brand500" : isDisabled ? "gray.300" : "gray.200"}
      opacity={isDisabled ? 0.6 : 1}
      onClick={isDisabled ? undefined : onClick}
      _hover={isDisabled ? {} : { borderColor: "brand400", shadow: "sm" }}
      transition="border-color 0.15s, box-shadow 0.15s"
    >
      <Box px={3} pt={3} pb={2}>
        <Text
          fontSize="sm"
          fontWeight="semibold"
          color={isDisabled ? "gray.400" : "gray.800"}
        >
          {moment(month).format("MMMM YYYY")}
        </Text>
      </Box>
      {stats ? (
        <Box h={DATA_SECTION_HEIGHT}>
          <VStack align="stretch" gap={0} h="100%">
            <Row
              label="Paid"
              amount={totalPaid}
              color="green.600"
              bgTint="green.50"
              isDisabled={isDisabled}
              showBorder={false}
            />
            <Row
              label="On Hold"
              amount={totalOnHold}
              color="blue.600"
              bgTint="blue.50"
              isDisabled={isDisabled}
              showBorder
            />
            <Row
              label="Unpaid"
              amount={totalUnpaid}
              color="red.600"
              bgTint="red.50"
              isDisabled={isDisabled}
              showBorder
            />
          </VStack>
        </Box>
      ) : (
        <Flex
          direction="column"
          align="center"
          justify="center"
          gap={2}
          h={DATA_SECTION_HEIGHT}
          px={3}
        >
          <Text as="span" fontSize="2xl" color="gray.300" aria-hidden>
            <i className="fa fa-calendar" />
          </Text>
          <Text fontSize="xs" color="gray.400">
            No data
          </Text>
        </Flex>
      )}
      <Flex justify="center" py={2} mt={1}>
        <Text fontSize="xs" fontWeight="semibold" color={statusColor}>
          {statusLabel}
        </Text>
      </Flex>
    </Box>
  );
}

export default MonthCard;
