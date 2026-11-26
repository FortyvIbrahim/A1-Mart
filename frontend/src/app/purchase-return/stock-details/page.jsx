"use client";

import React, { useMemo, useState, useCallback } from "react";
import {
  Box,
  Text,
  Flex,
  Tabs,
  Accordion,
  Badge,
  VStack,
  HStack,
  Icon,
  Spinner,
  Checkbox,
  Button,
} from "@chakra-ui/react";
import { FaUser, FaBoxOpen } from "react-icons/fa";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import CustomMenu from "@/components/CustomMenu";
import AgGrid from "@/components/AgGrid";
import usePurchaseReturns from "@/api/customHooks/usePurchaseReturns";
import { downloadCsv, exportToExcel } from "@/utils/exportCSVFile";
import { generatePDFWithToast } from "@/utils/pdfGenerator";
import toast from "react-hot-toast";

const EXPORT_HEADERS = {
  Supplier: "Supplier",
  Product: "Product",
  Qty: "Qty",
  Amount: "Amount",
  "PR No": "PR No",
  Outlet: "Outlet",
  Status: "Status",
};

const EXPORT_HEADERS_WITH_BUYER = {
  Buyer: "Buyer",
  ...EXPORT_HEADERS,
};

/** Build export rows for one buyer: supplier name row, item rows, then totals row per supplier (grouped by supplier). */
function buildBuyerExportRows(buyer) {
  const rows = [];
  for (const sup of buyer.suppliers || []) {
    rows.push({
      Supplier: sup.supplierName ?? "—",
      Product: "",
      Qty: "",
      Amount: "",
      "PR No": "",
      Outlet: "",
      Status: "",
    });
    let supplierQty = 0;
    let supplierAmount = 0;
    for (const it of sup.items || []) {
      supplierQty += Number(it.qty) || 0;
      supplierAmount += Number(it.total_amount) || 0;
      rows.push({
        Supplier: "",
        Product: it.product_name ?? "—",
        Qty: it.qty ?? "",
        Amount: it.total_amount ?? "",
        "PR No": it.pr_no ?? "—",
        Outlet: it.outlet_name ?? "—",
        Status: it.delivered ? "Returned" : "Not Returned",
      });
    }
    if ((sup.items || []).length > 0) {
      rows.push({
        Supplier: "",
        Product: "Total",
        Qty: supplierQty,
        Amount: Math.round(supplierAmount * 100) / 100,
        "PR No": "",
        Outlet: "",
        Status: "",
      });
    }
  }
  return rows;
}

/** Build export rows for all buyers: Buyer column + supplier row, item rows, then totals row per supplier. */
function buildAllBuyersExportRows(groupedByBuyer) {
  const rows = [];
  for (const buyer of groupedByBuyer || []) {
    let firstInBuyer = true;
    for (const sup of buyer.suppliers || []) {
      rows.push({
        Buyer: firstInBuyer ? buyer.buyerName ?? "—" : "",
        Supplier: sup.supplierName ?? "—",
        Product: "",
        Qty: "",
        Amount: "",
        "PR No": "",
        Outlet: "",
        Status: "",
      });
      firstInBuyer = false;
      let supplierQty = 0;
      let supplierAmount = 0;
      for (const it of sup.items || []) {
        supplierQty += Number(it.qty) || 0;
        supplierAmount += Number(it.total_amount) || 0;
        rows.push({
          Buyer: "",
          Supplier: "",
          Product: it.product_name ?? "—",
          Qty: it.qty ?? "",
          Amount: it.total_amount ?? "",
          "PR No": it.pr_no ?? "—",
          Outlet: it.outlet_name ?? "—",
          Status: it.delivered ? "Returned" : "Not Returned",
        });
      }
      if ((sup.items || []).length > 0) {
        rows.push({
          Buyer: "",
          Supplier: "",
          Product: "Total",
          Qty: supplierQty,
          Amount: Math.round(supplierAmount * 100) / 100,
          "PR No": "",
          Outlet: "",
          Status: "",
        });
      }
    }
  }
  return rows;
}

function normId(val) {
  if (val == null || val === "") return null;
  return String(val);
}

