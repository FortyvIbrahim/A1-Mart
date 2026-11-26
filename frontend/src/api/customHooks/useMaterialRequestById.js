import { useEffect, useState } from "react";
import { getMaterialRequestById } from "../helpers/material_requests";

function useMaterialRequestById(id) {
  const [requestData, setRequestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequestData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMaterialRequestById(id);
      if (data.status === 200) {
        setRequestData(data.data);
      } else {
        setRequestData(null);
        setError(data.message || "Failed to fetch material request");
      }
    } catch (err) {
      setError(err.message || err);
      setRequestData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRequestData();
    }
  }, [id]);

  return { requestData, loading, error, refetch: fetchRequestData };
}

export default useMaterialRequestById;
