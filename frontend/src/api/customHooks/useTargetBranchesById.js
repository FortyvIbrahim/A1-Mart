import { useEffect, useState } from "react";
import {
  getTargetBranchById,
  updateTargetBranch,
} from "../helpers/target_branch";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

function useTargetBranchesById(id) {
  const router = useRouter();
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTarget = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTargetBranchById(id);
      if (data.code === 200) {
        setTarget(data.data);
      } else {
        setTarget(null);
        setError(data.message || "Failed to fetch target branch");
      }
    } catch (err) {
      setError(err.message || err);
      setTarget(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updateBody) => {
    toast.promise(updateTargetBranch(id, updateBody), {
      loading: "Updating target branch...",
      success: (response) => {
        if (response.code === 200) {
          router.push("/target/branch");
          return "Target branch updated successfully!";
        } else {
          throw new Error(response.message || "Failed to update target branch");
        }
      },
      error: () => {
        return "Error updating target branch";
      },
    });
  };

  useEffect(() => {
    if (id) {
      fetchTarget();
    }
  }, [id]);

  return { target, loading, error, refetch: fetchTarget, handleUpdate };
}

export default useTargetBranchesById;
