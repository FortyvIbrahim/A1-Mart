"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getApiCallLogs } from "../helpers/api_logs";

function useApiCallLogs(options = {}) {
  const { limit = 100, offset = 0 } = options;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getApiCallLogs({ limit, offset });
      if (response.code === 200 && Array.isArray(response.data)) {
        setLogs(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching API call logs!");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [limit, offset]);

  return { logs, loading, refetch: fetchData };
}

export default useApiCallLogs;
