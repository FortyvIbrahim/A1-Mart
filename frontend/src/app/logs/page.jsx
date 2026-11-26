"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@chakra-ui/react";
import useApiCallLogs from "@/api/customHooks/useApiCallLogs";
import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import CustomDialog from "@/components/CustomDialog";
import GlobalWrapper from "@/components/GlobalWrapper";

const isLogSuccess = (row) =>
  row?.is_success === 1 || row?.is_success === true;

function formatDuration(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return "-";
  if (n >= 1000) return `${(n / 1000).toFixed(2)} s`;
  return `${Math.round(n)} ms`;
}

function formatSuccessRate(totalCalls, totalErrors) {
  if (!totalCalls) return "-";
  const pct = ((totalCalls - totalErrors) / totalCalls) * 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

function ApiCallLogsPage() {
  const { logs, loading, refetch } = useApiCallLogs({ limit: 500, offset: 0 });
  const [selectedGroup, setSelectedGroup] = useState(null);

  const summaryRows = useMemo(() => {
    const groups = new Map();
    for (const log of Array.isArray(logs) ? logs : []) {
      const apiType = log.api_type || "-";
      const secondaryType = log.secondary_type || "-";
      const key = `${apiType}::${secondaryType}`;
      let entry = groups.get(key);
      if (!entry) {
        entry = {
          key,
          api_type: apiType,
          secondary_type: secondaryType,
          total_calls: 0,
          total_errors: 0,
          total_time_ms: 0,
          timed_calls: 0,
          last_call_time: null,
          last_call_ts: 0,
        };
        groups.set(key, entry);
      }

      entry.total_calls += 1;
      if (!isLogSuccess(log)) {
        entry.total_errors += 1;
      }

      const ms = Number(log.time_taken_ms);
      if (Number.isFinite(ms)) {
        entry.total_time_ms += ms;
        entry.timed_calls += 1;
      }

      if (log.created_at) {
        const ts = new Date(log.created_at).getTime();
        if (Number.isFinite(ts) && ts > entry.last_call_ts) {
          entry.last_call_ts = ts;
          entry.last_call_time = log.created_at;
        }
      }
    }

    return [...groups.values()]
      .map((g) => ({
        ...g,
        avg_time_ms: g.timed_calls > 0 ? g.total_time_ms / g.timed_calls : null,
        success_rate: formatSuccessRate(g.total_calls, g.total_errors),
      }))
      .sort((a, b) => b.last_call_ts - a.last_call_ts);
  }, [logs]);

  const selectedGroupCalls = useMemo(() => {
    if (!selectedGroup) return [];
    return (Array.isArray(logs) ? logs : []).filter(
      (log) =>
        (log.api_type || "-") === selectedGroup.api_type &&
        (log.secondary_type || "-") === selectedGroup.secondary_type
    );
  }, [logs, selectedGroup]);

  const colDefs = useMemo(
    () => [
      {
        field: "api_type",
        headerName: "API Type",
        minWidth: 130,
      },
      {
        field: "secondary_type",
        headerName: "Secondary Type",
        minWidth: 160,
      },
      {
        field: "total_calls",
        headerName: "Total Calls",
        type: "number",
        minWidth: 120,
      },
      {
        field: "total_errors",
        headerName: "Total Errors",
        minWidth: 120,
        valueFormatter: (p) => (p.value > 0 ? String(p.value) : "-"),
      },
      {
        field: "success_rate",
        headerName: "Success Rate (%)",
        minWidth: 140,
      },
      {
        field: "avg_time_ms",
        headerName: "Avg Time Taken",
        minWidth: 140,
        valueFormatter: (p) => formatDuration(p.value),
      },
      {
        field: "last_call_time",
        headerName: "Last Call Time",
        type: "datetime",
        minWidth: 190,
      },
      {
        headerName: "Action",
        type: "action-column",
        valueGetter: (p) => [
          {
            label: "View",
            value: "view",
            onClick: () => setSelectedGroup(p.data),
          },
        ],
      },
    ],
    []
  );

  const detailColDefs = useMemo(
    () => [
      { field: "id", type: "id" },
      { field: "http_method", headerName: "Method", maxWidth: 100 },
      {
        field: "status_code",
        headerName: "Status",
        type: "number",
        maxWidth: 100,
      },
      {
        field: "is_success",
        headerName: "Result",
        type: "badge-column",
        maxWidth: 120,
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
        headerName: "Time Taken",
        minWidth: 120,
        valueFormatter: (p) => formatDuration(p.value),
      },
      {
        field: "caller_function",
        headerName: "Caller",
        minWidth: 170,
        valueGetter: (p) => p.data?.caller_function || "-",
      },
      {
        field: "error_message",
        headerName: "Error",
        minWidth: 200,
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

  return (
    <GlobalWrapper permissionKey="view_logs_list">
      <CustomContainer
        title="API Call Logs"
        rightSection={
          <Button onClick={refetch} loading={loading} size="sm">
            Refresh
          </Button>
        }
      >
        <AgGrid
          rowData={summaryRows}
          columnDefs={colDefs}
          tableKey="api-call-logs"
          loading={loading}
        />

        <CustomDialog
          open={Boolean(selectedGroup)}
          onOpenChange={(e) => {
            if (!e.open) setSelectedGroup(null);
          }}
          title={
            selectedGroup
              ? `${selectedGroup.api_type} — ${selectedGroup.secondary_type}`
              : "API Calls"
          }
          maxW="1100px"
          footer={
            <Button size="sm" onClick={() => setSelectedGroup(null)}>
              Close
            </Button>
          }
        >
          <AgGrid
            rowData={selectedGroupCalls}
            columnDefs={detailColDefs}
            tableKey="api-call-logs-detail"
            noMobileVersion
          />
        </CustomDialog>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default ApiCallLogsPage;
