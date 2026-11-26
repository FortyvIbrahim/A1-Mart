"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getPurchaseReturnById } from "../helpers/purchaseReturns";

function usePurchaseReturnById(id) {
  const [purchaseReturn, setPurchaseReturn] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!id) {
      setPurchaseReturn(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getPurchaseReturnById(id);
      if (response.purchase_return_id) {
        setPurchaseReturn(response || null);
      } else {
        throw response;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching purchase return!");
      setPurchaseReturn(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  return { purchaseReturn, loading, refresh: fetchData };
}

export default usePurchaseReturnById;
