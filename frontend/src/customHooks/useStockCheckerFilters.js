"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  filterCategoriesByDepartment,
  filterSubcategoriesByCategory,
  getCircleDepartmentIds,
} from "@/utils/stockChecker";

/**
 * Custom hook for managing stock checker filters
 * @param {Object} stockCircle - Circle data
 * @param {Array} categories - All categories
 * @param {Array} subcategories - All subcategories
 * @returns {Object} Filter state and handlers
 */
function useStockCheckerFilters(stockCircle, categories, subcategories) {
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");

  const isBranchDisabled =
    stockCircle?.branch_id != null && stockCircle?.branch_id !== "";

  const circleDeptIds = useMemo(
    () => getCircleDepartmentIds(stockCircle),
    [stockCircle]
  );

  const isDepartmentDisabled = circleDeptIds.length === 0;

  const isCategoryDisabled =
    stockCircle?.category_id != null && stockCircle?.category_id !== "";
  const isSubcategoryDisabled =
    stockCircle?.subcategory_id != null && stockCircle?.subcategory_id !== "";

  useEffect(() => {
    if (!stockCircle) return;
    setSelectedBranch(stockCircle.branch_id);
    const ids = getCircleDepartmentIds(stockCircle);
    setSelectedDepartmentIds(ids.map((id) => Number(id) || id));
    setSelectedCategory(stockCircle.category_id ?? "");
    setSelectedSubcategory(stockCircle.subcategory_id ?? "");
  }, [stockCircle]);

  const effectiveDepartmentIdsForCategories = useMemo(() => {
    if (selectedDepartmentIds.length > 0) return selectedDepartmentIds;
    return circleDeptIds;
  }, [selectedDepartmentIds, circleDeptIds]);

  const filteredCategories = useMemo(() => {
    if (effectiveDepartmentIdsForCategories.length === 0) return [];
    return filterCategoriesByDepartment(
      categories,
      effectiveDepartmentIdsForCategories
    );
  }, [categories, effectiveDepartmentIdsForCategories]);

  const filteredSubcategories = useMemo(() => {
    return filterSubcategoriesByCategory(subcategories, selectedCategory);
  }, [subcategories, selectedCategory]);

  const handleDepartmentIdsChange = useCallback(
    (next) => {
      const arr = Array.isArray(next) ? next : [];
      const circ = getCircleDepartmentIds(stockCircle);
      if (arr.length === 0 && circ.length > 0) {
        setSelectedDepartmentIds(circ.map((id) => Number(id) || id));
      } else {
        setSelectedDepartmentIds(arr);
      }
      setSelectedCategory("");
      setSelectedSubcategory("");
    },
    [stockCircle]
  );

  const handleCategoryChange = useCallback((categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory("");
  }, []);

  return {
    selectedBranch,
    setSelectedBranch,
    selectedDepartmentIds,
    setSelectedDepartmentIds: handleDepartmentIdsChange,
    circleDeptIds,
    selectedCategory,
    setSelectedCategory: handleCategoryChange,
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
  };
}

export default useStockCheckerFilters;
