"use client";

import useMaterialRequests from "@/api/customHooks/useMaterialRequests";
import {
  createMaterialRequests,
  getMaterialRequestById,
  updateMaterialRequest,
} from "@/api/helpers/material_requests";
import AgGrid from "@/components/AgGrid";
import { useListFilters } from "@/components/ListFilters";
import CustomContainer from "@/components/CustomContainer";
import CustomMenu from "@/components/CustomMenu";
import GlobalWrapper from "@/components/GlobalWrapper";
import useDeleteModal from "@/customHooks/useDeleteModal";
import { capitalizeWords } from "@/utils/string";
import { Badge, Button, Flex } from "@chakra-ui/react";
import moment from "moment";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import toast from "react-hot-toast";
import ApproveMaterialRequestDrawer from "./ApproveMaterialRequestDrawer";


/** Figma list filters for this page. */
const LIST_FILTERS = [
  { key: "q", type: "search", label: "Search", placeholder: "Search records...", getText: (r) => `${r.material_request_id ?? ""} ${r.creator_employee_name ?? ""}` },
  { key: "branch", type: "select", label: "Branch", placeholder: "All branches", getValue: (r) => r.outlet?.branch_name },
  { key: "status", type: "select", label: "Status", placeholder: "All statuses", getValue: (r) => (r.is_approved ? "Approved" : "Pending") },
];

function MaterialsRequest() {
  const router = useRouter();
  const {
    requests,
    handleDelete: handleDeleteRequest,
    refetch,
  } = useMaterialRequests();
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();
  const [approveDrawerOpen, setApproveDrawerOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  const handleDelete = (id) => {
    openDeleteModal({
      title: "Delete Material Request", // optional
      message: "Are you sure you want to delete this material request?", // optional
      onDelete: () => handleDeleteRequest(id),
    });
  };

  const handleApproveUnapprove = async (data) => {
    try {
      const isApproved = data?.is_approved === 1;

      const filteredItems = data.items.map((item) => ({
        material_id: item.material_id,
        quantity: Number(item.quantity),
        remark: item.remark,
      }));

      const response = await updateMaterialRequest(data.material_request_id, {
        items: filteredItems,
        is_approved: isApproved ? 0 : 1,
      });
      if (response.success) {
        refetch();
        toast.success(`Marked as ${isApproved ? "pending" : "approved"}`);
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error updating");
    }
  };

  const openApproveDrawer = (requestId) => {
    setSelectedRequestId(requestId);
    setApproveDrawerOpen(true);
  };

  const handleApproveConfirm = async (requestId, rows) => {
    try {
      const requestData = await getMaterialRequestById(requestId);

      if (requestData.status !== 200) {
        toast.error("Error fetching request data");
        return;
      }

      const outletId = requestData.data.outlet_id;
      const filteredItems = rows.map((row) => ({
        material_id: row.material_id,
        quantity: Number(row.approved_qty),
        remark: row.remark,
      }));

      const newItems = rows
        .filter((row) => row.create_as_new)
        .map((row) => ({
          material_id: row.material_id,
          quantity: Number(row.requested_qty) - Number(row.approved_qty),
          remark: row.remark,
        }));

      if (newItems.length > 0) {
        const postData = { items: newItems, outlet_id: outletId };
        await createMaterialRequests(postData);
      }

      const response = await updateMaterialRequest(requestId, {
        items: filteredItems,
        is_approved: 1,
      });
      if (response.success) {
        refetch();
        toast.success("Request approved");
      } else {
        throw response;
      }
    } catch (err) {
      console.log(err);
      toast.error("Error approving request");
      throw err;
    }
  };

  const colDefs = [
    {
      field: "material_request_id",
      headerName: "ID",
      maxWidth: 120,
      resizable: false,
    },
    {
      field: "creator_employee_name",
      headerName: "Creator Name",
      resizable: true,
      cellRenderer: (props) => capitalizeWords(props.value ?? "-"),
    },
    {
      field: "outlet.branch_name",
      headerName: "Branch",
      resizable: true,
    },
    {
      field: "items",
      headerName: "Items Count",
      resizable: true,
      valueGetter: (props) => props.data.items.length,
    },
    {
      field: "created_at",
      headerName: "Created At",
      resizable: true,
      valueGetter: (props) =>
        moment(props.data.created_at).format("MMM D, YYYY, h:mm A"),
    },
    {
      field: "updated_at",
      headerName: "Approved At",
      resizable: true,
      valueGetter: (props) =>
        props.data.is_approved
          ? moment(props.data.updated_at).format("MMM D, YYYY, h:mm A")
          : "-",
    },
    {
      field: "is_approved",
      headerName: "Approval Status",
      resizable: true,
      maxWidth: 200,
      filter: "agNumberColumnFilter",
      cellRenderer: (props) => {
        const isApproved = props.value === 1;
        return (
          <Badge colorPalette={isApproved ? "green" : "gray"}>
            {isApproved ? "Approved" : "Pending"}
          </Badge>
        );
      },
    },
    {
      field: "material_request_id",
      headerName: "Action",
      resizable: false,
      maxWidth: 100,
      filter: false,
      cellRenderer: (props) => {
        return (
          <Flex justifyContent="center" alignItems="center" height={"100%"}>
            <CustomMenu
              items={
                !props.data.is_approved
                  ? [
                      {
                        label: "View",
                        value: "view",
                        onClick: () =>
                          router.push(`/materials/request/view/${props.value}`),
                      },
                      {
                        label: "Edit",
                        value: "edit",
                        onClick: () =>
                          router.push(`/materials/request/edit/${props.value}`),
                      },
                      {
                        label: "Set to Approved",
                        value: "approve",
                        onClick: () =>
                          openApproveDrawer(props.data.material_request_id),
                      },
                      {
                        label: "Delete",
                        value: "delete",
                        onClick: () => handleDelete(props.value),
                        type: "danger",
                      },
                    ]
                  : [
                      {
                        label: "View",
                        value: "view",
                        onClick: () =>
                          router.push(`/materials/request/view/${props.value}`),
                      },
                      {
                        label: "Set to Pending",
                        value: "approve",
                        onClick: () => handleApproveUnapprove(props.data),
                      },
                    ]
              }
            />
          </Flex>
        );
      },
    },
  ];

  const { filtered: filteredRows, filterCard } = useListFilters(requests, LIST_FILTERS, { reset: true });

  return (
    <GlobalWrapper permissionKey="view_materials_request">
      <DeleteModalComponent />
      <ApproveMaterialRequestDrawer
        isOpen={approveDrawerOpen}
        onClose={() => {
          setApproveDrawerOpen(false);
          setSelectedRequestId(null);
        }}
        requestId={selectedRequestId}
        onConfirm={handleApproveConfirm}
      />
      <CustomContainer headerBand
        title="Materials Request"
        rightSection={
          <Link href="/materials/request/create">
            <Button>Add</Button>
          </Link>
        }
      >
        {filterCard}
        <AgGrid
          rowData={filteredRows}
          columnDefs={colDefs}
          tableKey="materials-request"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default MaterialsRequest;
