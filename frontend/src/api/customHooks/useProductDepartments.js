"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getProductDepartments } from "../helpers/products";

function useProductDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getProductDepartments();
      if (Array.isArray(response)) {
        setDepartments(response);
      } else {
        throw new Error("Invalid response: expected array");
      }
    } catch (err) {
      toast.error("Error fetching product departments!");
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { departments, loading, refetch: fetchData };
}

export default useProductDepartments;
