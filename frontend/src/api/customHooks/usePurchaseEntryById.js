"use client";

import { useEffect, useState } from "react";
import { getPurchaseEntryById } from "../helpers/purchase_entry";
import toast from "react-hot-toast";

function usePurchaseEntryById(id) {
  const [purchaseEntry, setPurchaseEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPurchaseEntry = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getPurchaseEntryById(id);
      if (data.status === 200 || data.code === 200) {
        setPurchaseEntry(data.data);
      } else {
        setPurchaseEntry(null);
        setError(data.message || "Failed to fetch purchase entry");
        toast.error(data.message || "Failed to fetch purchase entry");
      }
    } catch (err) {
      setError(err.message || err);
      setPurchaseEntry(null);
      toast.error("Error fetching purchase entry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseEntry();
  }, [id]);

  return {
    purchaseEntry,
    loading,
    error,
    refetch: fetchPurchaseEntry,
  };
}

export default usePurchaseEntryById;

