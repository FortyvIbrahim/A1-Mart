"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { getBillingCounterById } from "../helpers/billing_counter";

function useBillingCounterById(counterId) {
  const [billingCounter, setBillingCounter] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getBillingCounterById(counterId);
      if (response.code === 200) {
        setBillingCounter(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching billing counter!");
    } finally {
      setLoading(false);
    }
  };

  return { billingCounter, loading, fetchData };
}

export default useBillingCounterById;

