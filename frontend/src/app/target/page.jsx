"use client";

import useMaterials from "@/api/customHooks/useMaterials";
import useTargetBranches from "@/api/customHooks/useTargetBranches";
import useTargetEntries from "@/api/customHooks/useTargetEntries";
import useUserTarget from "@/api/customHooks/useUserTarget";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import CustomMenu from "@/components/CustomMenu";
import { useListFilters } from "@/components/ListFilters";
import GlobalWrapper from "@/components/GlobalWrapper";
import { useUser } from "@/contexts/UserContext";
import usePermission from "@/customHooks/usePermission";
import { capitalizeWords } from "@/utils/string";
import {
  Badge,
  Box,
  Button,
  Flex,
  FormatNumber,
  Grid,
  Text,
} from "@chakra-ui/react";
import moment from "moment";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

const getDataCard = (title, value, color = "#C95C18") => {
  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="border"
      borderRadius="12px"
      px="18px"
      py="16px"
    >
      <Text fontSize="12px" color="fg.muted" fontWeight="500" mb="8px">
        {title}
      </Text>
      <Text fontSize="22px" lineHeight="28px" fontWeight="600" color={color}>
        {value}
      </Text>
    </Box>
  );
};

const LIST_FILTERS = [
  {
    key: "q",
    type: "search",
    label: "Search",
    placeholder: "Search employee name...",
    getText: (r) => `${r.employee_name ?? ""} ${r.employee_code ?? ""}`,
  },
  {
    key: "date",
    type: "date",
    label: "Date",
    placeholder: "All dates",
    getValue: (r) => r.date,
  },
];

const TODAY = new Date();

function TargetEntry() {
  const router = useRouter();
  const { targets } = useTargetEntries();
  const allowAdd = usePermission("add_sales_target");
  const { employeeData } = useUser();

  const { target, salesMade, pendingSales, achievementPerc } = useUserTarget(
    TODAY,
    targets
  );

  const getMenuItems = (data) => {
    const isCurrentUser = employeeData?.employee_code == data.employee_code;

    const menu = [
      {
        label: "View",
        value: "view",
        onClick: () => router.push(`/target/branch/view/${props.value}`),
      },
    ];

    if (allowAdd && isCurrentUser) {
      menu.push({
        label: "Edit",
        value: "edit",
        onClick: () => router.push(`/target/branch/edit/${props.value}`),
      });
    }

    return menu;
  };

  const colDefs = [
    {
      field: "employee_name",
      headerName: "Name",
      resizable: true,
      cellRenderer: (props) => capitalizeWords(props.value ?? "-"),
    },
    {
      field: "date",
      headerName: "Date",
      resizable: true,
      cellRenderer: (props) => moment(props.value).format("DD/MM/YYYY"),
      valueGetter: (props) => moment(props.data.date),
    },
    {
      field: "sales_amount",
      headerName: "Amount",
      resizable: true,
      cellRenderer: (props) => (
        <FormatNumber
          value={props.value}
          style="currency"
          currency="INR"
          h="fit-content"
        />
      ),
      valueGetter: (props) => parseFloat(props.data.sales_amount),
    },
    // {
    //   field: "target_branch_id",
    //   headerName: "Action",
    //   resizable: false,
    //   maxWidth: 100,
    //   filter: false,
    //   cellRenderer: (props) => {
    //     return (
    //       <Flex justifyContent="center" alignItems="center" height={"100%"}>
    //         <CustomMenu items={getMenuItems(props.data)} />
    //       </Flex>
    //     );
    //   },
    // },
  ];

  const getPercentageColor = () => {
    if (achievementPerc < 25) {
      return "red.500";
    }

    if (achievementPerc < 50) {
      return "orange.500";
    }

    if (achievementPerc < 75) {
      return "yellow.500";
    }

    return "green.500";
  };

  const { filtered: filteredRows, filterCard } = useListFilters(
    targets,
    LIST_FILTERS,
    { reset: true }
  );

  return (
    <GlobalWrapper permissionKey="add_sales_target">
      <CustomContainer
        headerBand
        title="Target Entry"
        rightSection={
          allowAdd &&
          target && (
            <Flex gap="12px">
              <Link href="/target/create">
                <Button bg="#F47721" color="white" _hover={{ bg: "#E06612" }}>
                  Add
                </Button>
              </Link>
            </Flex>
          )
        }
      >
        <Grid
          templateColumns={{
            base: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          }}
          gap="16px"
        >
          {getDataCard(
            "Current Target",
            target ? (
              <FormatNumber value={target} style="currency" currency="INR" />
            ) : (
              "—"
            ),
            "#C95C18"
          )}
          {getDataCard(
            "Total Sales Made",
            salesMade ? (
              <FormatNumber
                value={salesMade}
                style="currency"
                currency="INR"
              />
            ) : (
              "—"
            ),
            "#C95C18"
          )}
          {getDataCard(
            "Pending Sales to Make",
            pendingSales ? (
              <FormatNumber
                value={Math.abs(pendingSales)}
                style="currency"
                currency="INR"
              />
            ) : (
              "—"
            ),
            pendingSales < 0 ? "#15803D" : "#DC2626"
          )}
          {getDataCard(
            "Achievement %",
            achievementPerc ? Math.round(achievementPerc) + " %" : "—",
            achievementPerc ? getPercentageColor() : "#15803D"
          )}
        </Grid>

        {filterCard}

        <AgGrid
          rowData={filteredRows}
          columnDefs={colDefs}
          tableKey="target-branch"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default TargetEntry;
