"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { getPurchaseAcknowledgmentById } from "../helpers/purchaseAcknowledgment";

function usePurchaseAcknowledgmentById(purchaseAcknowledgmentId) {
  const [purchaseAcknowledgment, setPurchaseAcknowledgment] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getPurchaseAcknowledgmentById(purchaseAcknowledgmentId);
      if (response.code === 200) {
        setPurchaseAcknowledgment(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching purchase acknowledgment!");
    } finally {
      setLoading(false);
    }
  };

  return { purchaseAcknowledgment, loading, fetchData };
}

export default usePurchaseAcknowledgmentById;

