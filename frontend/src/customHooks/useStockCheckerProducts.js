"use client";

import { useMemo } from "react";
import {
  createCheckedStockMap,
  filterProductsByCircle,
  filterProductsByUserFilters,
  calculateSummaryStats,
} from "@/utils/stockChecker";

/**
 * Custom hook for managing stock checker products and filtering
 * @param {Array} products - All products
 * @param {Object} stockCircle - Circle data
 * @param {Array} stockCirclesChecked - Checked stock items
 * @param {Object} filters - User-selected filters
 * @returns {Object} Filtered products, maps, and stats
 */
/**
 * @param {object} [options]
 * @param {boolean} [options.onlyRemainingToCheck=true] When true, hide products that already have a saved checked_stock for this circle (stock checker workflow).
 */
function useStockCheckerProducts(
  products,
  stockCircle,
  stockCirclesChecked,
  filters,
  options = {}
) {
  const { onlyRemainingToCheck = true } = options;
  // Create a map of product_id to checked_stock for quick lookup
  const checkedStockMap = useMemo(() => {
    return createCheckedStockMap(stockCirclesChecked);
  }, [stockCirclesChecked]);

  // Filter products based on circle data only (for total count)
  const circleFilteredProducts = useMemo(() => {
    return filterProductsByCircle(products, stockCircle);
  }, [products, stockCircle]);

  // Circle scope → user filters → optional hide OOS → hide already-checked rows
  const filteredProducts = useMemo(() => {
    let base = products;
    if (stockCircle) {
      base = filterProductsByCircle(products, stockCircle);
    }
    let filtered = filterProductsByUserFilters(base, filters);

    if (filters.hideOutOfStock) {
      filtered = filtered.filter((product) => {
        const totalStock =
          product.stock_price?.reduce(
            (acc, curr) => acc + Number(curr.stock || 0),
            0
          ) || 0;
        return totalStock > 0;
      });
    }

    if (onlyRemainingToCheck) {
      filtered = filtered.filter((product) => {
        const pid = product.product_id;
        return checkedStockMap[pid] === undefined;
      });
    }

    return filtered;
  }, [products, stockCircle, filters, checkedStockMap, onlyRemainingToCheck]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    return calculateSummaryStats(
      stockCirclesChecked,
      circleFilteredProducts,
      stockCircle
    );
  }, [stockCirclesChecked, circleFilteredProducts, stockCircle]);

  return {
    checkedStockMap,
    circleFilteredProducts,
    filteredProducts,
    summaryStats,
  };
}

export default useStockCheckerProducts;
