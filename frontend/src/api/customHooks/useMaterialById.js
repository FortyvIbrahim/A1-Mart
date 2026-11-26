"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getMaterialById } from "../helpers/materials";

function useMaterialById(id) {
  const [material, setMaterial] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getMaterialById(id);
      if (response) {
        setMaterial(response);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching material!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  return { material, loading };
}

export default useMaterialById;
