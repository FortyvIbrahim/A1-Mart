"use client";

import useAccountsSheet from "@/api/customHooks/useAccountsSheet";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import { capitalizeWords } from "@/utils/string";
import {
  Flex,
  FormatNumber,
  IconButton,
  Menu,
  Portal,
  Text,
} from "@chakra-ui/react";
import React, { useRef } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import moment from "moment";
import CustomMenu from "@/components/CustomMenu";
import { useRouter } from "next/navigation";
import useDeleteModal from "@/customHooks/useDeleteModal";

const renderSalesType = (sales, type, reason) => {
  const isExcess = type === "excess";

  if (sales == 0) {
    return "-";
  }

  const content = (
    <Flex gap="2px" color={isExcess ? "green.600" : "red.600"} w="fit-content">
      <Text>{isExcess ? "+" : "-"}</Text>

      <Text>
        <FormatNumber value={sales} style="currency" currency="INR" />
      </Text>
    </Flex>
  );

  if (reason) {
    return <Tooltip content={reason}>{content}</Tooltip>;
  }

  return content;
};

function Accounts() {
  const router = useRouter();
  const { accountSheets, handleDeleteAccountSheet } = useAccountsSheet();

  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();

  const handleDelete = (id) => {
    openDeleteModal({
      title: "Delete Performance Entry", // optional
      message: "Are you sure you want to delete this performance entry?", // optional
      onDelete: () => handleDeleteAccountSheet(id),
    });
  };

  const colDefs = [
    {
      field: "id",
      headerName: "ID",
      maxWidth: 120,
      resizable: false,
    },
    {
      field: "employee_name",
      headerName: "Name",
      resizable: true,
      cellRenderer: (props) => capitalizeWords(props.value),
    },
    {
      field: "branch_name",
      headerName: "Branch",
      resizable: true,
      cellRenderer: (props) => props.value,
    },
    {
      field: "counter_name",
      headerName: "Counter",
      type: "capitalized",
    },
    {
      field: "date",
      headerName: "Date",
      resizable: true,
      cellRenderer: (props) => moment(props.value).format("DD/MM/YYYY"),
      valueGetter: (props) => moment(props.data.date),
      filter: "agDateColumnFilter",
    },
    {
      field: "total_sales",
      headerName: "Total Sales",
      resizable: true,
      cellRenderer: (props) => (
        <FormatNumber value={props.value} style="currency" currency="INR" />
      ),
      valueGetter: (props) => parseFloat(props.data.total_sales),
      filter: "agNumberColumnFilter",
      type: "number",
    },
    {
      field: "card_sales",
      headerName: "Card",
      resizable: true,
      cellRenderer: (props) =>
        renderSalesType(
          props.data.card_sales,
          props.data.card_type,
          props.data.card_reason
        ),
      valueGetter: (props) => parseFloat(props.data.card_sales),
      filter: "agNumberColumnFilter",
    },
    {
      field: "cash_sales",
      headerName: "Cash",
      resizable: true,
      cellRenderer: (props) =>
        renderSalesType(
          props.data.cash_sales,
          props.data.cash_type,
          props.data.cash_reason
        ),
      valueGetter: (props) => parseFloat(props.data.cash_sales),
      filter: "agNumberColumnFilter",
    },
    {
      field: "paytm_sales",
      headerName: "Paytm",
      resizable: true,
      cellRenderer: (props) =>
        renderSalesType(
          props.data.paytm_sales,
          props.data.paytm_type,
          props.data.paytm_reason
        ),
      valueGetter: (props) => parseFloat(props.data.paytm_sales),
      filter: "agNumberColumnFilter",
    },
    {
      field: "id",
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
                    router.push(`/performance/view/${props.value}`),
                },
                {
                  label: "Edit",
                  value: "edit",
                  onClick: () =>
                    router.push(`/performance/edit/${props.value}`),
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

  const gridRef = useRef(null);

  return (
    <GlobalWrapper permissionKey="view_accounts_sheet">
      <DeleteModalComponent />
      <CustomContainer title="Performance Entry">
        <AgGrid
          ref={gridRef}
          rowData={accountSheets}
          columnDefs={colDefs}
          tableKey="performance-entry"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Accounts;
