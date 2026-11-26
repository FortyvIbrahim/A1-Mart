"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getPayrollById } from "../helpers/payroll";

function usePayrollById(id) {
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPayrollById(id);
      if (data.code === 200) {
        setPayroll(data.data);
      } else {
        setPayroll(null);
        setError(data.message || "Failed to fetch payroll");
      }
    } catch (err) {
      setError(err.message || err);
      setPayroll(null);
      toast.error("Error fetching payroll");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPayroll();
    }
  }, [id]);

  return { payroll, loading, error, refetch: fetchPayroll };
}

export default usePayrollById;

