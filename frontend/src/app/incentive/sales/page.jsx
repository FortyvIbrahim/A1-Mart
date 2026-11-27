"use client";

import useSalesIncentive from "@/api/customHooks/useSalesIncentive";
import AgGrid from "@/components/AgGrid";
import { useListFilters } from "@/components/ListFilters";
import CustomContainer from "@/components/CustomContainer";
import CustomMenu from "@/components/CustomMenu";
import GlobalWrapper from "@/components/GlobalWrapper";
import { capitalizeWordsLatest } from "@/utils/string";
import { Badge, Button, Flex, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { formatRange } from "@/utils/rangeValidation";
import moment from "moment";

function SalesIncentive() {
  const router = useRouter();
  const { incentives, loading, handleDelete } = useSalesIncentive();

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

  const formatClusterType = (type) => {
    const typeMap = {
      small: "Small",
      medium: "Medium",
      large: "Large",
    };
    return typeMap[type] || capitalizeWordsLatest(type || "");
  };

  const colDefs = [
    {
      field: "incentive_sales_id",
      headerName: "ID",
      maxWidth: 120,
      resizable: false,
    },
    {
      field: "cluster_type",
      headerName: "Cluster Type",
      resizable: true,
      valueGetter: (params) => {
        return formatClusterType(params.data.cluster_type);
      },
    },
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
      field: "incentive_sales_id",
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
                  onClick: () =>
                    router.push(`/incentive/sales/view/${props.value}`),
                },
                {
                  label: "Edit",
                  value: "edit",
                  onClick: () =>
                    router.push(`/incentive/sales/edit/${props.value}`),
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

  // Figma INC/04 filters: Search · Cluster type · Incentive Type (no labels).
  const { filtered: filteredIncentives, filterCard } = useListFilters(incentives, [
    { key: "q", type: "search", placeholder: "Search...", getText: (r) => `${r.incentive_sales_id ?? ""} ${r.cluster_type ?? ""}` },
    { key: "kind", type: "select", placeholder: "Cluster type", getValue: (r) => r.cluster_type },
    { key: "itype", type: "select", placeholder: "Incentive Type", getValue: (r) => r.incentive_type, getLabel: (v) => formatIncentiveType(v) },
  ], { columns: 3 });

  return (
    <GlobalWrapper permissionKey="view_sales_incentive">
      <CustomContainer headerBand
        title="Sales Incentive"
        rightSection={
          <Link href="/incentive/sales/create">
            <Button h="39px" px="16px" fontSize="12px">Add</Button>
          </Link>
        }
      >
        {filterCard}
        <AgGrid
          rowData={filteredIncentives}
          columnDefs={colDefs}
          loading={loading}
          tableKey="sales-incentive"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default SalesIncentive;
