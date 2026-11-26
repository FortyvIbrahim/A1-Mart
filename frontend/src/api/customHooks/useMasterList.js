"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAllMasterList } from "../helpers/eb_master";

function useMasterList() {
  const [masterList, setMasterList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async (options = {}) => {
    const { silent = false } = options;
    if (!silent) setLoading(true);
    try {
      const response = await getAllMasterList();
      if (response.code === 200) {
        setMasterList(response.data);
        return response.data;
      }
      throw response;
    } catch (err) {
      if (!silent) toast.error("Error fetching master list!");
      throw err;
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { masterList, loading, refetchMasterList: fetchData };
}

export default useMasterList;
