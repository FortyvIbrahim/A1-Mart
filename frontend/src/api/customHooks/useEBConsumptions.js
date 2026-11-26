"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  deleteEBConsumption,
  getAllEBConsumption,
} from "../helpers/eb_consumption";

function useEBConsumptions() {
  const [ebConsumptions, setEBConsumptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllEBConsumption();
      if (response.code === 200) {
        setEBConsumptions(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching eb consumptions!");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEBConsumption = async (id) => {
    toast.promise(deleteEBConsumption(id), {
      loading: "Deleting eb consumption...",
      success: (response) => {
        fetchData();
        return "Eb consumption deleted successfully";
      },
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { ebConsumptions, loading, handleDelete: handleDeleteEBConsumption };
}

export default useEBConsumptions;