/** Build "Grouped By Buyer": each buyer has list of suppliers (each supplier once) with no_of_boxes and items. When includeDelivered is false, skip suppliers that have delivered. */
function buildGroupedByBuyer(purchaseReturns, includeDelivered = true) {
  if (!Array.isArray(purchaseReturns)) return [];
  const byBuyer = new Map();
  for (const pr of purchaseReturns) {
    const prId = pr.purchase_return_id ?? pr.id;
    for (const emp of pr.employees || []) {
      const buyerCode = emp.employee_code ?? "";
      const buyerName =
        emp.employee?.employee_name ??
        emp.employee?.name ??
        emp.employee_name ??
        (buyerCode || "—");
      const key = buyerCode || `name-${buyerName}`;
      if (!byBuyer.has(key)) {
        byBuyer.set(key, {
          buyerCode,
          buyerName,
          supplierMap: new Map(),
        });
      }
      const buyerEntry = byBuyer.get(key);
      for (const s of emp.suppliers || []) {
        const isDelivered =
          Array.isArray(s.delivered) && s.delivered.length > 0;
        if (!includeDelivered && isDelivered) continue;
        const supplierName =
          s.supplier?.name ?? s.supplier?.supplier_name ?? "—";
        const sid = s.supplier_id ?? s.master_id;
        const skey = normId(sid) || `name-${supplierName}`;
        const no_of_boxes = Number(s.no_of_boxes) || 0;
        const items = (s.items || []).map((it) => ({
          product_name:
            it.product?.de_display_name ??
            it.product?.de_name ??
            it.product?.product_name ??
            it.item_name ??
            "—",
          qty: it.qty ?? "—",
          total_amount: it.total_amount != null ? it.total_amount : "—",
          pr_no: it.pr_no ?? "—",
          outlet_name: it.outlet_name ?? it.outlet?.branch_name ?? "—",
          purchase_return_id: prId,
          delivered: isDelivered,
        }));
        if (!buyerEntry.supplierMap.has(skey)) {
          buyerEntry.supplierMap.set(skey, {
            supplierName,
            supplier_id: sid,
            no_of_boxes: 0,
            items: [],
          });
        }
        const supEntry = buyerEntry.supplierMap.get(skey);
        supEntry.no_of_boxes += no_of_boxes;
        supEntry.items.push(...items);
      }
    }
  }
  return Array.from(byBuyer.values())
    .map((b) => ({
      buyerCode: b.buyerCode,
      buyerName: b.buyerName,
      suppliers: Array.from(b.supplierMap.values()),
    }))
    .filter((b) => b.suppliers.length > 0);
}

/** Build "Grouped By Supplier": each supplier has all items (from any buyer/PR). When includeDelivered is false, skip suppliers that have delivered. */
function buildGroupedBySupplier(purchaseReturns, includeDelivered = true) {
  if (!Array.isArray(purchaseReturns)) return [];
  const bySupplier = new Map();
  for (const pr of purchaseReturns) {
    const prId = pr.purchase_return_id ?? pr.id;
    for (const emp of pr.employees || []) {
      const buyerName =
        emp.employee?.employee_name ??
        emp.employee?.name ??
        emp.employee_name ??
        emp.employee_code ??
        "—";
      for (const s of emp.suppliers || []) {
        const isDelivered =
          Array.isArray(s.delivered) && s.delivered.length > 0;
        if (!includeDelivered && isDelivered) continue;
        const sid = s.supplier_id ?? s.master_id;
        const key =
          normId(sid) ||
          `name-${s.supplier?.name ?? s.supplier?.supplier_name ?? ""}`;
        const supplierName =
          s.supplier?.name ?? s.supplier?.supplier_name ?? "—";
        if (!bySupplier.has(key)) {
          bySupplier.set(key, {
            supplier_id: sid,
            supplierName,
            items: [],
          });
        }
        const supplierEntry = bySupplier.get(key);
        for (const it of s.items || []) {
          supplierEntry.items.push({
            product_name:
              it.product?.de_display_name ??
              it.product?.de_name ??
              it.product?.product_name ??
              it.item_name ??
              "—",
            qty: it.qty ?? "—",
            total_amount: it.total_amount != null ? it.total_amount : "—",
            pr_no: it.pr_no ?? "—",
            outlet_name: it.outlet_name ?? it.outlet?.branch_name ?? "—",
            buyer_name: buyerName,
            purchase_return_id: prId,
            delivered: isDelivered,
          });
        }
      }
    }
  }
  return Array.from(bySupplier.values()).filter((s) => s.items.length > 0);
}

