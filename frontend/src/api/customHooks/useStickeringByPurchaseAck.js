"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAllStickeringEntriesByPurchaseAcknowledgment } from "../helpers/stickering";

function useStickeringByPurchaseAck(purchaseAckId) {
  const [stickering, setStickering] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);

      const response = await getAllStickeringEntriesByPurchaseAcknowledgment(purchaseAckId);

      if (response.code === 200) {
        let data = response.data;
        setStickering(data || []);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching job sheet records!");
      setStickering([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (purchaseAckId) {
      fetchData();
    } else {
      setStickering([]);
      setLoading(false);
    }
  }, [purchaseAckId]);

  return { stickering, loading, refetch: fetchData };
}

export default useStickeringByPurchaseAck;
