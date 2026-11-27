import React, { useState } from "react";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import AgGrid from "@/components/AgGrid";
import { DashboardCard } from "@/components/dashboard/DashboardUI";
import BuyerChip from "./BuyerChip";

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/*
 * Figma "WMS Dashboard / Purchase Return by Buyers": one card per buyer
 * ("Buyer: NAME", name in #C95C18) listing each pending supplier as a bordered
 * row — name 12/600, "N bill(s) · ₹value · Not Returned" 10/400 muted.
 * Clicking a row reveals its items.
 */
function SupplierRow({ sup, colDefs, tableKey }) {
  const [open, setOpen] = useState(false);
  const bills = new Set(
    sup.items.map((i) => i.pr_no).filter((v) => v != null && v !== "—")
  ).size;
  const value = sup.items.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);

  return (
    <Box borderWidth="1px" borderColor="border" borderRadius="8px" bg="white">
      <Flex
        as="button"
        type="button"
        w="100%"
        direction="column"
        align="flex-start"
        gap="6px"
        px="16px"
        py="14px"
        textAlign="left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Text fontSize="12px" fontWeight="600" lineHeight="15px" color="fg">
          {sup.supplierName || "—"}
        </Text>
        <Text fontSize="10px" lineHeight="12px" color="fg.muted">
          {bills} bill(s) · {inr(value)} · Not Returned
        </Text>
      </Flex>
      {open && sup.items.length > 0 && (
        <Box px="16px" pb="14px">
          <AgGrid
            bare
            rowData={sup.items}
            columnDefs={colDefs}
            tableKey={tableKey}
            defaultRows={10}
            pagination={sup.items.length > 10}
          />
        </Box>
      )}
    </Box>
  );
}

function PurchaseReturnByBuyersTabContent({
  purchaseReturnBuyerFilter,
  setPurchaseReturnBuyerFilter,
  filteredPurchaseReturnByBuyer,
  purchaseReturnSupplierItemsColDefs,
}) {
  if (filteredPurchaseReturnByBuyer.length === 0) {
    return (
      <DashboardCard title="Purchase Return by Buyers">
        <Flex minH="140px" align="center" justify="center">
          <Text fontSize="12px" color="fg.muted">
            No purchase return data.
          </Text>
        </Flex>
      </DashboardCard>
    );
  }

  return (
    <Stack gap="16px">
      {filteredPurchaseReturnByBuyer.map((buyerData) => (
        <DashboardCard
          key={buyerData.buyerName}
          title={
            <>
              Buyer:{" "}
              <Text as="span" color="#C95C18">
                {buyerData.buyerName}
              </Text>
            </>
          }
          rightSection={
            purchaseReturnBuyerFilter ? (
              <BuyerChip
                buyer={purchaseReturnBuyerFilter}
                onClear={() => setPurchaseReturnBuyerFilter("")}
              />
            ) : null
          }
        >
          {buyerData.suppliers.length === 0 ? (
            <Text fontSize="12px" color="fg.muted">
              No pending suppliers.
            </Text>
          ) : (
            <Stack gap="10px">
              {buyerData.suppliers.map((sup, si) => (
                <SupplierRow
                  key={`${sup.supplier_id}-${si}`}
                  sup={sup}
                  colDefs={purchaseReturnSupplierItemsColDefs}
                  tableKey={`purchase-return-buyer-${buyerData.buyerName}-sup-${si}`}
                />
              ))}
            </Stack>
          )}
        </DashboardCard>
      ))}
    </Stack>
  );
}

export default PurchaseReturnByBuyersTabContent;
