"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { getGRNById } from "../helpers/grn";

function useGRNById(grnId) {
  const [grn, setGrn] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      if (!grnId || grnId === 0) {
        setLoading(false);
        return;
      }
      const response = await getGRNById(grnId);
      if (response.code === 200) {
        setGrn(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching GRN!");
    } finally {
      setLoading(false);
    }
  };

  return { grn, loading, fetchData };
}

export default useGRNById;

