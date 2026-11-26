"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getIncentiveStickering,
  deleteIncentiveStickering,
} from "../helpers/incentive_stickering";

function useStickeringIncentive() {
  const [incentives, setIncentives] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchIncentives = async () => {
    try {
      setLoading(true);
      const data = await getIncentiveStickering();

      if (data.code === 200) {
        setIncentives(data.data || []);
      } else {
        setIncentives([]);
        throw data;
      }
    } catch (err) {
      toast.error("Error fetching incentive stickering");
      setIncentives([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (incentiveId) => {
    toast.promise(deleteIncentiveStickering(incentiveId), {
      loading: "Deleting incentive stickering...",
      success: (response) => {
        if (response.code === 200) {
          fetchIncentives();
          return "Incentive stickering deleted successfully!";
        } else {
          throw new Error(response.message || "Failed to delete incentive stickering");
        }
      },
      error: () => {
        return "Error deleting incentive stickering";
      },
    });
  };

  useEffect(() => {
    fetchIncentives();
  }, []);

  return { incentives, loading, refetch: fetchIncentives, handleDelete };
}

export default useStickeringIncentive;
