"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAllGRNs } from "../helpers/grn";

function useGRNs() {
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllGRNs();
      if (response.code === 200) {
        setGrns(response.data || []);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching GRNs!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { grns, loading, refresh: fetchData };
}

export default useGRNs;

