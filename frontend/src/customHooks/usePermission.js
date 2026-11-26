import React from "react";
import { useUser } from "@/contexts/UserContext";

function usePermission(permissionKey) {
  const { permissions = [] } = useUser();

  const hasPermission = permissions.includes(permissionKey);

  return hasPermission;
}

export default usePermission;
