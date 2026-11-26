"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getProductById } from "../helpers/products";

function useProductById(id, withStockPrice = false) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getProductById(id, withStockPrice);
      if (response) {
        setProduct(response);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching product!");
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, withStockPrice]);

  return { product, loading, refetch: fetchData };
}

export default useProductById;

