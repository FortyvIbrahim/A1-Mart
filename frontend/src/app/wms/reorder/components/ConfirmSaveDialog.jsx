"use client";

import React from "react";
import { Button, Text } from "@chakra-ui/react";
import CustomDialog from "@/components/CustomDialog";

export default function ConfirmSaveDialog({
  open,
  onOpenChange,
  skippedCount,
  onConfirm,
  onCancel,
  saving,
}) {
  return (
    <CustomDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm save"
      maxW="md"
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button colorPalette="brand" onClick={onConfirm} loading={saving}>
            Continue
          </Button>
        </>
      }
    >
      <Text fontSize="sm" color="gray.700">
        {skippedCount} item(s) will be skipped due to mismatch
        (supplier/buyer not found). Only matched items will be saved. Do you
        want to continue?
      </Text>
    </CustomDialog>
  );
}
