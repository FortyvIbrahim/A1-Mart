"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAllProducts,
  bulkUpdateProductImageUrls,
  syncProducts as requestProductSync,
} from "../helpers/products";
import toast from "react-hot-toast";

/**
 * Fetches products from GET /product/all. Product objects include fields returned
 * by the API (e.g. `ean_number` when present).
 */
function useProducts({ withStockPrice = false, filters = {} } = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllProducts(withStockPrice);
      if (Array.isArray(response)) {
        setProducts(response);
      } else {
        throw new Error("Invalid response data");
      }
    } catch (err) {
      toast.error("Error fetching products!");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [withStockPrice]);

  const bulkUpdateImageUrls = useCallback(
    async (items) => {
      await bulkUpdateProductImageUrls(items);
      await fetchProducts();
    },
    [fetchProducts]
  );

  const syncProducts = useCallback(async () => {
    const response = await requestProductSync();
    await fetchProducts();
    return response;
  }, [fetchProducts]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    if (Object.keys(filters).length === 0) return products;

    let filtered = products;
    if (filters.branch_id) {
      filtered = filtered.map((product) => {
        return {
          ...product,
          stock_price: product.stock_price.filter(
            (stock) => stock.branch_id == filters.branch_id
          ),
        };
      });
    }

    if (filters.department_id) {
      filtered = filtered.filter(
        (product) => product.department_id == filters.department_id
      );
    }

    if (filters.category_id) {
      filtered = filtered.filter(
        (product) => product.category_id == filters.category_id
      );
    }

    if (filters.hide_out_of_stock) {
      filtered = filtered.filter((product) => {
        return product.stock_price.some((stock) => stock.stock > 0);
      });
    }

    if (filters.brand_id) {
      filtered = filtered.filter(
        (product) => product.brand_id == filters.brand_id
      );
    }

    if (filters.manufacturer) {
      filtered = filtered.filter(
        (product) => product.gf_manufacturer == filters.manufacturer
      );
    }

    if (filters.buyer) {
      filtered = filtered.filter(
        (product) => product.de_buyer_name == filters.buyer
      );
    }

    return filtered;
  }, [products, filters]);

  return {
    products,
    loading,
    filteredProducts,
    refetch: fetchProducts,
    bulkUpdateImageUrls,
    syncProducts,
  };
}

export default useProducts;
