"use client";

import React, { useCallback, useMemo } from "react";
import { useListFilters } from "@/components/ListFilters";
import { Button } from "@chakra-ui/react";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import useAccountAssets from "@/api/customHooks/useAccountAssets";
import useDeleteModal from "@/customHooks/useDeleteModal";
import Link from "next/link";
import usePermission from "@/customHooks/usePermission";


const LIST_FILTERS = [
  { key: "q", type: "search", placeholder: "Search asset...", getText: (r) => `${r.account_asset_id} ${r.label ?? ""}` },
];

function AssetsList() {
  const { assets, deleteAccountAsset } = useAccountAssets();
  const canAdd = usePermission("add_account_assets");
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();

  const handleDeleteClick = useCallback(
    (accountAssetId) => {
      openDeleteModal({
        title: "Delete Current Asset",
        message:
          "Are you sure you want to delete this account asset? This action cannot be undone.",
        onDelete: () => deleteAccountAsset(accountAssetId),
      });
    },
    [openDeleteModal, deleteAccountAsset]
  );

  const colDefs = useMemo(
    () => [
      {
        field: "account_asset_id",
        headerName: "ID",
        type: "id",
      },
      {
        field: "label",
        headerName: "Label",
      },
      {
        field: "account_asset_id",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => [
          {
            label: "View",
            value: "view",
            redirectionUrl: `/accounts/assets/view/${params.data.account_asset_id}`,
          },
          {
            label: "Edit",
            value: "edit",
            redirectionUrl: `/accounts/assets/edit/${params.data.account_asset_id}`,
          },
          {
            label: "Delete",
            value: "delete",
            type: "danger",
            onClick: () =>
              handleDeleteClick(params.data.account_asset_id),
          },
        ],
      },
    ],
    [handleDeleteClick]
  );

  const { filtered: filteredRows, filterCard } = useListFilters(assets, LIST_FILTERS);

  return (
    <GlobalWrapper permissionKey="view_account_assets">
      <CustomContainer
        title="Current Assets"
        rightSection={
          canAdd && (
            <Link href="/accounts/assets/create">
              <Button size="sm">Add</Button>
            </Link>
          )
        }
      >
        <div style={{ marginBottom: 16 }}>{filterCard}</div>
        <AgGrid
          rowData={filteredRows}
          columnDefs={colDefs}
          tableKey="accounts-assets"
        />
      </CustomContainer>
      <DeleteModalComponent />
    </GlobalWrapper>
  );
}

export default AssetsList;
