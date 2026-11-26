"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Badge, Button, Flex, Text, Box, VStack, Wrap } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import CustomDialog from "@/components/CustomDialog";
import AgGrid from "@/components/AgGrid";
import { usePoList } from "@/api/customHooks/usePo";
import { createPo, deletePo } from "@/api/helpers/po";
import useMasterList from "@/api/customHooks/useMasterList";
import useEmployee from "@/api/customHooks/useEmployee";
import useProducts from "@/api/customHooks/useProducts";
import FileUploaderWithColumnMapping from "@/components/FileUploaderWithColumnMapping";
import usePermission from "@/customHooks/usePermission";
import useDeleteModal from "@/customHooks/useDeleteModal";
import toast from "react-hot-toast";
import {
  DIST_WAREHOUSE_ID,
  PROD_WAREHOUSE_ID,
  SARON_ID,
  VELLORE_ROAD_ID,
} from "@/constants/branches";
import moment from "moment";

const PO_IMPORT_TARGET_COLUMNS = [
  {
    key: "po_id",
    label: "Po Id",
    type: "number",
    required: false,
    suggestedKey: "Po Id",
  },
  {
    key: "supplier_name",
    label: "Supplier Name",
    type: "string",
    required: true,
    suggestedKey: "Supplier Name",
  },
  {
    key: "buyer_name",
    label: "Buyer Name",
    type: "string",
    required: true,
    suggestedKey: "Buyer Name",
  },
  {
    key: "raised_on",
    label: "Raised On",
    type: "date",
    required: true,
    suggestedKey: "Raised On",
  },
  {
    key: "article_id",
    label: "Article Id",
    type: "number",
    required: true,
    suggestedKey: "Article Id",
  },
  {
    key: "quantity",
    label: "Quantity",
    type: "number",
    required: true,
    suggestedKey: "Quantity",
  },
  {
    key: "mrp",
    label: "Mrp",
    type: "number",
    required: false,
    suggestedKey: "Mrp",
  },
  {
    key: "net_cost",
    label: "Net Cost",
    type: "number",
    required: false,
    suggestedKey: "Net Cost",
  },
  {
    key: "branch_distribution",
    label: "A 1 Mart- Distribution",
    type: "number",
    required: false,
    suggestedKey: "A 1 Mart- Distribution",
  },
  {
    key: "branch_production",
    label: "A 1 Mart-Production",
    type: "number",
    required: false,
    suggestedKey: "A 1 Mart-Production",
  },
  {
    key: "branch_saron",
    label: "A 1 Mart-Saron",
    type: "number",
    required: false,
    suggestedKey: "A 1 Mart-Saron",
  },
  {
    key: "branch_vellore_road",
    label: "A 1 Mart-Vellore Road",
    type: "number",
    required: false,
    suggestedKey: "A 1 Mart-Vellore Road",
  },
];

const roundTo2 = (value) => {
  if (value == null || typeof value !== "number" || Number.isNaN(value))
    return value;
  return Math.round(value * 100) / 100;
};

const toQty = (v) => {
  const n = Number(v);
  return Number.isNaN(n) || n < 0 ? 0 : Math.round(n);
};

