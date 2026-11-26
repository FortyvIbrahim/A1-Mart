"use client";

import useBranches from "@/api/customHooks/useBranches";
import useProductBrands from "@/api/customHooks/useProductBrands";
import useProductBuyers from "@/api/customHooks/useProductBuyers";
import useProductCategories from "@/api/customHooks/useProductCategories";
import useProductDepartments from "@/api/customHooks/useProductDepartments";
import useProductManufacturer from "@/api/customHooks/useProductManufacturer";
import useProducts from "@/api/customHooks/useProducts";
import useProductSubcategories from "@/api/customHooks/useProductSubcategories";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import EmptyImage from "@/components/EmptyImage";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomInput from "@/components/CustomInput";
import FilterDropdown from "@/components/StockChecker/FilterDropdown";
import ProductCardPrice from "@/components/StockChecker/ProductCardPrice";
import BarcodeScannerControl from "@/components/StockChecker/BarcodeScannerControl";
import PriceCheckModal from "@/components/StockChecker/PriceCheckModal";
import usePriceCheckerFilters from "@/customHooks/usePriceCheckerFilters";
import {
  filterProductsByUserFilters,
  normalizeEan,
} from "@/utils/stockChecker";
import { generatePDFWithToast } from "@/utils/pdfGenerator";
import { transformDataForExport } from "@/utils/aggridExport";
import { formatStockDisplay } from "@/utils/stockFormat";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Grid,
  HStack,
  Text,
  useBreakpointValue,
  VStack,
} from "@chakra-ui/react";
import moment from "moment";
import React, { useCallback, useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import toast from "react-hot-toast";

function PriceChecker() {
  const { branches } = useBranches();
  const { departments } = useProductDepartments();
  const { categories } = useProductCategories();
  const { subcategories } = useProductSubcategories();
  const { brands } = useProductBrands();
  const { manufacturers } = useProductManufacturer();
  const { buyers } = useProductBuyers();

  const isMobile = useBreakpointValue({ base: true, md: false });

  const {
    selectedBranch,
    setSelectedBranch,
    selectedDepartment,
    setSelectedDepartment,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    filteredCategories,
    filteredSubcategories,
  } = usePriceCheckerFilters(categories, subcategories);

  const [hideOutOfStock, setHideOutOfStock] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState("");
  const [scannedEanFilter, setScannedEanFilter] = useState(null);
  /** Updated from CustomInput onChange after debounceMs (mobile product list filter). */
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [checkPriceModalOpen, setCheckPriceModalOpen] = useState(false);
  const [priceCheckProduct, setPriceCheckProduct] = useState(null);

  const { products, filteredProducts } = useProducts({
    withStockPrice: true,
    filters: {
      branch_id: selectedBranch,
      department_id: selectedDepartment,
      category_id: selectedCategory,
      subcategory_id: selectedSubcategory,
      hide_out_of_stock: hideOutOfStock,
      brand_id: selectedBrand,
      manufacturer: selectedManufacturer,
      buyer: selectedBuyer,
    },
  });

  const eanSearchFilteredProducts = useMemo(() => {
    return filterProductsByUserFilters(filteredProducts, {
      ean_number: scannedEanFilter?.trim()
        ? scannedEanFilter.trim()
        : undefined,
      product_search:
        isMobile === true
          ? debouncedProductSearch.trim() || undefined
          : undefined,
    });
  }, [filteredProducts, scannedEanFilter, debouncedProductSearch, isMobile]);

  const handleBarcodeFound = useCallback((decodedText) => {
    const trimmed = String(decodedText ?? "").trim();
    if (!trimmed) {
      toast.error("Empty scan");
      return;
    }
    setScannedEanFilter(trimmed);
    toast.success(`Filtering by EAN ${normalizeEan(trimmed)}`);
  }, []);

  // Pre-compute values for totals computation
  const productsWithComputedValues = useMemo(() => {
    return eanSearchFilteredProducts.map((product) => {
      const stockPrice = Array.isArray(product?.stock_price)
        ? product.stock_price
        : [];

      const purchasePrice = stockPrice.reduce(
        (acc, curr) => acc + Number(curr.purchase_price || 0),
        0
      );

      const totalStock = stockPrice.reduce(
        (acc, curr) => acc + Number(curr.stock || 0),
        0
      );

      const totalPurchasePrice = purchasePrice * totalStock;

      return {
        ...product,
        purchase_price: purchasePrice,
        total_purchase_price: totalPurchasePrice,
        total_stock: totalStock,
      };
    });
  }, [eanSearchFilteredProducts]);

  const colDefs = [
    {
      field: "product_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "image_url",
      headerName: "Image",
      type: "image",
    },
    {
      field: "product_name",
      headerName: "Name",
      type: "capitalized",
    },
    {
      field: "department_name",
      headerName: "Department",
      type: "capitalized",
    },
    {
      field: "category_name",
      headerName: "Category",
      type: "capitalized",
    },
    {
      field: "subcategory_name",
      headerName: "Subcategory",
      type: "capitalized",
    },
    {
      field: "brand_name",
      headerName: "Brand",
      type: "capitalized",
    },
    {
      field: "gf_manufacturer",
      headerName: "Manufacturer",
      type: "capitalized",
    },
    {
      field: "purchase_price",
      headerName: "Purchase Price",
      type: "currency",
    },
    {
      field: "total_purchase_price",
      headerName: "Total Purchase Price",
      type: "currency",
    },
    {
      field: "total_stock",
      headerName: "Total Stock",
      type: "number",
      cellRenderer: (params) => {
        const inStock = params.value > 0;
        const formattedStock = formatStockDisplay(params.value);
        return (
          <Badge colorPalette={inStock ? "green" : "red"}>
            {inStock ? "In Stock" : "Out of Stock"} ({formattedStock})
          </Badge>
        );
      },
    },
    {
      headerName: "Action",
      type: "action-column",
      valueGetter: (params) => {
        const row = params.data;
        return [
          {
            label: "Check Price",
            value: "checkPrice",
            onClick: () => {
              if (!row?.product_id) return;
              setPriceCheckProduct(row);
              setCheckPriceModalOpen(true);
            },
          },
          {
            label: "View Purchase History",
            value: "view",
            redirectionUrl: `/products/price-checker/${params.data.product_id}`,
          },
        ];
      },
    },
  ];

  const mobileProductData = useMemo(() => {
    return productsWithComputedValues.map((product) => {
      const productId = product.product_id;
      const totalStock = product.total_stock || 0;

      return {
        product,
        totalStock,
        productId,
      };
    });
  }, [productsWithComputedValues]);

  const handleExportPDF = async () => {
    try {
      if (productsWithComputedValues.length === 0) return;

      // Transform data based on column definitions
      const transformedData = transformDataForExport(
        productsWithComputedValues,
        colDefs
      );

      // Create headers from the transformed data keys
      const headers = {};
      if (transformedData.length > 0) {
        Object.keys(transformedData[0]).forEach((key) => {
          headers[key] = key;
        });
      }

      const fileName = `price-checker-${moment().format(
        "DD-MM-YYYY-HH-mm-ss"
      )}.pdf`;

      const response = await generatePDFWithToast({
        data: transformedData,
        headers: headers,
        pdf_name: fileName,
        title: "Price Checker",
        size: "md",
        orientation: "landscape",
        s3_folder: `reports/price-checker`,
      });
      const pdfUrl =
        response.code === 200 ? response.data.pdf_url : response.pdf_url;
      if (pdfUrl) {
        window.open(pdfUrl, "_blank");
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
    }
  };

  const renderProductCard = (index, itemData) => {
    if (!itemData || !itemData.product) return null;
    const { product, totalStock, productId } = itemData;

    return (
      <ProductCardPrice
        key={productId}
        product={product}
        totalStock={totalStock}
        onOpenPriceCheck={(p) => {
          setPriceCheckProduct(p);
          setCheckPriceModalOpen(true);
        }}
      />
    );
  };

  return (
    <GlobalWrapper permissionKey="view_price_checker">
      <Flex flexDirection="column" gap="22px">
        <CustomContainer
          title="Price Checker"
          color="brand"
          size="sm"
          rightSection={<Button onClick={handleExportPDF}>Export</Button>}
        >
          <Flex flexDirection="column" gap="22px">
            {/* Filters */}
            <CustomContainer
              title="Filters"
              size="sm"
              color="secondary"
              collapsible={isMobile === true}
              defaultOpen={false}
            >
              <Flex flexDirection="column" gap="22px">
                <Grid
                  templateColumns={{
                    base: "1fr",
                    md: "repeat(2, 1fr)",
                    lg: "repeat(3, 1fr)",
                  }}
                  gap="22px"
                >
                  <Box gridColumn={{ base: "1", md: "1 / -1", lg: "1 / -1" }}>
                    <FilterDropdown
                      label="Branch"
                      value={selectedBranch}
                      options={branches.map((branch) => ({
                        value: branch.branch_id,
                        label: branch.branch_name,
                      }))}
                      onChange={(e) => {
                        setSelectedBranch(e.target.value);
                      }}
                      allOptionLabel="All Branches"
                    />
                  </Box>

                  <FilterDropdown
                    label="Department"
                    value={selectedDepartment}
                    options={departments.map((department) => ({
                      value: department.department_id,
                      label: department.department_name,
                    }))}
                    onChange={(e) => {
                      setSelectedDepartment(e.target.value);
                    }}
                    allOptionLabel="All Departments"
                    searchable
                  />

                  <FilterDropdown
                    label="Category"
                    value={selectedCategory}
                    options={filteredCategories.map((category) => ({
                      value: category.category_id,
                      label: category.category_name,
                    }))}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                    }}
                    disabled={!selectedDepartment}
                    allOptionLabel="All Categories"
                    searchable
                  />

                  <FilterDropdown
                    label="Subcategory"
                    value={selectedSubcategory}
                    options={filteredSubcategories.map((subcategory) => ({
                      value: subcategory.subcategory_id,
                      label: subcategory.subcategory_name,
                    }))}
                    onChange={(e) => {
                      setSelectedSubcategory(e.target.value);
                    }}
                    allOptionLabel="All Subcategories"
                    disabled={!selectedCategory}
                    searchable
                  />

                  <FilterDropdown
                    label="Manufacturer"
                    value={selectedManufacturer}
                    options={manufacturers.map((manufacturer) => ({
                      value: manufacturer.manufacturer_name,
                      label: manufacturer.manufacturer_name,
                    }))}
                    onChange={(e) => {
                      setSelectedManufacturer(e.target.value);
                    }}
                    allOptionLabel="All Manufacturers"
                    searchable
                  />

                  <FilterDropdown
                    label="Brand"
                    value={selectedBrand}
                    options={brands
                      .filter((brand) => brand.brand_name !== "")
                      .sort((a, b) => a.brand_name.localeCompare(b.brand_name))
                      .map((brand) => ({
                        value: brand.brand_id,
                        label: brand.brand_name,
                      }))}
                    onChange={(e) => {
                      setSelectedBrand(e.target.value);
                    }}
                    allOptionLabel="All Brands"
                    searchable
                  />

                  <FilterDropdown
                    label="Buyer"
                    value={selectedBuyer}
                    options={buyers.map((buyer) => ({
                      value: buyer,
                      label: buyer,
                    }))}
                    onChange={(e) => {
                      setSelectedBuyer(e.target.value);
                    }}
                    allOptionLabel="All Buyers"
                    searchable
                  />
                </Grid>
                <VStack align="start" spacing={1}>
                  <Checkbox.Root
                    checked={hideOutOfStock}
                    onClick={(e) => {
                      e.preventDefault();
                      setHideOutOfStock(!hideOutOfStock);
                    }}
                    size="sm"
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Label>
                      <Text fontSize="sm" fontWeight="normal">
                        Hide out of stock products
                      </Text>
                    </Checkbox.Label>
                  </Checkbox.Root>
                </VStack>
              </Flex>
            </CustomContainer>
          </Flex>
        </CustomContainer>

        <CustomContainer title="Products" size="sm" color="secondary">
          <Flex
            w="100%"
            align="flex-end"
            justify="space-between"
            gap={2}
            flexWrap="wrap"
            mb={4}
          >
            {isMobile ? (
              <Box flex="1" minW="min(100%, 160px)">
                <CustomInput
                  name="price_checker_product_search"
                  method="input"
                  label="Search product"
                  labelStyle={{
                    fontSize: "xs",
                    fontWeight: "medium",
                    color: "gray.600",
                  }}
                  placeholder="Product ID or name"
                  type="search"
                  enterKeyHint="search"
                  size="sm"
                  debounceMs={400}
                  value={debouncedProductSearch}
                  onChange={(e) =>
                    setDebouncedProductSearch(e.target.value ?? "")
                  }
                />
              </Box>
            ) : null}
            <HStack
              justify="flex-end"
              flexShrink={0}
              ml={isMobile ? undefined : "auto"}
              gap={2}
              flexWrap="wrap"
              w={{ base: "100%", md: "auto" }}
            >
              <BarcodeScannerControl
                activeEan={scannedEanFilter}
                onClear={() => setScannedEanFilter(null)}
                onBarcodeFound={handleBarcodeFound}
                scanButtonAriaLabel="Scan barcode to filter by EAN"
                hintText="Point the camera at the product barcode. The list will filter to that EAN."
              />
              <Button
                type="button"
                size="sm"
                variant="subtle"
                px={3}
                fontSize="sm"
                flexShrink={0}
                onClick={() => {
                  setPriceCheckProduct(null);
                  setCheckPriceModalOpen(true);
                }}
              >
                Check Price
              </Button>
            </HStack>
          </Flex>
          <PriceCheckModal
            open={checkPriceModalOpen}
            onOpenChange={(e) => {
              if (!e.open) {
                setCheckPriceModalOpen(false);
                setPriceCheckProduct(null);
              }
            }}
            product={priceCheckProduct}
            onProductChange={setPriceCheckProduct}
            products={products}
          />
          {isMobile ? (
            <Box>
              {productsWithComputedValues.length === 0 ? (
                <Box
                  p={8}
                  textAlign="center"
                  bg="gray.50"
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="gray.200"
                >
                  <Text color="gray.500" fontSize="sm">
                    No products found
                  </Text>
                </Box>
              ) : (
                <Box
                  h="calc(100dvh - 400px)"
                  minH="400px"
                  w="100%"
                  css={{
                    "&::-webkit-scrollbar": {
                      width: "6px",
                    },
                    "&::-webkit-scrollbar-track": {
                      background: "transparent",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      background: "#cbd5e0",
                      borderRadius: "3px",
                    },
                    "&::-webkit-scrollbar-thumb:hover": {
                      background: "#a0aec0",
                    },
                  }}
                >
                  <Virtuoso
                    data={mobileProductData}
                    itemContent={renderProductCard}
                    style={{ height: "100%", width: "100%" }}
                    overscan={5}
                    increaseViewportBy={200}
                  />
                </Box>
              )}
            </Box>
          ) : (
            <AgGrid
              rowData={productsWithComputedValues}
              colDefs={colDefs}
              gridOptions={{ rowHeight: 80 }}
              tableKey="price-checker"
            />
          )}
        </CustomContainer>
      </Flex>
    </GlobalWrapper>
  );
}

export default PriceChecker;
