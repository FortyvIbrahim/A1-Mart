"use client";

import useBillingCounters from "@/api/customHooks/useBillingCounters";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import useDeleteModal from "@/customHooks/useDeleteModal";
import usePermission from "@/customHooks/usePermission";
import { capitalizeWords } from "@/utils/string";
import { Button } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function BillingCounter() {
  const router = useRouter();
  const { billingCounters, handleDelete } = useBillingCounters();
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();
  const canEdit = usePermission("add_billing_counter");
  const canDelete = usePermission("delete_billing_counter");

  const handleDeleteClick = (counterId, counterName) => {
    openDeleteModal({
      title: "Delete Billing Counter",
      message: `Are you sure you want to delete "${counterName}"? This action cannot be undone.`,
      onDelete: () => handleDelete(counterId),
    });
  };

  const colDefs = [
    {
      field: "counter_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "counter_name",
      headerName: "Counter Name",
      type: "capitalized",
    },
    {
      field: "counter_code",
      headerName: "Counter Code",
      type: "capitalized",
    },
    {
      field: "branch_name",
      headerName: "Branch",
      resizable: true,
      cellRenderer: (props) => capitalizeWords(props.value ?? "-"),
    },
    {
      field: "counter_id",
      headerName: "Action",
      type: "action-column",
      valueGetter: (props) => {
        const items = [
          {
            label: "View",
            value: "view",
            onClick: () =>
              router.push(`/billing-counter/view/${props.data.counter_id}`),
          },
        ];

        if (canEdit) {
          items.push({
            label: "Edit",
            value: "edit",
            onClick: () =>
              router.push(`/billing-counter/edit/${props.data.counter_id}`),
          });
        }

        if (canDelete) {
          items.push({
            label: "Delete",
            value: "delete",
            onClick: () =>
              handleDeleteClick(
                props.data.counter_id,
                props.data.counter_name || "this counter"
              ),
            type: "danger",
          });
        }

        return items;
      },
    },
  ];

  return (
    <GlobalWrapper permissionKey="view_billing_counter">
      <DeleteModalComponent />
      <CustomContainer mainCard
        title="Billing Counters"
        rightSection={
          canEdit && (
            <Link href="/billing-counter/create">
              <Button>Add Counter</Button>
            </Link>
          )
        }
      >
        <AgGrid
          rowData={billingCounters}
          columnDefs={colDefs}
          tableKey="billing-counters"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default BillingCounter;
