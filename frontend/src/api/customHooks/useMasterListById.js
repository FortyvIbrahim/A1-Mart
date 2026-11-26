"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getMasterListById } from "../helpers/eb_master";

function useMasterListById(id) {
  const [master, setMaster] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getMasterListById(id);
      if (response.code === 200) {
        setMaster(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching master!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  return { master, loading };
}

export default useMasterListById;
