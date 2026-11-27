"use client";

import useTargetBranches from "@/api/customHooks/useTargetBranches";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import { useTargetFilters } from "@/components/TargetFilters";
import CustomMenu from "@/components/CustomMenu";
import GlobalWrapper from "@/components/GlobalWrapper";
import usePermission from "@/customHooks/usePermission";
import { Badge, Flex, FormatNumber } from "@chakra-ui/react";
import moment from "moment";
import { useRouter } from "next/navigation";
import React from "react";

function TargetDepartment() {
  const router = useRouter();
  const { targets } = useTargetBranches();
  const { filtered: filteredTargets, filterCard } = useTargetFilters(targets, ["branch", "month", "status"], { monthField: "target_month", statusField: "has_department_targets" });
  const allowAdd = usePermission("add_target_department");

  const getMenuItems = (props) => {
    const isSet = props.data.has_department_targets == true;

    const menuItems = [,];

    if (isSet) {
      menuItems.push({
        label: "View targets",
        value: "view_target",
        onClick: () => router.push(`/target/department/view/${props.value}`),
      });
    }

    if (allowAdd) {
      menuItems.push({
        label: isSet ? "Update targets" : "Set target",
        value: "set_target",
        onClick: () => router.push(`/target/department/create/${props.value}`),
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
      field: "target_month",
      headerName: "Target Month",
      resizable: true,
      cellRenderer: (props) => moment(props.value).format("MMM YYYY"),
      valueGetter: (props) => moment(props.data.target_month),
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
      field: "has_department_targets",
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
      field: "target_branch_id",
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
    <GlobalWrapper permissionKey="view_target_department">
      <CustomContainer breadcrumb="Sales Target  /  Department" title="Sales Target – Department">
        <Flex direction="column" gap="16px">
        {filterCard}
        <AgGrid
          rowData={filteredTargets}
          columnDefs={colDefs}
          tableKey="target-department"
        />
        </Flex>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default TargetDepartment;
