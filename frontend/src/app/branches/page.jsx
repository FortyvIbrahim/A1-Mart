"use client";

import useBranches from "@/api/customHooks/useBranches";
import { useListFilters } from "@/components/ListFilters";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import CustomMenu from "@/components/CustomMenu";
import GlobalWrapper from "@/components/GlobalWrapper";
import { capitalizeWords } from "@/utils/string";
import { Button, Flex } from "@chakra-ui/react";
import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";


const LIST_FILTERS = [
  { key: "q", type: "search", placeholder: "Search branch...", getText: (r) => `${r.branch_id} ${r.branch_name ?? ""} ${r.branch_nickname ?? ""}` },
  { key: "cluster", type: "select", placeholder: "All cluster sizes", getValue: (r) => r.cluster_size },
];

function Branches() {
  const router = useRouter();
  const { branches } = useBranches();

  const colDefs = [
    {
      field: "branch_id",
      headerName: "ID",
      maxWidth: 120,
      resizable: false,
    },
    {
      field: "branch_name",
      headerName: "Name",
      resizable: true,
      valueGetter: (props) => capitalizeWords(props.data.branch_name),
    },
    {
      field: "branch_nickname",
      headerName: "Nickname",
      resizable: true,
      valueGetter: (props) =>
        props.data.branch_nickname ? props.data.branch_nickname : "-",
    },
    {
      field: "cluster_size",
      headerName: "Cluster Size",
      type: "new-capitalized",
    },
    {
      field: "branch_id",
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
                  onClick: () => router.push(`/branches/view/${props.value}`),
                },
                {
                  label: "Edit",
                  value: "edit",
                  onClick: () => router.push(`/branches/edit/${props.value}`),
                },
                // {
                //   label: "Delete",
                //   value: "delete",
                //   onClick: () => alert("test"),
                //   type: "danger",
                // },
              ]}
            />
          </Flex>
        );
      },
    },
  ];

  const { filtered: filteredRows, filterCard } = useListFilters(branches, LIST_FILTERS);

  return (
    <GlobalWrapper permissionKey="view_branches">
      <CustomContainer
        title="Branches"
        // rightSection={
        //   <Link href="/branches/create">
        //     <Button>Add</Button>
        //   </Link>
        // }
      >
        <div style={{ marginBottom: 16 }}>{filterCard}</div>
        <AgGrid rowData={filteredRows} columnDefs={colDefs} tableKey="branches" />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Branches;
