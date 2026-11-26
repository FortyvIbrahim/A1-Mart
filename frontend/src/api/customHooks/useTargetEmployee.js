import { useEffect, useState } from "react";

import toast from "react-hot-toast";
import { getTargetEmployees } from "../helpers/target_employee";

function useTargetEmployees() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const data = await getTargetEmployees();

      if (data.code === 200) {
        setTargets(data.data);
      } else {
        setTargets([]);
        throw data;
      }
    } catch (err) {
      toast.error("Error fetching target employee");
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

export default useTargetEmployees;
