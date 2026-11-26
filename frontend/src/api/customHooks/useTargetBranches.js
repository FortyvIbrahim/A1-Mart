import { useEffect, useState } from "react";
import {
  getTargetBranches,
  deleteTargetBranch,
} from "../helpers/target_branch";
import toast from "react-hot-toast";

function useTargetBranches() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const data = await getTargetBranches();

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

  const handleDelete = async (targetId) => {
    toast.promise(deleteTargetBranch(targetId), {
      loading: "Deleting target branch...",
      success: (response) => {
        if (response.code === 200) {
          fetchTargets();
          return "Target branch deleted successfully!";
        } else {
          throw new Error(response.message || "Failed to delete target branch");
        }
      },
      error: () => {
        return "Error deleting target branch";
      },
    });
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  return { targets, loading, refetch: fetchTargets, handleDelete };
}

export default useTargetBranches;
