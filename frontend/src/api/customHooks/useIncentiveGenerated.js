"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getIncentiveGeneratedList,
  deleteIncentiveGenerated,
} from "../helpers/incentive_generated";

function useIncentiveGenerated() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getIncentiveGeneratedList();
      if (response.code === 200) {
        setBatches(response.data || []);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching incentive batches");
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    return toast.promise(deleteIncentiveGenerated(id), {
      loading: "Deleting incentive batch...",
      success: (response) => {
        if (response.code === 200) {
          fetchData();
          return "Incentive batch deleted successfully!";
        }
        throw new Error(response.message || "Failed to delete");
      },
      error: "Error deleting incentive batch",
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { batches, loading, refresh: fetchData, handleDelete };
}

export default useIncentiveGenerated;
