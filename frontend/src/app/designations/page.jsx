"use client";

import { Badge, Flex } from "@chakra-ui/react";
import { useListFilters } from "@/components/ListFilters";
import { useRef, useEffect } from "react";
import useDesignations from "@/api/customHooks/useDesignations";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import { capitalizeWords } from "@/utils/string";
import CustomMenu from "@/components/CustomMenu";
import { useRouter } from "next/navigation";
import usePermission from "@/customHooks/usePermission";
import { INCENTIVE_TYPES } from "@/constants/incentive_type";


const LIST_FILTERS = [
  { key: "q", type: "search", placeholder: "Search designation...", getText: (r) => `${r.designation_id} ${r.designation_name ?? ""}` },
  { key: "incentive", type: "select", placeholder: "All incentive types", getValue: (r) => r.incentive_type },
  { key: "status", type: "select", placeholder: "All statuses", getValue: (r) => (r.is_active ? "Active" : "Inactive") },
];

export default function Designations() {
  const router = useRouter();
  const { designations, handleUpdateStatus } = useDesignations();

  const canEditDesignation = usePermission("add_designations");

  const colDefs = [
    {
      field: "designation_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "designation_name",
      headerName: "Name",
      type: "capitalize",
    },
    {
      field: "incentive_type",
      headerName: "Incentive Type",
      type: "badge-column",
      valueGetter: (props) => {
        return {
          label: INCENTIVE_TYPES[props.data.incentive_type]?.label,
          colorScheme: INCENTIVE_TYPES[props.data.incentive_type]?.color,
        };
      },
    },
    {
      field: "working_days",
      headerName: "Working Days (per week)",
      type: "number",
    },
    {
      field: "is_active",
      headerName: "Status",
      resizable: true,
      maxWidth: 150,
      filter: "agNumberColumnFilter",
      cellRenderer: (props) => {
        const isActive = props.value === 1;
        return (
          <Badge colorPalette={isActive ? "green" : "red"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    ...(canEditDesignation
      ? [
          {
            field: "designation_id",
            headerName: "Action",
            resizable: false,
            maxWidth: 100,
            filter: false,
            cellRenderer: (props) => {
              return (
                <Flex
                  justifyContent="center"
                  alignItems="center"
                  height={"100%"}
                >
                  <CustomMenu
                    items={[
                      {
                        label: props.data.is_active
                          ? "Set Inactive"
                          : "Set Active",
                        value: "updateStatus",
                        onClick: () =>
                          handleUpdateStatus(
                            props.value,
                            !props.data.is_active
                          ),
                      },
                      {
                        label: "Edit",
                        value: "edit",
                        onClick: () =>
                          router.push(`/designations/edit/${props.value}`),
                      },
                    ]}
                  />
                </Flex>
              );
            },
          },
        ]
      : []),
  ];

  const { filtered: filteredRows } = useListFilters(designations, LIST_FILTERS);

  return (
    // <GlobalWrapper permissionKey="view_designations">
    <GlobalWrapper>
      <CustomContainer mainCard title="Designations">
        <AgGrid
          rowData={filteredRows}
          columnDefs={colDefs}
          tableKey="designations"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}
