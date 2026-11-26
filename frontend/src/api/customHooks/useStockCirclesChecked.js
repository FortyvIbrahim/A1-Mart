"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getStockCirclesChecked,
  getStockCircleCheckedById,
  createStockCircleChecked,
  createStockCircleCheckedBulk,
  updateStockCircleChecked,
  deleteStockCircleChecked,
} from "../helpers/stock_circle_checked";

function useStockCirclesChecked(stock_circle_id = null) {
  const [stockCirclesChecked, setStockCirclesChecked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getStockCirclesChecked(stock_circle_id);
      if (response.code === 200 || Array.isArray(response)) {
        setStockCirclesChecked(
          Array.isArray(response) ? response : response.data || []
        );
      } else {
        setError(response.message || "Failed to fetch stock circles checked");
        setStockCirclesChecked([]);
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching stock circles checked!");
      setError(err.message || err);
      setStockCirclesChecked([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (stockCircleCheckedData) => {
    try {
      const response = await createStockCircleChecked(stockCircleCheckedData);
      if (response.code === 200 || response.success) {
        await fetchData();
        return response;
      } else {
        throw new Error(
          response.message || "Failed to create stock circle checked"
        );
      }
    } catch (err) {
      throw err;
    }
  };

  const handleCreateBulk = async (stockCirclesCheckedData) => {
    try {
      const response = await createStockCircleCheckedBulk(
        stockCirclesCheckedData
      );
      if (response.code === 200 || response.success) {
        await fetchData();
        return response;
      } else {
        throw new Error(
          response.message || "Failed to create stock circles checked"
        );
      }
    } catch (err) {
      throw err;
    }
  };

  const handleUpdate = async (
    stock_circle_id,
    product_id,
    stockCircleCheckedData
  ) => {
    try {
      const response = await updateStockCircleChecked(
        stock_circle_id,
        product_id,
        stockCircleCheckedData
      );
      if (response.code === 200 || response.success) {
        await fetchData();
        return response;
      } else {
        throw new Error(
          response.message || "Failed to update stock circle checked"
        );
      }
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async (stock_circle_id, product_id) => {
    try {
      const response = await deleteStockCircleChecked(
        stock_circle_id,
        product_id
      );
      if (response.code === 200 || response.success) {
        await fetchData();
        return response;
      } else {
        throw new Error(
          response.message || "Failed to delete stock circle checked"
        );
      }
    } catch (err) {
      throw err;
    }
  };

  const getById = async (stock_circle_id, product_id) => {
    try {
      const response = await getStockCircleCheckedById(
        stock_circle_id,
        product_id
      );
      return response;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    if (stock_circle_id) {
      fetchData();
    } else {
      setLoading(false);
      setStockCirclesChecked([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock_circle_id]);

  return {
    stockCirclesChecked,
    loading,
    error,
    refetch: fetchData,
    createStockCircleChecked: handleCreate,
    createStockCircleCheckedBulk: handleCreateBulk,
    updateStockCircleChecked: handleUpdate,
    deleteStockCircleChecked: handleDelete,
    getStockCircleCheckedById: getById,
  };
}

export default useStockCirclesChecked;
