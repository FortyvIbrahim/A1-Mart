"use client";

import useMasterList from "@/api/customHooks/useMasterList";
import { useListFilters } from "@/components/ListFilters";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import usePermission from "@/customHooks/usePermission";
import { capitalizeWords } from "@/utils/string";
import { Button, Flex } from "@chakra-ui/react";
import React, { useMemo } from "react";
import { PERSON_TYPES } from "./[...mode]/page";
import { useRouter } from "next/navigation";
import Link from "next/link";


const LIST_FILTERS = [
  { key: "q", type: "search", placeholder: "Search name or ID...", getText: (r) => `${r.master_id} ${r.name ?? ""}` },
  { key: "type", type: "select", placeholder: "All types", getValue: (r) => PERSON_TYPES.find((t) => t.value === r.person_type)?.label ?? r.person_type },
  { key: "status", type: "select", placeholder: "All statuses", getValue: (r) => (r.status === 1 || r.status === true ? "Active" : "Inactive") },
];

function MasterPage() {
  const router = useRouter();
  const { masterList } = useMasterList();
  const canAdd = usePermission("add_master_list");

  const colDefs = useMemo(() => [
    {
      field: "master_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "name",
      headerName: "Name",
      type: "capitalized",
    },
    {
      field: "buyers",
      headerName: "Buyer",
      hideByDefault: true,
      type: "capitalized",
      valueGetter: (props) => {
        const buyers = props.data?.buyers;
        if (!Array.isArray(buyers) || buyers.length === 0) return null;
        return buyers
          .map((b) =>
            b.employee_name ? capitalizeWords(b.employee_name) : null
          )
          .filter(Boolean)
          .join(", ");
      },
    },
    {
      field: "person_type",
      headerName: "Type",
      valueGetter: (props) => {
        return PERSON_TYPES.find(
          (item) => item.value === props.data.person_type
        )?.label;
      },
    },
    {
      field: "status",
      headerName: "Status",
      type: "badge-column",
      valueGetter: (props) => {
        return props.data.status === 1
          ? { colorScheme: "green", label: "Active" }
          : { colorScheme: "red", label: "Inactive" };
      },
    },
    // {
    //   field: "created_at",
    //   headerName: "Created At",
    //   type: "date",
    // },
    // {
    //   field: "updated_at",
    //   headerName: "Updated At",
    //   type: "date",
    // },
    {
      field: "master_id",
      headerName: "Action",
      type: "action-column",
      valueGetter: (props) => {
        return [
          {
            label: "View",
            value: "view",
            onClick: () => router.push(`/master/view/${props.data.master_id}`),
          },
          {
            label: "Edit",
            value: "edit",
            onClick: () => router.push(`/master/edit/${props.data.master_id}`),
          },
        ];
      },
    },
  ], [router]);

  const { filtered: filteredRows, filterCard } = useListFilters(masterList, LIST_FILTERS);

  return (
    <GlobalWrapper permissionKey="view_master_list">
      <CustomContainer
        title="Master List"
        rightSection={
          canAdd && (
            <Link href="/master/create">
              <Button>Add</Button>
            </Link>
          )
        }
      >
        <div style={{ marginBottom: 16 }}>{filterCard}</div>
        <AgGrid
          rowData={filteredRows}
          columnDefs={colDefs}
          tableKey="master-list"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default MasterPage;
