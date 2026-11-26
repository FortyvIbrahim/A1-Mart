"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deletePurchaseEntry,
  getPurchaseEntries,
  updatePurchaseEntry,
} from "../helpers/purchase_entry";
import toast from "react-hot-toast";

function usePurchaseEntries() {
  const [purchaseEntries, setPurchaseEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPurchaseEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPurchaseEntries();
      if (data.status === 200 || data.code === 200) {
        setPurchaseEntries(data.data || []);
      } else {
        setPurchaseEntries([]);
        setError(data.message || "Failed to fetch purchase entries");
      }
    } catch (err) {
      setError(err.message || err);
      setPurchaseEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (purchaseEntryId) => {
    toast.promise(deletePurchaseEntry(purchaseEntryId), {
      loading: "Deleting purchase entry...",
      success: (response) => {
        if (response.success || response.code === 200) {
          fetchPurchaseEntries();
          return "Purchase entry deleted successfully";
        } else {
          throw new Error(response.message);
        }
      },
      error: (err) => {
        console.log(err);
        return "Error deleting purchase entry";
      },
    });
  };

  useEffect(() => {
    fetchPurchaseEntries();
  }, []);

  const memoizedPurchaseEntries = useMemo(() => purchaseEntries.sort((a, b) => b.purchase_entry_id - a.purchase_entry_id), [purchaseEntries]);

  return {
    purchaseEntries: memoizedPurchaseEntries,
    loading,
    error,
    refetch: fetchPurchaseEntries,
    handleDelete,
  };
}

export default usePurchaseEntries;

