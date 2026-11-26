import React, { useEffect, useState } from "react";
import { getAllDesignations, updateDesignation } from "../helpers/designation";
import toast from "react-hot-toast";

function useDesignations() {
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllDesignations();
      if (response.code === 200) {
        setDesignations(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching designations!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (designationId, isActive) => {
    toast.promise(updateDesignation(designationId, { is_active: isActive }), {
      loading: "Updating status...",
      success: (response) => {
        if (response.code === 200) {
          fetchData();
          return "Status updated successfully";
        } else {
          throw new Error(response.message);
        }
      },
      error: (err) => {
        console.log(err);
        return "Error updating status";
      },
    });
  };

  return { designations, loading, handleUpdateStatus };
}

export default useDesignations;
