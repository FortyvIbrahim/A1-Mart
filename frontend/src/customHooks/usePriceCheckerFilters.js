"use client";

import { useState, useEffect, useMemo } from "react";
import {
  filterCategoriesByDepartment,
  filterSubcategoriesByCategory,
} from "@/utils/stockChecker";

/**
 * Custom hook for managing stock checker filters
 * @param {Array} categories - All categories
 * @param {Array} subcategories - All subcategories
 * @returns {Object} Filter state and handlers
 */
function usePriceCheckerFilters(categories, subcategories) {
  // Filter states
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");

  // Filter categories by selected department
  const filteredCategories = useMemo(() => {
    return filterCategoriesByDepartment(categories, selectedDepartment);
  }, [categories, selectedDepartment]);

  // Filter subcategories by selected category
  const filteredSubcategories = useMemo(() => {
    return filterSubcategoriesByCategory(subcategories, selectedCategory);
  }, [subcategories, selectedCategory]);

  // Handle department change (reset category and subcategory)
  const handleDepartmentChange = (departmentId) => {
    setSelectedDepartment(departmentId);
    setSelectedCategory("");
    setSelectedSubcategory("");
  };

  // Handle category change (reset subcategory)
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory("");
  };

  return {
    selectedBranch,
    setSelectedBranch,
    selectedDepartment,
    setSelectedDepartment: handleDepartmentChange,
    selectedCategory,
    setSelectedCategory: handleCategoryChange,
    selectedSubcategory,
    setSelectedSubcategory,
    filteredCategories,
    filteredSubcategories,
  };
}

export default usePriceCheckerFilters;
