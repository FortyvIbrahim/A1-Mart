"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getTasks, createTask, updateTask, deleteTask } from "../helpers/tasks";

function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTasks();
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

  const handleCreate = async (taskData) => {
    try {
      const response = await createTask(taskData);
      if (response.code === 200 || response.success) {
        await fetchData();
        return response;
      } else {
        throw new Error(response.message || "Failed to create task");
      }
    } catch (err) {
      throw err;
    }
  };

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

  const handleDelete = async (id) => {
    try {
      const response = await deleteTask(id);
      if (response.code === 200 || response.success) {
        await fetchData();
        return response;
      } else {
        throw new Error(response.message || "Failed to delete task");
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
    createTask: handleCreate,
    updateTask: handleUpdate,
    deleteTask: handleDelete,
  };
}

export default useTasks;
