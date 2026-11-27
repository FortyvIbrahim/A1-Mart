"use client";

import CustomDialog from "@/components/CustomDialog";
import CustomInput from "@/components/CustomInput";
import EmptyImage from "@/components/EmptyImage";
import AgGrid from "@/components/AgGrid";
import BarcodeScannerControl from "@/components/StockChecker/BarcodeScannerControl";
import { capitalizeWords } from "@/utils/string";
import { findProductByBarcodeScan } from "@/utils/stockChecker";
import { formatStockDisplay } from "@/utils/stockFormat";
import { getProductById } from "@/api/helpers/products";
import {
  Badge,
  Box,
  Button,
  Flex,
  FormatNumber,
  HStack,
  Separator,
  Spinner,
  Text,
  VStack,
  useBreakpointValue,
} from "@chakra-ui/react";
import Image from "next/image";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";

function Money({ value }) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "—";
  }
  return <FormatNumber value={n} style="currency" currency="INR" />;
}

const BRANCH_GRID_COL_DEFS = [
  {
    field: "branch_name",
    headerName: "Branch",
    type: "capitalized",
    flex: 1.2,
    minWidth: 140,
  },
  {
    field: "stock",
    headerName: "Stk",
    width: 72,
    maxWidth: 88,
    valueFormatter: (params) => formatStockDisplay(params.value),
  },
  {
    field: "cost_price",
    headerName: "Cost",
    type: "currency",
    minWidth: 96,
  },
  {
    field: "selling_price",
    headerName: "Sell",
    type: "currency",
    minWidth: 96,
  },
  {
    field: "purchase_price",
    headerName: "Buy",
    type: "currency",
    minWidth: 96,
  },
  {
    headerName: "Status",
    width: 100,
    maxWidth: 110,
    type: "badge-column",
    valueGetter: (p) => {
      const stock = Number(p.data?.stock ?? 0);
      const inStock = stock > 0;
      return {
        label: inStock ? "In" : "Out",
        colorScheme: inStock ? "green" : "red",
      };
    },
  },
];

function MobileBranchCard({ row }) {
  const stock = Number(row?.stock ?? 0);
  const inStock = stock > 0;
  return (
    <Flex
      w="100%"
      flexShrink={0}
      direction="column"
      justify="center"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      bg="white"
      px={2.5}
      py={2}
      gap={1.5}
    >
      <Text
        fontSize="xs"
        fontWeight="bold"
        color="gray.800"
        lineHeight="short"
        whiteSpace="normal"
        wordBreak="break-word"
      >
        {row.branch_name ?? "—"}
      </Text>
      <Flex
        flexWrap="wrap"
        columnGap={2}
        rowGap={0.5}
        align="center"
        fontSize="2xs"
        color="gray.600"
      >
        <Box as="span" whiteSpace="nowrap">
          Cost <Money value={row.cost_price} />
        </Box>
        <Text as="span" color="gray.300">
          |
        </Text>
        <Box as="span" whiteSpace="nowrap">
          Sell <Money value={row.selling_price} />
        </Box>
        <Text as="span" color="gray.300">
          |
        </Text>
        <Box as="span" whiteSpace="nowrap">
          Buy <Money value={row.purchase_price} />
        </Box>
      </Flex>
      <Box>
        <Badge
          colorPalette={inStock ? "green" : "red"}
          variant="subtle"
          fontSize="2xs"
          px={1.5}
          py={0}
        >
          {inStock
            ? `In stock (${formatStockDisplay(stock)})`
            : "Out of stock"}
        </Badge>
      </Box>
    </Flex>
  );
}

/**
 * @param {boolean} open
 * @param {(e: { open: boolean }) => void} onOpenChange
 * @param {object | null} product
 * @param {(p: object | null) => void} onProductChange
 * @param {object[]|undefined} products — catalog for search / scan (full `products` from useProducts)
 * @param {import('react').ReactNode} [extraRender] — optional content above the search row (this modal only)
 */
