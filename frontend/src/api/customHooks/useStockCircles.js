"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getStockCircles,
  createStockCircle,
  updateStockCircle,
  deleteStockCircle,
} from "../helpers/stock_circles";

function useStockCircles() {
  const [stockCircles, setStockCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getStockCircles();
      if (response.code === 200 || Array.isArray(response)) {
        setStockCircles(
          Array.isArray(response) ? response : response.data || []
        );
      } else {
        setError(response.message || "Failed to fetch stock circles");
        setStockCircles([]);
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching stock circles!");
      setError(err.message || err);
      setStockCircles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (stockCircleData) => {
    try {
      const response = await createStockCircle(stockCircleData);
      if (response.code === 200 || response.success) {
        await fetchData();
        return response;
      } else {
        throw new Error(response.message || "Failed to create stock circle");
      }
    } catch (err) {
      throw err;
    }
  };

  const handleUpdate = async (id, stockCircleData) => {
    try {
      const response = await updateStockCircle(id, stockCircleData);
      if (response.code === 200 || response.success) {
        await fetchData();
        return response;
      } else {
        throw new Error(response.message || "Failed to update stock circle");
      }
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await deleteStockCircle(id);
      if (response.code === 200 || response.success) {
        await fetchData();
        return response;
      } else {
        throw new Error(response.message || "Failed to delete stock circle");
      }
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    stockCircles,
    loading,
    error,
    refetch: fetchData,
    createStockCircle: handleCreate,
    updateStockCircle: handleUpdate,
    deleteStockCircle: handleDelete,
  };
}

export default useStockCircles;
