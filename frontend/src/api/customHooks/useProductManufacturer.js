"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getAllProducts } from "../helpers/products";
import toast from "react-hot-toast";

function useProductManufacturer() {
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getAllProducts();
      if (Array.isArray(response)) {
        // Filter out duplicate manufacturer names
        const uniqueManufacturers = Array.from(
          new Set(response.map((item) => item.gf_manufacturer))
        ).filter((name) => name); // Exclude falsy names if necessary

        const transformedResponse = uniqueManufacturers.map((name, index) => ({
          manufacturer_id: index + 1,
          manufacturer_name: name,
        }));
        setManufacturers(transformedResponse);
      } else {
        throw new Error("Invalid response data");
      }
    } catch (err) {
      toast.error("Error fetching products!");
      setManufacturers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return { manufacturers, loading };
}

export default useProductManufacturer;
