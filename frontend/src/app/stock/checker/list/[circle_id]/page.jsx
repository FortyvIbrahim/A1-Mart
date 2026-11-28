"use client";

import useProducts from "@/api/customHooks/useProducts";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomInput from "@/components/CustomInput";
import FilterDropdown from "@/components/StockChecker/FilterDropdown";
import ProductCard from "@/components/StockChecker/ProductCard";
import {
  Box,
  Checkbox,
  Flex,
  Grid,
  Spinner,
  Text,
  useBreakpointValue,
  VStack,
} from "@chakra-ui/react";
import { Virtuoso } from "react-virtuoso";
import React, { use, useCallback, useMemo, useState } from "react";
import useBranches from "@/api/customHooks/useBranches";
import useProductBrands from "@/api/customHooks/useProductBrands";
import useProductDepartments from "@/api/customHooks/useProductDepartments";
import useProductCategories from "@/api/customHooks/useProductCategories";
import useProductSubcategories from "@/api/customHooks/useProductSubcategories";
import { capitalizeWords } from "@/utils/string";
import useStockCircleById from "@/api/customHooks/useStockCircleById";
import useStockCirclesChecked from "@/api/customHooks/useStockCirclesChecked";
import useStockCheckerFilters from "@/customHooks/useStockCheckerFilters";
import useStockCheckerProducts from "@/customHooks/useStockCheckerProducts";
import BarcodeScannerControl from "@/components/StockChecker/BarcodeScannerControl";
import { getProductStockForBranch, normalizeEan } from "@/utils/stockChecker";
import { getStockCheckerProductColDefs } from "@/components/StockChecker/stockCheckerProductColDefs";
import toast from "react-hot-toast";

