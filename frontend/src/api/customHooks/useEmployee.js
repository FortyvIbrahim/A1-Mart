import React, { useEffect, useMemo, useState } from "react";
import {
  getAllEmployees,
  getAllEmployeesByDepartmentId,
  syncEmployees,
  removeEmployeeLogin as removeEmployeeLoginApi,
} from "../helpers/employee";
import toast from "react-hot-toast";

function useEmployee(props) {
  const {
    branch_id = null,
    department_id = null,
    section_id = null,
    loadWithFilter = false,
    allBranches = false,
    filterInactive = false,
  } = props ?? {};

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      let response;

      if (branch_id && department_id && section_id) {
        response = await getAllEmployeesByDepartmentId(
          branch_id,
          department_id,
          section_id
        );
      } else {
        response = await getAllEmployees(allBranches);
      }

      if (response.code === 200) {
        setEmployees(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching employees!");
    } finally {
      setLoading(false);
    }
  };

  const removeEmployeeLogin = async (employeeCode) => {
    try {
      const response = await removeEmployeeLoginApi(employeeCode);
      if (response.code === 200) {
        toast.success("Employee login reset successfully!");
        fetchData();
        return response.data;
      }
      throw response;
    } catch (err) {
      toast.error("Error removing employee login!");
      throw err;
    }
  };

  const sync = async () => {
    toast.promise(syncEmployees(), {
      loading: "Syncing employees...",
      success: (response) => {
        if (response.code === 200) {
          fetchData();
          return "Data successfully synced!";
        }
      },
      error: (err) => {
        console.log(err);
        return "Error syncing employees!";
      },
    });
  };

  useEffect(() => {
    if (!loadWithFilter || (branch_id && department_id && section_id)) {
      fetchData();
    }
  }, [branch_id, department_id, section_id, loadWithFilter]);

  const filteredEmployees = useMemo(() => {
    if (!filterInactive) return employees;

    return employees.filter((employee) => employee.terminated == 0);
  }, [employees, filterInactive]);

  return {
    employees: filteredEmployees,
    loading,
    sync,
    refresh: fetchData,
    removeEmployeeLogin,
  };
}

export default useEmployee;
