"use client";

import useAccountsSheet from "@/api/customHooks/useAccountsSheet";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import { capitalizeWords } from "@/utils/string";
import {
  Button,
  Flex,
  FormatNumber,
  IconButton,
  Menu,
  Portal,
  Text,
} from "@chakra-ui/react";
import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import usePermission from "@/customHooks/usePermission";
import { DashboardFilterField } from "@/components/dashboard/DashboardUI";
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
  const canAdd = usePermission("add_accounts_sheet");

  // Figma "Record filters / Search, Branch, Billing Counter, Date".
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [counter, setCounter] = useState("");
  const [date, setDate] = useState(null);

  const uniq = (key) =>
    [...new Set((accountSheets || []).map((r) => r[key]).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b)))
      .map((v) => ({ value: v, label: capitalizeWords(String(v)) }));
  const branchOptions = useMemo(() => uniq("branch_name"), [accountSheets]);
  const counterOptions = useMemo(() => uniq("counter_name"), [accountSheets]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const day = date ? moment(date).format("YYYY-MM-DD") : null;
    return (accountSheets || []).filter((r) => {
      if (branch && r.branch_name !== branch) return false;
      if (counter && r.counter_name !== counter) return false;
      if (day && moment(r.date).format("YYYY-MM-DD") !== day) return false;
      if (q && !`${r.id ?? ""} ${r.employee_name ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [accountSheets, search, branch, counter, date]);

  const resetFilters = () => {
    setSearch("");
    setBranch("");
    setCounter("");
    setDate(null);
  };

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
      <CustomContainer
        headerBand
        title="Performance Entry"
        rightSection={
          canAdd ? (
            <Link href="/performance/create">
              <Button h="39px" px="16px" fontSize="12px">
                Add
              </Button>
            </Link>
          ) : null
        }
      >
        <Flex gap="12px" align="flex-end" wrap="wrap">
          <DashboardFilterField
            size="lg"
            field={{
              key: "search",
              type: "search",
              label: "Search",
              placeholder: "Search ID or employee…",
              value: search,
              onChange: setSearch,
              width: { base: "100%", md: "300px" },
            }}
          />
          <DashboardFilterField
            size="lg"
            field={{
              key: "branch",
              label: "Branch",
              placeholder: "All branches",
              value: branch,
              onChange: setBranch,
              options: branchOptions,
              width: { base: "100%", md: "200px" },
            }}
          />
          <DashboardFilterField
            size="lg"
            field={{
              key: "counter",
              label: "Billing Counter",
              placeholder: "All counters",
              value: counter,
              onChange: setCounter,
              options: counterOptions,
              width: { base: "100%", md: "180px" },
            }}
          />
          <DashboardFilterField
            size="lg"
            field={{
              key: "date",
              type: "date",
              label: "Date",
              placeholder: "All dates",
              value: date,
              onChange: setDate,
              width: { base: "100%", md: "260px" },
            }}
          />
          <Button
            h="44px"
            px="16px"
            fontSize="12px"
            bg="#FFF5ED"
            color="#C95C18"
            _hover={{ bg: "#FDE9DA" }}
            onClick={resetFilters}
          >
            Reset
          </Button>
        </Flex>
        <AgGrid
          ref={gridRef}
          rowData={rows}
          columnDefs={colDefs}
          tableKey="performance-entry"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Accounts;
