"use client";

import useMaterials from "@/api/customHooks/useMaterials";
import useTargetBranches from "@/api/customHooks/useTargetBranches";
import useTargetEntries from "@/api/customHooks/useTargetEntries";
import useUserTarget from "@/api/customHooks/useUserTarget";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import CustomMenu from "@/components/CustomMenu";
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

const getDataCard = (title, value, color = "brand600") => {
  return (
    <Box>
      <Text fontSize="xs" color="gray.600" fontWeight="medium">
        {title}
      </Text>
      <Text fontSize="2xl" fontWeight="bold" color={color}>
        {value}
      </Text>
    </Box>
  );
};

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

  return (
    <GlobalWrapper permissionKey="add_sales_target">
      <CustomContainer
        title="Sales Target - Branch"
        rightSection={
          allowAdd &&
          target && (
            <Flex gap="18px">
              <Link href="/target/create">
                <Button>Add</Button>
              </Link>
            </Flex>
          )
        }
      >
        <CustomContainer containerStyle={{ marginBottom: "22px" }}>
          <Grid templateColumns="repeat(3, 1fr)" gap={6}>
            {getDataCard(
              "Current Target",
              target ? (
                <FormatNumber value={target} style="currency" currency="INR" />
              ) : (
                "-"
              )
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
                "-"
              )
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
                "-"
              ),
              pendingSales < 0 ? "green.500" : "red.500"
            )}
            {getDataCard(
              "Achievement %",
              achievementPerc ? Math.round(achievementPerc) + " %" : "-",
              getPercentageColor()
            )}
          </Grid>
        </CustomContainer>

        <AgGrid
          rowData={targets}
          columnDefs={colDefs}
          tableKey="target-branch"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default TargetEntry;
