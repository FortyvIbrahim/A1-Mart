"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getStickeringById } from "../helpers/stickering";

function useStickeringById(id) {
  const [stickering, setStickering] = useState(null);
  const [loading, setLoading] = useState(!!id);

  const fetchData = async () => {
    try {
      if (!id) {
        setLoading(false);
        return;
      }
      const response = await getStickeringById(id);
      if (response.code === 200) {
        setStickering(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching stickering entry!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { stickering, loading, refetch: fetchData };
}

export default useStickeringById;
