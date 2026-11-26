import React, { useEffect, useState } from "react";
import { getDesignation, updateDesignation } from "../helpers/designation";
import toast from "react-hot-toast";

function useDesignation(designationId, hideToast = false) {
  const [designation, setDesignation] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getDesignation(designationId);
      if (response.code === 200) {
        setDesignation(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      if (!hideToast) {
        toast.error("Error fetching designation!");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (designationId) {
      fetchData();
    }
  }, [designationId]);

  const handleUpdateDesignation = async (designationId, data) => {
    toast.promise(updateDesignation(designationId, data), {
      loading: "Updating designation...",
      success: (response) => {
        if (response.code === 200) {
          // fetchData();
          return "Designation updated successfully";
        } else {
          throw new Error(response.message);
        }
      },
      error: (err) => {
        console.log(err);
        return "Error updating designation";
      },
    });
  };

  return { designation, loading, handleUpdateDesignation };
}

export default useDesignation;
