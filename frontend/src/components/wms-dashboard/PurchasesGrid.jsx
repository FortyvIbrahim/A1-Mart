"use client";

import React from "react";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";

function PurchasesGrid({ rows, columnDefs }) {
  return (
    <CustomContainer title="Purchases" fullWidth>
      <AgGrid
        rowData={rows}
        columnDefs={columnDefs}
        defaultRows={20}
        tableKey="purchases-grid"
        computationColumns={["amount"]}
      />
    </CustomContainer>
  );
}

export default PurchasesGrid;
