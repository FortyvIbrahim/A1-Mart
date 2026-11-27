import React from "react";
import AgGrid from "@/components/AgGrid";
import { DashboardCard } from "@/components/dashboard/DashboardUI";

/** Figma "WMS Dashboard / Purchases": untitled table card. */
function PurchasesTabContent({ rowData, columnDefs, onRowClick }) {
  return (
    <DashboardCard>
      <AgGrid
        bare
        rowData={rowData}
        columnDefs={columnDefs}
        defaultRows={10}
        tableKey="purchases-grid"
        onRowClicked={(e) => onRowClick?.(e.data)}
      />
    </DashboardCard>
  );
}

export default PurchasesTabContent;
