"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getIncentiveSales,
  deleteIncentiveSales,
} from "../helpers/incentive_sales";

function useSalesIncentive() {
  const [incentives, setIncentives] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchIncentives = async () => {
    try {
      setLoading(true);
      const data = await getIncentiveSales();

      if (data.code === 200) {
        setIncentives(data.data || []);
      } else {
        setIncentives([]);
        throw data;
      }
    } catch (err) {
      toast.error("Error fetching incentive sales");
      setIncentives([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (incentiveId) => {
    toast.promise(deleteIncentiveSales(incentiveId), {
      loading: "Deleting incentive sales...",
      success: (response) => {
        if (response.code === 200) {
          fetchIncentives();
          return "Incentive sales deleted successfully!";
        } else {
          throw new Error(response.message || "Failed to delete incentive sales");
        }
      },
      error: () => {
        return "Error deleting incentive sales";
      },
    });
  };

  useEffect(() => {
    fetchIncentives();
  }, []);

  return { incentives, loading, refetch: fetchIncentives, handleDelete };
}

export default useSalesIncentive;
