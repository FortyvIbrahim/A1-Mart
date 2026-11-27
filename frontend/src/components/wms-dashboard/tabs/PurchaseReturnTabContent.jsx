import React from "react";
import AgGrid from "@/components/AgGrid";
import { DashboardCard } from "@/components/dashboard/DashboardUI";
import BuyerChip from "./BuyerChip";

/** Figma "WMS Dashboard / Purchase Return": titled table card. */
function PurchaseReturnTabContent({
  purchaseReturnBuyerFilter,
  setPurchaseReturnBuyerFilter,
  filteredPurchaseReturnSupplierRows,
  purchaseReturnColDefs,
  onRowClick,
}) {
  return (
    <DashboardCard
      title="Purchase Return"
      rightSection={
        <BuyerChip
          buyer={purchaseReturnBuyerFilter}
          onClear={() => setPurchaseReturnBuyerFilter("")}
        />
      }
    >
      <AgGrid
        bare
        rowData={filteredPurchaseReturnSupplierRows}
        columnDefs={purchaseReturnColDefs}
        defaultRows={10}
        tableKey="purchase-return-stats-grid"
        onRowClicked={(e) => onRowClick?.(e.data)}
      />
    </DashboardCard>
  );
}

export default PurchaseReturnTabContent;
