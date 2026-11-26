"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { deleteReceipt, getAllReceipts } from "../helpers/receipts";

function useReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllReceipts();
      if (response.code === 200) {
        setReceipts(response.data || []);
      } else {
        throw response;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching receipts!");
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteReceipt = async (receiptId) => {
    toast.promise(deleteReceipt(receiptId), {
      loading: "Deleting receipt...",
      success: (response) => {
        fetchData();
        return response?.message || "Receipt deleted successfully";
      },
      error: () => {
        return "Error deleting receipt";
      },
    });
  };

  return { receipts, loading, refresh: fetchData, deleteReceipt: handleDeleteReceipt };
}

export default useReceipts;

