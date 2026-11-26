"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getMaterialCategoryById } from "../helpers/materials";

function useMaterialCategoryById(id) {
  const [materialsCategory, setMaterialsCategory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getMaterialCategoryById(id);
      if (response) {
        setMaterialsCategory(response);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching material category!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  return { materialsCategory, loading };
}

export default useMaterialCategoryById;
