"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getPurchaseEntriesByProductId } from "../helpers/purchaseAcknowledgment";

function usePurchaseEntriesByProductId(productId) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(!!productId);

  useEffect(() => {
    if (!productId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getPurchaseEntriesByProductId(productId);
        if (response.code === 200) {
          setEntries(response.data || []);
        } else {
          throw response;
        }
      } catch (err) {
        console.error(err);
        toast.error("Error fetching purchase entries!");
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId]);

  return { entries, loading };
}

export default usePurchaseEntriesByProductId;
