import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTargetSectionById } from "../helpers/target_section";

function useTargetSectionsById(id) {
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTarget = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTargetSectionById(id);
      if (data.code === 200) {
        setTarget(data.data);
      } else {
        setTarget(null);
        setError(data.message || "Failed to fetch target section");
      }
    } catch (err) {
      setError(err.message || err);
      setTarget(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTarget();
    }
  }, [id]);

  return { target, loading, error, refetch: fetchTarget };
}

export default useTargetSectionsById;
