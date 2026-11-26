"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getStockCircleById } from "../helpers/stock_circles";

function useStockCircleById(id) {
  const [stockCircle, setStockCircle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getStockCircleById(id);
      if (response.code === 200) {
        setStockCircle(response.data);
      } else {
        setStockCircle(null);
        setError(response.message || "Failed to fetch stock circle");
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching stock circle!");
      setError(err.message || err);
      setStockCircle(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  return { stockCircle, loading, error, refetch: fetchData };
}

export default useStockCircleById;
