"use client";

import useStickering from "@/api/customHooks/useStickering";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import SetToDoneDrawer from "./SetToDoneDrawer";
import {
  updateStickeringEntry,
  deleteStickeringEntry,
} from "@/api/helpers/stickering";
import { capitalizeWords, capitalizeWordsLatest } from "@/utils/string";
import { Button, Flex, Text, Box, Badge } from "@chakra-ui/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import usePermission from "@/customHooks/usePermission";
import useDeleteModal from "@/customHooks/useDeleteModal";
import { useUser } from "@/contexts/UserContext";

export default function Stickering({
  permissionKey = "view_stickering",
  type = "stickering",
}) {
  const mine = type === "my_stickering";
  const is_repack_entry_sheet =
    type === "repack_entry_sheet" || type === "my_repack_entry_sheet";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { stickering, loading, refetch } = useStickering({ type });
  const canAddStickering = usePermission("add_stickering");
  const canAddRepack = usePermission("add_repack_entry_sheet");
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();
  const { employee_code } = useUser()?.employeeData;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const handleSetToDone = (record) => {
    setSelectedRecord(record);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = (open) => {
    setIsDrawerOpen(open);
    if (!open) {
      // Reset state when drawer closes
      setSelectedRecord(null);
    }
  };

  const handleDrawerSuccess = () => {
    refetch();
  };

  const handleUpdateStatus = async (id, status) => {
    toast.promise(updateStickeringEntry(id, { status }), {
      loading: `Updating status to ${status}...`,
      success: (response) => {
        if (response.code === 200) {
          refetch();
          return `Status updated to ${status} successfully!`;
        } else {
          throw new Error(
            response.message || response.msg || "Failed to update status"
          );
        }
      },
      error: (err) => {
        console.error(err);
        return err.message || err.msg || "Error updating status!";
      },
    });
  };

  const selectedPurchaseAckId = useMemo(() => {
    const raw = searchParams.get("purchase_acknowledgment_id");
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);

  const invoiceSummaryRows = useMemo(() => {
    const rows = stickering || [];
    const byPa = new Map();

    for (const row of rows) {
      const rawId = row.purchase_acknowledgment_id;
      if (rawId == null || rawId === "") continue;
      const paId = Number(rawId);
      if (!Number.isFinite(paId)) continue;

      if (!byPa.has(paId)) {
        byPa.set(paId, {
          purchase_acknowledgment_id: paId,
          invoice_no: row.purchase_acknowledgment_invoice_no ?? "—",
          supplier_name: row.supplier_name ?? "—",
          jobs_pending: 0,
          jobs_done: 0,
          total_jobs: 0,
          supervisorSet: new Set(),
          repackSupervisorSet: new Set(),
        });
      }
      const g = byPa.get(paId);
      g.total_jobs += 1;
      if (row.status === "done") {
        g.jobs_done += 1;
      } else {
        g.jobs_pending += 1;
      }
      if (row.purchase_acknowledgment_invoice_no) {
        g.invoice_no = row.purchase_acknowledgment_invoice_no;
      }
      if (row.supplier_name) {
        g.supplier_name = row.supplier_name;
      }
      const sup =
        row.supervisor_name != null &&
        String(row.supervisor_name).trim() !== ""
          ? String(row.supervisor_name).trim()
          : row.supervisor_id != null && row.supervisor_id !== ""
          ? String(row.supervisor_id)
          : "";
      if (sup) g.supervisorSet.add(sup);
      const repackSup =
        row.repack_supervisor_name != null &&
        String(row.repack_supervisor_name).trim() !== ""
          ? String(row.repack_supervisor_name).trim()
          : row.repack_supervisor_id != null && row.repack_supervisor_id !== ""
          ? String(row.repack_supervisor_id)
          : "";
      if (repackSup) g.repackSupervisorSet.add(repackSup);
    }

    const formatSupervisorSet = (set) =>
      set && set.size > 0
        ? Array.from(set)
            .sort((a, b) => a.localeCompare(b))
            .join(", ")
        : "—";

    return Array.from(byPa.values()).map((g) => {
      const { supervisorSet, repackSupervisorSet, ...rest } = g;
      return {
        ...rest,
        supervisors_display: formatSupervisorSet(supervisorSet),
        repack_supervisors_display: formatSupervisorSet(repackSupervisorSet),
      };
    });
  }, [stickering]);

  const detailRowData = useMemo(() => {
    if (selectedPurchaseAckId == null) return [];
    return (stickering || []).filter(
      (r) => Number(r.purchase_acknowledgment_id) === selectedPurchaseAckId
    );
  }, [stickering, selectedPurchaseAckId]);

  const isInvoiceDetailView = selectedPurchaseAckId != null;

  const handleBackToInvoiceList = useCallback(() => {
    router.replace(pathname);
  }, [router, pathname]);

  const invoiceSummaryColDefs = useMemo(() => {
    const supervisorHeader = is_repack_entry_sheet ? "Rpk supv." : "Supv.";
    const supervisorField = is_repack_entry_sheet
      ? "repack_supervisors_display"
      : "supervisors_display";

    return [
      {
        field: "purchase_acknowledgment_id",
        headerName: "ID",
        type: "id",
      },
      {
        field: "invoice_no",
        headerName: "Inv #",
        type: "capitalized",
      },
      {
        field: "supplier_name",
        headerName: "Supplier",
        type: "capitalized",
      },
      {
        field: supervisorField,
        headerName: supervisorHeader,
        type: "capitalized",
      },
      {
        field: "jobs_pending",
        headerName: "Pend.",
        type: "number",
      },
      {
        field: "jobs_done",
        headerName: "Done",
        type: "number",
      },
      {
        field: "total_jobs",
        headerName: "Total",
        type: "number",
      },
      {
        headerName: "Action",
        field: "actions",
        type: "action-column",
        valueGetter: (params) => [
          {
            label: "View Details",
            value: "view-details",
            onClick: () =>
              router.push(
                `${pathname}?purchase_acknowledgment_id=${params.data.purchase_acknowledgment_id}`
              ),
          },
        ],
      },
    ];
  }, [is_repack_entry_sheet, pathname, router]);

  const handleDelete = (id) => {
    openDeleteModal({
      title: "Delete Stickering Record",
      message:
        "Are you sure you want to delete this stickering record? This action cannot be undone.",
      onDelete: async () => {
        try {
          const response = await deleteStickeringEntry(id);
          if (response.code === 200) {
            toast.success("Stickering record deleted successfully!");
            refetch();
          } else {
            throw new Error(
              response.message || response.msg || "Failed to delete record"
            );
          }
        } catch (err) {
          console.error(err);
          toast.error(
            err.message || err.msg || "Error deleting stickering record!"
          );
        }
      },
    });
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "open":
        return "blue";
      case "in_progress":
        return "orange";
      case "done":
        return "green";
      case "cancelled":
        return "red";
      default:
        return "gray";
    }
  };

  const colDefs = [
    {
      field: "stickering_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "supplier_name",
      headerName: "Supplier",
      type: "capitalized",
    },
    {
      field: "purchase_acknowledgment_invoice_no",
      headerName: "Invoice No",
      type: "capitalized",
    },
    {
      field: "product_id",
      headerName: "PID",
      type: "id",
    },
    {
      field: "product_name",
      headerName: "Product Name",
      type: "capitalized",
    },
    {
      field: "qty",
      headerName: "Quantity",
      type: "capitalized",
    },
    ...(is_repack_entry_sheet
      ? [
          {
            field: "packing",
            headerName: "Details",
            resizable: true,
            minWidth: 200,
            autoHeight: true,
            cellRenderer: (props) => {
              const record = props.data;
              const items = [];

              if (record.packing !== null && record.packing !== undefined) {
                items.push({
                  label: "Packing",
                  value: record.packing,
                  color: "blue",
                });
              }
              if (record.loose !== null && record.loose !== undefined) {
                items.push({
                  label: "Loose",
                  value: record.loose,
                  color: "green",
                });
              }
              if (record.pur_ret !== null && record.pur_ret !== undefined) {
                items.push({
                  label: "Pur Ret",
                  value: record.pur_ret,
                  color: "brand",
                });
              }
              if (record.wastage !== null && record.wastage !== undefined) {
                items.push({
                  label: "Wastage",
                  value: record.wastage,
                  color: "purple",
                });
              }

              if (items.length === 0) {
                return "-";
              }

              return (
                <Flex
                  flexWrap="wrap"
                  gap={2}
                  alignContent="center"
                  h="100%"
                  p={2}
                >
                  {items.map((item, idx) => (
                    <Badge
                      key={idx}
                      colorPalette={item.color}
                    >{`${item.label}: ${item.value}`}</Badge>
                  ))}
                </Flex>
              );
            },
          },
        ]
      : [
          {
            field: "material_type",
            headerName: "Material Type",
            type: "badge-column",
            valueGetter: (params) => {
              const COLORS_MAP = {
                single: "pink",
                double: "teal",
                looping: "purple",
              };

              return {
                label: capitalizeWordsLatest(params.data.material_type ?? ""),
                colorScheme: COLORS_MAP[params.data.material_type] ?? "gray",
              };
            },
          },
          {
            field: "sticker_type_1_material",
            headerName: "Sticker Type",
            autoHeight: true,
            cellRenderer: (params) => {
              return (
                <Flex
                  alignItems="center"
                  gap={2}
                  h="100%"
                  flexWrap="wrap"
                  p={2}
                >
                  {params.data.sticker_type_1_material && (
                    <Badge colorPalette="pink">
                      {params.data.sticker_type_1_material?.name}
                    </Badge>
                  )}

                  {params.data.sticker_type_2_material && (
                    <Badge colorPalette="teal">
                      {params.data.sticker_type_2_material?.name}
                    </Badge>
                  )}
                </Flex>
              );
            },
          },
        ]),
    {
      field: "employee_name",
      headerName: "Employee",
      type: "capitalized",
      hideByDefault: true,
    },
    ...(is_repack_entry_sheet
      ? [
          {
            field: "repack_supervisor_name",
            headerName: "Supervisor",
            type: "capitalized",
          },
        ]
      : [
          {
            field: "supervisor_name",
            headerName: "Supervisor",
            type: "capitalized",
          },
        ]),
    {
      field: "created_at",
      headerName: "Created At",
      type: "datetime",
      hideByDefault: true,
    },
    {
      field: "status",
      headerName: "Status",
      type: "badge-column",
      valueGetter: (props) => {
        const status = props.data.status || "open";

        const record = props.data;
        const detailsExists =
          (record.packing !== null && record.packing !== undefined) ||
          (record.loose !== null && record.loose !== undefined) ||
          (record.pur_ret !== null && record.pur_ret !== undefined) ||
          (record.wastage !== null && record.wastage !== undefined);

        if (status === "done" && is_repack_entry_sheet && !detailsExists) {
          return {
            colorScheme: "gray",
            label: "Pending",
          };
        }

        if (is_repack_entry_sheet && status === "done" && detailsExists) {
          return {
            colorScheme: "green",
            label: "Done",
          };
        }

        return {
          colorScheme: getStatusBadgeColor(status),
          label:
            status === "in_progress" ? "In Progress" : capitalizeWords(status),
        };
      },
    },
    ...(type === "stickering"
      ? [
          {
            field: "updated_at",
            headerName: "Updated At",
            type: "datetime",
            hideByDefault: true,
            valueGetter: (props) => {
              return props.data.status === "done"
                ? props.data.updated_at
                : null;
            },
          },
        ]
      : []),
    {
      colId: "stickering_row_actions",
      field: "_stickering_row_actions",
      headerName: "Action",
      type: "action-column",
      valueGetter: (props) => {
        const record = props.data;

        // Special handling for repack entry sheet:
        // - Always show an action when status is "done"
        // - If no details yet → "Set Values"
        // - If details exist    → "Edit Values"
        if (is_repack_entry_sheet) {
          const items = [];

          const detailsExists =
            (record.packing !== null && record.packing !== undefined) ||
            (record.loose !== null && record.loose !== undefined) ||
            (record.pur_ret !== null && record.pur_ret !== undefined) ||
            (record.wastage !== null && record.wastage !== undefined);

          if (record.status === "done") {
            items.push({
              label: detailsExists ? "Edit Values" : "Set to Done",
              value: "edit_values",
              onClick: () => handleSetToDone(record),
            });
          }

          if (canAddRepack) {
            items.push({
              label: "Edit",
              value: "edit",
              redirectionUrl: `/wms/repack-entry-sheet/edit/${record.purchase_acknowledgment_id}`,
            });
          }

          return items;
        }

        const items = [
          {
            label: "View",
            value: "view",
            redirectionUrl: `/stickering/view/${record.stickering_id}`,
          },
        ];

        if (canAddStickering) {
          items.push({
            label: "Edit",
            value: "edit",
            redirectionUrl: `/stickering/edit/${record.stickering_id}`,
          });
        }

        // Add status update options based on current status
        if (
          record.status === "open" &&
          (record.employee_code === employee_code ||
            record.supervisor_id === employee_code)
        ) {
          items.push({
            label: "Set to In Progress",
            value: "in_progress",
            onClick: () =>
              handleUpdateStatus(record.stickering_id, "in_progress"),
          });
        } else if (
          record.status === "in_progress" &&
          (record.employee_code === employee_code ||
            record.supervisor_id === employee_code)
        ) {
          items.push({
            label: "Set to Done",
            value: "done",
            onClick: () => handleUpdateStatus(record.stickering_id, "done"),
            // onClick: () => handleSetToDone(record),
          });
        }

        if (!mine && canAddStickering) {
          items.push({
            label: "Delete",
            value: "delete",
            onClick: () => handleDelete(record.stickering_id),
            type: "danger",
          });
        }

        return items;
      },
    },
  ];

  const getTitle = () => {
    if (type === "my_stickering") {
      return "My Job Worksheet";
    } else if (type === "my_repack_entry_sheet") {
      return "My Repack Entry Sheet";
    } else if (type === "repack_entry_sheet") {
      return "Repack Entry Sheet";
    } else {
      return "Job Worksheet";
    }
  };

  const getRightSection = () => {
    if (type === "stickering" && canAddStickering) {
      return (
        <Link href="/stickering/create">
          <Button>Add</Button>
        </Link>
      );
    }

    if (type === "repack_entry_sheet" && canAddRepack) {
      return (
        <Link href="/wms/repack-entry-sheet/create">
          <Button>Add</Button>
        </Link>
      );
    }

    return null;
  };

  const detailInvoiceLabel =
    detailRowData[0]?.purchase_acknowledgment_invoice_no ?? "—";

  return (
    <GlobalWrapper permissionKey={permissionKey}>
      <CustomContainer title={getTitle()} rightSection={getRightSection()}>
        {isInvoiceDetailView && (
          <Flex mb={4} align="center" gap={3} flexWrap="wrap">
            <Button variant="outline" size="sm" onClick={handleBackToInvoiceList}>
              Back
            </Button>
            <Text fontSize="sm" color="gray.600">
              Invoice {detailInvoiceLabel} · Purchase #
              {selectedPurchaseAckId}
            </Text>
          </Flex>
        )}
        <AgGrid
          rowData={isInvoiceDetailView ? detailRowData : invoiceSummaryRows}
          columnDefs={isInvoiceDetailView ? colDefs : invoiceSummaryColDefs}
          loading={loading}
          tableKey={
            isInvoiceDetailView ? `${type}-jobs` : `${type}-by-invoice`
          }
          saveFilters
        />
      </CustomContainer>
      <DeleteModalComponent />

      {/* Drawer for setting status to done with additional fields */}
      {selectedRecord && (
        <SetToDoneDrawer
          isOpen={isDrawerOpen}
          setIsOpen={handleDrawerClose}
          selectedRecord={selectedRecord}
          onSuccess={handleDrawerSuccess}
        />
      )}
    </GlobalWrapper>
  );
}
