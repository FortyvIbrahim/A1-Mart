import { useMemo } from "react";
import useBranches from "@/api/customHooks/useBranches";
import { useUser } from "@/contexts/UserContext";
import usePermission from "@/customHooks/usePermission";

export default function useBranchFilterAccess() {
  const { employeeData } = useUser();
  const canAccessAllBranches = usePermission("access_all_branches");
  const { branches } = useBranches();

  const userBranchId = employeeData?.branch_id ?? null;

  const userBranch = useMemo(
    () =>
      (branches || []).find((b) => b.branch_id === userBranchId) ?? null,
    [branches, userBranchId]
  );

  const userBranchKey =
    userBranchId != null ? String(userBranchId) : null;
  const userBranchName = userBranch?.branch_name ?? null;
  const isBranchLocked = !canAccessAllBranches && userBranchKey != null;

  return {
    canAccessAllBranches,
    userBranchId,
    userBranchKey,
    userBranchName,
    isBranchLocked,
  };
}

export function getLockedBranchFilterByKey(branchKey) {
  return branchKey ? [branchKey] : [];
}

export function getLockedBranchFilterByName(branchName) {
  return branchName ? [branchName] : [];
}
