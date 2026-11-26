"use client";

import React, { useMemo } from "react";
import { Button } from "@chakra-ui/react";
import useApiCallLogs from "@/api/customHooks/useApiCallLogs";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import { useListFilters } from "@/components/ListFilters";

const isLogSuccess = (row) =>
  row?.is_success === 1 || row?.is_success === true;

const LIST_FILTERS = [
  {
    key: "q",
    type: "search",
    placeholder: "Search URL, caller, error...",
    getText: (r) =>
      `${r.id ?? ""} ${r.api_type ?? ""} ${r.secondary_type ?? ""} ${r.api_url ?? ""} ${r.caller_function ?? ""} ${r.error_message ?? ""} ${r.status_code ?? ""}`,
  },
  {
    key: "api_type",
    type: "select",
    placeholder: "All providers",
    getValue: (r) => r.api_type,
    getLabel: (v) => String(v),
  },
  {
    key: "secondary_type",
    type: "select",
    placeholder: "All operations",
    getValue: (r) => r.secondary_type,
  },
  {
    key: "result",
    type: "select",
    placeholder: "All results",
    getValue: (r) => (isLogSuccess(r) ? "success" : "failed"),
    getLabel: (v) => (v === "success" ? "Success" : "Failed"),
  },
];

function ApiLogsPage() {
  const { logs, loading, refetch } = useApiCallLogs({ limit: 500, offset: 0 });

  const colDefs = useMemo(
    () => [
      {
        field: "id",
        type: "id",
      },
      {
        field: "api_type",
        headerName: "Provider",
        minWidth: 120,
      },
      {
        field: "secondary_type",
        headerName: "Operation",
        minWidth: 150,
        valueGetter: (p) => p.data?.secondary_type || "-",
      },
      {
        field: "http_method",
        headerName: "Method",
        maxWidth: 100,
        valueGetter: (p) => p.data?.http_method || "-",
      },
      {
        field: "status_code",
        headerName: "Status",
        type: "number",
        maxWidth: 110,
      },
      {
        field: "is_success",
        headerName: "Result",
        type: "badge-column",
        maxWidth: 130,
        valueGetter: (p) => {
          if (p.node?.rowPinned === "bottom") return null;
          const ok = isLogSuccess(p.data);
          return {
            label: ok ? "Success" : "Failed",
            colorScheme: ok ? "green" : "red",
          };
        },
      },
      {
        field: "time_taken_ms",
        headerName: "Duration (ms)",
        type: "number",
        maxWidth: 140,
      },
      {
        field: "caller_function",
        headerName: "Caller",
        minWidth: 180,
        valueGetter: (p) => p.data?.caller_function || "-",
      },
      {
        field: "api_url",
        headerName: "URL",
        minWidth: 260,
        valueGetter: (p) => p.data?.api_url || "-",
      },
      {
        field: "error_message",
        headerName: "Error",
        minWidth: 220,
        valueGetter: (p) => p.data?.error_message || "-",
      },
      {
        field: "created_at",
        headerName: "Time",
        type: "datetime",
        minWidth: 190,
      },
    ],
    []
  );

  const { filtered: filteredRows, filterCard } = useListFilters(
    logs,
    LIST_FILTERS
  );

  return (
    <GlobalWrapper permissionKey="view_logs_list">
      <CustomContainer
        title="API Logs"
        rightSection={
          <Button onClick={refetch} loading={loading} size="sm">
            Refresh
          </Button>
        }
      >
        <div style={{ marginBottom: 16 }}>{filterCard}</div>
        <AgGrid
          rowData={filteredRows}
          columnDefs={colDefs}
          tableKey="api-logs"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default ApiLogsPage;
