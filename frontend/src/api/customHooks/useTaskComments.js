"use client";

import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { getTaskComments, createTaskComment } from "../helpers/tasks";

function useTaskComments(taskId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchComments = useCallback(async () => {
    if (!taskId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await getTaskComments(taskId);
      if (response.code === 200) {
        setComments(response.data || []);
      } else {
        setComments([]);
        setError(response.message || "Failed to fetch comments");
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching comments!");
      setError(err.message || err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const addComment = useCallback(async (commentData) => {
    if (!taskId) {
      throw new Error("Task ID is required");
    }

    try {
      const response = await createTaskComment(taskId, commentData);
      if (response.code === 200) {
        // Refresh comments after adding
        await fetchComments();
        return response;
      } else {
        throw new Error(response.message || "Failed to create comment");
      }
    } catch (err) {
      throw err;
    }
  }, [taskId, fetchComments]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    loading,
    error,
    refetch: fetchComments,
    addComment,
  };
}

export default useTaskComments;

