"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { deletePayroll, generatePayslip, getMyPayrolls, getPayslips } from "../helpers/payroll";

function usePayslips({ type = "all_payslips" }) {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const endpoint = type === "all_payslips" ? getPayslips : getMyPayrolls;
      const data = await endpoint();
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

  const handleGeneratePayslip = async (payrollEmployeeId) => {
    toast.promise(generatePayslip(payrollEmployeeId), {
      loading: "Generating payslip...",
      success: (response) => {
        if (response.code === 200) {
          fetchPayrolls();
          window.open(response.data.payslip_url, "_blank");
          return "Payslip generated successfully";
        } else {
          throw new Error(response.message || "Failed to generate payslip");
        }
      },
      error: (err) => {
        console.error(err);
        return "Error generating payslip";
      },
    });
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

  return { payrolls, loading, refetch: fetchPayrolls, handleDelete, handleGeneratePayslip };
}

export default usePayslips;