export default function PurchaseOrderListing() {
  const router = useRouter();
  const { poList, loading, refetch } = usePoList();
  const { masterList } = useMasterList();
  const { employees } = useEmployee();
  const { products } = useProducts();
  const canAdd = usePermission("add_po");
  const canDelete = usePermission("delete_po");
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [notFoundModalOpen, setNotFoundModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [saving, setSaving] = useState(false);

  const supplierByName = useMemo(() => {
    const map = {};
    (masterList || []).forEach((m) => {
      const name = (m.name || m.master_name || "")
        .toString()
        .trim()
        .toLowerCase();
      if (name) map[name] = m;
    });
    return map;
  }, [masterList]);

  const employeeByName = useMemo(() => {
    const map = {};
    (employees || []).forEach((e) => {
      const name = (e.employee_name || "").toString().trim().toLowerCase();
      if (name) map[name] = e;
    });
    return map;
  }, [employees]);

  const productById = useMemo(() => {
    const map = {};
    (products || []).forEach((p) => {
      if (p.product_id != null) map[Number(p.product_id)] = p;
    });
    return map;
  }, [products]);

  const listColumnDefs = useMemo(
    () => [
      { field: "po_id", headerName: "PO ID", type: "id", sort: "desc" },
      {
        field: "supplier.name",
        headerName: "Supplier",
        type: "capitalized",
        flex: 2,
      },
      {
        field: "raised_date",
        headerName: "Raised Date",
        type: "date",
      },
      {
        field: "buyer.employee_name",
        headerName: "Buyer",
        type: "capitalized",
      },
      {
        field: "items_count",
        headerName: "Items",
        type: "number",
        valueGetter: (params) =>
          Array.isArray(params.data?.items) ? params.data.items.length : 0,
      },
      {
        field: "actions",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => {
          const actions = [
            {
              label: "View",
              value: "view",
              onClick: () => {
                const id = params.data?.po_id;
                if (id != null) router.push(`/wms/purchase-order/view/${id}`);
              },
            },
          ];
          if (canDelete) {
            actions.push({
              label: "Delete",
              value: "delete",
              onClick: () => handleDeletePo(params.data?.po_id),
            });
          }
          return actions;
        },
      },
    ],
    [router, canDelete]
  );

  const handleDeletePo = useCallback(
    (id) => {
      if (id == null) return;
      openDeleteModal({
        title: "Delete Purchase Order",
        message:
          "Are you sure you want to delete this purchase order? This action cannot be undone.",
        onDelete: () =>
          deletePo(id)
            .then(() => {
              refetch();
              toast.success("Purchase order deleted.");
            })
            .catch((err) =>
              toast.error(err?.message ?? "Failed to delete purchase order.")
            ),
      });
    },
    [openDeleteModal, refetch]
  );

  const buildPoPayloadsFromPreview = useCallback(() => {
    if (!previewData?.length) return [];
    const groups = {};
    previewData.forEach((row) => {
      const supplierName = (row.supplier_name ?? "")
        .toString()
        .trim()
        .toLowerCase();
      const buyerName = (row.buyer_name ?? "").toString().trim().toLowerCase();
      const supplier = supplierByName[supplierName];
      const employee = employeeByName[buyerName];
      if (!supplier?.master_id || !employee?.employee_code) return;
      const productId = row.article_id != null ? Number(row.article_id) : null;
      if (!productId || productId <= 0) return;
      const poKey =
        row.po_id != null && row.po_id !== ""
          ? `po_${row.po_id}`
          : `h_${supplierName}|${
              (row.raised_on && moment(row.raised_on).format("YYYY-MM-DD")) ||
              ""
            }|${buyerName}`;
      if (!groups[poKey]) {
        groups[poKey] = {
          po_id:
            row.po_id != null && row.po_id !== ""
              ? Number(row.po_id)
              : undefined,
          raised_date: row.raised_on
            ? moment(row.raised_on).isValid()
              ? moment(row.raised_on).format("YYYY-MM-DD")
              : undefined
            : undefined,
          buyer_id: employee.employee_code,
          supplier_id: supplier.master_id,
          items: [],
        };
      }
      const stockArray = [];
      const distQty = toQty(row.branch_distribution);
      if (distQty > 0)
        stockArray.push({ branch_id: DIST_WAREHOUSE_ID, qty: distQty });
      const prodQty = toQty(row.branch_production);
      if (prodQty > 0)
        stockArray.push({ branch_id: PROD_WAREHOUSE_ID, qty: prodQty });
      const saronQty = toQty(row.branch_saron);
      if (saronQty > 0) stockArray.push({ branch_id: SARON_ID, qty: saronQty });
      const velloreQty = toQty(row.branch_vellore_road);
      if (velloreQty > 0)
        stockArray.push({ branch_id: VELLORE_ROAD_ID, qty: velloreQty });
      groups[poKey].items.push({
        product_id: productId,
        qty: toQty(row.quantity),
        mrp: row.mrp != null ? roundTo2(Number(row.mrp)) : undefined,
        net_cost:
          row.net_cost != null ? roundTo2(Number(row.net_cost)) : undefined,
        stock_array: stockArray,
      });
    });
    return Object.values(groups).filter((g) => g.items.length > 0);
  }, [previewData, supplierByName, employeeByName]);

  const previewRowsWithMapped = useMemo(() => {
    if (!previewData?.length) return [];
    return previewData.map((row) => {
      const product =
        row.article_id != null ? productById[Number(row.article_id)] : null;
      const supplierName = (row.supplier_name ?? "")
        .toString()
        .trim()
        .toLowerCase();
      const buyerName = (row.buyer_name ?? "").toString().trim().toLowerCase();
      const supplier = supplierByName[supplierName];
      const employee = employeeByName[buyerName];
      const supplier_mapped = !!supplier?.master_id;
      const buyer_mapped = !!employee?.employee_code;
      return {
        ...row,
        product_image: product?.image_url ?? null,
        product_name:
          product?.product_name ?? product?.product_display_name ?? null,
        supplier_mapped,
        buyer_mapped,
      };
    });
  }, [previewData, productById, supplierByName, employeeByName]);

  const { suppliersNotFound, buyersNotFound } = useMemo(() => {
    if (!previewRowsWithMapped?.length)
      return { suppliersNotFound: [], buyersNotFound: [] };
    const supplierSet = new Set();
    const buyerSet = new Set();
    previewRowsWithMapped.forEach((row) => {
      if (
        !row.supplier_mapped &&
        row.supplier_name != null &&
        String(row.supplier_name).trim() !== ""
      )
        supplierSet.add(String(row.supplier_name).trim());
      if (
        !row.buyer_mapped &&
        row.buyer_name != null &&
        String(row.buyer_name).trim() !== ""
      )
        buyerSet.add(String(row.buyer_name).trim());
    });
    return {
      suppliersNotFound: Array.from(supplierSet).sort(),
      buyersNotFound: Array.from(buyerSet).sort(),
    };
  }, [previewRowsWithMapped]);

  const handleSaveImport = useCallback(async () => {
    const payloads = buildPoPayloadsFromPreview();
    if (!payloads.length) {
      toast.error(
        "No valid rows. Check supplier name, buyer name, and article ID."
      );
      return;
    }
    setSaving(true);
    let successCount = 0;
    try {
      for (const payload of payloads) {
        const body = {
          buyer_id: payload.buyer_id,
          supplier_id: payload.supplier_id,
          raised_date: payload.raised_date || undefined,
          items: payload.items,
        };
        if (payload.po_id != null) body.po_id = payload.po_id;
        const response = await createPo(body);
        if (response?.code === 200) successCount += 1;
        if (response?.code === 409)
          toast.error(
            response?.message ?? `${payload.po_id} was already created.`
          );
      }
      if (successCount > 0)
        toast.success(`${successCount} purchase order(s) created.`);
      setPreviewData(null);
      setImportModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(err?.msg || "Error creating purchase order(s).");
    } finally {
      setSaving(false);
    }
  }, [buildPoPayloadsFromPreview, refetch]);

  const handleCancelImport = () => {
    setPreviewData(null);
    setImportModalOpen(false);
    setNotFoundModalOpen(false);
  };

  const previewColumnDefs = useMemo(
    () => [
      {
        field: "product_image",
        headerName: "Image",
        type: "image",
      },
      {
        field: "product_name",
        headerName: "Product",
        type: "capitalized",
      },
      ...PO_IMPORT_TARGET_COLUMNS.map((col) => {
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

        if (col.key === "raised_on") {
          return {
            field: col.key,
            headerName: col.label,
            type: "date",
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
          flex: ["supplier_name", "buyer_name"].includes(col.key)
            ? 1
            : undefined,
          width: [
            "po_id",
            "article_id",
            "quantity",
            "mrp",
            "net_cost",
            "raised_on",
          ].includes(col.key)
            ? 100
            : undefined,
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
    <GlobalWrapper permissionKey="view_po">
      <DeleteModalComponent />
      <CustomContainer
        title="Purchase Order"
        rightSection={
          canAdd ? (
            <Button
              size="sm"
              colorPalette="brand"
              onClick={() => setImportModalOpen(true)}
            >
              Import
            </Button>
          ) : null
        }
      >
        {loading ? (
          <Text color="gray.500">Loading...</Text>
        ) : (
          <AgGrid
            tableKey="po-list"
            rowData={poList ?? []}
            columnDefs={listColumnDefs}
            showColumnSettings={true}
          />
        )}
      </CustomContainer>

      <CustomDialog
        open={importModalOpen}
        onOpenChange={(e) => {
          if (!e.open) handleCancelImport();
        }}
        title="Import purchase orders from Excel"
        maxW="90vw"
        maxH="90vh"
        footer={
          previewData?.length > 0 ? (
            <>
              <Button variant="outline" onClick={handleCancelImport}>
                Cancel
              </Button>
              <Button
                colorPalette="brand"
                onClick={handleSaveImport}
                loading={saving}
              >
                Save
              </Button>
            </>
          ) : null
        }
      >
        {!previewData?.length ? (
          <Box>
            <Text fontSize="sm" color="gray.600" mb={3}>
              Upload an Excel file with columns: Po Id, Supplier Name, Raised
              On, Article Id, Quantity, Mrp, Net Cost, A 1 Mart- Distribution, A
              1 Mart-Production, A 1 Mart-Saron, A 1 Mart-Vellore Road, Buyer
              Name.
            </Text>
            <FileUploaderWithColumnMapping
              targetColumns={PO_IMPORT_TARGET_COLUMNS}
              onDataMapped={(data) =>
                setPreviewData(Array.isArray(data) ? data : [])
              }
              showToast={false}
            />
          </Box>
        ) : (
          <Flex direction="column" gap={4}>
            <Text fontSize="sm" color="gray.600">
              Mapped rows: {previewData.length}.{" "}
              {buildPoPayloadsFromPreview().length} PO(s) will be created.
              Review and click Save.
            </Text>
            {(suppliersNotFound.length > 0 || buyersNotFound.length > 0) && (
              <Flex gap={4} flexWrap="wrap" align="center">
                {suppliersNotFound.length > 0 && (
                  <Badge
                    as="button"
                    colorPalette="red"
                    variant="subtle"
                    cursor="pointer"
                    _hover={{ opacity: 0.9 }}
                    onClick={() => setNotFoundModalOpen(true)}
                  >
                    Suppliers not found: {suppliersNotFound.length}
                  </Badge>
                )}
                {buyersNotFound.length > 0 && (
                  <Badge
                    as="button"
                    colorPalette="red"
                    variant="subtle"
                    cursor="pointer"
                    _hover={{ opacity: 0.9 }}
                    onClick={() => setNotFoundModalOpen(true)}
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
                tableKey="po-import-preview"
                rowData={previewRowsWithMapped}
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

      <CustomDialog
        open={notFoundModalOpen}
        onOpenChange={(e) => {
          if (!e.open) setNotFoundModalOpen(false);
        }}
        title="Not found in master data"
        maxW="md"
        maxH="85vh"
        footer={
          <Button onClick={() => setNotFoundModalOpen(false)}>Close</Button>
        }
      >
        <VStack align="stretch" gap={4}>
          {suppliersNotFound.length > 0 && (
            <Box>
              <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                Suppliers not found ({suppliersNotFound.length})
              </Text>
              <Wrap gap={2}>
                {suppliersNotFound.map((name) => (
                  <Badge
                    key={name}
                    colorPalette="red"
                    variant="subtle"
                    size="sm"
                  >
                    {name}
                  </Badge>
                ))}
              </Wrap>
            </Box>
          )}
          {buyersNotFound.length > 0 && (
            <Box>
              <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                Buyers not found ({buyersNotFound.length})
              </Text>
              <Wrap gap={2}>
                {buyersNotFound.map((name) => (
                  <Badge
                    key={name}
                    colorPalette="red"
                    variant="subtle"
                    size="sm"
                  >
                    {name}
                  </Badge>
                ))}
              </Wrap>
            </Box>
          )}
          {suppliersNotFound.length === 0 && buyersNotFound.length === 0 && (
            <Text fontSize="sm" color="gray.500">
              All suppliers and buyers are mapped.
            </Text>
          )}
        </VStack>
      </CustomDialog>
    </GlobalWrapper>
  );
}
