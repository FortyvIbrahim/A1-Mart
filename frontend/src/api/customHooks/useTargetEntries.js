"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAllTargetEntry } from "../helpers/employee_target";

function useTargetEntries() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllTargetEntry();
      if (response.code === 200) {
        setTargets(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching target entries!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { targets, loading };
}

export default useTargetEntries;