const STATUS_COLUMN = {
  field: "delivered",
  headerName: "Status",
  width: 120,
  type: "badge-column",
  valueGetter: (params) => {
    const delivered = params.data?.delivered;
    return {
      label: delivered ? "Returned" : "Not Returned",
      colorScheme: delivered ? "green" : "gray",
    };
  },
};

const ITEMS_COLUMN_DEFS = [
  { field: "product_name", headerName: "Product", flex: 1, minWidth: 160 },
  { field: "qty", headerName: "Qty", width: 90 },
  { field: "total_amount", headerName: "Amount", width: 110 },
  { field: "pr_no", headerName: "PR No", width: 100 },
  { field: "outlet_name", headerName: "Outlet", flex: 1, minWidth: 100 },
  STATUS_COLUMN,
];

const ITEMS_COLUMN_DEFS_WITH_BUYER = [
  { field: "buyer_name", headerName: "Buyer", flex: 1, minWidth: 120 },
  ...ITEMS_COLUMN_DEFS,
];

function StockDetails() {
  const { purchaseReturns, loading } = usePurchaseReturns();
  const [detailsTab, setDetailsTab] = useState("by_buyer");
  const [showDelivered, setShowDelivered] = useState(false);

  const exportAsCsv = useCallback((rows, filename) => {
    if (!rows?.length) {
      toast.error("No data to export");
      return;
    }
    try {
      downloadCsv(rows, `${filename}.csv`);
      toast.success("Exported as CSV");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export CSV");
    }
  }, []);

  const exportAsXlsx = useCallback((rows, filename) => {
    if (!rows?.length) {
      toast.error("No data to export");
      return;
    }
    try {
      exportToExcel([rows], ["Sheet1"], `${filename}.xlsx`);
      toast.success("Exported as XLSX");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export XLSX");
    }
  }, []);

  const exportAsPdf = useCallback((rows, filename, headers) => {
    if (!rows?.length) {
      toast.error("No data to export");
      return;
    }
    try {
      generatePDFWithToast({
        data: rows,
        headers:
          headers ||
          Object.keys(rows[0] || {}).reduce(
            (acc, k) => ({ ...acc, [k]: k }),
            {}
          ),
        pdf_name: filename,
        title: "Stock Details",
        size: "md",
        orientation: "landscape",
        s3_folder: "ag-grid-tmp",
      }).then((response) => {
        const pdfData = response?.code === 200 ? response?.data : response;
        const pdfUrl = pdfData?.pdf_url;
        if (pdfUrl) window.open(pdfUrl, "_blank");
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PDF");
    }
  }, []);

  const groupedByBuyer = useMemo(
    () => buildGroupedByBuyer(purchaseReturns, showDelivered),
    [purchaseReturns, showDelivered]
  );
  const groupedBySupplier = useMemo(
    () => buildGroupedBySupplier(purchaseReturns, showDelivered),
    [purchaseReturns, showDelivered]
  );

  if (loading) {
    return (
      <GlobalWrapper permissionKey="view_purchase_return_issue_entry">
        <CustomContainer title="Stock Details" fullWidth>
          <Flex justifyContent="center" py={10}>
            <Spinner size="lg" />
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey="view_purchase_return_issue_entry">
      <CustomContainer
        title="Stock Details"
        fullWidth
        rightSection={
          <Flex alignItems="center" gap={3}>
            <Checkbox.Root
              size="sm"
              checked={showDelivered}
              onCheckedChange={(e) => setShowDelivered(e.checked === true)}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label fontSize="sm" color="brand700">
                Show Returned
              </Checkbox.Label>
            </Checkbox.Root>
            {/* {detailsTab === "by_buyer" && groupedByBuyer.length > 0 && (
              <CustomMenu
                customButton={
                  <Button size="xs" variant="outline" colorPalette="primary">
                    Export
                  </Button>
                }
                colorPalette="primary"
                items={[
                  {
                    label: "Export as CSV",
                    value: "csv",
                    onClick: () => {
                      const rows = buildAllBuyersExportRows(groupedByBuyer);
                      exportAsCsv(rows, "stock-details-by-buyer-all");
                    },
                  },
                  {
                    label: "Export as XLSX",
                    value: "xlsx",
                    onClick: () => {
                      const rows = buildAllBuyersExportRows(groupedByBuyer);
                      exportAsXlsx(rows, "stock-details-by-buyer-all");
                    },
                  },
                  {
                    label: "Export as PDF",
                    value: "pdf",
                    onClick: () => {
                      const rows = buildAllBuyersExportRows(groupedByBuyer);
                      exportAsPdf(
                        rows,
                        "stock-details-by-buyer-all",
                        EXPORT_HEADERS_WITH_BUYER
                      );
                    },
                  },
                ]}
              />
            )} */}
          </Flex>
        }
      >
        <Tabs.Root
          value={detailsTab}
          onValueChange={(e) => {
            const next =
              typeof e === "string" ? e : e?.value ?? e?.target?.value;
            setDetailsTab(next ?? "by_buyer");
          }}
        >
          <Tabs.List mb={4}>
            <Tabs.Trigger value="by_buyer">Grouped By Buyer</Tabs.Trigger>
            <Tabs.Trigger value="by_supplier">Grouped By Supplier</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="by_buyer">
            <Box>
              {groupedByBuyer.length === 0 ? (
                <Text color="gray.600">No purchase return data.</Text>
              ) : (
                <Accordion.Root multiple gap={0}>
                  {groupedByBuyer.map((buyer, bi) => (
                    <Accordion.Item
                      key={`buyer-${bi}-${buyer.buyerCode}`}
                      value={`buyer-${bi}`}
                      bg="gray.50"
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="gray.200"
                      overflow="hidden"
                      mb={4}
                    >
                      <Accordion.ItemTrigger
                        _hover={{ bg: "gray.100" }}
                        px={4}
                        py={3}
                      >
                        <Flex
                          alignItems="center"
                          justifyContent="space-between"
                          w="100%"
                        >
                          <HStack gap={3}>
                            <Icon as={FaUser} boxSize="4" color="gray.500" />
                            <Text fontWeight="semibold" fontSize="md">
                              {buyer.buyerName || "—"}
                            </Text>
                            {buyer.buyerCode && (
                              <Badge
                                size="sm"
                                variant="subtle"
                                colorPalette="gray"
                              >
                                {buyer.buyerCode}
                              </Badge>
                            )}
                            <Badge
                              size="sm"
                              variant="outline"
                              colorPalette="gray"
                            >
                              {buyer.suppliers.length} supplier(s)
                            </Badge>
                          </HStack>
                          <HStack gap={2} onClick={(e) => e.stopPropagation()}>
                            <CustomMenu
                              customButton={
                                <Button
                                  size="xs"
                                  variant="subtle"
                                  colorPalette="secondary"
                                >
                                  Export
                                </Button>
                              }
                              items={[
                                {
                                  label: "Export as CSV",
                                  value: "csv",
                                  onClick: () => {
                                    const rows = buildBuyerExportRows(buyer);
                                    exportAsCsv(
                                      rows,
                                      `stock-details-${(
                                        buyer.buyerName || "buyer"
                                      ).replace(/\s+/g, "-")}`
                                    );
                                  },
                                },
                                {
                                  label: "Export as XLSX",
                                  value: "xlsx",
                                  onClick: () => {
                                    const rows = buildBuyerExportRows(buyer);
                                    exportAsXlsx(
                                      rows,
                                      `stock-details-${(
                                        buyer.buyerName || "buyer"
                                      ).replace(/\s+/g, "-")}`
                                    );
                                  },
                                },
                                {
                                  label: "Export as PDF",
                                  value: "pdf",
                                  onClick: () => {
                                    const rows = buildBuyerExportRows(buyer);
                                    exportAsPdf(
                                      rows,
                                      `stock-details-${(
                                        buyer.buyerName || "buyer"
                                      ).replace(/\s+/g, "-")}`,
                                      EXPORT_HEADERS
                                    );
                                  },
                                },
                              ]}
                            />
                            <Accordion.ItemIndicator />
                          </HStack>
                        </Flex>
                      </Accordion.ItemTrigger>
                      <Accordion.ItemContent px={4} pb={4} pt={0}>
                        <VStack align="stretch" gap={4} mt={2}>
                          {buyer.suppliers.map((sup, si) => (
                            <Box
                              key={`${sup.supplier_id}-${si}`}
                              bg="white"
                              borderRadius="md"
                              borderWidth="1px"
                              borderColor="gray.200"
                              p={4}
                            >
                              <Flex alignItems="center" gap={2} mb={3}>
                                <Icon
                                  as={FaBoxOpen}
                                  boxSize="4"
                                  color="gray.500"
                                />
                                <Text fontWeight="medium" fontSize="sm">
                                  {sup.supplierName}
                                </Text>
                                <Badge
                                  size="sm"
                                  colorPalette="blue"
                                  variant="subtle"
                                >
                                  No of boxes: {sup.no_of_boxes}
                                </Badge>
                              </Flex>
                              {sup.items.length === 0 ? (
                                <Text fontSize="sm" color="gray.500">
                                  No items
                                </Text>
                              ) : (
                                <AgGrid
                                  rowData={sup.items}
                                  columnDefs={ITEMS_COLUMN_DEFS}
                                  tableKey={`stock-by-buyer-${bi}-sup-${si}`}
                                  defaultRows={Math.min(sup.items.length, 10)}
                                  pagination={sup.items.length > 10}
                                  gridOptions={{
                                    domLayout: "normal",
                                    headerHeight: 36,
                                    rowHeight: 36,
                                  }}
                                />
                              )}
                            </Box>
                          ))}
                        </VStack>
                      </Accordion.ItemContent>
                    </Accordion.Item>
                  ))}
                </Accordion.Root>
              )}
            </Box>
          </Tabs.Content>

          <Tabs.Content value="by_supplier">
            <Box>
              {groupedBySupplier.length === 0 ? (
                <Text color="gray.600">No purchase return data.</Text>
              ) : (
                <Accordion.Root multiple gap={0}>
                  {groupedBySupplier.map((supplier, si) => (
                    <Accordion.Item
                      key={`sup-${si}-${supplier.supplier_id}`}
                      value={`sup-${si}`}
                      bg="gray.50"
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="gray.200"
                      overflow="hidden"
                      mb={4}
                    >
                      <Accordion.ItemTrigger
                        _hover={{ bg: "gray.100" }}
                        px={4}
                        py={3}
                      >
                        <Flex
                          alignItems="center"
                          justifyContent="space-between"
                          w="100%"
                        >
                          <HStack gap={3}>
                            <Icon as={FaBoxOpen} boxSize="4" color="gray.500" />
                            <Text fontWeight="semibold" fontSize="md">
                              {supplier.supplierName || "—"}
                            </Text>
                            <Badge
                              size="sm"
                              variant="outline"
                              colorPalette="gray"
                            >
                              {supplier.items.length} item(s)
                            </Badge>
                          </HStack>
                          <Accordion.ItemIndicator />
                        </Flex>
                      </Accordion.ItemTrigger>
                      <Accordion.ItemContent px={4} pb={4} pt={0}>
                        <Box mt={2} bg="white" borderRadius="md" p={4}>
                          {supplier.items.length === 0 ? (
                            <Text fontSize="sm" color="gray.500">
                              No items
                            </Text>
                          ) : (
                            <AgGrid
                              rowData={supplier.items}
                              columnDefs={ITEMS_COLUMN_DEFS_WITH_BUYER}
                              tableKey={`stock-by-supplier-${si}`}
                              defaultRows={Math.min(supplier.items.length, 10)}
                              pagination={supplier.items.length > 10}
                              gridOptions={{
                                domLayout: "normal",
                                headerHeight: 36,
                                rowHeight: 36,
                              }}
                            />
                          )}
                        </Box>
                      </Accordion.ItemContent>
                    </Accordion.Item>
                  ))}
                </Accordion.Root>
              )}
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default StockDetails;
