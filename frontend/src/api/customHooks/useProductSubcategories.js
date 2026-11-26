"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getProductSubcategories } from "../helpers/products";

function useProductSubcategories() {
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getProductSubcategories();
      if (Array.isArray(response)) {
        setSubcategories(response);
      } else {
        throw new Error("Invalid response: expected array");
      }
    } catch (err) {
      toast.error("Error fetching product subcategories!");
      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { subcategories, loading, refetch: fetchData };
}

export default useProductSubcategories;
