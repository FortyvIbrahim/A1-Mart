"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  deleteEmployeeAllocation,
  getAllEmployeeAllocations,
} from "../helpers/employee_allocation";

function useEmployeeAllocations() {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllEmployeeAllocations();
      if (response.code === 200) {
        setAllocations(response.data || []);
      } else {
        throw response;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching employee allocations!");
      setAllocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    toast.promise(deleteEmployeeAllocation(id), {
      loading: "Deleting employee allocation...",
      success: (response) => {
        fetchData();
        return (
          response?.message || "Employee allocation deleted successfully"
        );
      },
      error: () => {
        return "Error deleting employee allocation";
      },
    });
  };

  return { allocations, loading, refresh: fetchData, deleteAllocation: handleDelete };
}

export default useEmployeeAllocations;

