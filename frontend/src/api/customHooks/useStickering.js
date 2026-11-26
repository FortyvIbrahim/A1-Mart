"use client";

import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getAllStickeringEntries,
  getMyStickeringEntries,
  getMySupervisorEntries,
} from "../helpers/stickering";

function useStickering({ type = "stickering", from, to } = {}) {
  const [stickering, setStickering] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const dateFilters = {};
      if (from) dateFilters.from = from;
      if (to) dateFilters.to = to;

      let response;

      if (type === "my_stickering") {
        response = await getMyStickeringEntries();
      } else if (type === "my_repack_entry_sheet") {
        response = await getMySupervisorEntries();
      } else {
        response = await getAllStickeringEntries(dateFilters);
      }

      if (response.code === 200) {
        let data = response.data;

        if (type === "repack_entry_sheet" || type === "my_repack_entry_sheet") {
          data = data.filter((item) => {
            return item.status === "done" && item.repack_supervisor_name !== null;
          });
        }

        setStickering(data || []);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching job sheet records!");
      setStickering([]);
    } finally {
      setLoading(false);
    }
  }, [type, from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { stickering, loading, refetch: fetchData };
}

export default useStickering;
