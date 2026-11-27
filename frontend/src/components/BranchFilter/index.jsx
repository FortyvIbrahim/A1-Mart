"use client";

import React, { useEffect } from "react";
import { Flex, Text } from "@chakra-ui/react";
import CustomSelect from "@/components/CustomSelect";
import useBranches from "@/api/customHooks/useBranches";
import { useUser } from "@/contexts/UserContext";
import usePermission from "@/customHooks/usePermission";

function BranchFilter({
  value,
  onChange,
  label = "Branch",
  allLabel = "All Branches",
  width = { base: "100%", md: "219px" },
  // "header": Figma page-heading filter (10/500 label, 7px gap)
  // "panel":  Figma "Record filters" field (12/500 label, 6px gap)
  variant = "header",
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

  const panel = variant === "panel";

  return (
    <Flex direction="column" gap={panel ? "6px" : "7px"} w={width} minW={0}>
      <Text
        fontSize={panel ? "12px" : "10px"}
        lineHeight={panel ? "18px" : "12px"}
        fontWeight="500"
        color="fg.muted"
      >
        {label}
      </Text>
      <CustomSelect
        h="40px"
        fontSize="12px"
        w="100%"
        value={displayValue}
        placeholder={allLabel}
        disabled={!canAccessAllBranches && !!employeeData?.branch_id}
        onChange={(v) => onChange?.(v || "")}
        options={(branches || []).map((branch) => ({
          value: String(branch.branch_id),
          label: branch.branch_name,
        }))}
        ariaLabel={label}
      />
    </Flex>
  );
}

export default BranchFilter;

