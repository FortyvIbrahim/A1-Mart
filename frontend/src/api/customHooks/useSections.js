import React, { useEffect, useState } from "react";

import toast from "react-hot-toast";
import {
  getAllSections,
  getAllSectionsByDepartmentId,
} from "../helpers/sections";

function useSections(props) {
  const { branch_id = null, department_id = null } = props ?? {};
  const [sections, setSection] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      let list = null;

      if (branch_id && department_id) {
        try {
          const response = await getAllSectionsByDepartmentId(branch_id, department_id);
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
        } catch (e) {
          console.warn("Sections by branch/department failed, falling back to all sections", e);
        }
      }

      if (!list || list.length === 0) {
        const response = await getAllSections();
        const raw = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : response?.code === 200 && Array.isArray(response?.data)
          ? response.data
          : [];
        list = raw;
      }

      setSection(list || []);
    } catch (err) {
      toast.error("Error fetching sections!");
      setSection([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [branch_id, department_id]);

  return { sections, loading };
}

export default useSections;
