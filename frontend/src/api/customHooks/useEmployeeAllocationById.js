"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getEmployeeAllocationById } from "../helpers/employee_allocation";

function useEmployeeAllocationById(id) {
  const [allocation, setAllocation] = useState(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getEmployeeAllocationById(id);
        if (response.code === 200) {
          setAllocation(response.data || null);
        } else if (response.code === 404) {
          setAllocation(null);
        } else {
          throw response;
        }
      } catch (err) {
        console.error(err);
        toast.error("Error fetching employee allocation!");
        setAllocation(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  return { allocation, loading };
}

export default useEmployeeAllocationById;

