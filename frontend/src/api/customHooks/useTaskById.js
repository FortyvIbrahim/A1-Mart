"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getTaskById } from "../helpers/tasks";

function useTaskById(id) {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTaskById(id);
      if (response.code === 200) {
        setTask(response.data);
      } else {
        setTask(null);
        setError(response.message || "Failed to fetch task");
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching task!");
      setError(err.message || err);
      setTask(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  return { task, loading, error, refetch: fetchData };
}

export default useTaskById;