function PriceCheckModal({
  open,
  onOpenChange,
  product,
  onProductChange,
  products,
  extraRender = null,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const onProductChangeRef = useRef(onProductChange);
  onProductChangeRef.current = onProductChange;

  useEffect(() => {
    if (!open) return;
    setSearchQuery("");
  }, [open]);

  useEffect(() => {
    if (product?.product_id != null) {
      setSearchQuery(String(product.product_id));
    }
  }, [product?.product_id]);

  useEffect(() => {
    if (!open || product?.product_id == null) {
      setDetailProduct(null);
      setDetailLoading(false);
      return;
    }

    const id = product.product_id;
    let cancelled = false;

    (async () => {
      setDetailLoading(true);
      setDetailProduct(null);
      try {
        const data = await getProductById(id, true, true);
        if (cancelled) return;
        if (data?.product_id != null) {
          setDetailProduct(data);
        } else {
          toast.error("No product found for this ID");
          onProductChangeRef.current?.(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          toast.error("Error loading product");
          onProductChangeRef.current?.(null);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, product?.product_id]);

  const displayProduct = detailProduct ?? product;

  const rows = useMemo(() => {
    if (!detailProduct?.stock_price?.length) return [];
    return [...detailProduct.stock_price].sort((a, b) =>
      String(a.branch_name ?? "").localeCompare(String(b.branch_name ?? ""))
    );
  }, [detailProduct]);

  const totalStock = useMemo(() => {
    return rows.reduce((acc, r) => acc + Number(r?.stock ?? 0), 0);
  }, [rows]);

  const applyProductSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) {
      onProductChange?.(null);
      return;
    }
    if (!/^\d+$/.test(q)) {
      toast.error("Enter a numeric product ID");
      onProductChange?.(null);
      return;
    }
    onProductChange?.({ product_id: Number(q) });
  }, [searchQuery, onProductChange]);

  const handleBarcodeFound = useCallback(
    (decodedText) => {
      if (!products?.length) {
        toast.error("Product list is not loaded yet");
        return;
      }
      const p = findProductByBarcodeScan(products, decodedText);
      if (!p) {
        toast.error("No product found for this barcode");
        return;
      }
      onProductChange?.(p);
    },
    [products, onProductChange]
  );

  const handleBackToSearch = useCallback(() => {
    onProductChange?.(null);
    setSearchQuery("");
    setDetailProduct(null);
  }, [onProductChange]);

  const canScanBarcode = Array.isArray(products) && products.length > 0;
  const name =
    displayProduct?.product_name ?? displayProduct?.de_display_name ?? "";
  const isMobileBranchCards =
    useBreakpointValue({ base: true, md: false }) ?? true;

  const branchGridRows = useMemo(
    () =>
      rows.map((r, i) => ({
        id: String(r.branch_id ?? `row-${i}`),
        branch_name: r.branch_name ?? "—",
        stock: Number(r.stock ?? 0),
        cost_price: r.cost_price,
        selling_price: r.selling_price,
        purchase_price: r.purchase_price,
      })),
    [rows]
  );

  return (
    <CustomDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Check price"
      maxW="min(100vw - 24px, 680px)"
      maxH="min(100dvh - 12px, 92dvh)"
      contentProps={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      bodyProps={{
        p: 0,
        flex: "1",
        minH: "0",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
      }}
      footer={
        product ? (
          <Box py={3} w="100%">
            <HStack gap={3} w="100%" justify="flex-end">
              <Button
                type="button"
                variant="subtle"
                colorPalette="secondary"
                size="md"
                onClick={handleBackToSearch}
              >
                Back
              </Button>
            </HStack>
          </Box>
        ) : null
      }
    >
      <Flex direction="column" w="100%" minW={0}>
        <Box px={4} pt={4} pb={3} flexShrink={0}>
          {extraRender ? <Box mb={4}>{extraRender}</Box> : null}

          {!product ? (
            <VStack align="stretch" gap={3}>
              <Text fontSize="xs" fontWeight="medium" color="gray.600">
                Product ID
              </Text>
              <HStack align="flex-end" gap={2} flexWrap="wrap">
                <Box flex="1" minW="min(100%, 140px)">
                  <CustomInput
                    name="price_check_modal_product_id"
                    method="input"
                    label=""
                    placeholder="e.g. 100438"
                    type="text"
                    inputMode="numeric"
                    enterKeyHint="search"
                    size="sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value ?? "")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyProductSearch();
                      }
                    }}
                  />
                </Box>
                <Button
                  type="button"
                  size="sm"
                  variant="solid"
                  colorPalette="brand"
                  minH="36px"
                  px={4}
                  onClick={applyProductSearch}
                >
                  Find
                </Button>
                {canScanBarcode ? (
                  <BarcodeScannerControl
                    onBarcodeFound={handleBarcodeFound}
                    scanButtonAriaLabel="Scan barcode to check price"
                    dialogTitle="Scan for price check"
                    hintText="Point the camera at the product barcode."
                  />
                ) : null}
              </HStack>
            </VStack>
          ) : null}
        </Box>

        {!product ? (
          <Box px={4} pb={6}>
            <Flex
              align="center"
              justify="center"
              minH="120px"
              borderWidth="1px"
              borderColor="gray.100"
              borderRadius="md"
              bg="gray.50"
            >
              <Text fontSize="sm" color="gray.500" textAlign="center" px={4}>
                {canScanBarcode
                  ? "Enter a product ID and tap Find, or scan a barcode to view stock and prices."
                  : "Enter a product ID and tap Find to view stock and prices."}
              </Text>
            </Flex>
          </Box>
        ) : (
          <>
            <Box px={4} pb={3} flexShrink={0}>
              <Flex gap={3} align="stretch">
                <Box
                  w={{ base: "92px", sm: "108px" }}
                  flexShrink={0}
                  borderRadius="md"
                  overflow="hidden"
                  bg="gray.50"
                  borderWidth="1px"
                  borderColor="gray.200"
                  alignSelf="stretch"
                  minH="72px"
                >
                  <Flex
                    w="100%"
                    h="100%"
                    minH="72px"
                    align="center"
                    justify="center"
                    p={1}
                  >
                    {displayProduct.image_url ? (
                      <Image
                        src={displayProduct.image_url}
                        alt={name || "Product"}
                        width={160}
                        height={160}
                        style={{
                          width: "100%",
                          height: "100%",
                          maxHeight: "100%",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <EmptyImage width="100%" height="100%" />
                    )}
                  </Flex>
                </Box>
                <VStack align="stretch" gap={0.5} flex="1" minW="0">
                  <Text
                    fontSize="sm"
                    fontWeight="bold"
                    color="gray.800"
                    lineHeight="short"
                    css={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {detailLoading && !detailProduct
                      ? "Loading…"
                      : capitalizeWords(name || "—")}
                  </Text>
                  <Flex
                    w="100%"
                    mt={2}
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                    overflow="hidden"
                  >
                    <Flex
                      flex={1}
                      direction="column"
                      align="center"
                      justify="center"
                      py={2.5}
                      px={2}
                      bg="brand.50"
                      borderRightWidth="1px"
                      borderColor="gray.200"
                      gap={0.5}
                    >
                      <Text
                        fontSize="2xs"
                        fontWeight="semibold"
                        color="brand.700"
                        textTransform="uppercase"
                      >
                        ID
                      </Text>
                      <Text
                        fontSize="lg"
                        fontWeight="bold"
                        color="brand.800"
                        lineHeight="1"
                      >
                        {displayProduct.product_id}
                      </Text>
                    </Flex>
                    <Flex
                      flex={1}
                      direction="column"
                      align="center"
                      justify="center"
                      py={2.5}
                      px={2}
                      bg="gray.50"
                      gap={0.5}
                    >
                      <Text
                        fontSize="2xs"
                        fontWeight="semibold"
                        color="gray.600"
                        textTransform="uppercase"
                      >
                        Available
                      </Text>
                      <Text
                        fontSize="lg"
                        fontWeight="bold"
                        color="gray.800"
                        lineHeight="1"
                      >
                        {detailLoading ? "—" : formatStockDisplay(totalStock)}
                      </Text>
                    </Flex>
                  </Flex>
                </VStack>
              </Flex>
            </Box>

            <Separator />

            <Box px={4} py={3} display="flex" flexDirection="column" minW={0}>
              {detailLoading ? (
                <Flex align="center" justify="center" py={10}>
                  <Spinner size="lg" colorPalette="brand" />
                </Flex>
              ) : rows.length === 0 ? (
                <Text fontSize="xs" color="gray.500" textAlign="center" py={3}>
                  No branch stock rows for this product.
                </Text>
              ) : isMobileBranchCards ? (
                <Flex
                  direction="column"
                  gap={1.5}
                  w="100%"
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  p={2}
                  bg="gray.50"
                >
                  {rows.map((row, idx) => (
                    <MobileBranchCard
                      key={`${row.branch_id ?? idx}-${idx}`}
                      row={row}
                    />
                  ))}
                </Flex>
              ) : (
                <Box
                  w="100%"
                  maxW="100%"
                  overflowX="auto"
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                >
                  <AgGrid
                    rowData={branchGridRows}
                    colDefs={BRANCH_GRID_COL_DEFS}
                    tableKey="price-check-modal-branches"
                    pagination={false}
                    showColumnSettings={false}
                    noMobileVersion
                    colorPalette="secondary"
                    gridOptions={{
                      suppressCellFocus: true,
                    }}
                  />
                </Box>
              )}
            </Box>
          </>
        )}
      </Flex>
    </CustomDialog>
  );
}

export default PriceCheckModal;
