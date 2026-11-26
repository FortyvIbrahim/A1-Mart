"use client";

import React from "react";
import { Button } from "@chakra-ui/react";
import CustomDialog from "@/components/CustomDialog";
import AgGrid from "@/components/AgGrid";

function DesignationEmployeesModal({
  open,
  onClose,
  title,
  rowData,
  columnDefs,
  tableKey,
}) {
  return (
    <CustomDialog
      open={open}
      onOpenChange={(e) => {
        if (!e?.open) onClose?.();
      }}
      title={title}
      minW="85vw"
      width="85vw"
      maxH="85vh"
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <AgGrid tableKey={tableKey} rowData={rowData} columnDefs={columnDefs} />
    </CustomDialog>
  );
}

export default DesignationEmployeesModal;
