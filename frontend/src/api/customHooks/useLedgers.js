"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { deleteLedger, getAllLedgers } from "../helpers/ledgers";

function useLedgers() {
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllLedgers();
      if (response.code === 200) {
        setLedgers(response.data || []);
      } else {
        throw response;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching ledgers!");
      setLedgers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteLedger = async (ledgerId) => {
    toast.promise(deleteLedger(ledgerId), {
      loading: "Deleting ledger...",
      success: (response) => {
        if (response.code === 200) {
          fetchData();
          return response?.message || "Ledger deleted successfully";
        } else {
          throw response;
        }
      },
      error: (err) => err.message || err.msg || "Error deleting ledger",
    });
  };

  return {
    ledgers,
    loading,
    refresh: fetchData,
    deleteLedger: handleDeleteLedger,
  };
}

export default useLedgers;

