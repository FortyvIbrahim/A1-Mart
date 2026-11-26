"use client";

import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getPoList, getPoById } from "../helpers/po";

export function usePoList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getPoList();
      if (response?.code === 200 && Array.isArray(response?.data)) {
        setData(response.data);
      } else {
        setData([]);
      }
    } catch (err) {
      toast.error(err?.message || "Error fetching purchase orders");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { poList: data, loading, refetch };
}

export function usePoById(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!id);

  const refetch = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await getPoById(id);
      if (response?.code === 200) {
        setData(response.data);
      } else {
        setData(null);
      }
    } catch (err) {
      toast.error(err?.message || "Error fetching purchase order");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { po: data, loading, refetch };
}
