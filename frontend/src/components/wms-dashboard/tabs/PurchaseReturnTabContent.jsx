import React from "react";
import { Flex, Text } from "@chakra-ui/react";
import AgGrid from "@/components/AgGrid";
import CustomInput from "@/components/CustomInput";

function PurchaseReturnTabContent({
  purchaseReturnBuyerFilter,
  purchaseReturnBuyerOptions,
  setPurchaseReturnBuyerFilter,
  filteredPurchaseReturnSupplierRows,
  purchaseReturnColDefs,
}) {
  return (
    <>
      <Flex mb={3} maxW={{ base: "100%", md: "320px" }}>
        <CustomInput
          method="searchable-dropdown"
          name="purchase_return_buyer_filter_old"
          label="Buyer"
          placeholder="All Buyers"
          value={purchaseReturnBuyerFilter}
          options={[
            { label: "All Buyers", value: "" },
            ...purchaseReturnBuyerOptions,
          ]}
          onChange={(next) =>
            setPurchaseReturnBuyerFilter(next == null ? "" : String(next))
          }
        />
      </Flex>
      {filteredPurchaseReturnSupplierRows.length === 0 ? (
        <Flex minH="180px" align="center" justify="center">
          <Text color="gray.500">No purchase return data.</Text>
        </Flex>
      ) : (
        <AgGrid
          rowData={filteredPurchaseReturnSupplierRows}
          columnDefs={purchaseReturnColDefs}
          defaultRows={20}
          tableKey="purchase-return-stats-grid"
          computationColumns={["total_value"]}
        />
      )}
    </>
  );
}

export default PurchaseReturnTabContent;
