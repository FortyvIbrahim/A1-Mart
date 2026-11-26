"use client";

import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getPurchaseReorders } from "../helpers/purchaseReorders";

function usePurchaseReorders() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getPurchaseReorders();
      if (response?.code === 200 && Array.isArray(response?.data)) {
        setData(response.data);
      } else {
        setData([]);
      }
    } catch (err) {
      toast.error(err?.message || "Error fetching purchase reorders");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { purchaseReorders: data, loading, refetch };
}

export default usePurchaseReorders;
