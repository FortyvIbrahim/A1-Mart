"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAllReceiptItems } from "../helpers/receipts";

function useReceiptItems({ allBranches = false } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const params = {};
      if (allBranches) {
        params.all_branches = true;
      }
      const response = await getAllReceiptItems(params);
      if (response.code === 200) {
        setItems(response.data || []);
      } else {
        throw response;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching receipt items!");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [allBranches]);

  return { items, loading, refresh: fetchData };
}

export default useReceiptItems;

