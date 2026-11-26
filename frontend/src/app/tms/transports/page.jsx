"use client";

import React, { useCallback, useMemo } from "react";
import { Button, Flex } from "@chakra-ui/react";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import AgGrid from "@/components/AgGrid";
import useTransports from "@/api/customHooks/useTransports";
import useBranches from "@/api/customHooks/useBranches";
import useDeleteModal from "@/customHooks/useDeleteModal";
import Link from "next/link";
import usePermission from "@/customHooks/usePermission";
import FileUploaderWithColumnMapping from "@/components/FileUploaderWithColumnMapping";
import { bulkInsertTransports } from "@/api/helpers/transports";
import toast from "react-hot-toast";
import { TRANSPORTS_ROUTES } from "@/constants/routes/index";

const TRANSPORT_IMPORT_TARGET_COLUMNS = [
  {
    key: "asset_code",
    label: "Asset Code",
    required: true,
    suggestedKey: "Asset Code",
    type: "string",
  },
  {
    key: "asset_name",
    label: "Asset Name",
    suggestedKey: "Asset Name",
    type: "string",
  },
  {
    key: "main_category",
    label: "Main Category",
    suggestedKey: "Main Category",
    type: "string",
    required: true,
  },
  {
    key: "vehicle_number",
    label: "Vehicle Number",
    suggestedKey: "Vehicle Number",
    type: "string",
  },
  {
    key: "engine_number",
    label: "Engine Number",
    suggestedKey: "Engine Number",
    type: "string",
  },
  {
    key: "chassis_number",
    label: "Chassis Number",
    suggestedKey: "Chassis Number",
    type: "string",
  },
  {
    key: "acquisition_type",
    label: "Acquisition Type",
    suggestedKey: "Acquisition Type",
    type: "string",
  },
  {
    key: "dependency_type",
    label: "Dependency Type",
    suggestedKey: "Dependency Type",
    type: "string",
  },
  {
    key: "working_status",
    label: "Working Status",
    suggestedKey: "Working Status",
    type: "string",
  },
  {
    key: "asset_description",
    label: "Asset Description",
    suggestedKey: "Asset Description",
    type: "string",
  },
  {
    key: "customer_asset_no",
    label: "Customer Asset No",
    suggestedKey: "Customer Asset No",
    type: "string",
  },
  {
    key: "sub_category",
    label: "Sub Category",
    suggestedKey: "Sub Category",
    type: "string",
  },
  {
    key: "hsn_code",
    label: "HSN Code",
    suggestedKey: "HSN Code",
    type: "string",
  },
  {
    key: "barcode_option",
    label: "Barcode Option",
    suggestedKey: "Barcode Option",
    type: "string",
  },
  {
    key: "barcode_no",
    label: "Barcode No",
    suggestedKey: "Barcode No",
    type: "string",
  },
  {
    key: "purchased_price",
    label: "Purchased Price (₹)",
    suggestedKey: "Purchased Price",
    type: "number",
  },
  {
    key: "purchased_date",
    label: "Purchased Date",
    suggestedKey: "Purchased Date",
    type: "date",
  },
  {
    key: "placed_in_service",
    label: "Placed In Service",
    suggestedKey: "Placed In Service",
    type: "date",
  },
  {
    key: "capitalization_date",
    label: "Capitalization Date",
    suggestedKey: "Capitalization Date",
    type: "date",
  },
  { key: "bill_no", label: "Bill No", suggestedKey: "Bill No", type: "string" },
  {
    key: "bill_date",
    label: "Bill Date",
    suggestedKey: "Bill Date",
    type: "date",
  },
  {
    key: "received_date",
    label: "Received Date",
    suggestedKey: "Received Date",
    type: "date",
  },
  {
    key: "serial_number",
    label: "Serial Number",
    suggestedKey: "Serial Number",
    type: "string",
  },
  {
    key: "model_number",
    label: "Model Number",
    suggestedKey: "Model Number",
    type: "string",
  },
  { key: "seller", label: "Seller", suggestedKey: "Seller", type: "string" },
  {
    key: "branch_name",
    label: "Branch Name",
    suggestedKey: "Branch Name",
    type: "string",
  },
  {
    key: "branch_code",
    label: "Branch Code",
    suggestedKey: "Branch Code",
    type: "string",
  },
  {
    key: "is_depreciation_applicable",
    label: "Is Depreciation Applicable",
    suggestedKey: "Is Depreciation Applicable",
    type: "string",
  },
  {
    key: "salvage_value",
    label: "Salvage Value (₹)",
    suggestedKey: "Salvage Value",
    type: "number",
  },
  {
    key: "exp_end_date",
    label: "Exp End Date",
    suggestedKey: "Exp End Date",
    type: "date",
  },
  {
    key: "asset_life_span",
    label: "Asset Life Span",
    suggestedKey: "Asset Life Span",
    type: "number",
  },
];

