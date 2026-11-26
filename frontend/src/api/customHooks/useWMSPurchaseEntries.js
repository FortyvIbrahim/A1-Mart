"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getAllWMSPurchaseEntries,
  deleteWMSPurchaseEntry,
} from "../helpers/wms_purchase_entry";

function useWMSPurchaseEntries() {
  const [wmsPurchaseEntries, setWmsPurchaseEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllWMSPurchaseEntries();
      if (response.code === 200) {
        setWmsPurchaseEntries(
          response.data.sort(
            (a, b) => b.purchase_entry_id - a.purchase_entry_id
          ) || []
        );
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching WMS purchase entries!");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    toast.promise(deleteWMSPurchaseEntry(id), {
      loading: "Deleting WMS purchase entry...",
      success: (response) => {
        if (response.code === 200) {
          fetchData();
          return "WMS purchase entry deleted successfully";
        } else {
          throw new Error(response.message);
        }
      },
      error: (err) => {
        console.log(err);
        return err.message || "Error deleting WMS purchase entry";
      },
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    wmsPurchaseEntries,
    loading,
    refetch: fetchData,
    handleDelete,
  };
}

export default useWMSPurchaseEntries;
