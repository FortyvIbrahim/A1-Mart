"use client";

import useStickeringIncentive from "@/api/customHooks/useStickeringIncentive";
import AgGrid from "@/components/AgGrid";
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

function StickeringIncentive() {
  const router = useRouter();
  const { incentives, loading, handleDelete } = useStickeringIncentive();

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
      field: "incentive_stickering_id",
      headerName: "ID",
      maxWidth: 120,
      resizable: false,
    },
    {
      field: "material_type",
      headerName: "Material Type",
      type: "new-capitalized",
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
      field: "incentive_stickering_id",
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
                    router.push(`/incentive/stickering/view/${props.value}`),
                },
                {
                  label: "Edit",
                  value: "edit",
                  onClick: () =>
                    router.push(`/incentive/stickering/edit/${props.value}`),
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

  return (
    <GlobalWrapper permissionKey="view_stickering_incentive">
      <CustomContainer
        title="Stickering Incentive"
        rightSection={
          <Link href="/incentive/stickering/create">
            <Button>Add</Button>
          </Link>
        }
      >
        <AgGrid
          rowData={incentives}
          columnDefs={colDefs}
          loading={loading}
          tableKey="stickering-incentive"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default StickeringIncentive;
