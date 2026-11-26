"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { getBranchById } from "../helpers/branches";

function useBranchById(branchId) {
  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getBranchById(branchId);
      if (response.code === 200) {
        setBranch(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching branch!");
    } finally {
      setLoading(false);
    }
  };

  return { branch, loading, fetchData };
}

export default useBranchById;
