"use client";

/**
 * Stock circle dashboard — Products tab only.
 * Multi-circle scope, composite checked keys, branch filter scoped to circles (all branches or preselect when one).
 * Not used by /stock/checker/list/[circle_id].
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Flex,
  Grid,
  Spinner,
  Text,
  useBreakpointValue,
  VStack,
} from "@chakra-ui/react";
import { Virtuoso } from "react-virtuoso";
import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import FilterDropdown from "@/components/StockChecker/FilterDropdown";
import ProductCard from "@/components/StockChecker/ProductCard";
import AgGrid from "@/components/AgGrid";
import { capitalizeWords } from "@/utils/string";
import useStockCheckerFilters from "@/customHooks/useStockCheckerFilters";
import {
  buildCompositeCheckedMap,
  buildDashboardProductRows,
  buildUnionStockCircleForFilterScope,
  filterDashboardProductRows,
  getProductStockForBranch,
  uniqueBranchIdsFromCircles,
} from "@/utils/stockChecker";
import { getStockCheckerProductColDefs } from "@/components/StockChecker/stockCheckerProductColDefs";
import { circleKey, circleOptionLabel } from "@/components/StockCircleFilter";
import { createStockCircleChecked } from "@/api/helpers/stock_circle_checked";
import useBranches from "@/api/customHooks/useBranches";
import useProductBrands from "@/api/customHooks/useProductBrands";
import useProductDepartments from "@/api/customHooks/useProductDepartments";
import useProductCategories from "@/api/customHooks/useProductCategories";
import useProductSubcategories from "@/api/customHooks/useProductSubcategories";
import toast from "react-hot-toast";

const STATUS_OPTIONS = [
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "checked", label: "Checked" },
  { value: "pending", label: "Pending" },
];

export default function StockCircleDashboardProducts({
  filteredCircles,
  selectedCircleIds,
  products,
  productsLoading,
  allChecked,
  statusPreset = "total",
  scrollToTableTrigger = 0,
  onRefetchChecked,
}) {
  const { branches, loading: branchesLoading } = useBranches();
  const { brands, loading: brandsLoading } = useProductBrands();
  const { departments, loading: departmentsLoading } = useProductDepartments();
  const { categories, loading: categoriesLoading } = useProductCategories();
  const { subcategories, loading: subcategoriesLoading } =
    useProductSubcategories();

  const isMobile = useBreakpointValue({ base: true, md: false });

  const flatRows = useMemo(
    () =>
      buildDashboardProductRows(filteredCircles, products, circleOptionLabel),
    [filteredCircles, products]
  );

  const allowedCircleIds = useMemo(
    () => filteredCircles.map((c) => circleKey(c)),
    [filteredCircles]
  );

  const compositeCheckedMap = useMemo(
    () => buildCompositeCheckedMap(allChecked, allowedCircleIds),
    [allChecked, allowedCircleIds]
  );

  const showCircleColumn = selectedCircleIds.length !== 1;

  const representativeStockCircle = useMemo(() => {
    if (!filteredCircles?.length) return null;
    if (filteredCircles.length === 1) return filteredCircles[0];
    return buildUnionStockCircleForFilterScope(filteredCircles);
  }, [filteredCircles]);

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
  } = useStockCheckerFilters(representativeStockCircle, categories, subcategories);

  const branchIdsInScope = useMemo(
    () => uniqueBranchIdsFromCircles(filteredCircles),
    [filteredCircles]
  );

  const branchFilterOptions = useMemo(() => {
    const allow = new Set(branchIdsInScope.map(String));
    return branches
      .filter((b) => allow.has(String(b.branch_id)))
      .map((branch) => ({
        value: branch.branch_id,
        label: capitalizeWords(branch.branch_name),
      }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [branches, branchIdsInScope]);

  useEffect(() => {
    if (branchIdsInScope.length === 1) {
      setSelectedBranch(branchIdsInScope[0]);
    } else if (branchIdsInScope.length > 1) {
      setSelectedBranch("");
    }
  }, [branchIdsInScope, setSelectedBranch]);

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

  const [selectedStatus, setSelectedStatus] = useState(statusPreset || "total");
  const productsSectionRef = useRef(null);

  useEffect(() => {
    setSelectedStatus(statusPreset || "total");
  }, [statusPreset]);

  useEffect(() => {
    if (!scrollToTableTrigger) return;

    const timeoutId = window.setTimeout(() => {
      productsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [scrollToTableTrigger]);

  const stockCheckerFilters = useMemo(
    () => ({
      branch_id: selectedBranch,
      department_ids: departmentFilterIds,
      category_id: selectedCategory,
      subcategory_id: selectedSubcategory,
      brand_id: selectedBrand,
      hideOutOfStock: false,
      ean_number: undefined,
      product_search: undefined,
    }),
    [
      selectedBranch,
      departmentFilterIds,
      selectedCategory,
      selectedSubcategory,
      selectedBrand,
    ]
  );

  const baseFilteredRows = useMemo(
    () => filterDashboardProductRows(flatRows, stockCheckerFilters, false),
    [flatRows, stockCheckerFilters]
  );

  const checkedStockMap = compositeCheckedMap;

  const filteredProducts = useMemo(() => {
    const byStatus = baseFilteredRows.filter((row) => {
      const stock = getProductStockForBranch(row, row.circle_branch_id);
      const inStock = stock > 0;
      const checked = checkedStockMap[row._checkKey] !== undefined;

      if (selectedStatus === "total") return true;
      if (selectedStatus === "out_of_stock") return !inStock;
      if (selectedStatus === "checked") return checked;
      if (selectedStatus === "pending") return inStock && !checked;
      return true;
    });
    return byStatus;
  }, [baseFilteredRows, selectedStatus, checkedStockMap]);

  const createChecked = useCallback(
    async (payload) => {
      const res = await createStockCircleChecked(payload);
      await onRefetchChecked?.();
      return res;
    },
    [onRefetchChecked]
  );

  const handleCreateStockCirclesChecked = useCallback(
    async ({ productId, checkedStock, stockCircleId: rowCircleId }) => {
      const stockCircleIdResolved = rowCircleId;
      if (stockCircleIdResolved == null || stockCircleIdResolved === "") {
        toast.error("Missing stock circle for this row");
        return;
      }
      try {
        toast.promise(
          createChecked({
            stock_circle_id: stockCircleIdResolved,
            product_id: productId,
            checked_stock: checkedStock,
          }),
          {
            loading: "Saving check…",
            success: (response) => {
              if (response?.code === 200 || response?.success) {
                return "Saved";
              }
              throw new Error(response?.message || "Save failed");
            },
            error: (err) =>
              err?.message || "Error saving stock circle checked",
          }
        );
      } catch (err) {
        console.error(err);
      }
    },
    [createChecked]
  );

  const mobileProductData = useMemo(() => {
    return filteredProducts.map((row) => {
      const totalStock = getProductStockForBranch(row, row.circle_branch_id);
      const productId = row.product_id;
      const lookupKey = row._checkKey ?? productId;
      const initialCheckedStock = checkedStockMap[lookupKey] ?? null;
      return {
        product: row,
        totalStock,
        productId,
        initialCheckedStock,
        stockCircleId: row.stock_circle_id,
      };
    });
  }, [filteredProducts, checkedStockMap]);

  const renderProductCard = useCallback(
    (index, itemData) => {
      if (!itemData?.product) return null;
      const {
        product,
        totalStock,
        productId,
        initialCheckedStock,
        stockCircleId,
      } = itemData;
      const cardKey = product._checkKey ?? productId;
      if (initialCheckedStock != null) {
        return (
          <Box
            key={cardKey}
            borderWidth="1px"
            borderRadius="md"
            borderColor="gray.200"
            p={3}
            bg="gray.50"
          >
            {product.circle_label ? (
              <Text fontSize="xs" color="gray.500" mb={1}>
                {product.circle_label}
              </Text>
            ) : null}
            <Text fontSize="xs" color="gray.600">
              {product.product_name}
            </Text>
            <Text fontSize="sm" mt={1}>
              Checked: <strong>{String(initialCheckedStock)}</strong>
            </Text>
          </Box>
        );
      }
      return (
        <ProductCard
          key={cardKey}
          product={product}
          totalStock={totalStock}
          initialCheckedStock={initialCheckedStock}
          stockCircleId={stockCircleId}
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
        listMode: "all",
        showCircleColumn,
      }),
    [checkedStockMap, handleCreateStockCirclesChecked, showCircleColumn]
  );

  const dataLoading =
    productsLoading ||
    branchesLoading ||
    brandsLoading ||
    departmentsLoading ||
    categoriesLoading ||
    subcategoriesLoading;

  if (!filteredCircles?.length) {
    return (
      <Box ref={productsSectionRef}>
        <CustomContainer title="Products" size="sm" color="brand">
          <VStack align="stretch" gap={2} py={4}>
            <Text fontSize="sm" color="gray.600">
              No stock circles match the current branch / circle filters.
            </Text>
          </VStack>
        </CustomContainer>
      </Box>
    );
  }

  if (dataLoading) {
    return (
      <Box ref={productsSectionRef}>
        <CustomContainer title="Products" size="sm" color="brand">
          <Flex justify="center" align="center" minH="280px" py={10}>
            <Spinner size="lg" color="brand.500" />
          </Flex>
        </CustomContainer>
      </Box>
    );
  }

  return (
    <Box ref={productsSectionRef}>
      <CustomContainer title="Products" size="sm" color="brand">
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
                options={branchFilterOptions}
                onChange={(e) => setSelectedBranch(e.target.value)}
                allOptionLabel="All Branches"
                disabled={isBranchDisabled}
              />

              <CustomInput
                name="stock_circle_dashboard_department_ids"
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
                onChange={(e) => setSelectedCategory(e.target.value)}
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
                onChange={(e) => setSelectedSubcategory(e.target.value)}
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
                onChange={(e) => setSelectedBrand(e.target.value)}
                allOptionLabel="All Brands"
                searchable
              />

              <FilterDropdown
                label="Filter Type"
                value={selectedStatus}
                options={STATUS_OPTIONS}
                onChange={(e) => setSelectedStatus(e.target.value)}
                allOptionLabel="Total Products"
                allOptionValue="total"
              />
            </Grid>
          </Flex>
        </CustomContainer>

        <Box>
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
                  "&::-webkit-scrollbar": { width: "6px" },
                  "&::-webkit-scrollbar-track": { background: "transparent" },
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
              tableKey="stock-circle-dashboard-products"
              gridOptions={{
                getRowId: (p) =>
                  String(p.data?._checkKey ?? p.data?.product_id ?? ""),
              }}
            />
          )}
        </Box>
        </Flex>
      </CustomContainer>
    </Box>
  );
}
