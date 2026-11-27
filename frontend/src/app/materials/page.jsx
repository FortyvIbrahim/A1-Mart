"use client";

import useMaterials from "@/api/customHooks/useMaterials";
import AgGrid from "@/components/AgGrid";
import { useListFilters } from "@/components/ListFilters";
import CustomContainer from "@/components/CustomContainer";
import CustomMenu from "@/components/CustomMenu";
import GlobalWrapper from "@/components/GlobalWrapper";
import { capitalizeWords, capitalizeWordsLatest } from "@/utils/string";
import { Badge, Button, Flex, Text } from "@chakra-ui/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";


/** Figma list filters for this page. */
const LIST_FILTERS = [
  { key: "q", type: "search", label: "Search", placeholder: "Search records...", getText: (r) => `${r.material_id ?? ""} ${r.name ?? ""} ${r.supplier_name ?? ""}` },
  { key: "category", type: "select", label: "Category", placeholder: "All categories", getValue: (r) => r.category?.category_name },
  { key: "status", type: "select", label: "Status", placeholder: "All statuses", getValue: (r) => (r.is_active ? "Active" : "Inactive") },
];

function Materials() {
  const router = useRouter();
  const { materials, handleUpdateStatus } = useMaterials();

  const centerCellStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  };

  const colDefs = [
    {
      field: "material_id",
      headerName: "ID",
      maxWidth: 110,
      resizable: false,
      cellStyle: centerCellStyle,
    },
    {
      field: "image_url",
      headerName: "Image",
      maxWidth: 120,
      resizable: false,
      filter: false,
      cellStyle: centerCellStyle,
      cellRenderer: (props) => {
        if (!props.value) {
          return (
            <Flex justifyContent="center" alignItems="center" w="100%" h="100%">
              <Flex
                justifyContent="center"
                alignItems="center"
                height="56px"
                width="56px"
                backgroundColor="#FFF5ED"
                borderWidth="1px"
                borderColor="border"
                borderRadius="8px"
                padding="4px"
              >
                <Text color="#C95C18" fontSize="10px" fontWeight="500" textAlign="center">
                  No Image
                </Text>
              </Flex>
            </Flex>
          );
        }

        return (
          <Flex justifyContent="center" alignItems="center" w="100%" h="100%">
            <Flex
              w="60px"
              h="60px"
              borderRadius="8px"
              overflow="hidden"
              bg="#FFFBF8"
              borderWidth="1px"
              borderColor="border.subtle"
              justifyContent="center"
              alignItems="center"
            >
              <Image
                src={props.value}
                alt="Material Image"
                width={60}
                height={60}
                style={{ objectFit: "contain", width: "100%", height: "100%" }}
              />
            </Flex>
          </Flex>
        );
      },
    },
    {
      field: "name",
      headerName: "Name",
      resizable: true,
      cellStyle: centerCellStyle,
      cellRenderer: (props) => capitalizeWords(props.value ?? "-"),
    },
    {
      field: "live_stock",
      headerName: "Live Stock",
      resizable: true,
      cellStyle: centerCellStyle,
      cellRenderer: (props) => props.value ?? "-",
    },
    {
      field: "category.category_name",
      headerName: "Category",
      resizable: true,
      cellStyle: centerCellStyle,
      cellRenderer: (props) => capitalizeWords(props.value ?? "-"),
    },
    {
      field: "supplier_name",
      headerName: "Supplier",
      resizable: true,
      cellStyle: centerCellStyle,
      cellRenderer: (props) => capitalizeWords(props.value ?? "-"),
    },
    {
      field: "is_active",
      headerName: "Status",
      resizable: true,
      maxWidth: 150,
      filter: "agNumberColumnFilter",
      cellStyle: centerCellStyle,
      cellRenderer: (props) => {
        const isActive = props.value === 1;
        return (
          <Flex justifyContent="center" alignItems="center" w="100%" h="100%">
            <Badge colorPalette={isActive ? "green" : "red"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </Flex>
        );
      },
    },
    {
      field: "material_id",
      headerName: "Action",
      resizable: false,
      maxWidth: 100,
      filter: false,
      cellStyle: centerCellStyle,
      cellRenderer: (props) => {
        return (
          <Flex justifyContent="center" alignItems="center" w="100%" height={"100%"}>
            <CustomMenu
              items={[
                {
                  label: "View",
                  value: "view",
                  onClick: () => router.push(`/materials/view/${props.value}`),
                },
                {
                  label: "Edit",
                  value: "edit",
                  onClick: () => router.push(`/materials/edit/${props.value}`),
                },
                {
                  label: props.data.is_active ? "Set Inactive" : "Set Active",
                  value: "updateStatus",
                  onClick: () =>
                    handleUpdateStatus(props.value, !props.data.is_active),
                },
              ]}
            />
          </Flex>
        );
      },
    },
  ];

  const { filtered: filteredRows, filterCard } = useListFilters(materials, LIST_FILTERS, { reset: true });

  return (
    <GlobalWrapper permissionKey="view_materials">
      <CustomContainer headerBand
        title="Materials"
        rightSection={
          <Flex gap="10px">
            <Link href="/materials/category/create">
              <Button>Add Category</Button>
            </Link>
            <Link href="/materials/create">
              <Button>Add</Button>
            </Link>
          </Flex>
        }
      >
        {filterCard}
        <AgGrid
          rowData={filteredRows}
          columnDefs={colDefs}
          gridOptions={{ rowHeight: 80 }}
          tableKey="materials"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Materials;
