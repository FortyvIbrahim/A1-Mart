"use client";

import useEBConsumptions from "@/api/customHooks/useEBConsumptions";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import useDeleteModal from "@/customHooks/useDeleteModal";
import usePermission from "@/customHooks/usePermission";
import { capitalizeWords } from "@/utils/string";
import { Button } from "@chakra-ui/react";
import moment from "moment";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

function EbConsumption() {
  const router = useRouter();
  const { ebConsumptions, handleDelete } = useEBConsumptions();
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();
  const canDelete = usePermission("delete_eb_consumption");

  const onDelete = (id) => {
    openDeleteModal({
      title: "Delete EB Consumption", // optional
      message: "Are you sure you want to delete this eb consumption?", // optional
      onDelete: () => handleDelete(id),
    });
  };

  const getLastEBConsumption = ({ date, branch_id }) => {
    if (date && branch_id) {
      const filteredList = ebConsumptions
        .filter(
          (item) =>
            item.branch_id == branch_id &&
            moment(item.date).isBefore(date, "day")
        )
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const lastEBConsumption = filteredList[filteredList.length - 1];

      if (lastEBConsumption) {
        return lastEBConsumption.closing_units;
      }
      return 0;
    }

    return 0;
  };

  const customDateComparator = (filterLocalDateAtMidnight, cellValue) => {
    if (!cellValue) return -1;

    const cellDate = moment(cellValue);
    const filterDate = moment(filterLocalDateAtMidnight);

    // Custom comparison logic - you can modify this as needed
    if (cellDate.isSame(filterDate, "day")) {
      return 0;
    } else if (cellDate.isBefore(filterDate, "day")) {
      return -1;
    } else {
      return 1;
    }
  };

  const colDefs = [
    {
      field: "consumption_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "branch_name",
      headerName: "Branch",
      type: "capitalized",
    },
    {
      field: "date",
      headerName: "Date",
      type: "date",
    },
    {
      field: "closing_units",
      headerName: "Closing Units",
    },
    {
      field: "closing_units",
      headerName: "Units Consumed",
      resizable: true,
      cellRenderer: (props) => `${props.value} units`,
      valueGetter: (props) => {
        return (
          props.data.closing_units -
          getLastEBConsumption({
            date: props.data.date,
            branch_id: props.data.branch_id,
          })
        ).toFixed(2);
      },
    },
    {
      field: "consumption_id",
      headerName: "Action",
      type: "action-column",
      valueGetter: (props) => {
        if (canDelete) {
          return [
            {
              value: "delete",
              label: "Delete",
              onClick: () => onDelete(props.data.consumption_id),
            },
          ];
        }

        return [];
      },
    },
  ];

  return (
    <GlobalWrapper permissionKey="view_eb_consumption">
      <DeleteModalComponent />
      <CustomContainer
        title="EB Consumption"
        rightSection={
          <Link href="/eb-consumption/create">
            <Button>Add</Button>
          </Link>
        }
      >
        <AgGrid
          rowData={ebConsumptions}
          columnDefs={colDefs}
          tableKey="eb-consumption"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default EbConsumption;
