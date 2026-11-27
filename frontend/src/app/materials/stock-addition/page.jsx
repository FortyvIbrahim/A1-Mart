"use client";

import useStockAdditions from "@/api/customHooks/useStockAdditions";
import AgGrid from "@/components/AgGrid";
import { useListFilters } from "@/components/ListFilters";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import React from "react";
import { useRouter } from "next/navigation";
import { updateStockAddition } from "@/api/helpers/stock_addition";
import toast from "react-hot-toast";
import { Button } from "@chakra-ui/react";
import usePermission from "@/customHooks/usePermission";
import Link from "next/link";


/** Figma list filters for this page. */
const LIST_FILTERS = [
  { key: "q", type: "search", label: "Search", placeholder: "Search records...", getText: (r) => `${r.stock_addition_id ?? ""} ${r.creator_employee_name ?? ""}` },
  { key: "status", type: "select", label: "Status", placeholder: "All statuses", getValue: (r) => (r.is_approved ? "Approved" : "Pending") },
];

function StockAddition() {
  const router = useRouter();
  const { stockAdditions, refetch } = useStockAdditions();
  const allowAdd = usePermission("add_stock_addition");

  const handleApproveUnapprove = async (data) => {
    try {
      const isApproved = data?.is_approved === 1;

      const filteredItems = data.items.map((item) => ({
        material_id: item.material_id,
        quantity: Number(item.quantity),
        remark: item.remark,
      }));

      const response = await updateStockAddition(data.stock_addition_id, {
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
      toast.error("Error updating stock addition");
    }
  };

  const colDefs = [
    {
      field: "stock_addition_id",
      type: "id",
      headerName: "ID",
    },
    {
      field: "creator_employee_name",
      headerName: "Name",
      type: "capitalized",
    },
    {
      field: "items",
      headerName: "Items Count",
      resizable: true,
      valueGetter: (props) => props.data.items.length,
    },
    {
      field: "is_approved",
      headerName: "Approval Status",
      resizable: true,
      maxWidth: 200,
      filter: "agNumberColumnFilter",
      type: "badge-column",
      valueGetter: (props) => {
        const isApproved = props.data.is_approved === 1;
        return {
          label: isApproved ? "Approved" : "Pending",
          colorScheme: isApproved ? "green" : "gray",
        };
      },
    },
    {
      field: "stock_addition_id",
      headerName: "Action",
      type: "action-column",
      valueGetter: (props) => [
        {
          label: "View",
          value: "view",
          onClick: () =>
            router.push(
              `/materials/stock-addition/view/${props.data.stock_addition_id}`
            ),
        },
        {
          label:
            props.data.is_approved === 1 ? "Set to Pending" : "Set to Approved",
          value: "approve",
          onClick: () => handleApproveUnapprove(props.data),
        },
      ],
    },
  ];

  const { filtered: filteredRows, filterCard } = useListFilters(stockAdditions, LIST_FILTERS, { reset: true });

  return (
    <GlobalWrapper permissionKey="view_stock_addition">
      <CustomContainer headerBand
        title="Stock Addition"
        rightSection={
          allowAdd && (
            <Link href="/materials/stock-addition/create">
              <Button>Add</Button>
            </Link>
          )
        }
      >
        {filterCard}
        <AgGrid
          rowData={filteredRows}
          columnDefs={colDefs}
          tableKey="stock-addition"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default StockAddition;
