"use client";

import useChecklistForms from "@/api/customHooks/useChecklistForms";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import useDeleteModal from "@/customHooks/useDeleteModal";
import usePermission from "@/customHooks/usePermission";
import { CHECKLIST_FORM_ROUTES } from "@/constants/routes";
import { Button } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useRef } from "react";

function ChecklistFormsListing() {
  const router = useRouter();
  const gridRef = useRef(null);
  const { forms, handleDelete } = useChecklistForms();
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();
  const canDelete = usePermission("delete_checklist_form");
  const canAdd = usePermission(CHECKLIST_FORM_ROUTES.create.permissionKey);

  const onDelete = (id) => {
    openDeleteModal({
      title: "Delete checklist form",
      message: "Are you sure you want to delete this checklist form?",
      onDelete: () => handleDelete(id),
    });
  };

  const colDefs = [
    {
      field: "id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "title",
      headerName: "Title",
      type: "capitalized",
      flex: 2,
    },
    {
      field: "questions_count",
      headerName: "Questions",
      type: "number",
    },
    {
      field: "report_to_designations",
      headerName: "Report to",
      flex: 2,
      valueGetter: (p) => {
        const rows = p.data?.report_to_designations;
        if (!Array.isArray(rows) || rows.length === 0) return "";
        return rows.map((d) => d.designation_name).join(", ");
      },
    },
    {
      field: "updated_at",
      headerName: "Updated",
      type: "datetime",
    },
    {
      field: "id",
      headerName: "Action",
      type: "action-column",
      valueGetter: (p) => {
        const id = p.data?.id;
        if (id == null) return [];
        return [
          {
            label: "View",
            value: "view",
            onClick: () =>
              router.push(
                CHECKLIST_FORM_ROUTES.view.path.replace(":id", String(id))
              ),
          },
          {
            label: "Edit",
            value: "edit",
            onClick: () =>
              router.push(
                CHECKLIST_FORM_ROUTES.edit.path.replace(":id", String(id))
              ),
          },
          ...(canDelete
            ? [
                {
                  label: "Delete",
                  value: "delete",
                  onClick: () => onDelete(id),
                  type: "danger",
                },
              ]
            : []),
        ];
      },
    },
  ];

  return (
    <GlobalWrapper permissionKey={CHECKLIST_FORM_ROUTES.listing.permissionKey}>
      <DeleteModalComponent />
      <CustomContainer
        title={CHECKLIST_FORM_ROUTES.listing.title}
        rightSection={
          canAdd && (
            <Link href={CHECKLIST_FORM_ROUTES.create.path}>
              <Button>Add</Button>
            </Link>
          )
        }
      >
        <AgGrid
          ref={gridRef}
          rowData={forms}
          columnDefs={colDefs}
          tableKey="checklist-forms"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default ChecklistFormsListing;
