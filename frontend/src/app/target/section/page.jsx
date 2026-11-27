"use client";

import useTargetBranches from "@/api/customHooks/useTargetBranches";
import useTargetDepartments from "@/api/customHooks/useTargetDepartments";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import { useTargetFilters } from "@/components/TargetFilters";
import CustomMenu from "@/components/CustomMenu";
import GlobalWrapper from "@/components/GlobalWrapper";
import usePermission from "@/customHooks/usePermission";
import { capitalizeWords } from "@/utils/string";
import { Badge, Flex, FormatNumber } from "@chakra-ui/react";
import moment from "moment";
import { useRouter } from "next/navigation";
import React from "react";

function TargetSection() {
  const router = useRouter();
  const { targets } = useTargetDepartments();
  const { filtered: filteredTargets, filterCard } = useTargetFilters(targets, ["branch", "department", "month", "status"], { monthField: "target_date", statusField: "has_section_targets" });
  const allowAdd = usePermission("add_target_section");

  const getMenuItems = (props) => {
    const isSet = props.data.has_section_targets == true;

    const menuItems = [];

    if (isSet) {
      menuItems.push({
        label: "View targets",
        value: "view_target",
        onClick: () => router.push(`/target/section/view/${props.value}`),
      });
    }

    if (allowAdd) {
      menuItems.push({
        label: "Set target",
        value: "set_target",
        onClick: () => router.push(`/target/section/create/${props.value}`),
      });
    }

    return menuItems;
  };

  const colDefs = [
    {
      field: "branch_name",
      headerName: "Branch",
      resizable: true,
      cellRenderer: (props) => props.value ?? "-",
    },
    {
      field: "department_name",
      headerName: "Department",
      resizable: true,
      cellRenderer: (props) => capitalizeWords(props.value ?? "-"),
    },
    {
      field: "target_date",
      headerName: "Target Month",
      resizable: true,
      cellRenderer: (props) => moment(props.value).format("MMM YYYY"),
      valueGetter: (props) => moment(props.data.target_date),
    },
    {
      field: "target_amount",
      headerName: "Target Amount",
      resizable: true,
      cellRenderer: (props) => (
        <FormatNumber
          value={props.value}
          style="currency"
          currency="INR"
          h="fit-content"
        />
      ),
      valueGetter: (props) => parseFloat(props.data.target_amount),
    },
    {
      field: "has_section_targets",
      headerName: "Status",
      resizable: true,
      cellRenderer: (props) => {
        const isSet = props.value == true;
        return (
          <Badge colorPalette={isSet ? "green" : "gray"}>
            {isSet ? "Targets Set" : "Pending"}
          </Badge>
        );
      },
    },
    {
      field: "target_department_id",
      headerName: "Action",
      resizable: false,
      maxWidth: 100,
      filter: false,
      cellRenderer: (props) => {
        return (
          <Flex justifyContent="center" alignItems="center" height={"100%"}>
            <CustomMenu items={getMenuItems(props)} />
          </Flex>
        );
      },
    },
  ];

  return (
    <GlobalWrapper permissionKey="view_target_section">
      <CustomContainer breadcrumb="Sales Target  /  Section" title="Sales Target – Section">
        <Flex direction="column" gap="16px">
        {filterCard}
        <AgGrid
          rowData={filteredTargets}
          columnDefs={colDefs}
          tableKey="target-section"
        />
        </Flex>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default TargetSection;
