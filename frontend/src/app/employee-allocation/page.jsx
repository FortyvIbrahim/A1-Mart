"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, Text } from "@chakra-ui/react";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import useEmployeeAllocations from "@/api/customHooks/useEmployeeAllocations";
import Link from "next/link";
import usePermission from "@/customHooks/usePermission";
import useBranches from "@/api/customHooks/useBranches";
import useDesignations from "@/api/customHooks/useDesignations";
import { useUser } from "@/contexts/UserContext";
import TableFiltersBar from "@/components/Filters/TableFiltersBar";

function EmployeeAllocationListing() {
  const { allocations, deleteAllocation } = useEmployeeAllocations();
  const canAdd = usePermission("add_employee_allocation");
  const canAccessAllBranches = usePermission("access_all_branches");
  const { employeeData } = useUser();
  const { branches } = useBranches();
  const { designations } = useDesignations();

  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [selectedDesignationIds, setSelectedDesignationIds] = useState([]);

  // Permissions may load after first render. If access_all_branches becomes true,
  // clear any previously auto-selected branch.
  useEffect(() => {
    if (canAccessAllBranches) {
      setSelectedBranchIds([]);
    }
  }, [canAccessAllBranches]);

  // If user cannot access all branches, preselect their branch and lock the filter.
  useEffect(() => {
    if (canAccessAllBranches) {
      // Explicitly do not preselect when access_all_branches exists.
      return;
    }
    const userBranchId = employeeData?.branch_id;
    if (!userBranchId) return;
    setSelectedBranchIds([Number(userBranchId)]);
  }, [canAccessAllBranches, employeeData?.branch_id]);

  const branchOptions = useMemo(() => {
    return (branches ?? []).map((b) => ({
      value: b.branch_id,
      label: b.branch_name,
    }));
  }, [branches]);

  const designationOptions = useMemo(() => {
    return (designations ?? [])
      .slice()
      .sort((a, b) =>
        String(a.designation_name ?? "").localeCompare(
          String(b.designation_name ?? "")
        )
      )
      .map((d) => ({
        value: d.designation_id,
        label: d.designation_name ?? d.label ?? String(d.designation_id),
      }));
  }, [designations]);

  const filteredAllocations = useMemo(() => {
    const branchSet = new Set((selectedBranchIds ?? []).map((v) => Number(v)));
    const desigSet = new Set(
      (selectedDesignationIds ?? []).map((v) => Number(v))
    );

    return (allocations ?? []).filter((row) => {
      const branchId =
        row?.branch_id ?? row?.branchId ?? row?.branch?.branch_id ?? null;
      const designationId =
        row?.designation_id ??
        row?.designationId ??
        row?.designation?.designation_id ??
        null;

      if (branchSet.size > 0 && !branchSet.has(Number(branchId))) return false;
      if (desigSet.size > 0 && !desigSet.has(Number(designationId)))
        return false;
      return true;
    });
  }, [allocations, selectedBranchIds, selectedDesignationIds]);

  const colDefs = useMemo(
    () => [
      {
        field: "employee_allocation_id",
        headerName: "ID",
        type: "id",
      },
      {
        field: "branch_name",
        headerName: "Branch",
        type: "capitalize",
      },
      {
        field: "designation_name",
        headerName: "Designation",
        type: "capitalize",
      },
      {
        field: "required_count",
        headerName: "Required",
        type: "number",
      },
      {
        field: "existing_count",
        headerName: "Existing",
        type: "number",
      },
      {
        field: "allocated_count",
        headerName: "To Be Filled",
        valueGetter: (params) => {
          return params.data.required_count - params.data.existing_count;
        },
        cellRenderer: (params) => {
          let color = "gray.500";

          if (params.value > 0) {
            color = "green.500";
          } else if (params.value < 0) {
            color = "red.500";
          }

          return <Text color={color}>{params.value || "-"}</Text>;
        },
      },
      {
        field: "employee_allocation_id",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => [
          {
            label: "View",
            value: "view",
            redirectionUrl: `/employee-allocation/view/${params.data.employee_allocation_id}`,
          },
          {
            label: "Edit",
            value: "edit",
            redirectionUrl: `/employee-allocation/edit/${params.data.employee_allocation_id}`,
          },
          {
            label: "Delete",
            value: "delete",
            type: "danger",
            onClick: () => deleteAllocation(params.data.employee_allocation_id),
          },
        ],
      },
    ],
    [deleteAllocation]
  );

  return (
    <GlobalWrapper permissionKey="view_employee_allocation">
      <CustomContainer headerBand
        title="Employee Allocation"
        rightSection={
          canAdd && (
            <Link href="/employee-allocation/create">
              <Button size="sm">Add</Button>
            </Link>
          )
        }
      >
        <TableFiltersBar
          style={{ marginBottom: "22px" }}
          filters={[
            {
              key: "branch",
              label: "Branch",
              placeholder: "All branches",
              options: branchOptions,
              value: selectedBranchIds,
              onChange: setSelectedBranchIds,
              disabled: !canAccessAllBranches && !!employeeData?.branch_id,
            },
            {
              key: "designation",
              label: "Designation",
              placeholder: "All designations",
              options: designationOptions,
              value: selectedDesignationIds,
              onChange: setSelectedDesignationIds,
            },
          ]}
        />
        <AgGrid
          rowData={filteredAllocations}
          columnDefs={colDefs}
          tableKey="employee-allocation"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default EmployeeAllocationListing;
