"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getProductCategories } from "../helpers/products";

function useProductCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getProductCategories();
      if (Array.isArray(response)) {
        setCategories(response);
      } else {
        throw new Error("Invalid response: expected array");
      }
    } catch (err) {
      toast.error("Error fetching product categories!");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { categories, loading, refetch: fetchData };
}

export default useProductCategories;
