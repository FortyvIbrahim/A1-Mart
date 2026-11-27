import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import { FormatNumber } from "@chakra-ui/react";
import React from "react";
import { getEmployeeStats } from "./utils";

function EmployeeStats({ entryTargets = [] }) {
  const stats = getEmployeeStats(entryTargets);

  const colDefs = [
    {
      field: "employee_code",
      headerName: "Employee Code",
      resizable: true,
      flex: 1,
    },
    {
      field: "employee_name",
      headerName: "Employee Name",
      resizable: true,
      flex: 1,
    },
    {
      field: "branch_name",
      headerName: "Branch",
      resizable: true,
      flex: 1,
    },
    {
      field: "department_name",
      headerName: "Department",
      resizable: true,
      flex: 1,
      cellRenderer: (props) => props.value || "-",
    },
    {
      field: "section_name",
      headerName: "Section",
      resizable: true,
      flex: 1,
      cellRenderer: (props) => props.value || "-",
    },
    {
      field: "salesMade",
      headerName: "Total Sales",
      resizable: true,
      cellRenderer: (props) => (
        <FormatNumber
          value={props.value}
          style="currency"
          currency="INR"
          h="fit-content"
        />
      ),
      valueGetter: (props) => parseFloat(props.data.salesMade || 0),
    },
  ];

  return (
    <CustomContainer headerBand size="sm" title="Employee-wise Statistics">
      <AgGrid bare rowData={stats} columnDefs={colDefs} tableKey="employee-stats" />
    </CustomContainer>
  );
}

export default EmployeeStats;
