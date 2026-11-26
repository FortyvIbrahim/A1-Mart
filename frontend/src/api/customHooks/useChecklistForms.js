"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  deleteChecklistForm,
  getChecklistForms,
} from "@/api/helpers/checklist_forms";

export default function useChecklistForms() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getChecklistForms();
      if (response.code === 200) {
        setForms(response.data ?? []);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error loading checklist forms");
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = useCallback(
    async (id) => {
      const response = await deleteChecklistForm(id);
      if (response.code === 200) {
        await fetchData();
        return response;
      }
      throw response;
    },
    [fetchData]
  );

  return { forms, loading, fetchData, handleDelete };
}
