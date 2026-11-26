"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getPayrolls, deletePayroll } from "../helpers/payroll";

function usePayrolls() {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const data = await getPayrolls();
      if (data.code === 200) {
        setPayrolls(data.data || []);
      } else {
        setPayrolls([]);
        throw data;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching payrolls");
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (payrollId) => {
    toast.promise(deletePayroll(payrollId), {
      loading: "Deleting payroll...",
      success: (response) => {
        if (response.code === 200) {
          fetchPayrolls();
          return "Payroll deleted successfully";
        } else {
          throw new Error(response.message || "Failed to delete payroll");
        }
      },
      error: () => {
        return "Error deleting payroll";
      },
    });
  };

  useEffect(() => {
    fetchPayrolls();
  }, []);

  return { payrolls, loading, refetch: fetchPayrolls, handleDelete };
}

export default usePayrolls;

