import React, { useEffect, useRef } from "react";
import { Box, Button, Flex, NativeSelect, Text } from "@chakra-ui/react";
import AgGrid from "@/components/AgGrid";
import { purchaseAckStatusBadgeLabel } from "@/utils/string";

const REPACK_ENTRY_STATUS_FILTER_MODEL = {
  filterType: "badge",
  values: [purchaseAckStatusBadgeLabel("repack_entry_in_progress")],
};

function applyRepackEntryStatusBadgeFilter(api) {
  if (!api) return;
  api.setFilterModel({
    status: REPACK_ENTRY_STATUS_FILTER_MODEL,
  });
}

function RepackEntryTabContent({
  isActive,
  selectedRepackSupervisor,
  setSelectedRepackSupervisor,
  repackSummary,
  handleExportRepackPurchases,
  handleExportRepackData,
  repackEntryTableRows,
  repackEntryDrawerColDefs,
}) {
  const repackGridApiRef = useRef(null);

  useEffect(() => {
    if (!isActive || !repackGridApiRef.current) return;
    const id = requestAnimationFrame(() => {
      applyRepackEntryStatusBadgeFilter(repackGridApiRef.current);
    });
    return () => cancelAnimationFrame(id);
  }, [isActive, repackEntryTableRows]);

  return (
    <>
      <Flex
        mb={4}
        gap={4}
        flexWrap="wrap"
        alignItems="flex-end"
        justifyContent="space-between"
      >
        <Box minW={{ base: "100%", md: "280px" }}>
          <Text fontSize="xs" mb={1} color="gray.500">
            Repack supervisor
          </Text>
          <NativeSelect.Root width={{ base: "100%", md: "280px" }}>
            <NativeSelect.Field
              value={selectedRepackSupervisor ?? ""}
              onChange={(e) =>
                setSelectedRepackSupervisor(
                  e.target.value ? e.target.value : null
                )
              }
            >
              <option value="">All supervisors</option>
              {repackSummary.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>
        <Flex gap={2} flexWrap="wrap">
          <Button variant="outline" onClick={handleExportRepackPurchases}>
            Export
          </Button>
          <Button variant="outline" onClick={handleExportRepackData}>
            Export Repack Worksheet
          </Button>
        </Flex>
      </Flex>
      {repackEntryTableRows.length === 0 ? (
        <Flex minH="180px" align="center" justify="center">
          <Text color="gray.500">No repack entry data.</Text>
        </Flex>
      ) : (
        <AgGrid
          rowData={repackEntryTableRows}
          columnDefs={repackEntryDrawerColDefs}
          defaultRows={20}
          tableKey="repack-entry-details"
          onGridReady={(params) => {
            repackGridApiRef.current = params.api;
            if (isActive) {
              requestAnimationFrame(() =>
                applyRepackEntryStatusBadgeFilter(params.api)
              );
            }
          }}
        />
      )}
    </>
  );
}

export default RepackEntryTabContent;
