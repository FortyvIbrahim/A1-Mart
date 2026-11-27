"use client";

import AgGrid from "@/components/AgGrid";
import { useListFilters } from "@/components/ListFilters";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import { PayslipDetailsDrawer } from "@/components/payroll";
import { roundOff } from "@/utils/payroll";
import React, { useState } from "react";
import moment from "moment";
import usePayslips from "@/api/customHooks/usePayslips";

function PayslipPage({ type = "all_payslips" }) {
  const { payrolls, handleGeneratePayslip } = usePayslips({ type });
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  const columnDefs = [
    {
      field: "payroll.payroll_month",
      headerName: "Payroll Month",
      valueGetter: (params) => {
        const month = params.data?.payroll?.payroll_month;
        if (!month) return "-";
        return moment(month).format("MMM YYYY");
      },
    },
    {
      field: "employee.employee_name",
      headerName: "Employee",
    },
    {
      field: "employee.employee_code",
      headerName: "Employee Code",
    },
    {
      field: "net_pay",
      headerName: "Net Pay",
      type: "currency",
      valueGetter: (params) => roundOff(params.data?.net_pay).toFixed(0),
    },
    {
      field: "is_payslip_available",
      headerName: "Payslip Status",
      type: "badge-column",
      valueGetter: (params) => {
        const isGenerated = params.data.is_payslip_available == true;
        return {
          label: isGenerated ? "Generated" : "Not Generated",
          colorScheme: isGenerated ? "green" : "gray",
        };
      },
    },
    {
      field: "status",
      headerName: "Payment Status",
      type: "badge-column",
      valueGetter: (params) => {
        const statusLower = params.data?.payment_details?.status?.toLowerCase();
        const isDone = statusLower === "processed" || statusLower === "done";
        return {
          label: isDone ? "Done" : "Pending",
          colorScheme: isDone ? "green" : "gray",
        };
      },
    },
    {
      field: "actions",
      headerName: "Action",
      type: "action-column",
      valueGetter: (params) => {
        const isGenerated = params.data.is_payslip_available == true;

        const menu = [
          {
            label: "View Details",
            value: "view_details",
            onClick: () => {
              setSelectedPayslip(params.data);
              setDetailsDrawerOpen(true);
            },
          },
        ];

        if (isGenerated)
          menu.push({
            label: "Download Payslip",
            value: "download_payslip",
            type: "link",
            onClick: () => {
              if (params.data.payslip_url) {
                window.open(params.data.payslip_url, "_blank");
              } else {
                handleGeneratePayslip(params.data.payroll_employee_id);
              }
            },
          });

        return menu;
      },
    },
  ];

  // Figma PSL/01 filters: Payroll month · Select employee · Payslip status · Payment status.
  const isDone = (r) => {
    const st = r?.payment_details?.status?.toLowerCase();
    return st === "processed" || st === "done";
  };
  const filterFields = [
    { key: "month", type: "select", label: "Payroll month", placeholder: "All months", getValue: (r) => (r.payroll?.payroll_month ? moment(r.payroll.payroll_month).format("MMM YYYY") : "") },
    ...(type === "all_payslips"
      ? [{ key: "employee", type: "select", label: "Select employee", placeholder: "All employees", getValue: (r) => r.employee?.employee_name }]
      : []),
    { key: "payslip", type: "select", label: "Payslip status", placeholder: "All statuses", getValue: (r) => (r.is_payslip_available == true ? "Generated" : "Not Generated") },
    { key: "payment", type: "select", label: "Payment status", placeholder: "All statuses", getValue: (r) => (isDone(r) ? "Done" : "Pending") },
  ];
  const { filtered: filteredPayrolls, filterCard } = useListFilters(payrolls, filterFields);

  const getTitle = () => {
    return type === "all_payslips" ? "All Payslips" : "My Payslips";
  };

  const getPermissionKey = () => {
    return type === "all_payslips" ? "view_payslips" : "view_my_payslips";
  };

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer headerBand title={getTitle()}>
        {filterCard}
        <AgGrid
          rowData={filteredPayrolls}
          columnDefs={columnDefs}
          tableKey="payslips"
        />
        <PayslipDetailsDrawer
          isOpen={detailsDrawerOpen}
          onClose={() => {
            setDetailsDrawerOpen(false);
            setSelectedPayslip(null);
          }}
          selectedRow={selectedPayslip}
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PayslipPage;
