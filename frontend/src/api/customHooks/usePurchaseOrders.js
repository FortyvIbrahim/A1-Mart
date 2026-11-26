"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deletePurchaseOrder,
  getPurchaseOrders,
  updatePurchaseOrder,
} from "../helpers/purchase_orders";
import toast from "react-hot-toast";

function usePurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPurchaseOrders();
      if (data.status === 200 || data.code === 200) {
        setPurchaseOrders(data.data || []);
      } else {
        setPurchaseOrders([]);
        setError(data.message || "Failed to fetch purchase orders");
      }
    } catch (err) {
      setError(err.message || err);
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (purchaseOrderId) => {
    toast.promise(deletePurchaseOrder(purchaseOrderId), {
      loading: "Deleting purchase order...",
      success: (response) => {
        if (response.success || response.code === 200) {
          fetchPurchaseOrders();
          return "Purchase order deleted successfully";
        } else {
          throw new Error(response.message);
        }
      },
      error: (err) => {
        console.log(err);
        return "Error deleting purchase order";
      },
    });
  };

  const updateStatus = async (purchaseOrderId, status) => {
    toast.promise(updatePurchaseOrder(purchaseOrderId, { status }), {
      loading: "Updating status...",
      success: (response) => {
        if (response.code === 200 || response.success) {
          fetchPurchaseOrders();
          return "Status updated successfully";
        }
        throw new Error(response.message || "Failed to update status");
      },
      error: (err) => {
        console.error(err);
        return err.message || "Error updating status";
      },
    });
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const memoizedPurchaseOrders = useMemo(() => purchaseOrders.sort((a, b) => b.purchase_order_id - a.purchase_order_id), [purchaseOrders]);

  return {
    purchaseOrders: memoizedPurchaseOrders,
    loading,
    error,
    refetch: fetchPurchaseOrders,
    handleDelete,
    updateStatus,
  };
}

export default usePurchaseOrders;
