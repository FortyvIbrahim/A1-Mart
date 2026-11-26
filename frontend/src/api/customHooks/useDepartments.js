import React, { useEffect, useState } from "react";
import {
  getAllDesignations,
  getAllDesignationsByBranchId,
  updateDesignation,
} from "../helpers/designation";
import toast from "react-hot-toast";
import {
  getAllDepartments,
  getAllDepartmentsByBranchId,
} from "../helpers/departments";

function useDepartments(props) {
  const { branch_id } = props ?? {};
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      let list = null;

      if (branch_id) {
        try {
          const response = await getAllDepartmentsByBranchId(branch_id);
          const raw = Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
            ? response.data
            : response?.code === 200 && Array.isArray(response?.data)
            ? response.data
            : [];
          if (Array.isArray(raw) && raw.length > 0) {
            list = raw;
          }
        } catch (branchErr) {
          console.warn("Branch-specific departments failed, falling back to all departments", branchErr);
        }
      }

      // If branch has no specific departments or fetch failed, fallback to all departments
      if (!list || list.length === 0) {
        const response = await getAllDepartments();
        const raw = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : response?.code === 200 && Array.isArray(response?.data)
          ? response.data
          : [];
        list = raw;
      }

      setDepartments(list || []);
    } catch (err) {
      toast.error("Error fetching departments!");
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [branch_id]);

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

  return { departments, loading, handleUpdateStatus };
}

export default useDepartments;
