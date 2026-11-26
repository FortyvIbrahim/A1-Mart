"use client";

import { useEffect, useState } from "react";
import { getPurchaseOrderById } from "../helpers/purchase_orders";
import toast from "react-hot-toast";

function usePurchaseOrderById(id) {
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPurchaseOrder = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getPurchaseOrderById(id);
      if (data.status === 200 || data.code === 200) {
        setPurchaseOrder(data.data);
      } else {
        setPurchaseOrder(null);
        setError(data.message || "Failed to fetch purchase order");
        toast.error(data.message || "Failed to fetch purchase order");
      }
    } catch (err) {
      setError(err.message || err);
      setPurchaseOrder(null);
      toast.error("Error fetching purchase order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrder();
  }, [id]);

  return {
    purchaseOrder,
    loading,
    error,
    refetch: fetchPurchaseOrder,
  };
}

export default usePurchaseOrderById;
