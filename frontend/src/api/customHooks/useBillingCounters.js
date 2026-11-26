"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getAllBillingCounters,
  deleteBillingCounter,
} from "../helpers/billing_counter";

function useBillingCounters() {
  const [billingCounters, setBillingCounters] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllBillingCounters();
      if (response.code === 200) {
        setBillingCounters(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching billing counters!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (counterId) => {
    try {
      const response = await deleteBillingCounter(counterId);
      if (response.code === 200) {
        toast.success(
          response.message || "Billing counter deleted successfully"
        );
        fetchData();
      } else {
        throw response;
      }
    } catch (err) {
      toast.error(err.msg || err.message || "Error deleting billing counter");
      throw err;
    }
  };

  return { billingCounters, loading, refetch: fetchData, handleDelete };
}

export default useBillingCounters;
