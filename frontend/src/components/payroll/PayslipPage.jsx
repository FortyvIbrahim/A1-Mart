"use client";

import AgGrid from "@/components/AgGrid";
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
      headerName: "Employee",
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

  const getTitle = () => {
    return type === "all_payslips" ? "All Payslips" : "My Payslips";
  };

  const getPermissionKey = () => {
    return type === "all_payslips" ? "view_payslips" : "view_my_payslips";
  };

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer title={getTitle()}>
        <AgGrid
          rowData={payrolls}
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
