"use client";

import React, { useMemo, useState } from "react";
import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import CustomDialog from "@/components/CustomDialog";
import CustomSelect from "@/components/CustomSelect";
import AgGrid from "@/components/AgGrid";
import {
  AGE_BUCKETS,
  AGE_BUCKET_BADGE_LABELS,
  OUTSTANDING_CATEGORIES,
  buildModalSlotTotals,
  getAgeBucketBadge,
  getCategoryBadge,
  formatDateDisplay,
} from "@/utils/outstandingDashboard";
import { formatCurrency } from "@/utils/string";

const SLOT_CARD_COLORS = {
  "0_7": "blue",
  "8_14": "green",
  "15_21": "purple",
  "22_31": "orange",
  gt_31: "red",
};

export default function ViewInvoicesModal({ open, onClose, title, invoices = [] }) {
  const [slotFilter, setSlotFilter] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("");

  const categoryFilteredInvoices = useMemo(() => {
    const rows = invoices || [];
    if (!categoryFilter) return rows;
    return rows.filter((r) => r.category_key === categoryFilter);
  }, [invoices, categoryFilter]);

  const slotTotals = useMemo(
    () => buildModalSlotTotals(categoryFilteredInvoices),
    [categoryFilteredInvoices]
  );

  const filteredRows = useMemo(() => {
    if (!slotFilter) return categoryFilteredInvoices;
    return categoryFilteredInvoices.filter(
      (r) => r.age_bucket_key === slotFilter
    );
  }, [categoryFilteredInvoices, slotFilter]);

  const slotCards = useMemo(
    () =>
      AGE_BUCKETS.map((b) => ({
        key: b.key,
        title: AGE_BUCKET_BADGE_LABELS[b.key] ?? b.label,
        value: slotTotals[b.key] ?? 0,
        color: SLOT_CARD_COLORS[b.key] ?? "gray",
      })),
    [slotTotals]
  );

  const columnDefs = useMemo(
    () => [
      { field: "ref_no", headerName: "Ref No", flex: 1 },
      { field: "invoice_no", headerName: "Invoice No" },
      { field: "supplier_name", headerName: "Supplier", flex: 1 },
      { field: "buyer_name", headerName: "Buyer", flex: 1 },
      { field: "branch_name", headerName: "Branch", flex: 1 },
      {
        field: "category_key",
        headerName: "Category",
        type: "badge-column",
        minWidth: 180,
        width: 180,
        valueGetter: (p) => getCategoryBadge(p.data?.category_key),
      },
      {
        field: "invoice_date",
        headerName: "Invoice Date",
        valueGetter: (p) => formatDateDisplay(p.data?.invoice_date),
      },
      { field: "net_balance", headerName: "Net Balance", type: "number" },
      {
        field: "age_days",
        headerName: "No. of Days",
        type: "number",
        valueGetter: (p) => {
          const days = p.data?.age_days;
          if (days == null || Number.isNaN(Number(days))) return null;
          return Number(days);
        },
      },
      {
        field: "age_bucket_key",
        headerName: "Age",
        type: "badge-column",
        minWidth: 120,
        width: 120,
        valueGetter: (p) => getAgeBucketBadge(p.data?.age_bucket_key),
      },
    ],
    []
  );

  return (
    <CustomDialog
      open={open}
      onOpenChange={(e) => {
        if (!e.open) {
          setSlotFilter(null);
          setCategoryFilter("");
          onClose();
        }
      }}
      title={title || "Invoices"}
      maxW="95vw"
      maxH="90vh"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <Flex gap={4} align="center" mb={4}>
        <Box>
          <Text fontSize="sm" color="gray.600" mb={1}>
            Category
          </Text>
          <CustomSelect
            h="36px"
            value={categoryFilter}
            emptyLabel="All"
            onChange={(val) => {
              setCategoryFilter(val);
              setSlotFilter(null);
            }}
            options={OUTSTANDING_CATEGORIES.map((c) => ({
              value: c.key,
              label: c.label,
            }))}
          />
        </Box>
      </Flex>

      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(2, 1fr)",
          xl: "repeat(5, 1fr)",
        }}
        gap={4}
        mb={5}
      >
        {slotCards.map((card) => (
          <Box
            key={card.key}
            p={4}
            borderWidth="1px"
            borderRadius="12px"
            borderColor={
              slotFilter === card.key ? `${card.color}.500` : `${card.color}.200`
            }
            borderTopWidth="4px"
            bg={`${card.color}.50`}
            minH="100px"
            cursor="pointer"
            onClick={() =>
              setSlotFilter((prev) => (prev === card.key ? null : card.key))
            }
            boxShadow={slotFilter === card.key ? "md" : "none"}
          >
            <Text
              fontSize="sm"
              color={`${card.color}.700`}
              fontWeight="bold"
              mb={2}
            >
              {card.title}
            </Text>
            <Flex align="center" justify="space-between">
              <Text fontSize="xs" color="gray.600">
                Value
              </Text>
              <Text fontSize="md" fontWeight="semibold">
                {formatCurrency(card.value)}
              </Text>
            </Flex>
          </Box>
        ))}
      </Grid>

      <AgGrid
        tableKey="outstanding-dashboard-invoices-modal"
        rowData={filteredRows}
        columnDefs={columnDefs}
        pagination={true}
        paginationPageSize={10}
      />
    </CustomDialog>
  );
}
