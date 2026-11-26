"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAllTransports, deleteTransport } from "../helpers/transports";

function useTransports() {
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllTransports();
      if (response.code === 200) {
        setTransports(response.data || []);
      } else {
        throw response;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching transports!");
      setTransports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (transportId) => {
    return toast.promise(deleteTransport(transportId), {
      loading: "Deleting transport...",
      success: (response) => {
        if (response.code === 200) {
          fetchData();
          return response?.message || "Transport deleted successfully";
        }
        throw response;
      },
      error: (err) => err.message || err.msg || "Error deleting transport",
    });
  };

  return {
    transports,
    loading,
    refresh: fetchData,
    deleteTransport: handleDelete,
  };
}

export default useTransports;
