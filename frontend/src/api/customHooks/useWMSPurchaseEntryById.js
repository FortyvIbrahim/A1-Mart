"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getWMSPurchaseEntryById } from "../helpers/wms_purchase_entry";

function useWMSPurchaseEntryById(id) {
  const [wmsPurchaseEntry, setWmsPurchaseEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      if (!id) {
        setLoading(false);
        return;
      }

      const response = await getWMSPurchaseEntryById(id);
      if (response.code === 200) {
        setWmsPurchaseEntry(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching WMS purchase entry!");
      setWmsPurchaseEntry(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  return { wmsPurchaseEntry, loading, refetch: fetchData };
}

export default useWMSPurchaseEntryById;
