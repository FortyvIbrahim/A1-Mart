"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getIncentiveSalesById } from "../helpers/incentive_sales";

function useSalesIncentiveById(id) {
  const [incentive, setIncentive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchIncentive = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getIncentiveSalesById(id);
      if (data.code === 200) {
        setIncentive(data.data);
      } else {
        setIncentive(null);
        setError(data.message || "Failed to fetch incentive sales");
      }
    } catch (err) {
      setError(err.message || err);
      setIncentive(null);
      toast.error("Error fetching incentive sales!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchIncentive();
    }
  }, [id]);

  return { incentive, loading, error, refetch: fetchIncentive };
}

export default useSalesIncentiveById;
