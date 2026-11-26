"use client";

import useMaterials from "@/api/customHooks/useMaterials";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import CustomMenu from "@/components/CustomMenu";
import GlobalWrapper from "@/components/GlobalWrapper";
import { capitalizeWords, capitalizeWordsLatest } from "@/utils/string";
import { Badge, Button, Flex, Text } from "@chakra-ui/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

function Materials() {
  const router = useRouter();
  const { materials, handleUpdateStatus } = useMaterials();

  const colDefs = [
    {
      field: "material_id",
      headerName: "ID",
      maxWidth: 120,
      resizable: false,
    },
    {
      field: "image_url",
      headerName: "Image",
      maxWidth: 120,
      resizable: false,
      filter: false,
      cellRenderer: (props) => {
        if (!props.value) {
          return (
            <Flex justifyContent="center" alignItems="center" height={"100%"}>
              <Flex
                justifyContent="center"
                alignItems="center"
                height="80%"
                width="100%"
                backgroundColor="gray.100"
                borderRadius="md"
                padding="4px"
              >
                <Text color="gray.500" fontSize="2xs">
                  No Image
                </Text>
              </Flex>
            </Flex>
          );
        }

        return (
          <Flex justifyContent="center" alignItems="center" height={"100%"}>
            <Image
              src={props.value}
              alt="Material Image"
              width={100}
              height={100}
            />
          </Flex>
        );
      },
    },
    {
      field: "name",
      headerName: "Name",
      resizable: true,
      cellRenderer: (props) => capitalizeWords(props.value ?? "-"),
    },
    {
      field: "live_stock",
      headerName: "Live Stock",
      resizable: true,
      cellRenderer: (props) => props.value ?? "-",
    },
    {
      field: "category.category_name",
      headerName: "Category",
      resizable: true,
      cellRenderer: (props) => capitalizeWords(props.value ?? "-"),
    },
    {
      field: "supplier_name",
      headerName: "Supplier",
      resizable: true,
      cellRenderer: (props) => capitalizeWords(props.value ?? "-"),
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
      field: "material_id",
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

  return (
    <GlobalWrapper permissionKey="view_materials">
      <CustomContainer
        title="Materials"
        rightSection={
          <Flex gap="18px">
            <Link href="/materials/category/create">
              <Button>Add Category</Button>
            </Link>

            <Link href="/materials/create">
              <Button>Add</Button>
            </Link>
          </Flex>
        }
      >
        <AgGrid
          rowData={materials}
          columnDefs={colDefs}
          gridOptions={{ rowHeight: 80 }}
          tableKey="materials"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Materials;
