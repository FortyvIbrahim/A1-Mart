"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getIncentiveGeneratedById } from "../helpers/incentive_generated";

function useIncentiveGeneratedById(id) {
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      if (!id || id === "undefined") {
        setLoading(false);
        return;
      }
      setLoading(true);
      const response = await getIncentiveGeneratedById(id);
      if (response.code === 200) {
        setBatch(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching incentive batch!");
      setBatch(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  return { batch, loading, fetchData };
}

export default useIncentiveGeneratedById;
