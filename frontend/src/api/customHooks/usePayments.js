"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { deletePayment, getAllPayments } from "../helpers/payments";

function usePayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllPayments();
      if (response.code === 200) {
        setPayments(response.data || []);
      } else {
        throw response;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching payments!");
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeletePayment = async (paymentId) => {
    toast.promise(deletePayment(paymentId), {
      loading: "Deleting payment...",
      success: (response) => {
        fetchData();
        return response?.message || "Payment deleted successfully";
      },
      error: () => {
        return "Error deleting payment";
      },
    });
  };

  return { payments, loading, refresh: fetchData, deletePayment: handleDeletePayment };
}

export default usePayments;

