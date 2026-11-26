"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getMaterials,
  getMaterialsWithRate,
  updateMaterial,
} from "../helpers/materials";

function useMaterials({ withRate = false } = {}) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await (withRate ? getMaterialsWithRate : getMaterials)();
      if (response.length >= 0) {
        setMaterials(response);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching materials!");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (materialId, isActive) => {
    toast.promise(updateMaterial(materialId, { is_active: isActive }), {
      loading: "Updating status...",
      success: (response) => {
        if (response.code === 200) {
          fetchData();
          return "Status updated successfully";
        } else {
          throw new Error(response.message);
        }
      },
      error: "Error updating status",
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { materials, loading, handleUpdateStatus };
}

export default useMaterials;
