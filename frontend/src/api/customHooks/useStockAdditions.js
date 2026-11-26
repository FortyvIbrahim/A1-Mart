import { useEffect, useState } from "react";
import {
  deleteMaterialRequest,
  getMaterialRequests,
} from "../helpers/material_requests";
import toast from "react-hot-toast";
import { getStockAdditions } from "../helpers/stock_addition";

function useStockAdditions() {
  const [stockAdditions, setStockAdditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStockAdditions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStockAdditions();
      if (data.length >= 0) {
        setStockAdditions(data);
      } else {
        setStockAdditions([]);
        setError(data.message || "Failed to fetch stock additions");
      }
    } catch (err) {
      setError(err.message || err);
      setStockAdditions([]);
    } finally {
      setLoading(false);
    }
  };

  // const handleDelete = async (materialId) => {
  //   toast.promise(deleteMaterialRequest(materialId), {
  //     loading: "Deleting material request...",
  //     success: (response) => {
  //       if (response.success) {
  //         fetchRequests();
  //         return "Material request deleted successfully";
  //       } else {
  //         throw new Error(response.message);
  //       }
  //     },
  //     error: (err) => {
  //       console.log(err);
  //       return "Error deleting material request";
  //     },
  //   });
  // };

  useEffect(() => {
    fetchStockAdditions();
  }, []);

  return { stockAdditions, loading, error, refetch: fetchStockAdditions };
}

export default useStockAdditions;
