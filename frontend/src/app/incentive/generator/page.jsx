"use client";

import useIncentiveGenerated from "@/api/customHooks/useIncentiveGenerated";
import AgGrid from "@/components/AgGrid";
import { useListFilters } from "@/components/ListFilters";
import CustomContainer from "@/components/CustomContainer";
import CustomMenu from "@/components/CustomMenu";
import GlobalWrapper from "@/components/GlobalWrapper";
import { INCENTIVE_TYPES } from "@/constants/incentive_type";
import { Badge, Button, Flex, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import moment from "moment";
import usePermission from "@/customHooks/usePermission";


/** Figma INC/01 (generator): Search · Branches · Type, no labels. */
const GENERATOR_FILTERS = [
  { key: "q", type: "search", placeholder: "Search by ID or branch", getText: (r) => `${r.incentive_generated_id ?? ""} ${r.branch_name ?? ""}` },
  { key: "branch", type: "select", placeholder: "All Branches", getValue: (r) => r.branch_name },
  { key: "type", type: "select", placeholder: "All Type", getValue: (r) => r.incentive_type, getLabel: (v) => INCENTIVE_TYPES[v]?.label ?? v },
];

/** Figma IA01 (approvals): Branch · Designation · Status · Reset. */
const APPROVAL_FILTERS = [
  { key: "branch", type: "select", label: "Branch", placeholder: "All branches", getValue: (r) => r.branch_name },
  { key: "designation", type: "select", label: "Designation", placeholder: "All designations", getValue: (r) => (r.designations ?? []).map((d) => d.designation_name).join(", ") },
  { key: "status", type: "select", label: "Status", placeholder: "All statuses", getValue: (r) => r.status },
];

function IncentiveGeneratorList({ type = "normal" }) {
  const { batches, loading, handleDelete } = useIncentiveGenerated();
  const canAdd = usePermission("add_incentive_generator");
  const canDelete = usePermission("delete_incentive_generator");
  const isApprovalMode = type === "approval";

  const colDefs = [
    {
      field: "incentive_generated_id",
      headerName: "ID",
      maxWidth: 100,
      resizable: false,
    },
    {
      field: "start_date",
      headerName: "Start Date",
      type: "date",
    },
    {
      field: "end_date",
      headerName: "End Date",
      type: "date",
    },
    {
      field: "branch_name",
      headerName: "Branch",
      valueGetter: (params) => params.data?.branch_name ?? "-",
    },
    {
      field: "designations",
      headerName: "Designation",
      autoHeight: true,
      valueGetter: (params) =>
        params.data?.designations
          .map((designation) => designation.designation_name)
          .join(", ") ?? "-",
      cellRenderer: (params) => {
        return (
          <Flex flexWrap="wrap" gap="4px" p="4px" alignItems="center">
            {params.data?.designations.slice(0, 2).map((designation) => (
              <Badge key={designation.designation_id}>
                {designation.designation_name}
              </Badge>
            ))}
            {params.data?.designations.length > 2 && (
              <Text colorScheme="gray" lineHeight="1.2" fontSize="xs">
                +{params.data?.designations.length - 2} more
              </Text>
            )}
          </Flex>
        );
      },
    },
    {
      field: "incentive_type",
      headerName: "Incentive Type",
      type: "badge-column",
      valueGetter: (params) => {
        return {
          label: INCENTIVE_TYPES[params.data?.incentive_type]?.label,
          colorScheme:
            INCENTIVE_TYPES[params.data?.incentive_type]?.color ?? "gray",
        };
      },
    },
    {
      field: "incentive_generated_items_count",
      headerName: "Total Incentives",
    },
    {
      field: "status",
      headerName: "Status",
      type: "badge-column",
      valueGetter: (params) => {
        const statusMap = {
          unapproved: "gray",
          approved: "green",
          cancelled: "red",
        };
        return {
          label: params.data?.status,
          colorScheme: statusMap[params.data?.status] ?? "gray",
        };
      },
    },
    {
      field: "incentive_generated_id",
      headerName: "Action",
      type: "action-column",
      valueGetter: (props) => {
        const menuItems = [
          {
            label: "View",
            value: "view",
            redirectionUrl: `/incentive/generator/view/${props.data.incentive_generated_id}?type=${type}`,
          },
        ];

        if (canDelete) {
          menuItems.push({
            label: "Delete",
            value: "delete",
            onClick: () => handleDelete(props.data.incentive_generated_id),
            type: "danger",
          });
        }

        if (isApprovalMode) {
          return menuItems;
        }

        if (canAdd && props.data.status === "unapproved") {
          menuItems.push({
            label: "Edit",
            value: "edit",
            redirectionUrl: `/incentive/generator/edit/${props.data.incentive_generated_id}?type=${type}`,
          });
        }

        return menuItems;
      },
    },
  ];

  const getPermissionKey = () => {
    if (type === "approval") return "view_incentive_approvals";

    return "view_incentive_generator";
  };

  const getTitle = () => {
    if (type === "approval") return "Incentive Approvals";
    return "Incentive Generator";
  };

  const { filtered: filteredBatches, filterCard } = useListFilters(
    batches,
    isApprovalMode ? APPROVAL_FILTERS : GENERATOR_FILTERS,
    isApprovalMode ? { reset: true } : { columns: 3 }
  );

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer
        headerBand={!isApprovalMode}
        breadcrumb={isApprovalMode ? "Approvals  /  Incentive Approvals" : undefined}
        title={getTitle()}
        rightSection={
          // Figma IA01 (approvals) has no Add button.
          canAdd && !isApprovalMode && (
            <Link href="/incentive/generator/create">
              <Button>Add</Button>
            </Link>
          )
        }
      >
        {filterCard}
        <AgGrid
          rowData={filteredBatches}
          columnDefs={colDefs}
          loading={loading}
          tableKey="incentive-generator"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default IncentiveGeneratorList;
