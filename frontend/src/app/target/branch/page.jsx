"use client";

import useMaterials from "@/api/customHooks/useMaterials";
import useTargetBranches from "@/api/customHooks/useTargetBranches";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import { useTargetFilters } from "@/components/TargetFilters";
import CustomMenu from "@/components/CustomMenu";
import GlobalWrapper from "@/components/GlobalWrapper";
import usePermission from "@/customHooks/usePermission";
import { capitalizeWords } from "@/utils/string";
import { Badge, Button, Flex, FormatNumber, Text } from "@chakra-ui/react";
import moment from "moment";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

function TargetBranch() {
  const router = useRouter();
  const { targets, handleDelete } = useTargetBranches();
  const { filtered: filteredTargets, filterCard } = useTargetFilters(targets, ["branch", "month"], { monthField: "target_month" });
  const allowAdd = usePermission("add_target_branch");

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
      field: "target_branch_id",
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
                    router.push(`/target/branch/view/${props.value}`),
                },
                {
                  label: "Edit",
                  value: "edit",
                  onClick: () =>
                    router.push(`/target/branch/edit/${props.value}`),
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
    <GlobalWrapper permissionKey="view_materials">
      <CustomContainer
        breadcrumb="Sales Target  /  Branch"
        title="Sales Target – Branch"
        rightSection={
          allowAdd && (
            <Flex gap="18px">
              <Link href="/target/branch/create">
                <Button>Add</Button>
              </Link>
            </Flex>
          )
        }
      >
        <Flex direction="column" gap="16px">
        {filterCard}
        <AgGrid
          rowData={filteredTargets}
          columnDefs={colDefs}
          tableKey="target-branch"
        />
        </Flex>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default TargetBranch;
