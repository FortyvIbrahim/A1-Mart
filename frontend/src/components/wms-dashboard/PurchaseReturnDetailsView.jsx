"use client";

import React from "react";
import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import { FigmaBadge } from "@/components/AgGrid/columnTypes";
import { formatCurrency } from "@/utils/string";

function SummaryField({ label, value }) {
  return (
    <Flex direction="column" gap="4px">
      <Text fontSize="11.5px" lineHeight="15px" color="#C95C18" fontWeight="400">
        {label}
      </Text>
      <Text fontSize="14px" lineHeight="20px" color="#202938" fontWeight="600">
        {value || "-"}
      </Text>
    </Flex>
  );
}

export default function PurchaseReturnDetailsView({
  supplierRow,
  itemColDefs,
  onBack,
}) {
  const items = supplierRow?.items || [];

  return (
    <CustomContainer
      headerBand
      onBack={onBack}
      title={`Purchase Return – ${supplierRow?.supplier_name ?? ""}`}
      subtitle={
        supplierRow?.buyer_name ? `Buyer: ${supplierRow.buyer_name}` : undefined
      }
      rightSection={<FigmaBadge colorScheme="red">Not Returned</FigmaBadge>}
    >
      <Box
        bg="#FFFBF8"
        borderWidth="1px"
        borderColor="#F1E3D9"
        borderRadius="10px"
        p={{ base: "16px", md: "20px" }}
      >
        <Grid
          templateColumns={{
            base: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, minmax(0, 1fr))",
          }}
          gap="20px"
        >
          <SummaryField label="Buyer" value={supplierRow?.buyer_name} />
          <SummaryField label="Supplier" value={supplierRow?.supplier_name} />
          <SummaryField
            label="Total Bills"
            value={String(supplierRow?.total_bills ?? items.length)}
          />
          <SummaryField
            label="Total Value"
            value={formatCurrency(supplierRow?.total_value ?? 0)}
          />
        </Grid>
      </Box>

      <CustomContainer title="Pending Items" size="sm" fullWidth>
        {items.length === 0 ? (
          <Flex minH="180px" align="center" justify="center">
            <Text color="fg.muted" fontSize="13px">
              No pending items.
            </Text>
          </Flex>
        ) : (
          <AgGrid
            rowData={items}
            columnDefs={itemColDefs}
            tableKey="purchase-return-supplier-items"
            defaultRows={10}
          />
        )}
      </CustomContainer>
    </CustomContainer>
  );
}
