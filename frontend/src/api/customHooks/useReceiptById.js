"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getReceiptById } from "../helpers/receipts";

function useReceiptById(receiptId) {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!receiptId) {
      setReceipt(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getReceiptById(receiptId);
      if (response.code === 200) {
        setReceipt(response.data || null);
      } else {
        throw response;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching receipt!");
      setReceipt(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [receiptId]);

  return { receipt, loading, refresh: fetchData };
}

export default useReceiptById;