function toApiDate(val) {
  if (val == null || val === "") return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val))
    return val.slice(0, 10);
  return null;
}

function toApiNumber(val) {
  if (val == null || val === "") return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

function toApiString(val) {
  if (val == null) return null;
  const s = String(val).trim();
  return s === "" ? null : s;
}

function TransportsList() {
  const { transports, deleteTransport, refresh } = useTransports();
  const { branches } = useBranches();
  const canAdd = usePermission(TRANSPORTS_ROUTES.create.permissionKey);
  const canDelete = usePermission("delete_transport");
  const canImport = usePermission("import_transports");
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();

  const branchByCode = useMemo(() => {
    const m = new Map();
    (branches || []).forEach((b) => {
      if (b.branch_code != null && String(b.branch_code).trim() !== "")
        m.set(String(b.branch_code).trim().toLowerCase(), b.branch_id);
      if (b.branch_name != null && String(b.branch_name).trim() !== "")
        m.set(String(b.branch_name).trim().toLowerCase(), b.branch_id);
    });
    return m;
  }, [branches]);

  const resolveBranchId = useCallback(
    (row) => {
      const code = toApiString(row.branch_code);
      const name = toApiString(
        row.branch_name
          ?.replace("A1 MART", "A1MART")
          ?.replace("A1  MART", "A1MART")
      );

      if (code) {
        const id = branchByCode.get(code.toLowerCase());
        if (id != null) return id;
      }
      if (name) {
        const id = branchByCode.get(name.toLowerCase());
        if (id != null) return id;
      }
      return null;
    },
    [branchByCode]
  );

  const handleImportMapped = useCallback(
    async (mappedRows) => {
      if (!mappedRows || mappedRows.length === 0) {
        toast.error("No rows to import");
        return;
      }

      const payload = mappedRows
        .filter((row) => row.main_category === "VEHICLES-15%")
        .map((row) => {
          const assetCode = toApiString(row.asset_code);
          if (!assetCode) return null;

          const dep = toApiString(row.is_depreciation_applicable);
          const isDepreciation =
            dep && /^yes$/i.test(dep) ? "Yes" : dep ? "No" : null;

          const fields = {
            asset_code: assetCode,
            asset_name: toApiString(row.asset_name),
            vehicle_number: toApiString(row.vehicle_number),
            engine_number: toApiString(row.engine_number),
            chassis_number: toApiString(row.chassis_number),
            acquisition_type: toApiString(row.acquisition_type),
            dependency_type: toApiString(row.dependency_type),
            working_status: toApiString(row.working_status),
            asset_description: toApiString(row.asset_description),
            customer_asset_no: toApiString(row.customer_asset_no),
            sub_category: toApiString(row.sub_category),
            hsn_code: toApiString(row.hsn_code),
            barcode_option: toApiString(row.barcode_option),
            barcode_no: toApiString(row.barcode_no),
            purchased_price: toApiNumber(row.purchased_price),
            purchased_date: toApiDate(row.purchased_date),
            placed_in_service: toApiDate(row.placed_in_service),
            capitalization_date: toApiDate(row.capitalization_date),
            bill_no: toApiString(row.bill_no),
            bill_date: toApiDate(row.bill_date),
            received_date: toApiDate(row.received_date),
            serial_number: toApiString(row.serial_number),
            model_number: toApiString(row.model_number),
            seller: toApiString(row.seller),
            branch_id: resolveBranchId(row),
            is_depreciation_applicable: isDepreciation,
            salvage_value: toApiNumber(row.salvage_value),
            exp_end_date: toApiDate(row.exp_end_date),
            asset_life_span: toApiNumber(row.asset_life_span),
            image_url: toApiString(row.image_url),
          };

          const result = {};
          for (const [key, value] of Object.entries(fields)) {
            if (value != null) {
              result[key] = value;
            }
          }
          return result;
        })
        .filter(Boolean);
      if (payload.length === 0) {
        toast.error("No valid rows (Asset Code is required)");
        return;
      }
      try {
        const response = await bulkInsertTransports(payload);
        if (response?.code === 200) {
          toast.success(`Imported ${payload.length} transport(s) successfully`);
          refresh();
        } else {
          toast.error(response?.message || "Import failed");
        }
      } catch (err) {
        toast.error(
          err?.response?.data?.message || err?.message || "Import failed"
        );
      }
    },
    [resolveBranchId, refresh]
  );

  const handleDeleteClick = useCallback(
    (transportId) => {
      openDeleteModal({
        title: "Delete Transport",
        message:
          "Are you sure you want to delete this transport? This action cannot be undone.",
        onDelete: () => deleteTransport(transportId),
      });
    },
    [openDeleteModal, deleteTransport]
  );

  const colDefs = useMemo(
    () => [
      {
        field: "transport_id",
        headerName: "ID",
        type: "id",
      },
      {
        field: "image_url",
        headerName: "Image",
        type: "image",
      },
      {
        field: "asset_code",
        headerName: "Asset Code",
      },
      {
        field: "asset_name",
        headerName: "Asset Name",
      },
      {
        field: "vehicle_number",
        headerName: "Vehicle No.",
      },
      {
        field: "working_status",
        headerName: "Working Status",
      },
      {
        field: "branch",
        headerName: "Branch",
        valueGetter: (params) => params.data?.branch?.branch_name ?? "—",
      },
      {
        field: "created_at",
        headerName: "Created",
        hideByDefault: true,
        type: "datetime",
      },
      {
        field: "transport_id",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => {
          const actions = [
            {
              label: "View",
              value: "view",
              redirectionUrl: `/tms/transports/view/${params.data.transport_id}`,
            },
          ];

          if (canAdd) {
            actions.push({
              label: "Edit",
              value: "edit",
              redirectionUrl: `/tms/transports/edit/${params.data.transport_id}`,
            });
          }

          if (canDelete) {
            actions.push({
              label: "Delete",
              value: "delete",
              type: "danger",
              onClick: () => handleDeleteClick(params.data.transport_id),
            });
          }
          return actions;
        },
      },
    ],
    [handleDeleteClick, canDelete]
  );

  return (
    <GlobalWrapper permissionKey="view_transports">
      <CustomContainer
        title="Transports"
        rightSection={
          <Flex gap={2} alignItems="center">
            {canImport && (
              <FileUploaderWithColumnMapping
                showToast={false}
                targetColumns={TRANSPORT_IMPORT_TARGET_COLUMNS}
                onDataMapped={handleImportMapped}
                renderer={({ openFileSelector }) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openFileSelector}
                  >
                    Import
                  </Button>
                )}
              />
            )}
            {/* {canAdd && (
              <Link href="/tms/transports/create">
                <Button size="sm">Add</Button>
              </Link>
            )} */}
          </Flex>
        }
      >
        <AgGrid
          rowData={transports}
          columnDefs={colDefs}
          tableKey="tms-transports"
        />
      </CustomContainer>
      <DeleteModalComponent />
    </GlobalWrapper>
  );
}

export default TransportsList;
