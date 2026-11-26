import React from "react";
import AgGrid from "@/components/AgGrid";

function PurchasesTabContent({ rowData, columnDefs }) {
  return (
    <AgGrid
      rowData={rowData}
      columnDefs={columnDefs}
      defaultRows={20}
      tableKey="purchases-grid"
      computationColumns={["amount"]}
    />
  );
}

export default PurchasesTabContent;
