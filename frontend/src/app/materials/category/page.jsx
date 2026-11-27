"use client";

import useMaterials from "@/api/customHooks/useMaterials";
import useMaterialsCategory from "@/api/customHooks/useMaterialsCategory";
import AgGrid from "@/components/AgGrid";
import { useListFilters } from "@/components/ListFilters";
import CustomContainer from "@/components/CustomContainer";
import CustomMenu from "@/components/CustomMenu";
import GlobalWrapper from "@/components/GlobalWrapper";
import { capitalizeWords } from "@/utils/string";
import { Badge, Button, Flex } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";


/** Figma list filters for this page. */
const LIST_FILTERS = [
  { key: "q", type: "search", label: "Search", placeholder: "Search records...", getText: (r) => `${r.material_category_id ?? ""} ${r.category_name ?? ""}` },
  { key: "status", type: "select", label: "Status", placeholder: "All statuses", getValue: (r) => (r.is_active ? "Active" : "Inactive") },
];

function MaterialsCategory() {
  const router = useRouter();
  const { materialsCategory, handleUpdateStatus } = useMaterialsCategory();

  const colDefs = [
    {
      field: "material_category_id",
      headerName: "ID",
      maxWidth: 120,
      resizable: false,
    },
    {
      field: "category_name",
      headerName: "Name",
      resizable: true,
      cellRenderer: (props) => capitalizeWords(props.value),
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
    {
      field: "material_category_id",
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
                    router.push(`/materials/category/view/${props.value}`),
                },
                {
                  label: "Edit",
                  value: "edit",
                  onClick: () =>
                    router.push(`/materials/category/edit/${props.value}`),
                },
                {
                  label: props.data.is_active ? "Set Inactive" : "Set Active",
                  value: "updateStatus",
                  onClick: () =>
                    handleUpdateStatus(props.value, !props.data.is_active),
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

  const { filtered: filteredRows, filterCard } = useListFilters(materialsCategory, LIST_FILTERS, { reset: true });

  return (
    <GlobalWrapper permissionKey="view_materials_category">
      <CustomContainer headerBand
        title="Materials Category"
        rightSection={
          <Link href="/materials/category/create">
            <Button>Add</Button>
          </Link>
        }
      >
        {filterCard}
        <AgGrid
          rowData={filteredRows}
          columnDefs={colDefs}
          tableKey="materials-category"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default MaterialsCategory;
