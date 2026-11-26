import { useEffect, useState } from "react";

import toast from "react-hot-toast";
import { getTargetSections } from "../helpers/target_section";

function useTargetSections() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const data = await getTargetSections();

      if (data.code === 200) {
        setTargets(data.data);
      } else {
        setTargets([]);
        throw data;
      }
    } catch (err) {
      toast.error("Error fetching target sections");
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

export default useTargetSections;
