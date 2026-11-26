"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getEmployeeByCode } from "../helpers/employee";

function useEmployeeById(employeeCode) {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      if (!employeeCode) {
        setLoading(false);
        return;
      }

      const response = await getEmployeeByCode(employeeCode);
      if (response.code === 200) {
        setEmployee(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error fetching employee!");
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [employeeCode]);

  return { employee, loading, refetch: fetchData };
}

export default useEmployeeById;
