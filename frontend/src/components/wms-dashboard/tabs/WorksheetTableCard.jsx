import React, { useEffect, useRef } from "react";
import { Flex, Text } from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import AgGrid from "@/components/AgGrid";
import { DashboardCard } from "@/components/dashboard/DashboardUI";

/** Active supervisor filter (set from the Pending Stats bars). */
function SupervisorChip({ name, onClear }) {
  if (!name) return null;
  return (
    <Flex
      as="button"
      type="button"
      onClick={onClear}
      align="center"
      gap="6px"
      h="28px"
      px="10px"
      borderRadius="8px"
      bg="#FFF5ED"
      color="#C95C18"
      fontSize="11px"
      fontWeight="500"
      aria-label={`Clear supervisor filter ${name}`}
    >
      <Text as="span">Supervisor: {name}</Text>
      <LuX size={12} />
    </Flex>
  );
}

/**
 * Figma "WMS Dashboard / Job Worksheet" and "/ Repack Entry": a titled card
 * holding the in-progress worksheet table. Rows open the progress drawer.
 */
export default function WorksheetTableCard({
  title,
  isActive,
  rows,
  columnDefs,
  tableKey,
  statusFilterModel,
  supervisor,
  onClearSupervisor,
  onRowClick,
}) {
  const apiRef = useRef(null);
  const applyFilter = (api) =>
    api && statusFilterModel && api.setFilterModel({ status: statusFilterModel });

  useEffect(() => {
    if (!isActive || !apiRef.current) return;
    const id = requestAnimationFrame(() => applyFilter(apiRef.current));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, rows]);

  return (
    <DashboardCard
      title={title}
      rightSection={<SupervisorChip name={supervisor} onClear={onClearSupervisor} />}
    >
      <AgGrid
        bare
        rowData={rows}
        columnDefs={columnDefs}
        defaultRows={10}
        tableKey={tableKey}
        onRowClicked={(e) => onRowClick?.(e.data)}
        onGridReady={(params) => {
          apiRef.current = params.api;
          if (isActive) requestAnimationFrame(() => applyFilter(params.api));
        }}
      />
    </DashboardCard>
  );
}
