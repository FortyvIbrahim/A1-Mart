"use client";

import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAllPurchaseAcknowledgments } from "../helpers/purchaseAcknowledgment";

function usePurchaseAcknowledgments({ from, to } = {}) {
  const [purchaseAcknowledgments, setPurchaseAcknowledgments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const filters = {};
      if (from) filters.from = from;
      if (to) filters.to = to;
      const response = await getAllPurchaseAcknowledgments(filters);
      if (response.code === 200) {
        setPurchaseAcknowledgments(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching purchase acknowledgments!");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { purchaseAcknowledgments, loading, fetchData };
}

export default usePurchaseAcknowledgments;

