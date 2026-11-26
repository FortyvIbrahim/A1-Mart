"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getMaterialCategories,
  updateMaterialCategory,
} from "../helpers/materials";

function useMaterialsCategory() {
  const [materialsCategory, setMaterialsCategory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getMaterialCategories();
      if (response.length >= 0) {
        setMaterialsCategory(response);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching materials category!");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (materialId, isActive) => {
    toast.promise(updateMaterialCategory(materialId, { is_active: isActive }), {
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

  return { materialsCategory, loading, handleUpdateStatus };
}

export default useMaterialsCategory;
