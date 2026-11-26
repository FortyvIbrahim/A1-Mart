"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getAllMoneyTransfers,
  deleteMoneyTransfer,
} from "../helpers/money_transfers";

function useMoneyTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllMoneyTransfers();
      if (response.code === 200) {
        setTransfers(response.data || []);
      } else {
        throw response;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching money transfers!");
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (moneyTransferId) => {
    return toast.promise(deleteMoneyTransfer(moneyTransferId), {
      loading: "Deleting money transfer...",
      success: (response) => {
        if (response.code === 200) {
          fetchData();
          return response?.message || "Money transfer deleted successfully";
        }
        throw response;
      },
      error: (err) => err.message || err.msg || "Error deleting money transfer",
    });
  };

  return {
    transfers,
    loading,
    refresh: fetchData,
    deleteMoneyTransfer: handleDelete,
  };
}

export default useMoneyTransfers;
