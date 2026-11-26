"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getPaymentById } from "../helpers/payments";

function usePaymentById(paymentId) {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!paymentId) {
      setPayment(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getPaymentById(paymentId);
      if (response.code === 200) {
        setPayment(response.data || null);
      } else {
        throw response;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching payment!");
      setPayment(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [paymentId]);

  return { payment, loading, refresh: fetchData };
}

export default usePaymentById;

