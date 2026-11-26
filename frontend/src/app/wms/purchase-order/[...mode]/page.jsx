"use client";

import React, { use, useCallback, useMemo } from "react";
import { Box, Button, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import AgGrid from "@/components/AgGrid";
import { usePoById } from "@/api/customHooks/usePo";
import { deletePo } from "@/api/helpers/po";
import usePermission from "@/customHooks/usePermission";
import useDeleteModal from "@/customHooks/useDeleteModal";
import toast from "react-hot-toast";

export default function PurchaseOrderModePage({ params }) {
  const resolvedParams = use(
    typeof params?.then === "function" ? params : Promise.resolve(params)
  );
  const mode = resolvedParams?.mode ?? [];
  const action = mode[0];
  const id = mode[1] ?? null;

  const router = useRouter();
  const { po, loading } = usePoById(id);
  const canDelete = usePermission("delete_po");
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();

  const handleDeletePo = useCallback(() => {
    if (id == null) return;
    openDeleteModal({
      title: "Delete Purchase Order",
      message:
        "Are you sure you want to delete this purchase order? This action cannot be undone.",
      onDelete: () =>
        deletePo(id)
          .then(() => {
            toast.success("Purchase order deleted.");
            router.push("/wms/purchase-order");
          })
          .catch((err) =>
            toast.error(err?.message ?? "Failed to delete purchase order.")
          ),
    });
  }, [id, openDeleteModal, router]);

  const items = po?.items ?? [];
  const hasStock = items.some(
    (it) => Array.isArray(it.stock_array) && it.stock_array.length > 0
  );
  const branchColumns = useMemo(() => {
    if (!hasStock) return [];
    return Array.from(
      new Map(
        items.flatMap((it) =>
          (it.stock_array || []).map((s) => [
            s.branch_id,
            {
              id: s.branch_id,
              name:
                s.branch_name.replace("A1MART-", "") ?? `Branch ${s.branch_id}`,
            },
          ])
        )
      ).values()
    );
  }, [hasStock, items]);

  const stockGridColumnDefs = useMemo(() => {
    const cols = [
      {
        field: "image_url",
        headerName: "Image",
        type: "image",
      },
      { field: "product", headerName: "Product", flex: 2 },
      { field: "mrp", headerName: "MRP", type: "number" },
      { field: "net_cost", headerName: "Cost", type: "number" },
      { field: "qty", headerName: "Total Qty", type: "number" },
    ];
    branchColumns.forEach((col) => {
      cols.push({
        field: String(col.id),
        headerName: col.name,
        type: "number",
      });
    });
    return cols;
  }, [branchColumns]);

  const stockGridRowData = useMemo(() => {
    return items.map((item) => {
      const stockByBranch = new Map(
        (item.stock_array || []).map((s) => [s.branch_id, s.qty])
      );
      const row = {
        image_url:
          item.image_url ?? item.product_image ?? item.product?.image_url ?? "",
        product:
          item.product_name ??
          item.product_display_name ??
          item.product_id ??
          "—",
        mrp: item.mrp ?? "—",
        net_cost: item.net_cost ?? "—",
        qty: item.qty ?? "",
      };
      branchColumns.forEach((col) => {
        row[String(col.id)] = stockByBranch.get(col.id) ?? "—";
      });
      return row;
    });
  }, [items, branchColumns]);

  const itemsGridColumnDefs = useMemo(
    () => [
      {
        field: "image_url",
        headerName: "Image",
        type: "image",
        width: 120,
      },
      { field: "product", headerName: "Product", flex: 1 },
      { field: "qty", headerName: "Qty", width: 100, type: "number" },
      { field: "mrp", headerName: "MRP", width: 100, type: "number" },
      { field: "net_cost", headerName: "Cost", width: 110, type: "number" },
    ],
    []
  );

  const itemsGridRowData = useMemo(
    () =>
      items.map((item) => ({
        image_url:
          item.image_url ?? item.product_image ?? item.product?.image_url ?? "",
        product:
          item.product_name ??
          item.product_display_name ??
          item.product_id ??
          "—",
        qty: item.qty ?? "—",
        mrp: item.mrp ?? "—",
        net_cost: item.net_cost ?? "—",
      })),
    [items]
  );

  const isViewMode = action === "view";
  // edit mode may be added later

  if (loading) {
    return (
      <GlobalWrapper permissionKey="view_po">
        <CustomContainer title="Purchase Order">
          <Flex justifyContent="center" p={8}>
            <Text color="gray.500">Loading...</Text>
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (!po && (isViewMode || action === "edit")) {
    return (
      <GlobalWrapper permissionKey="view_po">
        <CustomContainer title="Purchase Order">
          <Flex flexDirection="column" gap={4} alignItems="center" p={8}>
            <Text>Purchase order not found.</Text>
            <Link href="/wms/purchase-order">
              <Button variant="subtle">Back to list</Button>
            </Link>
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (!isViewMode && action !== "edit") {
    return (
      <GlobalWrapper permissionKey="view_po">
        <CustomContainer title="Purchase Order">
          <Flex flexDirection="column" gap={4} alignItems="center" p={8}>
            <Text>Invalid mode.</Text>
            <Link href="/wms/purchase-order">
              <Button variant="subtle">Back to list</Button>
            </Link>
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const title =
    action === "edit"
      ? `Edit Purchase Order #${po?.po_id ?? id}`
      : `Purchase Order #${po.po_id ?? id}`;

  return (
    <GlobalWrapper permissionKey="view_po">
      <DeleteModalComponent />
      <CustomContainer
        title={title}
        rightSection={
          <Flex gap={2}>
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                colorPalette="red"
                onClick={handleDeletePo}
              >
                Delete
              </Button>
            )}
            <Link href="/wms/purchase-order">
              <Button variant="outline" size="sm">
                Back to list
              </Button>
            </Link>
          </Flex>
        }
      >
        <Flex direction="column" gap={6}>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
            <GridItem>
              <CustomInput label="PO ID" value={po.po_id ?? ""} viewOnly />
            </GridItem>
            <GridItem>
              <CustomInput
                label="Raised On"
                value={po.raised_date}
                method="date-picker"
                viewOnly
              />
            </GridItem>
            <GridItem>
              <CustomInput
                label="Buyer Name"
                value={po.buyer?.employee_name ?? po.buyer_id ?? ""}
                viewOnly
              />
            </GridItem>
            <GridItem>
              <CustomInput
                label="Supplier Name"
                value={po.supplier?.name ?? po.supplier_id ?? ""}
                viewOnly
              />
            </GridItem>
          </Grid>

          {hasStock && (
            <CustomContainer
              title="Stock sent to each branch"
              size="sm"
              color="secondary"
            >
              <AgGrid
                tableKey="po-view-stock"
                rowData={stockGridRowData}
                columnDefs={stockGridColumnDefs}
                showColumnSettings={false}
              />
            </CustomContainer>
          )}

          {items.length > 0 && !hasStock && (
            <Box>
              <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>
                Items
              </Text>
              <AgGrid
                tableKey="po-view-items"
                rowData={itemsGridRowData}
                columnDefs={itemsGridColumnDefs}
                showColumnSettings={false}
              />
            </Box>
          )}
        </Flex>
      </CustomContainer>
    </GlobalWrapper>
  );
}
