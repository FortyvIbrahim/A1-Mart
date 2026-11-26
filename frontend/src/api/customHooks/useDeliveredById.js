"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getDeliveredById } from "../helpers/purchaseReturns";

function useDeliveredById(id) {
  const [delivered, setDelivered] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!id) {
      setDelivered(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await getDeliveredById(id);
      if (response?.purchase_returns_items_delivered_id != null) {
        setDelivered(response);
      } else if (response?.error === "Not found") {
        setDelivered(null);
      } else {
        throw response;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching delivered record!");
      setDelivered(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  return { delivered, loading, refresh: fetchData };
}

export default useDeliveredById;
