import React, { useEffect, useRef } from "react";
import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import AgGrid from "@/components/AgGrid";
import CustomDialog from "@/components/CustomDialog";
import CustomSelect from "@/components/CustomSelect";
import { purchaseAckStatusBadgeLabel } from "@/utils/string";

const JOB_WORKSHEET_STATUS_FILTER_MODEL = {
  filterType: "badge",
  values: [purchaseAckStatusBadgeLabel("job_entry_in_progress")],
};

function applyJobWorksheetStatusBadgeFilter(api) {
  if (!api) return;
  api.setFilterModel({
    status: JOB_WORKSHEET_STATUS_FILTER_MODEL,
  });
}

function JobWorksheetTabContent({
  isActive,
  selectedJobSupervisor,
  setSelectedJobSupervisor,
  jobSummary,
  handleExportJobWorksheetPurchases,
  handleExportJobWorksheetData,
  jobWorksheetStickeringStats,
  isJobDoneByDayModalOpen,
  setIsJobDoneByDayModalOpen,
  isJobDayEmployeesModalOpen,
  setIsJobDayEmployeesModalOpen,
  setJobDayEmployeesContext,
  isJobEmployeeJobsModalOpen,
  setIsJobEmployeeJobsModalOpen,
  setJobEmployeeJobsContext,
  formatJobStatsModalRangeSubtitle,
  dateRange,
  jobWorksheetStickeringDailyRows,
  jobDoneByDayModalColDefs,
  jobDayEmployeesContext,
  jobDayEmployeeStickerRows,
  jobDayEmployeesModalColDefs,
  jobEmployeeJobsContext,
  jobEmployeeCompletedJobsRows,
  jobEmployeeJobsModalColDefs,
  jobWorksheetTableRows,
  jobWorksheetDrawerColDefs,
}) {
  const jobGridApiRef = useRef(null);

  useEffect(() => {
    if (!isActive || !jobGridApiRef.current) return;
    const id = requestAnimationFrame(() => {
      applyJobWorksheetStatusBadgeFilter(jobGridApiRef.current);
    });
    return () => cancelAnimationFrame(id);
  }, [isActive, jobWorksheetTableRows]);

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
            Job supervisor
          </Text>
          <CustomSelect
            width={{ base: "100%", md: "280px" }}
            h="40px"
            value={selectedJobSupervisor ?? ""}
            emptyLabel="All supervisors"
            onChange={(val) => setSelectedJobSupervisor(val ? val : null)}
            options={jobSummary.map((r) => ({
              value: r.name,
              label: r.name,
            }))}
          />
        </Box>
        <Flex gap={2} flexWrap="wrap">
          <Button variant="outline" onClick={handleExportJobWorksheetPurchases}>
            Export
          </Button>
          <Button variant="outline" onClick={handleExportJobWorksheetData}>
            Export Job Worksheet
          </Button>
        </Flex>
      </Flex>
      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(2, 1fr)",
          xl: "repeat(4, 1fr)",
        }}
        gap={4}
        mb={5}
      >
        <Box
          borderRadius="xl"
          borderWidth="0.5px"
          borderStyle="solid"
          borderColor="brand.200"
          px={{ base: 4, md: 5 }}
          py={4}
          bg="brand.50"
          _dark={{
            bg: "color-mix(in srgb, var(--chakra-colors-brand-500) 18%, transparent)",
            borderColor: "brand.300",
          }}
        >
          <Flex
            minH="36px"
            align="center"
            justify="space-between"
            gap={3}
            mb={3}
          >
            <Text
              as="span"
              fontSize="sm"
              fontWeight="semibold"
              color="brand.500"
              lineHeight="1.35"
              flex="1"
              minW={0}
            >
              Stickers Stuck Today
            </Text>
            <Box
              flexShrink={0}
              minW="76px"
              display="flex"
              justifyContent="flex-end"
            >
              <Button
                size="xs"
                variant="outline"
                colorPalette="brand"
                onClick={() => setIsJobDoneByDayModalOpen(true)}
              >
                View All
              </Button>
            </Box>
          </Flex>
          <Text
            fontSize="2xl"
            fontWeight="bold"
            lineHeight="1.2"
            color="brand.500"
          >
            {new Intl.NumberFormat(undefined, {
              maximumFractionDigits: 2,
            }).format(jobWorksheetStickeringStats.stickersStuckTodayQty)}
          </Text>
        </Box>
        <Box
          borderRadius="xl"
          borderWidth="0.5px"
          borderStyle="solid"
          borderColor="blue.200"
          px={{ base: 4, md: 5 }}
          py={4}
          bg="blue.50"
          _dark={{
            bg: "color-mix(in srgb, var(--chakra-colors-blue-500) 18%, transparent)",
            borderColor: "blue.300",
          }}
        >
          <Flex
            minH="36px"
            align="center"
            justify="space-between"
            gap={3}
            mb={3}
          >
            <Text
              as="span"
              fontSize="sm"
              fontWeight="semibold"
              color="blue.500"
              lineHeight="1.35"
              flex="1"
              minW={0}
            >
              Sticker Pending (QTY)
            </Text>
          </Flex>
          <Text
            fontSize="2xl"
            fontWeight="bold"
            lineHeight="1.2"
            color="blue.500"
          >
            {new Intl.NumberFormat(undefined, {
              maximumFractionDigits: 2,
            }).format(jobWorksheetStickeringStats.totalStickerPendingQty)}
          </Text>
        </Box>
        <Box
          borderRadius="xl"
          borderWidth="0.5px"
          borderStyle="solid"
          borderColor="purple.200"
          px={{ base: 4, md: 5 }}
          py={4}
          bg="purple.50"
          _dark={{
            bg: "color-mix(in srgb, var(--chakra-colors-purple-500) 18%, transparent)",
            borderColor: "purple.300",
          }}
        >
          <Flex
            minH="36px"
            align="center"
            justify="space-between"
            gap={3}
            mb={3}
          >
            <Text
              as="span"
              fontSize="sm"
              fontWeight="semibold"
              color="purple.500"
              lineHeight="1.35"
              flex="1"
              minW={0}
            >
              Total Done Today
            </Text>
            <Box
              flexShrink={0}
              minW="76px"
              display="flex"
              justifyContent="flex-end"
            >
              <Button
                size="xs"
                variant="outline"
                colorPalette="purple"
                onClick={() => setIsJobDoneByDayModalOpen(true)}
              >
                View All
              </Button>
            </Box>
          </Flex>
          <Text
            fontSize="2xl"
            fontWeight="bold"
            lineHeight="1.2"
            color="purple.500"
          >
            {jobWorksheetStickeringStats.totalDoneTodayCount}
          </Text>
        </Box>
        <Box
          borderRadius="xl"
          borderWidth="0.5px"
          borderStyle="solid"
          borderColor="secondary.200"
          px={{ base: 4, md: 5 }}
          py={4}
          bg="secondary.50"
          _dark={{
            bg: "color-mix(in srgb, var(--chakra-colors-secondary-500) 18%, transparent)",
            borderColor: "secondary.300",
          }}
        >
          <Flex
            minH="36px"
            align="center"
            justify="space-between"
            gap={3}
            mb={3}
          >
            <Text
              as="span"
              fontSize="sm"
              fontWeight="semibold"
              color="secondary.500"
              lineHeight="1.35"
              flex="1"
              minW={0}
            >
              Total Pending
            </Text>
            <Box flexShrink={0} minW="76px" minH="28px" aria-hidden />
          </Flex>
          <Text
            fontSize="2xl"
            fontWeight="bold"
            lineHeight="1.2"
            color="secondary.500"
          >
            {jobWorksheetStickeringStats.totalPendingCount}
          </Text>
        </Box>
      </Grid>
      <CustomDialog
        open={isJobDoneByDayModalOpen}
        onOpenChange={(e) => {
          if (!e.open) {
            setIsJobDoneByDayModalOpen(false);
            setIsJobDayEmployeesModalOpen(false);
            setIsJobEmployeeJobsModalOpen(false);
            setJobDayEmployeesContext(null);
            setJobEmployeeJobsContext(null);
          }
        }}
        title={
          <Box>
            <Text fontSize="md" fontWeight="semibold" color="gray.800">
              Jobs completed by day
            </Text>
            <Text
              fontSize="xs"
              color="gray.500"
              mt={1}
              fontWeight="normal"
              lineHeight="1.5"
            >
              {formatJobStatsModalRangeSubtitle(dateRange)} · Same job lines as
              the cards (dashboard date filter, job supervisor, and status
              filter when set).
            </Text>
          </Box>
        }
        maxW="85vw"
        maxH="85vh"
        bodyProps={{
          display: "flex",
          flexDirection: "column",
          minH: "280px",
          pr: 16,
        }}
        contentProps={{ display: "flex", flexDirection: "column" }}
        footer={
          <Button
            variant="outline"
            onClick={() => {
              setIsJobDoneByDayModalOpen(false);
              setIsJobDayEmployeesModalOpen(false);
              setIsJobEmployeeJobsModalOpen(false);
              setJobDayEmployeesContext(null);
              setJobEmployeeJobsContext(null);
            }}
          >
            Close
          </Button>
        }
      >
        <Box flex={1} minH="260px" w="100%">
          <AgGrid
            rowData={jobWorksheetStickeringDailyRows}
            columnDefs={jobDoneByDayModalColDefs}
            defaultRows={15}
            tableKey="wms-job-done-by-day"
            saveFilters={false}
          />
        </Box>
      </CustomDialog>
      <CustomDialog
        open={isJobDayEmployeesModalOpen}
        onOpenChange={(e) => {
          if (!e.open) {
            setIsJobDayEmployeesModalOpen(false);
            setIsJobEmployeeJobsModalOpen(false);
            setJobDayEmployeesContext(null);
            setJobEmployeeJobsContext(null);
          }
        }}
        title={
          <Box>
            <Text fontSize="md" fontWeight="semibold" color="gray.800">
              Stickers by employee
            </Text>
            <Text
              fontSize="xs"
              color="gray.500"
              mt={1}
              fontWeight="normal"
              lineHeight="1.5"
            >
              {jobDayEmployeesContext?.dateLabel
                ? `${jobDayEmployeesContext.dateLabel} · completed lines only, same filters as the jobs-by-day list`
                : ""}
            </Text>
          </Box>
        }
        maxW="85vw"
        maxH="85vh"
        bodyProps={{
          display: "flex",
          flexDirection: "column",
          minH: "240px",
          pr: 16,
        }}
        contentProps={{ display: "flex", flexDirection: "column" }}
        footer={
          <Button
            variant="outline"
            onClick={() => {
              setIsJobDayEmployeesModalOpen(false);
              setIsJobEmployeeJobsModalOpen(false);
              setJobDayEmployeesContext(null);
              setJobEmployeeJobsContext(null);
            }}
          >
            Close
          </Button>
        }
      >
        <Box flex={1} minH="220px" w="100%">
          <AgGrid
            rowData={jobDayEmployeeStickerRows}
            columnDefs={jobDayEmployeesModalColDefs}
            defaultRows={12}
            tableKey="wms-job-day-employees"
            saveFilters={false}
          />
        </Box>
      </CustomDialog>
      <CustomDialog
        open={isJobEmployeeJobsModalOpen}
        onOpenChange={(e) => {
          if (!e.open) {
            setIsJobEmployeeJobsModalOpen(false);
            setJobEmployeeJobsContext(null);
          }
        }}
        title={
          <Box>
            <Text fontSize="md" fontWeight="semibold" color="gray.800">
              Completed jobs by employee
            </Text>
            <Text
              fontSize="xs"
              color="gray.500"
              mt={1}
              fontWeight="normal"
              lineHeight="1.5"
            >
              {jobEmployeeJobsContext?.employee_name
                ? `${jobEmployeeJobsContext.employee_name}${
                    jobEmployeeJobsContext.employee_code
                      ? ` (${jobEmployeeJobsContext.employee_code})`
                      : ""
                  }${
                    jobEmployeeJobsContext.dateLabel
                      ? ` · ${jobEmployeeJobsContext.dateLabel}`
                      : ""
                  }`
                : ""}
            </Text>
          </Box>
        }
        maxW="85vw"
        maxH="85vh"
        bodyProps={{
          display: "flex",
          flexDirection: "column",
          minH: "240px",
          pr: 16,
        }}
        contentProps={{ display: "flex", flexDirection: "column" }}
        footer={
          <Button
            variant="outline"
            onClick={() => {
              setIsJobEmployeeJobsModalOpen(false);
              setJobEmployeeJobsContext(null);
            }}
          >
            Close
          </Button>
        }
      >
        <Box flex={1} minH="220px" w="100%">
          {jobEmployeeCompletedJobsRows.length === 0 ? (
            <Flex minH="180px" align="center" justify="center">
              <Text color="gray.500">No completed jobs found.</Text>
            </Flex>
          ) : (
            <AgGrid
              rowData={jobEmployeeCompletedJobsRows}
              columnDefs={jobEmployeeJobsModalColDefs}
              defaultRows={12}
              tableKey="wms-job-employee-completed-jobs"
              saveFilters={false}
            />
          )}
        </Box>
      </CustomDialog>
      {jobWorksheetTableRows.length === 0 ? (
        <Flex minH="180px" align="center" justify="center">
          <Text color="gray.500">No job worksheet data.</Text>
        </Flex>
      ) : (
        <AgGrid
          rowData={jobWorksheetTableRows}
          columnDefs={jobWorksheetDrawerColDefs}
          defaultRows={20}
          tableKey="job-worksheet-details"
          onGridReady={(params) => {
            jobGridApiRef.current = params.api;
            if (isActive) {
              requestAnimationFrame(() =>
                applyJobWorksheetStatusBadgeFilter(params.api)
              );
            }
          }}
        />
      )}
    </>
  );
}

export default JobWorksheetTabContent;
