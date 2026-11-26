"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getProductBrands } from "../helpers/products";

function useProductBrands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getProductBrands();
      const list = Array.isArray(response) ? response : response?.data;
      if (Array.isArray(list)) {
        setBrands(list);
      } else {
        throw new Error("Invalid response: expected array of objects");
      }
    } catch (err) {
      toast.error("Error fetching product brands!");
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { brands, loading, refetch: fetchData };
}

export default useProductBrands;
