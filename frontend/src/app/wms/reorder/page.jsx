"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Button, Flex } from "@chakra-ui/react";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import usePurchaseReorders from "@/api/customHooks/usePurchaseReorders";
import { bulkInsertPurchaseReorders } from "@/api/helpers/purchaseReorders";
import useMasterList from "@/api/customHooks/useMasterList";
import useEmployee from "@/api/customHooks/useEmployee";
import useProducts from "@/api/customHooks/useProducts";
import usePermission from "@/customHooks/usePermission";
import toast from "react-hot-toast";

import {
  ReorderListTabs,
  ViewProductsModal,
  ImportDialog,
  NotFoundDialog,
  ConfirmSaveDialog,
} from "./components";

export default function ReorderListing() {
  const { purchaseReorders, loading, refetch } = usePurchaseReorders();
  const { masterList } = useMasterList();
  const { employees } = useEmployee();
  const { products } = useProducts();
  const canAdd = usePermission("add_purchase_reorders");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [notFoundModalOpen, setNotFoundModalOpen] = useState(false);
  const [confirmSaveModalOpen, setConfirmSaveModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [selectedGroupItems, setSelectedGroupItems] = useState([]);
  const [productsModalMode, setProductsModalMode] = useState("all");

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

  const groupedBySupplierBuyer = useMemo(() => {
    const list = purchaseReorders ?? [];
    const groups = {};
    list.forEach((row) => {
      const sk =
        row.supplier_id ??
        row.supplier?.master_id ??
        (row.supplier?.name ?? "").toString().trim().toLowerCase();
      const bk =
        row.buyer_id ??
        row.buyer?.employee_code ??
        (row.buyer?.employee_name ?? "").toString().trim().toLowerCase();
      const key = `${sk}|${bk}`;
      if (!groups[key]) {
        groups[key] = {
          groupKey: key,
          supplier:
            row.supplier?.name ??
            row.supplier?.master_name ??
            row.supplier_id ??
            "—",
          buyer:
            row.buyer?.employee_name ??
            row.buyer?.employee_code ??
            row.buyer_id ??
            "—",
          tot_items: 0,
          tot_qty: 0,
          tot_value: 0,
          items: [],
        };
      }
      const g = groups[key];
      g.tot_items += 1;
      g.tot_qty += Number(row.qty) || 0;
      g.tot_value += Number(row.order_worth) || 0;
      g.items.push(row);
    });
    return Object.values(groups).map((g) => {
      const tot_purchased = g.items.filter((i) => i.is_purchased).length;
      const tot_pending = g.items.length - tot_purchased;
      return {
        ...g,
        tot_value: Math.round(g.tot_value * 100) / 100,
        tot_purchased,
        tot_pending,
      };
    });
  }, [purchaseReorders]);

  const groupedBySupplier = useMemo(() => {
    const list = purchaseReorders ?? [];
    const groups = {};
    list.forEach((row) => {
      const sk =
        row.supplier_id ??
        row.supplier?.master_id ??
        (row.supplier?.name ?? "").toString().trim().toLowerCase();
      if (!groups[sk]) {
        groups[sk] = {
          groupKey: sk,
          supplier:
            row.supplier?.name ??
            row.supplier?.master_name ??
            row.supplier_id ??
            "—",
          tot_items: 0,
          tot_value: 0,
          items: [],
        };
      }
      const g = groups[sk];
      g.tot_items += 1;
      g.tot_value += Number(row.order_worth) || 0;
      g.items.push(row);
    });
    return Object.values(groups).map((g) => {
      const tot_purchased = g.items.filter((i) => i.is_purchased).length;
      const tot_pending = g.items.length - tot_purchased;
      return {
        ...g,
        tot_value: Math.round(g.tot_value * 100) / 100,
        tot_purchased,
        tot_pending,
      };
    });
  }, [purchaseReorders]);

  const groupedByBuyer = useMemo(() => {
    const list = purchaseReorders ?? [];
    const groups = {};
    list.forEach((row) => {
      const bk =
        row.buyer_id ??
        row.buyer?.employee_code ??
        (row.buyer?.employee_name ?? "").toString().trim().toLowerCase();
      if (!groups[bk]) {
        groups[bk] = {
          groupKey: bk,
          buyer:
            row.buyer?.employee_name ??
            row.buyer?.employee_code ??
            row.buyer_id ??
            "—",
          tot_items: 0,
          tot_value: 0,
          items: [],
        };
      }
      const g = groups[bk];
      g.tot_items += 1;
      g.tot_value += Number(row.order_worth) || 0;
      g.items.push(row);
    });
    return Object.values(groups).map((g) => {
      const tot_purchased = g.items.filter((i) => i.is_purchased).length;
      const tot_pending = g.items.length - tot_purchased;
      return {
        ...g,
        tot_value: Math.round(g.tot_value * 100) / 100,
        tot_purchased,
        tot_pending,
      };
    });
  }, [purchaseReorders]);

  const handleViewProducts = useCallback((items, mode) => {
    setSelectedGroupItems(items ?? []);
    setProductsModalMode(mode);
    setProductsModalOpen(true);
  }, []);

  const previewRowsWithProduct = useMemo(() => {
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
    if (!previewRowsWithProduct?.length)
      return { suppliersNotFound: [], buyersNotFound: [] };
    const supplierSet = new Set();
    const buyerSet = new Set();
    previewRowsWithProduct.forEach((row) => {
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
  }, [previewRowsWithProduct]);

  const roundTo2 = (value) => {
    if (value == null || typeof value !== "number" || Number.isNaN(value))
      return value;
    return Math.round(value * 100) / 100;
  };

  const buildBulkPayload = () => {
    if (!previewData?.length) return [];
    return previewData
      .map((row) => {
        const supplierName = (row.supplier_name ?? "")
          .toString()
          .trim()
          .toLowerCase();
        const buyerName = (row.buyer_name ?? "")
          .toString()
          .trim()
          .toLowerCase();
        const supplier = supplierByName[supplierName];
        const employee = employeeByName[buyerName];
        const productId =
          row.article_id != null ? Number(row.article_id) : null;
        const qty = row.quantity != null ? Number(row.quantity) : null;
        if (
          !productId ||
          productId <= 0 ||
          !supplier?.master_id ||
          !employee?.employee_code
        )
          return null;
        return {
          product_id: productId,
          qty: roundTo2(qty >= 0 ? qty : 0),
          mrp: row.mrp != null ? roundTo2(Number(row.mrp)) : undefined,
          cost_price:
            row.cost_price != null
              ? roundTo2(Number(row.cost_price))
              : undefined,
          discount:
            row.discount != null ? roundTo2(Number(row.discount)) : undefined,
          order_worth:
            row.order_worth != null
              ? roundTo2(Number(row.order_worth))
              : undefined,
          tax_amount:
            row.tax_amount != null
              ? roundTo2(Number(row.tax_amount))
              : undefined,
          buyer_id: employee.employee_code,
          supplier_id: supplier.master_id,
        };
      })
      .filter(Boolean);
  };

  const doSaveImport = async () => {
    const payload = buildBulkPayload();
    if (!payload.length) {
      toast.error(
        "No valid rows to import. Check supplier name, buyer name, and article ID."
      );
      return;
    }
    setSaving(true);
    try {
      const response = await bulkInsertPurchaseReorders(payload);
      if (response?.code === 200) {
        toast.success(
          response?.message || `${payload.length} row(s) imported.`
        );
        setPreviewData(null);
        setImportModalOpen(false);
        setConfirmSaveModalOpen(false);
        refetch();
      } else {
        toast.error(response?.message || "Bulk insert failed.");
      }
    } catch (err) {
      toast.error(err?.message || "Error importing reorders.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveImport = () => {
    const payload = buildBulkPayload();
    if (!payload.length) {
      toast.error(
        "No valid rows to import. Check supplier name, buyer name, and article ID."
      );
      return;
    }
    const skipped = (previewData?.length ?? 0) - payload.length;
    if (skipped > 0) {
      setConfirmSaveModalOpen(true);
      return;
    }
    doSaveImport();
  };

  const handleCancelImport = () => {
    setPreviewData(null);
    setImportModalOpen(false);
  };

  const handleDataMapped = (mappedData) => {
    setPreviewData(Array.isArray(mappedData) ? mappedData : []);
  };

  return (
    <GlobalWrapper permissionKey="view_purchase_reorders">
      <CustomContainer
        contentCard
        title="Purchase Reorders"
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
        <ReorderListTabs
          groupedBySupplierBuyer={groupedBySupplierBuyer}
          groupedBySupplier={groupedBySupplier}
          groupedByBuyer={groupedByBuyer}
          onViewProducts={handleViewProducts}
          loading={loading}
        />
      </CustomContainer>

      <ImportDialog
        open={importModalOpen}
        onOpenChange={(e) => {
          if (!e.open) handleCancelImport();
        }}
        previewData={previewData}
        previewRowsWithProduct={previewRowsWithProduct}
        suppliersNotFound={suppliersNotFound}
        buyersNotFound={buyersNotFound}
        onCancel={handleCancelImport}
        onSave={handleSaveImport}
        onDataMapped={handleDataMapped}
        onOpenNotFound={() => setNotFoundModalOpen(true)}
        saving={saving}
      />

      <NotFoundDialog
        open={notFoundModalOpen}
        onOpenChange={(e) => {
          if (!e.open) setNotFoundModalOpen(false);
        }}
        suppliersNotFound={suppliersNotFound}
        buyersNotFound={buyersNotFound}
        onClose={() => setNotFoundModalOpen(false)}
      />

      <ViewProductsModal
        open={productsModalOpen}
        onClose={() => {
          setProductsModalOpen(false);
          setSelectedGroupItems([]);
        }}
        items={selectedGroupItems}
        mode={productsModalMode}
      />

      <ConfirmSaveDialog
        open={confirmSaveModalOpen}
        onOpenChange={(e) => {
          if (!e.open) setConfirmSaveModalOpen(false);
        }}
        skippedCount={(previewData?.length ?? 0) - buildBulkPayload().length}
        onConfirm={doSaveImport}
        onCancel={() => setConfirmSaveModalOpen(false)}
        saving={saving}
      />
    </GlobalWrapper>
  );
}
