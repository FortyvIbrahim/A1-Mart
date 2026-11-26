import { useEffect, useState } from "react";

import toast from "react-hot-toast";
import { getTargetDepartments } from "../helpers/target_department";

function useTargetDepartments() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const data = await getTargetDepartments();

      if (data.code === 200) {
        setTargets(data.data);
      } else {
        setTargets([]);
        throw data;
      }
    } catch (err) {
      toast.error("Error fetching target branches");
      setTargets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  return { targets, loading, refetch: fetchTargets };
}

export default useTargetDepartments;
