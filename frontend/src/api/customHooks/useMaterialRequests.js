import { useEffect, useMemo, useState } from "react";
import {
  deleteMaterialRequest,
  getMaterialRequests,
} from "../helpers/material_requests";
import toast from "react-hot-toast";

function useMaterialRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMaterialRequests();
      if (data.status === 200) {
        setRequests(data.data);
      } else {
        setRequests([]);
        setError(data.message || "Failed to fetch material requests");
      }
    } catch (err) {
      setError(err.message || err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (materialId) => {
    toast.promise(deleteMaterialRequest(materialId), {
      loading: "Deleting material request...",
      success: (response) => {
        if (response.success) {
          fetchRequests();
          return "Material request deleted successfully";
        } else {
          throw new Error(response.message);
        }
      },
      error: (err) => {
        console.log(err);
        return "Error deleting material request";
      },
    });
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const memoizedRequests = useMemo(() => requests.sort((a, b) => b.material_request_id - a.material_request_id), [requests]);

  return { requests: memoizedRequests, loading, error, refetch: fetchRequests, handleDelete };
}

export default useMaterialRequests;
