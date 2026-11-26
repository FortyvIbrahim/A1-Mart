"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getAllProducts } from "../helpers/products";
import toast from "react-hot-toast";

function useProductBuyers() {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getAllProducts();
      if (Array.isArray(response)) {
        // Filter out duplicate manufacturer names
        const uniqueBuyers = Array.from(
          new Set(response.map((item) => item.de_buyer_name))
        ).filter((name) => name);

        setBuyers(uniqueBuyers);
      } else {
        throw new Error("Invalid response data");
      }
    } catch (err) {
      toast.error("Error fetching products!");
      setBuyers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return { buyers, loading };
}

export default useProductBuyers;
