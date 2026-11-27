"use client";

import useGRNs from "@/api/customHooks/useGRNs";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Badge, Button, Text } from "@chakra-ui/react";
import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import usePermission from "@/customHooks/usePermission";

function GRN() {
  const router = useRouter();
  const { grns } = useGRNs();
  const canAdd = usePermission("add_grn");

  const colDefs = [
    {
      field: "grn_id",
      headerName: "ID",
      type: "id",
    },
    {
      headerName: "Supplier",
      type: "capitalized",
      valueGetter: (props) => {
        return props.data?.purchase_acknowledgment?.supplier?.name || "-";
      },
    },
    {
      field: "purchase_acknowledgment",
      headerName: "Invoice No",
      type: "capitalized",
      valueGetter: (props) => {
        return props.data?.purchase_acknowledgment?.invoice_no || "-";
      },
    },
    {
      field: "purchase_acknowledgment",
      headerName: "Amount",
      type: "currency",
      valueGetter: (props) => {
        return props.data?.purchase_acknowledgment?.amount;
      },
    },
    {
      field: "method",
      headerName: "Method",
      type: "badge-column",
      valueGetter: (props) => {
        if (!props.data.grn_method) {
          return { colorScheme: "gray", label: "Unset" };
        }

        return props.data.grn_method === "manual"
          ? { colorScheme: "brand", label: "Manual" }
          : { colorScheme: "secondary", label: "Device" };
      },
    },
    {
      field: "is_product_stock_missing",
      headerName: "Stock Missing",
      type: "badge-column",
      valueGetter: (props) => {
        return props.data.is_product_stock_missing
          ? {
              colorScheme: "red",
              label: "Yes",
            }
          : {
              colorScheme: "gray",
              label: "No",
            };
      },
    },
    {
      field: "employee",
      headerName: "Employee",
      type: "capitalized",
      valueGetter: (props) => props.data.employee?.employee_name || "-",
    },
    {
      field: "missing_qty",
      headerName: "Missing Qty",
      type: "number",
    },
    {
      field: "missing_value",
      headerName: "Missing Value",
      type: "currency",
    },
    {
      field: "created_at",
      headerName: "Created At",
      type: "datetime",
    },
    {
      field: "grn_id",
      headerName: "Action",
      type: "action-column",
      valueGetter: (props) => {
        const menuItems = [
          {
            label: "View",
            value: "view",
            onClick: () => router.push(`/wms/grn/view/${props.data.grn_id}`),
          },
        ];

        if (canAdd) {
          menuItems.push({
            label: "Edit",
            value: "edit",
            onClick: () => router.push(`/wms/grn/edit/${props.data.grn_id}`),
          });
        }

        return menuItems;
      },
    },
  ];

  return (
    <GlobalWrapper permissionKey="view_grn">
      <CustomContainer
        contentCard
        title="GRN"
        rightSection={
          canAdd && (
            <Link href="/wms/grn/create">
              <Button>Add</Button>
            </Link>
          )
        }
      >
        <AgGrid rowData={grns} columnDefs={colDefs} tableKey="grn" />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default GRN;
