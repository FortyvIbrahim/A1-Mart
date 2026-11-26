import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  getTargetDepartmentById,
  updateTargetDepartment,
} from "../helpers/target_department";

function useTargetDepartmentsById(id) {
  const router = useRouter();
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTarget = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTargetDepartmentById(id);
      if (data.code === 200) {
        setTarget(data.data);
      } else {
        setTarget(null);
        setError(data.message || "Failed to fetch target department");
      }
    } catch (err) {
      setError(err.message || err);
      setTarget(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updateBody) => {
    toast.promise(updateTargetDepartment(id, updateBody), {
      loading: "Updating target department...",
      success: (response) => {
        if (response.code === 200) {
          router.push("/target/department");
          return "Target branch updated successfully!";
        } else {
          throw new Error(
            response.message || "Failed to update target department"
          );
        }
      },
      error: () => {
        return "Error updating target department";
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

export default useTargetDepartmentsById;
