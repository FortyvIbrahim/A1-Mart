import { Badge, Flex, Text } from "@chakra-ui/react";
import React from "react";

/**
 * Renders a purchase acknowledgment option in a dropdown
 * @param {Object} item - The purchase acknowledgment option item
 * @param {string} item.invoice_no - Invoice number
 * @param {string} item.supplier_name - Supplier name
 * @param {string} item.invoice_date - Invoice date
 * @param {number} item.amount - Invoice amount
 */

export function PurchaseAcknowledgmentOptionRenderer(item) {
  // Handle undefined or null item
  if (!item) {
    return (
      <Flex direction="column" align="flex-start" w="100%">
        <Text fontSize="sm" fontWeight="medium">
          N/A
        </Text>
      </Flex>
    );
  }

  const formattedDate = item.invoice_date
    ? new Date(item.invoice_date).toLocaleDateString("en-GB")
    : "N/A";
  const formattedAmount = item.amount
    ? new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(item.amount)
    : "N/A";

  return (
    <Flex direction="column" align="flex-start" w="100%">
      <Text fontSize="sm" fontWeight="medium">
        {item.invoice_no || "N/A"}
      </Text>
      <Flex w="100%" mt={1} gap="4px" flexWrap="wrap">
        <Badge colorPalette="primary">
          Supplier: {item.supplier_name || "N/A"}
        </Badge>
        <Badge colorPalette="secondary">Date: {formattedDate}</Badge>
        <Badge colorPalette="secondary">Amount: {formattedAmount}</Badge>
      </Flex>
    </Flex>
  );
}

export function PurchaseAckRepackEntryRenderer(item) {
  // Handle undefined or null item
  if (!item) {
    return (
      <Flex direction="column" align="flex-start" w="100%">
        <Text fontSize="sm" fontWeight="medium">
          N/A
        </Text>
      </Flex>
    );
  }

  const formattedDate = item.invoice_date
    ? new Date(item.invoice_date).toLocaleDateString("en-GB")
    : "N/A";
  const formattedAmount = item.amount
    ? new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(item.amount)
    : "N/A";

  return (
    <Flex direction="column" align="flex-start" w="100%">
      <Text fontSize="sm" fontWeight="medium">
        {item.invoice_no || "N/A"}
      </Text>
      <Flex w="100%" mt={1} gap="4px" flexWrap="wrap">
        <Badge colorPalette="primary">
          Supplier: {item.supplier_name || "N/A"}
        </Badge>
        <Badge colorPalette="secondary">Date: {formattedDate}</Badge>
        <Badge colorPalette="secondary">Amount: {formattedAmount}</Badge>
      </Flex>

      <Flex w="100%" gap="4px" flexWrap="wrap" alignItems="center" borderTop="1px solid" borderColor="gray.100" mt="12px" pt="12px">
        <Text fontSize="xs" color="gray.500">Job Worksheet Stats:</Text>
        <Badge colorPalette="pink">Open: {item.job_worksheet_stats.open}</Badge>
        <Badge colorPalette="secondary">In Progress: {item.job_worksheet_stats.in_progress}</Badge>
        <Badge colorPalette="green">Done: {item.job_worksheet_stats.done}</Badge>
        <Badge colorPalette="purple">Total: {item.job_worksheet_stats.total}</Badge>
      </Flex>
    </Flex>
  );
}

export function PurchaseAckGRNOptionRenderer(item) {
  // Handle undefined or null item
  if (!item) {
    return (
      <Flex direction="column" align="flex-start" w="100%">
        <Text fontSize="sm" fontWeight="medium">
          N/A
        </Text>
      </Flex>
    );
  }

  const formattedDate = item.invoice_date
    ? new Date(item.invoice_date).toLocaleDateString("en-GB")
    : "N/A";
  const formattedAmount = item.amount
    ? new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(item.amount)
    : "N/A";

  return (
    <Flex direction="column" align="flex-start" w="100%">
      <Text fontSize="sm" fontWeight="medium">
        {`GRN-${item.grn_id}` || "N/A"}
      </Text>
      <Flex w="100%" mt={1} gap="4px" flexWrap="wrap">
        <Badge colorPalette="primary">
          Supplier: {item.supplier_name || "N/A"}
        </Badge>
        <Badge colorPalette="secondary">Date: {formattedDate}</Badge>
        <Badge colorPalette="secondary">Amount: {formattedAmount}</Badge>
      </Flex>
    </Flex>
  );
}

/**
 * Creates purchase acknowledgment options for dropdown from purchase acknowledgments array
 * @param {Array} purchaseAcknowledgments - Array of purchase acknowledgment objects
 * @returns {Array} Array of option objects with value, label, and metadata
 */
export function createPurchaseAcknowledgmentOptions(purchaseAcknowledgments, type) {
  if (!purchaseAcknowledgments || purchaseAcknowledgments.length === 0) {
    return [];
  }

  const getLabel = (pa) => {
    if (type === "purchase_entry") {
      return `GRN-${pa.grn_id}` || "N/A";
    }

    const formattedDate = pa.invoice_date
      ? new Date(pa.invoice_date).toLocaleDateString("en-GB")
      : "N/A";

    return `${pa.invoice_no || "N/A"} - ${pa.supplier?.name || "N/A"} (${formattedDate})`;
  }

  return purchaseAcknowledgments
    .filter((pa) => pa && pa.purchase_acknowledgment_id) // Filter out invalid items
    .map((pa) => {
      return {
        value: pa.purchase_acknowledgment_id,
        label: getLabel(pa),
        invoice_no: pa.invoice_no || null,
        supplier_name: pa.supplier?.name || "N/A",
        invoice_date: pa.invoice_date || null,
        amount: pa.amount || null,
        grn_id: pa.grn_id || null,
        job_worksheet_stats: {
          open: pa.status_counts.open || 0,
          in_progress: pa.status_counts.in_progress || 0,
          cancelled: pa.status_counts.cancelled || 0,
          done: pa.status_counts.done || 0,
          total: pa.status_counts.open + pa.status_counts.in_progress + pa.status_counts.cancelled + pa.status_counts.done || 0,
        }
      };
    });
}
