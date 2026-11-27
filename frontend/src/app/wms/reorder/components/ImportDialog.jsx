"use client";

import React, { useCallback, useMemo } from "react";
import { Badge, Button, Flex, Text, Box } from "@chakra-ui/react";
import CustomDialog from "@/components/CustomDialog";
import AgGrid from "@/components/AgGrid";
import FileUploaderWithColumnMapping from "@/components/FileUploaderWithColumnMapping";

const REORDER_IMPORT_TARGET_COLUMNS = [
  { key: "supplier_name", label: "Supplier name", type: "string", required: true, suggestedKey: "supplier_name" },
  { key: "article_id", label: "Article ID", type: "number", required: true, suggestedKey: "article_id" },
  { key: "quantity", label: "Quantity", type: "number", required: true, suggestedKey: "quantity" },
  { key: "mrp", label: "MRP", type: "number", required: false, suggestedKey: "mrp" },
  { key: "cost_price", label: "Cost price", type: "number", required: false, suggestedKey: "cost_price" },
  { key: "discount", label: "Discount", type: "number", required: false, suggestedKey: "discount" },
  { key: "order_worth", label: "Order worth", type: "number", required: false, suggestedKey: "order_worth" },
  { key: "tax_amount", label: "Tax amount", type: "number", required: false, suggestedKey: "tax_amount" },
  { key: "buyer_name", label: "Buyer name", type: "string", required: true, suggestedKey: "buyer_name" },
];

export default function ImportDialog({
  open,
  onOpenChange,
  previewData,
  previewRowsWithProduct,
  suppliersNotFound,
  buyersNotFound,
  onCancel,
  onSave,
  onDataMapped,
  onOpenNotFound,
  saving,
}) {
  const previewColumnDefs = useMemo(
    () => [
      { field: "product_image", headerName: "Image", type: "image", width: 100 },
      { field: "product_name", headerName: "Product", flex: 1 },
      ...REORDER_IMPORT_TARGET_COLUMNS.map((col) => {
        if (col.key === "supplier_name") {
          return {
            field: col.key,
            headerName: col.label,
            flex: 1,
            type: "badge-column",
            valueGetter: (params) => {
              const data = params.data;
              if (!data?.supplier_mapped)
                return { label: "Not Found", colorScheme: "red" };
              return {
                label: (data.supplier_name ?? "—").toString(),
                colorScheme: "gray",
              };
            },
          };
        }
        if (col.key === "buyer_name") {
          return {
            field: col.key,
            headerName: col.label,
            flex: 1,
            type: "badge-column",
            valueGetter: (params) => {
              const data = params.data;
              if (!data?.buyer_mapped)
                return { label: "Not Found", colorScheme: "red" };
              return {
                label: (data.buyer_name ?? "—").toString(),
                colorScheme: "gray",
              };
            },
          };
        }
        return {
          field: col.key,
          headerName: col.label,
          flex: ["supplier_name", "buyer_name"].includes(col.key) ? 1 : undefined,
          width: ["article_id", "quantity", "mrp", "cost_price", "discount", "order_worth", "tax_amount"].includes(col.key) ? 100 : undefined,
          type: col.type === "number" ? "number" : undefined,
        };
      }),
    ],
    []
  );

  const previewGridGetRowStyle = useCallback((params) => {
    if (!params?.data) return null;
    const { supplier_mapped, buyer_mapped } = params.data;
    if (!supplier_mapped || !buyer_mapped)
      return { backgroundColor: "rgba(254, 178, 178, 0.35)" };
    return null;
  }, []);

  return (
    <CustomDialog
      open={open}
      onOpenChange={onOpenChange}
      // Figma PUR/01.04: compact popup until a file is mapped.
      title="Import Purchase Reorders"
      maxW={previewData?.length ? "90vw" : "560px"}
      maxH="90vh"
      footer={
        <>
          <Button variant="subtle" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            loading={saving}
            disabled={!previewData?.length}
          >
            Import
          </Button>
        </>
      }
    >
      {!previewData?.length ? (
        <Box>
          <Text fontSize="11px" lineHeight="16px" color="fg.muted" mb="12px">
            Upload an Excel file with columns mapped to supplier name, article
            ID, quantity, MRP, cost price, discount, order worth, tax amount and
            buyer name.
          </Text>
          <FileUploaderWithColumnMapping
            targetColumns={REORDER_IMPORT_TARGET_COLUMNS}
            onDataMapped={onDataMapped}
            showToast={false}
            fileUploaderProps={{
              title: "Choose file or drag it here",
              placeholder: "Excel (.xlsx, .xls) or CSV",
              showClipboardButton: false,
            }}
          />
        </Box>
      ) : (
        <Flex direction="column" gap={4}>
          <Text fontSize="sm" color="gray.600">
            Mapped rows: {previewData.length}. Review and click Save to bulk
            insert.
          </Text>
          {(suppliersNotFound?.length > 0 || buyersNotFound?.length > 0) && (
            <Flex gap={4} flexWrap="wrap" align="center">
              {suppliersNotFound?.length > 0 && (
                <Badge
                  as="button"
                  colorPalette="red"
                  variant="subtle"
                  cursor="pointer"
                  _hover={{ opacity: 0.9 }}
                  onClick={onOpenNotFound}
                >
                  Suppliers not found: {suppliersNotFound.length}
                </Badge>
              )}
              {buyersNotFound?.length > 0 && (
                <Badge
                  as="button"
                  colorPalette="red"
                  variant="subtle"
                  cursor="pointer"
                  _hover={{ opacity: 0.9 }}
                  onClick={onOpenNotFound}
                >
                  Buyers not found: {buyersNotFound.length}
                </Badge>
              )}
              <Text fontSize="xs" color="gray.500">
                (Click to view list)
              </Text>
            </Flex>
          )}
          <Box w="100%" minH="200px">
            <AgGrid
              tableKey="reorder-import-preview"
              rowData={previewRowsWithProduct ?? []}
              columnDefs={previewColumnDefs}
              gridOptions={{ getRowStyle: previewGridGetRowStyle }}
              pagination={true}
              paginationPageSize={10}
              showColumnSettings={false}
            />
          </Box>
        </Flex>
      )}
    </CustomDialog>
  );
}