function StockChecker({ params }) {
  const { circle_id } = use(params);
  const { products, loading: productsLoading } = useProducts({
    withStockPrice: true,
  });
  const { branches, loading: branchesLoading } = useBranches();
  const { brands, loading: brandsLoading } = useProductBrands();
  const { departments, loading: departmentsLoading } = useProductDepartments();
  const { categories, loading: categoriesLoading } = useProductCategories();
  const { subcategories, loading: subcategoriesLoading } =
    useProductSubcategories();
  const {
    stockCircle,
    loading: stockCircleLoading,
    error: stockCircleError,
  } = useStockCircleById(circle_id);
  const {
    stockCirclesChecked,
    createStockCircleChecked,
    loading: checkedLoading,
  } = useStockCirclesChecked(circle_id);

  const isPageLoading =
    productsLoading ||
    branchesLoading ||
    brandsLoading ||
    departmentsLoading ||
    categoriesLoading ||
    subcategoriesLoading ||
    stockCircleLoading ||
    checkedLoading;

  const isMobile = useBreakpointValue({ base: true, md: false });

  const {
    selectedBranch,
    setSelectedBranch,
    selectedDepartmentIds,
    setSelectedDepartmentIds,
    circleDeptIds,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    selectedBrand,
    setSelectedBrand,
    filteredCategories,
    filteredSubcategories,
    isBranchDisabled,
    isDepartmentDisabled,
    isCategoryDisabled,
    isSubcategoryDisabled,
  } = useStockCheckerFilters(stockCircle, categories, subcategories);

  const circleDepartmentOptions = useMemo(() => {
    const idSet = new Set(circleDeptIds.map((id) => String(id)));
    return departments
      .filter((d) => idSet.has(String(d.department_id)))
      .map((d) => ({
        value: d.department_id,
        label: capitalizeWords(d.department_name),
      }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [departments, circleDeptIds]);

  const departmentFilterIds = useMemo(() => {
    if (selectedDepartmentIds.length > 0) return selectedDepartmentIds;
    return circleDeptIds;
  }, [selectedDepartmentIds, circleDeptIds]);

  const [hideOutOfStock, setHideOutOfStock] = useState(true);
  const [scannedEanFilter, setScannedEanFilter] = useState(null);
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");

  const stockCheckerFilters = useMemo(
    () => ({
      branch_id: selectedBranch,
      department_ids: departmentFilterIds,
      category_id: selectedCategory,
      subcategory_id: selectedSubcategory,
      brand_id: selectedBrand,
      hideOutOfStock: hideOutOfStock,
      ean_number: scannedEanFilter || undefined,
      product_search:
        isMobile === true
          ? debouncedProductSearch.trim() || undefined
          : undefined,
    }),
    [
      selectedBranch,
      departmentFilterIds,
      selectedCategory,
      selectedSubcategory,
      selectedBrand,
      hideOutOfStock,
      scannedEanFilter,
      isMobile,
      debouncedProductSearch,
    ]
  );

  const { checkedStockMap, filteredProducts, summaryStats } =
    useStockCheckerProducts(
      products,
      stockCircle,
      stockCirclesChecked,
      stockCheckerFilters,
      { onlyRemainingToCheck: true }
    );

  const handleCreateStockCirclesChecked = useCallback(
    async ({ productId, checkedStock }) => {
      try {
        toast.promise(
          createStockCircleChecked({
            stock_circle_id: circle_id,
            product_id: productId,
            checked_stock: checkedStock,
          }),
          {
            loading: "Creating stock circles checked...",
            success: (response) => {
              if (response.code === 200) {
                return "Stock circles checked created successfully";
              } else {
                throw new Error(response.message);
              }
            },
            error: (err) => {
              console.log("ERROR", err);
              return "Error creating stock circles checked";
            },
          }
        );
      } catch (err) {
        console.log("ERROR", err);
      }
    },
    [circle_id, createStockCircleChecked]
  );

  const handleBarcodeFound = useCallback((decodedText) => {
    const trimmed = String(decodedText ?? "").trim();
    if (!trimmed) {
      toast.error("Empty scan");
      return;
    }

    setScannedEanFilter(trimmed);
    toast.success(`Filtering by EAN ${normalizeEan(trimmed)}`);
  }, []);

  const mobileProductData = useMemo(() => {
    return filteredProducts.map((product) => {
      const totalStock = getProductStockForBranch(
        product,
        stockCircle?.branch_id
      );
      const productId = product.product_id;
      const initialCheckedStock = checkedStockMap[productId] || null;

      return {
        product,
        totalStock,
        productId,
        initialCheckedStock,
      };
    });
  }, [filteredProducts, checkedStockMap]);

  const renderProductCard = useCallback(
    (index, itemData) => {
      if (!itemData || !itemData.product) return null;
      const { product, totalStock, productId, initialCheckedStock } = itemData;

      return (
        <ProductCard
          key={productId}
          product={product}
          totalStock={totalStock}
          initialCheckedStock={initialCheckedStock}
          onSave={handleCreateStockCirclesChecked}
        />
      );
    },
    [handleCreateStockCirclesChecked]
  );

  const colDefs = useMemo(
    () =>
      getStockCheckerProductColDefs({
        checkedStockMap,
        onSave: handleCreateStockCirclesChecked,
        listMode: "remaining",
        showCircleColumn: false,
        branchId: stockCircle?.branch_id ?? null,
      }),
    [checkedStockMap, handleCreateStockCirclesChecked, stockCircle?.branch_id]
  );

  if (isPageLoading) {
    return (
      <GlobalWrapper permissionKey="view_stock_checker">
        <CustomContainer title="Stock Checker" color="brand" size="sm">
          <Flex
            justifyContent="center"
            alignItems="center"
            minH="280px"
            py={10}
          >
            <Spinner size="lg" color="brand.500" />
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (!stockCircle) {
    return (
      <GlobalWrapper permissionKey="view_stock_checker">
        <CustomContainer title="Stock Checker" color="brand" size="sm">
          <Flex
            justifyContent="center"
            alignItems="center"
            minH="240px"
            py={10}
          >
            <Text color="gray.500" fontSize="sm">
              {stockCircleError || "Stock circle not found"}
            </Text>
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey="view_stock_checker">
      <CustomContainer title="Stock Checker" color="brand" size="sm">
        <Flex flexDirection="column" gap="22px">
          <CustomContainer title="Filters" size="sm" color="secondary">
            <Flex flexDirection="column" gap="22px">
              <Grid
                templateColumns={{
                  base: "1fr",
                  md: "repeat(2, 1fr)",
                  lg: "repeat(3, 1fr)",
                  xl: "repeat(5, 1fr)",
                }}
                gap="22px"
              >
                <FilterDropdown
                  label="Branch"
                  placeholder="Select Branch"
                  value={selectedBranch}
                  options={branches.map((branch) => ({
                    value: branch.branch_id,
                    label: capitalizeWords(branch.branch_name),
                  }))}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                  }}
                  allOptionLabel="All Branches"
                  disabled={isBranchDisabled}
                />

                <CustomInput
                  name="stock_checker_department_ids"
                  method="multiple-dropdown"
                  label="Departments"
                  placeholder={
                    circleDepartmentOptions.length
                      ? "Select departments (circle)"
                      : "No departments on this circle"
                  }
                  value={selectedDepartmentIds}
                  onChange={setSelectedDepartmentIds}
                  options={circleDepartmentOptions}
                  disabled={isDepartmentDisabled}
                  labelStyle={{
                    fontSize: "xs",
                    fontWeight: "medium",
                    color: "var(--chakra-colors-brand-600)",
                  }}
                />

                <FilterDropdown
                  label="Category"
                  placeholder="Select Category"
                  value={selectedCategory}
                  options={filteredCategories.map((category) => ({
                    value: category.category_id,
                    label: capitalizeWords(category.category_name),
                  }))}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                  }}
                  disabled={
                    isCategoryDisabled || departmentFilterIds.length === 0
                  }
                  allOptionLabel="All Categories"
                  searchable
                />

                <FilterDropdown
                  label="Subcategory"
                  placeholder="Select Subcategory"
                  value={selectedSubcategory}
                  options={filteredSubcategories.map((subcategory) => ({
                    value: subcategory.subcategory_id,
                    label: capitalizeWords(subcategory.subcategory_name),
                  }))}
                  onChange={(e) => {
                    setSelectedSubcategory(e.target.value);
                  }}
                  allOptionLabel="All Subcategories"
                  disabled={isSubcategoryDisabled || !selectedCategory}
                  searchable
                />

                <FilterDropdown
                  label="Brand"
                  placeholder="Select Brand"
                  value={selectedBrand}
                  options={brands
                    .filter((brand) => brand.brand_name !== "")
                    .sort((a, b) => a.brand_name.localeCompare(b.brand_name))
                    .map((brand) => ({
                      value: brand.brand_id,
                      label: capitalizeWords(brand.brand_name),
                    }))}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                  }}
                  allOptionLabel="All Brands"
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

          <CustomContainer title="Summary" size="sm" color="secondary">
            <Grid
              templateColumns={{
                base: "repeat(2, 1fr)",
                md: "repeat(2, 1fr)",
                lg: "repeat(5, 1fr)",
              }}
              gap="22px"
            >
              <Flex
                direction="column"
                p={4}
                bg="brand.50"
                borderRadius="md"
                borderWidth="1px"
                borderColor="brand.200"
              >
                <Text
                  fontSize="xs"
                  color="brand.600"
                  fontWeight="medium"
                  mb={1}
                >
                  Total Products
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="brand.700">
                  {summaryStats.totalProducts}
                </Text>
              </Flex>
              <Flex
                direction="column"
                p={4}
                bg="red.50"
                borderRadius="md"
                borderWidth="1px"
                borderColor="red.200"
              >
                <Text
                  fontSize="xs"
                  color="red.600"
                  fontWeight="medium"
                  mb={1}
                >
                  Out of stock
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="red.700">
                  {summaryStats.outOfStockProductCount ?? 0}
                </Text>
              </Flex>
              <Flex
                direction="column"
                p={4}
                bg="green.50"
                borderRadius="md"
                borderWidth="1px"
                borderColor="green.200"
              >
                <Text
                  fontSize="xs"
                  color="green.600"
                  fontWeight="medium"
                  mb={1}
                >
                  Checked
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="green.700">
                  {summaryStats.completedProductCount}
                </Text>
              </Flex>
              <Flex
                direction="column"
                p={4}
                bg="orange.50"
                borderRadius="md"
                borderWidth="1px"
                borderColor="orange.200"
              >
                <Text
                  fontSize="xs"
                  color="orange.600"
                  fontWeight="medium"
                  mb={1}
                >
                  Pending
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="orange.700">
                  {summaryStats.pendingProductCount}
                </Text>
              </Flex>
              <Flex
                direction="column"
                p={4}
                bg="purple.50"
                borderRadius="md"
                borderWidth="1px"
                borderColor="purple.200"
              >
                <Text
                  fontSize="xs"
                  color="purple.600"
                  fontWeight="medium"
                  mb={1}
                >
                  Completion
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="purple.700">
                  {summaryStats.percentCompleted}%
                </Text>
              </Flex>
            </Grid>
          </CustomContainer>

          <Flex
            w="100%"
            align="flex-end"
            justify="space-between"
            gap={2}
            flexWrap="wrap"
          >
            {isMobile ? (
              <Box flex="1" minW="min(100%, 160px)">
                <CustomInput
                  name="stock_checker_product_search"
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
            <Flex
              justify="flex-end"
              flexShrink={0}
              ml={isMobile ? undefined : "auto"}
            >
              <BarcodeScannerControl
                activeEan={scannedEanFilter}
                onClear={() => setScannedEanFilter(null)}
                onBarcodeFound={handleBarcodeFound}
                scanButtonAriaLabel="Scan barcode to filter by EAN"
                hintText="Point the camera at the product barcode. The list will filter to that EAN."
              />
            </Flex>
          </Flex>

          {isMobile ? (
            <Box>
              {filteredProducts.length === 0 ? (
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
              rowData={filteredProducts}
              colDefs={colDefs}
              tableKey="stock-checker-list"
            />
          )}
        </Flex>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default StockChecker;
