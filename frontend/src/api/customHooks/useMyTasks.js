"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { updateTask, getMyTasks } from "../helpers/tasks";

function useMyTasks({ ping = false, pingInterval = 10000 } = {}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getMyTasks();
      if (response.code === 200 || Array.isArray(response)) {
        setTasks(Array.isArray(response) ? response : response.data || []);
      } else {
        setError(response.message || "Failed to fetch tasks");
        setTasks([]);
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching tasks!");
      setError(err.message || err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ping) {
      const interval = setInterval(() => {
        fetchData();
      }, pingInterval);
      return () => clearInterval(interval);
    }
  }, [ping, pingInterval]);

  const handleUpdate = async (id, taskData) => {
    try {
      const response = await updateTask(id, taskData);
      if (response.code === 200 || response.success) {
        await fetchData();
        return response;
      } else {
        throw new Error(response.message || "Failed to update task");
      }
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    tasks,
    loading,
    error,
    refetch: fetchData,
    updateTask: handleUpdate,
  };
}

export default useMyTasks;
