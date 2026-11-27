"use client";

import useIncentiveCommon from "@/api/customHooks/useIncentiveCommon";
import AgGrid from "@/components/AgGrid";
import { useListFilters } from "@/components/ListFilters";
import CustomContainer from "@/components/CustomContainer";
import CustomMenu from "@/components/CustomMenu";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Badge, Button, Flex, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { formatRange } from "@/utils/rangeValidation";
import moment from "moment";

export default function IncentiveCommonList({
  type,
  basePath,
  title,
  permissionKey,
  showClusterSelection = false,
}) {
  const router = useRouter();
  const { incentives, loading, handleDelete } = useIncentiveCommon(type);

  const formatIncentiveValue = (incentive) => {
    if (incentive.incentive_type === "single_percentage") {
      return `${incentive.value}%`;
    } else if (incentive.incentive_type === "fixed") {
      return `₹${incentive.value}`;
    } else if (incentive.incentive_type === "ranged_percentage") {
      if (incentive.ranges && incentive.ranges.length > 0) {
        return `${incentive.ranges.length} range(s)`;
      }
      return "-";
    } else if (incentive.incentive_type === "ranged_fixed") {
      if (incentive.ranges && incentive.ranges.length > 0) {
        return `${incentive.ranges.length} range(s)`;
      }
      return "-";
    }
    return "-";
  };

  const formatIncentiveType = (type) => {
    const typeMap = {
      single_percentage: "Single Percentage",
      ranged_percentage: "Ranged Percentage",
      fixed: "Fixed",
      ranged_fixed: "Ranged Fixed",
    };
    return typeMap[type] || type;
  };

  const colDefs = [
    {
      field: "incentive_common_id",
      headerName: "ID",
      maxWidth: 120,
      resizable: false,
    },
    ...(showClusterSelection
      ? [
          {
            field: "cluster_size",
            headerName: "Cluster Size",
            type: "new-capitalized",
          },
        ]
      : []),
    {
      field: "selected_month",
      headerName: "Month",
      resizable: true,
      valueGetter: (params) => {
        return params.data.selected_month
          ? moment(params.data.selected_month).format("MMM YYYY")
          : "-";
      },
    },
    {
      field: "incentive_type",
      headerName: "Incentive Type",
      resizable: true,
      valueGetter: (params) => {
        return formatIncentiveType(params.data.incentive_type);
      },
    },
    {
      field: "value",
      headerName: "Value",
      resizable: true,
      valueGetter: (params) => {
        return formatIncentiveValue(params.data);
      },
    },
    {
      field: "ranges",
      headerName: "Ranges",
      resizable: true,
      autoHeight: true,
      cellRenderer: (props) => {
        if (!props.value || props.value.length === 0) {
          return (
            <Text fontSize="sm" color="gray.500">
              -
            </Text>
          );
        }
        return (
          <Flex flexDirection="column" wrap="wrap" gap="8px" p="8px">
            {props.value.slice(0, 2).map((range, index) => {
              // Transform API format to formatRange expected format
              const formattedRange = {
                start: range.start,
                end: range.end,
                startOperator: range.start_operator,
                endOperator: range.end_operator,
              };
              return (
                <Badge key={index} w="fit-content">
                  {formatRange(formattedRange)}
                  {range.percentage !== undefined && range.percentage !== null
                    ? ` - ${range.percentage}%`
                    : range.fixed !== undefined && range.fixed !== null
                    ? ` - ₹${range.fixed}`
                    : ""}
                </Badge>
              );
            })}
            {props.value.length > 2 && (
              <Text fontSize="xs" color="brand.500" lineHeight={1.2}>
                +{props.value.length - 2} more
              </Text>
            )}
          </Flex>
        );
      },
    },
    {
      field: "incentive_common_id",
      headerName: "Action",
      resizable: false,
      maxWidth: 100,
      filter: false,
      cellRenderer: (props) => {
        return (
          <Flex justifyContent="center" alignItems="center" height={"100%"}>
            <CustomMenu
              items={[
                {
                  label: "View",
                  value: "view",
                  onClick: () => router.push(`${basePath}/view/${props.value}`),
                },
                {
                  label: "Edit",
                  value: "edit",
                  onClick: () => router.push(`${basePath}/edit/${props.value}`),
                },
                {
                  label: "Delete",
                  value: "delete",
                  onClick: () => handleDelete(props.value),
                  type: "danger",
                },
              ]}
            />
          </Flex>
        );
      },
    },
  ];

  // Figma INC/04 filters: Search · Cluster size · Incentive Type (no labels).
  const { filtered: filteredIncentives, filterCard } = useListFilters(incentives, [
    { key: "q", type: "search", placeholder: "Search...", getText: (r) => `${r.incentive_common_id ?? ""} ${r.cluster_size ?? ""}` },
    ...(showClusterSelection
      ? [{ key: "kind", type: "select", placeholder: "Cluster size", getValue: (r) => r.cluster_size }]
      : []),
    { key: "itype", type: "select", placeholder: "Incentive Type", getValue: (r) => r.incentive_type, getLabel: (v) => formatIncentiveType(v) },
  ], { columns: showClusterSelection ? 3 : 2 });

  return (
    <GlobalWrapper permissionKey={permissionKey}>
      <CustomContainer headerBand
        title={title}
        rightSection={
          <Link href={`${basePath}/create`}>
            <Button h="39px" px="16px" fontSize="12px">Add</Button>
          </Link>
        }
      >
        {filterCard}
        <AgGrid
          rowData={filteredIncentives}
          columnDefs={colDefs}
          loading={loading}
          tableKey="incentive-common-list"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}
