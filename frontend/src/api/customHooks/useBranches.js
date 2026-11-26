"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAllBranches } from "../helpers/branches";

function useBranches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllBranches();
      if (response.code === 200) {
        setBranches(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching branches!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { branches, loading };
}

export default useBranches;
