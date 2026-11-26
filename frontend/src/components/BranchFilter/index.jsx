"use client";

import React, { useEffect } from "react";
import { Box, Text, NativeSelect } from "@chakra-ui/react";
import useBranches from "@/api/customHooks/useBranches";
import { useUser } from "@/contexts/UserContext";
import usePermission from "@/customHooks/usePermission";

function BranchFilter({
  value,
  onChange,
  label = "Branch",
  allLabel = "All Branches",
  width = { base: "100%", md: "220px" },
}) {
  const { branches } = useBranches();
  const { employeeData } = useUser();
  const canAccessAllBranches = usePermission("access_all_branches");

  // If user cannot access all branches, default to their branch when no value is set
  useEffect(() => {
    if (canAccessAllBranches) return;
    const userBranchId = employeeData?.branch_id;
    if (!userBranchId) return;
    if (value == null || value === "") {
      onChange?.(String(userBranchId));
    }
  }, [canAccessAllBranches, employeeData?.branch_id, value, onChange]);

  const displayValue =
    value != null
      ? String(value)
      : canAccessAllBranches
      ? ""
      : employeeData?.branch_id
      ? String(employeeData.branch_id)
      : "";

  return (
    <Box minW={width}>
      <Text fontSize="xs" mb={1} color="gray.500">
        {label}
      </Text>
      <NativeSelect.Root
        width={width}
        disabled={!canAccessAllBranches && !!employeeData?.branch_id}
      >
        <NativeSelect.Field
          value={displayValue}
          color={!displayValue ? "gray.400" : "black"}
          onChange={(e) => {
            const v = e.target.value;
            onChange?.(v || "");
          }}
        >
          <option value="">{allLabel}</option>
          {(branches || []).map((branch) => (
            <option key={branch.branch_id} value={branch.branch_id}>
              {branch.branch_name}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </Box>
  );
}

export default BranchFilter;

