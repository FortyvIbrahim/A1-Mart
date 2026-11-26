"use client";

import AgGrid from "@/components/AgGrid";
import CustomContainer from "@/components/CustomContainer";
import CustomDialog from "@/components/CustomDialog";
import {
  Badge,
  Box,
  Button,
  Center,
  Flex,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import moment from "moment";
import React, { useMemo } from "react";

const QUESTION_TIMEFRAME_COL_DEFS = [
  {
    field: "question",
    headerName: "Question",
    minWidth: 200,
    flex: 1.2,
    wrapText: true,
    autoHeight: true,
  },
  {
    field: "timeframe",
    headerName: "Timeframe",
    minWidth: 140,
    flex: 0.8,
    wrapText: true,
    autoHeight: true,
  },
];

function sectionGridRows(section) {
  const qs = section?.questions ?? [];
  return qs.map((q, qIdx) => ({
    rowId: `${section.sectionKey}-q-${qIdx}`,
    question: q.question ?? "-",
    timeframe:
      q.timeframe != null && String(q.timeframe).trim() !== ""
        ? q.timeframe
        : "-",
  }));
}

function formatSectionCalendarDate(responseYmd) {
  if (responseYmd == null || String(responseYmd).trim() === "") return null;
  const m = moment(responseYmd, "YYYY-MM-DD", true);
  return m.isValid() ? m.format("DD/MM/YYYY") : String(responseYmd);
}

export default function ChecklistPendingQuestionsModal({
  open,
  onOpenChange,
  loading,
  sections,
  fromYmd,
  toYmdStr,
}) {
  const formattedDateRange = useMemo(() => {
    if (!fromYmd || !toYmdStr) return null;
    const start = moment(fromYmd, "YYYY-MM-DD", true).isValid()
      ? moment(fromYmd, "YYYY-MM-DD").format("DD MMM YYYY")
      : fromYmd;
    const end = moment(toYmdStr, "YYYY-MM-DD", true).isValid()
      ? moment(toYmdStr, "YYYY-MM-DD").format("DD MMM YYYY")
      : toYmdStr;
    return `${start} - ${end}`;
  }, [fromYmd, toYmdStr]);

  const dateRangeLine =
    formattedDateRange != null ? (
      <Text fontSize="xs" color="gray.500" mb={3}>
        Date range: {formattedDateRange}
      </Text>
    ) : null;

  const sectionList = sections ?? [];

  const tableKeySuffix = useMemo(
    () => `${fromYmd ?? "x"}-${toYmdStr ?? "x"}`,
    [fromYmd, toYmdStr]
  );

  return (
    <CustomDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Pending checklist questions"
      maxW="min(960px, 96vw)"
      maxH="85vh"
      footer={
        <Button
          variant="outline"
          onClick={() => onOpenChange?.({ open: false })}
        >
          Close
        </Button>
      }
    >
      {dateRangeLine}

      {loading ? (
        <Center minH="200px">
          <Spinner color="brand.500" />
        </Center>
      ) : sectionList.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          No pending question slots match the current range and branch filter,
          or all outstanding slots are already accounted for in submissions.
        </Text>
      ) : (
        <VStack align="stretch" gap={4} w="100%">
          {sectionList.map((section) => {
            const sectionDayLabel = formatSectionCalendarDate(
              section.responseYmd
            );
            return (
              <CustomContainer
                key={section.sectionKey}
                title={section.formTitle ?? `Form ${section.formId ?? ""}`}
                color="brand"
                size="sm"
                fullWidth
                rightSection={
                  <Flex
                    align="center"
                    gap={2}
                    flexWrap="wrap"
                    justify="flex-end"
                    maxW={{ base: "100%", md: "min(360px, 55vw)" }}
                  >
                    {sectionDayLabel != null ? (
                      <Text
                        fontSize="xs"
                        fontWeight="medium"
                        color="brand.700"
                        textAlign="right"
                        lineHeight="short"
                      >
                        {sectionDayLabel}
                      </Text>
                    ) : null}
                    <Badge colorPalette="brand" variant="subtle" size="sm">
                      {section.branchLabel ?? "-"}
                    </Badge>
                  </Flex>
                }
              >
                <Box minH="120px" w="100%" minW={0}>
                  <AgGrid
                    rowData={sectionGridRows(section)}
                    columnDefs={QUESTION_TIMEFRAME_COL_DEFS}
                    tableKey={`checklist-pending-${section.sectionKey}-${tableKeySuffix}`}
                    pagination={false}
                    gridOptions={{
                      getRowId: (p) =>
                        p.data?.rowId != null ? String(p.data.rowId) : "",
                      defaultColDef: {
                        sortable: true,
                        resizable: true,
                      },
                    }}
                  />
                </Box>
              </CustomContainer>
            );
          })}
        </VStack>
      )}
    </CustomDialog>
  );
}
