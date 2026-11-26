"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getIncentiveCommon,
  deleteIncentiveCommon,
} from "../helpers/incentive_common";

function useIncentiveCommon(type = null) {
  const [incentives, setIncentives] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchIncentives = async () => {
    try {
      setLoading(true);
      const filters = type ? { type } : {};
      const data = await getIncentiveCommon(filters);

      if (data.code === 200) {
        setIncentives(data.data || []);
      } else {
        setIncentives([]);
        throw data;
      }
    } catch (err) {
      toast.error("Error fetching incentive common");
      setIncentives([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (incentiveId) => {
    toast.promise(deleteIncentiveCommon(incentiveId), {
      loading: "Deleting incentive...",
      success: (response) => {
        if (response.code === 200) {
          fetchIncentives();
          return "Incentive deleted successfully!";
        } else {
          throw new Error(response.message || "Failed to delete incentive");
        }
      },
      error: () => {
        return "Error deleting incentive";
      },
    });
  };

  useEffect(() => {
    fetchIncentives();
  }, [type]);

  return { incentives, loading, refetch: fetchIncentives, handleDelete };
}

export default useIncentiveCommon;
