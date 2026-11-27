"use client";

import React, { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Flex, Text } from "@chakra-ui/react";
import useApiCallLogs from "@/api/customHooks/useApiCallLogs";
import AgGrid from "@/components/AgGrid";
import { useListFilters } from "@/components/ListFilters";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";

const isLogSuccess = (row) =>
  row?.is_success === 1 || row?.is_success === true;

function formatDuration(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return "-";
  if (n >= 1000) return `${(n / 1000).toFixed(2)} s`;
  return `${Math.round(n)} ms`;
}

const DETAIL_FILTERS = [
  {
    key: "q",
    type: "search",
    placeholder: "Search...",
    getText: (r) =>
      `${r.id ?? ""} ${r.http_method ?? ""} ${r.status_code ?? ""} ${
        r.caller_function ?? ""
      } ${r.error_message ?? ""}`,
  },
  {
    key: "status",
    type: "select",
    placeholder: "Status",
    getValue: (r) => (isLogSuccess(r) ? "Success" : "Failed"),
  },
];

function ApiCallLogDetailsContent() {
  const searchParams = useSearchParams();
  const apiType = searchParams.get("api") || "-";
  const secondaryType = searchParams.get("secondary") || "-";

  const { logs, loading } = useApiCallLogs({ limit: 500, offset: 0 });

  const groupCalls = useMemo(() => {
    return (Array.isArray(logs) ? logs : []).filter(
      (log) =>
        (log.api_type || "-") === apiType &&
        (log.secondary_type || "-") === secondaryType
    );
  }, [logs, apiType, secondaryType]);

  const { filtered: filteredCalls, filterCard } = useListFilters(
    groupCalls,
    DETAIL_FILTERS,
    { columns: 4 }
  );

  const detailColDefs = useMemo(
    () => [
      {
        field: "created_at",
        headerName: "Date & Time",
        type: "datetime",
        minWidth: 190,
      },
      {
        field: "is_success",
        headerName: "Status",
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
        headerName: "Time Taken",
        minWidth: 130,
        valueFormatter: (p) => formatDuration(p.value),
      },
      {
        field: "status_code",
        headerName: "Response Code",
        type: "number",
        minWidth: 140,
      },
      {
        field: "error_message",
        headerName: "Error Message",
        minWidth: 220,
        flex: 1,
        valueGetter: (p) => p.data?.error_message || "-",
      },
      {
        field: "http_method",
        headerName: "Method",
        hideByDefault: true,
        maxWidth: 110,
      },
      {
        field: "caller_function",
        headerName: "Caller",
        hideByDefault: true,
        minWidth: 170,
        valueGetter: (p) => p.data?.caller_function || "-",
      },
      {
        field: "id",
        type: "id",
        hideByDefault: true,
      },
    ],
    []
  );

  return (
    <GlobalWrapper permissionKey="view_logs_list">
      <CustomContainer
        headerBand
        backHref="/logs"
        title={
          <Flex align="baseline" gap="8px" flexWrap="wrap">
            <Text as="span">{`${apiType} – ${secondaryType}`}</Text>
            <Text as="span" fontSize="15px" fontWeight="500" color="fg.muted">
              ({filteredCalls.length}{" "}
              {filteredCalls.length === 1 ? "call" : "calls"})
            </Text>
          </Flex>
        }
      >
        {filterCard}
        <AgGrid
          rowData={filteredCalls}
          columnDefs={detailColDefs}
          tableKey="api-call-logs-detail"
          loading={loading}
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default function ApiCallLogDetailsPage() {
  return (
    <Suspense fallback={null}>
      <ApiCallLogDetailsContent />
    </Suspense>
  );
}
