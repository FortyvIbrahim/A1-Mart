import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import { FormatNumber } from "@chakra-ui/react";
import moment from "moment";
import React from "react";
import { getBranchStats, getPercentageColor } from "./utils";

function BranchStats({ branchTargets = [], entryTargets = [] }) {
  const stats = getBranchStats(branchTargets, entryTargets);

  const colDefs = [
    {
      field: "branch_name",
      headerName: "Branch Name",
      resizable: true,
      flex: 1,
    },
    {
      field: "target_month",
      headerName: "Target Month",
      resizable: true,
      cellRenderer: (props) =>
        props.value ? moment(props.value).format("MMM YYYY") : "-",
      valueGetter: (props) =>
        props.data.target_month ? moment(props.data.target_month) : null,
    },
    {
      field: "targetAmount",
      headerName: "Target Amount",
      resizable: true,
      cellRenderer: (props) => (
        <FormatNumber
          value={props.value}
          style="currency"
          currency="INR"
          h="fit-content"
        />
      ),
      valueGetter: (props) => parseFloat(props.data.targetAmount || 0),
    },
    {
      field: "salesMade",
      headerName: "Sales Made",
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
    {
      field: "targetLeft",
      headerName: "Target Left",
      resizable: true,
      cellRenderer: (props) => (
        <FormatNumber
          value={props.value}
          style="currency"
          currency="INR"
          h="fit-content"
          color={props.value > 0 ? "red.500" : "green.500"}
        />
      ),
      valueGetter: (props) => parseFloat(props.data.targetLeft || 0),
    },
    {
      field: "achievementPerc",
      headerName: "Achievement %",
      resizable: true,
      cellRenderer: (props) => {
        const perc = Math.round(props.value || 0);
        const color = getPercentageColor(props.value);
        return <span style={{ color, fontWeight: "bold" }}>{perc}%</span>;
      },
      valueGetter: (props) => parseFloat(props.data.achievementPerc || 0),
    },
  ];

  return (
    <CustomContainer title="Branch-wise Statistics">
      <AgGrid rowData={stats} columnDefs={colDefs} tableKey="branch-stats" />
    </CustomContainer>
  );
}

export default BranchStats;
