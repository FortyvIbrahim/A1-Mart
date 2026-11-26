"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getAllPurchaseReturns,
  deletePurchaseReturn,
} from "../helpers/purchaseReturns";

function usePurchaseReturns({ filterByBranch = true } = {}) {
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllPurchaseReturns({ filter_by_branch: filterByBranch });
      const list = Array.isArray(response)
        ? response
        : response?.data;
      if (Array.isArray(list)) {
        setPurchaseReturns(list);
      } else {
        throw response;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching purchase returns!");
      setPurchaseReturns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    toast.promise(deletePurchaseReturn(id), {
      loading: "Deleting purchase return...",
      success: (response) => {
        fetchData();
        return response?.message || "Purchase return deleted successfully";
      },
      error: () => "Error deleting purchase return",
    });
  };

  return {
    purchaseReturns,
    loading,
    refresh: fetchData,
    deletePurchaseReturn: handleDelete,
  };
}

export default usePurchaseReturns;
