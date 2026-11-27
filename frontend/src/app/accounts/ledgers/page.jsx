"use client";

import React, { useCallback, useMemo } from "react";
import { useListFilters } from "@/components/ListFilters";
import { Button } from "@chakra-ui/react";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import useLedgers from "@/api/customHooks/useLedgers";
import useDeleteModal from "@/customHooks/useDeleteModal";
import Link from "next/link";
import usePermission from "@/customHooks/usePermission";

const LEDGER_CATEGORIES = {
  1: "Expense",
  2: "Income",
};


const LIST_FILTERS = [
  { key: "q", type: "search", label: "Search", placeholder: "Search label", getText: (r) => `${r.ledger_id} ${r.label ?? ""}` },
  { key: "category", type: "select", label: "Category", placeholder: "All categories", getValue: (r) => r.category },
];

function LedgersList() {
  const { ledgers, deleteLedger } = useLedgers();
  const canAdd = usePermission("add_ledgers");
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();

  const handleDeleteClick = useCallback(
    (ledgerId) => {
      openDeleteModal({
        title: "Delete Master",
        message:
          "Are you sure you want to delete this ledger? This action cannot be undone.",
        onDelete: () => deleteLedger(ledgerId),
      });
    },
    [openDeleteModal, deleteLedger]
  );

  const colDefs = useMemo(
    () => [
      {
        field: "ledger_id",
        headerName: "ID",
        type: "id",
      },
      {
        field: "label",
        headerName: "Label",
      },
      {
        field: "category",
        headerName: "Category",
        valueGetter: (params) => {
          const cat = params.data?.category;
          return cat != null ? LEDGER_CATEGORIES[cat] ?? "-" : "-";
        },
        type: "capitalize",
      },
      {
        field: "ledger_id",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => [
          {
            label: "View",
            value: "view",
            redirectionUrl: `/accounts/ledgers/view/${params.data.ledger_id}`,
          },
          {
            label: "Edit",
            value: "edit",
            redirectionUrl: `/accounts/ledgers/edit/${params.data.ledger_id}`,
          },
          {
            label: "Delete",
            value: "delete",
            type: "danger",
            onClick: () => handleDeleteClick(params.data.ledger_id),
          },
        ],
      },
    ],
    [handleDeleteClick]
  );

  const { filtered: filteredRows, filterCard } = useListFilters(ledgers, LIST_FILTERS);

  return (
    <GlobalWrapper permissionKey="view_ledgers">
      <CustomContainer contentCard
        title="Master"
        rightSection={
          canAdd && (
            <Link href="/accounts/ledgers/create">
              <Button size="sm">Add</Button>
            </Link>
          )
        }
      >
        {filterCard}
        <AgGrid
          rowData={filteredRows}
          columnDefs={colDefs}
          tableKey="accounts-ledgers"
        />
      </CustomContainer>
      <DeleteModalComponent />
    </GlobalWrapper>
  );
}

export default LedgersList;
