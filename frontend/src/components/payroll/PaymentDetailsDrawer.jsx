"use client";

import React from "react";
import CustomDrawer from "@/components/CustomDrawer";
import { Button, Flex, Text, VStack } from "@chakra-ui/react";
import moment from "moment";

/**
 * Drawer that displays payment details for a payroll row (account_no, ifsc_code, beneficiary, etc.).
 * Used in payroll entry view mode when status is done.
 *
 * @param {boolean} isOpen - Whether the drawer is open
 * @param {Function} onClose - Called when the drawer should close
 * @param {Object|null} selectedRow - Row data with payment_details, employee_name / employee.employee_name / employee_code
 */
function PaymentDetailsDrawer({ isOpen, onClose, selectedRow }) {
  const employeeLabel =
    selectedRow?.employee_name ??
    selectedRow?.employee?.employee_name ??
    selectedRow?.employee_code ??
    "Employee";

  const title = selectedRow
    ? `Payment Details - ${employeeLabel}`
    : "Payment Details";

  const paymentDetails = selectedRow?.payment_details;

  const method = paymentDetails?.mode?.toLowerCase?.();
  const isCash = method === "cash";

  const content = paymentDetails ? (
    <VStack align="stretch" gap="3" fontSize="sm">
      {isCash && (
        <Flex justify="space-between" gap="4">
          <Text color="gray.600">Payment method</Text>
          <Text fontWeight="medium">Paid by cash</Text>
        </Flex>
      )}

      {!isCash && (
        <>
          <Flex justify="space-between" gap="4">
            <Text color="gray.600">Account Number</Text>
            <Text fontWeight="medium">{paymentDetails.account_no ?? "-"}</Text>
          </Flex>
          <Flex justify="space-between" gap="4">
            <Text color="gray.600">IFSC Code</Text>
            <Text fontWeight="medium">{paymentDetails.ifsc_code ?? "-"}</Text>
          </Flex>
          <Flex justify="space-between" gap="4">
            <Text color="gray.600">Beneficiary</Text>
            <Text fontWeight="medium">{paymentDetails.beneficiary ?? "-"}</Text>
          </Flex>
          <Flex justify="space-between" gap="4">
            <Text color="gray.600">Payment Date</Text>
            <Text fontWeight="medium">
              {paymentDetails.payment_date
                ? moment(paymentDetails.payment_date).format("DD MMM YYYY")
                : "-"}
            </Text>
          </Flex>
          <Flex justify="space-between" gap="4">
            <Text color="gray.600">Status</Text>
            <Text fontWeight="medium">{paymentDetails.status ?? "-"}</Text>
          </Flex>
          <Flex justify="space-between" gap="4">
            <Text color="gray.600">UTR</Text>
            <Text fontWeight="medium">{paymentDetails.utr ?? "-"}</Text>
          </Flex>
        </>
      )}
    </VStack>
  ) : (
    <Text color="gray.600">No payment details available.</Text>
  );

  return (
    <CustomDrawer
      title={title}
      isOpen={isOpen}
      setIsOpen={(open) => {
        if (!open) onClose();
      }}
      size="sm"
      content={content}
      footer={
        <Button size="sm" variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    />
  );
}

export default PaymentDetailsDrawer;
