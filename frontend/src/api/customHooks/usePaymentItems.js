"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAllPaymentItems } from "../helpers/payments";

function usePaymentItems({ allBranches = false } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const params = {};
      if (allBranches) {
        params.all_branches = true;
      }
      const response = await getAllPaymentItems(params);
      if (response.code === 200) {
        setItems(response.data || []);
      } else {
        throw response;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching payment items!");
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

export default usePaymentItems;

