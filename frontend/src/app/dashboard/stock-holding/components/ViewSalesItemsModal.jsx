"use client";

import React, { useMemo } from "react";
import { Center, Spinner } from "@chakra-ui/react";
import CustomDialog from "@/components/CustomDialog";
import AgGrid from "@/components/AgGrid";
import {
  getSalesItemsColumnDefs,
  SALES_ITEMS_TABLE_KEY,
} from "../salesItemsColumnDefs";

export default function ViewSalesItemsModal({
  open,
  onClose,
  title,
  rows = [],
  loading = false,
}) {
  const columnDefs = useMemo(() => getSalesItemsColumnDefs(), []);

  return (
    <CustomDialog
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose?.();
      }}
      title={title}
      maxW="90vw"
      maxH="90vh"
    >
      {loading ? (
        <Center py={10}>
          <Spinner size="lg" colorPalette="brand" />
        </Center>
      ) : (
        <AgGrid
          tableKey={`${SALES_ITEMS_TABLE_KEY}-modal`}
          rowData={rows}
          columnDefs={columnDefs}
          pagination={true}
          paginationPageSize={20}
        />
      )}
    </CustomDialog>
  );
}
