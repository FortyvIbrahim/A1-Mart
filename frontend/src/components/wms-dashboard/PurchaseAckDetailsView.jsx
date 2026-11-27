"use client";

import React, { useEffect, useMemo } from "react";
import { Box, Flex, Grid, Stack, Text } from "@chakra-ui/react";
import moment from "moment";
import CustomContainer from "@/components/CustomContainer";
import DashboardBarChart from "@/components/dashboard/DashboardBarChart";
import { FigmaBadge } from "@/components/AgGrid/columnTypes";
import usePurchaseAcknowledgmentById from "@/api/customHooks/usePurchaseAcknowledgmentById";
import { capitalizeWordsLatest } from "@/utils/string";
import { Tooltip } from "@/components/ui/tooltip";
import CustomImage from "@/components/CustomImage";

function buildStatusTimeline(ack) {
  const hasGrn = !!ack.has_grn;
  const hasPoLinked = ack.purchase_order_id != null;
  const hasPurchaseEntry = ack.purchase_entry_id != null;
  const isJobNeeded = ack.is_job_entry_needed === true;
  const statusCounts = ack.status_counts || {};
  const totalJobs =
    (statusCounts.open || 0) +
    (statusCounts.in_progress || 0) +
    (statusCounts.done || 0) +
    (statusCounts.cancelled || 0);
  const statusCode = ack.status || "";

  const allSteps = [
    { key: "purchase_ack", label: "Purchase Acknowledgement" },
    { key: "grn", label: "GRN Entry" },
    ...(hasPoLinked
      ? [{ key: "po_linked", label: "Purchase Order Linked" }]
      : []),
    { key: "purchase_entry", label: "Purchase Entry" },
    { key: "job_worksheets", label: "Job Worksheet" },
    { key: "repack_sheets", label: "Repack Entry Sheet" },
    { key: "done", label: "Done" },
  ];

  const statusToStepKey = {
    grn_pending: "grn",
    grn_done: hasPoLinked ? "po_linked" : "purchase_entry",
    pe_created: "purchase_entry",
    job_entry_in_progress: "job_worksheets",
    job_entry_done: "job_worksheets",
    repack_entry_in_progress: "repack_sheets",
    done: "done",
  };

  let currentStepKey = statusToStepKey[statusCode] || "done";
  let steps = [...allSteps];

  if (hasGrn && hasPoLinked) {
    steps = allSteps.filter((s) =>
      ["purchase_ack", "grn", "po_linked", "done"].includes(s.key)
    );
    currentStepKey = statusCode === "done" ? "done" : "po_linked";
  } else if (!isJobNeeded && hasPurchaseEntry) {
    steps = allSteps.filter((s) =>
      ["purchase_ack", "grn", "purchase_entry", "done"].includes(s.key)
    );
    currentStepKey = statusCode === "done" ? "done" : "purchase_entry";
  }

  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.key === currentStepKey)
  );

  return steps.map((step, idx) => {
    let progression;
    if (idx < currentIndex) {
      progression = "done";
    } else if (idx === currentIndex) {
      progression = statusCode === "done" ? "done" : "in_progress";
    } else {
      progression = "pending";
    }

    if (step.key === "job_worksheets") {
      const openAndInProgress =
        (statusCounts.open || 0) + (statusCounts.in_progress || 0);
      const nonCancelledDone = statusCounts.done || 0;
      if (openAndInProgress === 0 && nonCancelledDone > 0) {
        progression = "done";
      }
    }

    if (step.key === "repack_sheets" && totalJobs > 0) {
      if ((ack.repacking_entry_count || 0) >= totalJobs) {
        progression = "done";
      }
    }

    return {
      ...step,
      status: progression,
    };
  });
}

function SummaryField({ label, value }) {
  return (
    <Flex direction="column" gap="4px">
      <Text fontSize="11.5px" lineHeight="15px" color="#C95C18" fontWeight="400">
        {label}
      </Text>
      <Text fontSize="14px" lineHeight="20px" color="#202938" fontWeight="600">
        {value || "-"}
      </Text>
    </Flex>
  );
}

const STEP_STYLE = {
  done: { dotBg: "#147D52", titleColor: "#147D52" },
  in_progress: { dotBg: "#3E5B94", titleColor: "#3E5B94" },
  pending: { dotBg: "#9CA3AF", titleColor: "#637188" },
};

export default function PurchaseAckDetailsView({ ack, onBack }) {
  const { purchaseAcknowledgment, fetchData } = usePurchaseAcknowledgmentById(
    ack?.purchase_acknowledgment_id
  );
  const steps = useMemo(() => buildStatusTimeline(ack), [ack]);

  const formattedStatus = useMemo(() => {
    if (!ack?.status) return "-";
    if (ack.status === "pe_created") return "Purchase Entry Done";
    return capitalizeWordsLatest(String(ack.status)).replaceAll("_", " ");
  }, [ack?.status]);

  useEffect(() => {
    if (ack?.purchase_acknowledgment_id) {
      fetchData();
    }
  }, [ack?.purchase_acknowledgment_id]);

  const getGRNEmployee = () => {
    if (purchaseAcknowledgment?.grns?.length > 0) {
      return purchaseAcknowledgment.grns[0]?.employee || null;
    }
    return null;
  };

  const getPurchaseEntryEmployee = () => {
    if (purchaseAcknowledgment?.purchase_entries?.length > 0) {
      return (
        purchaseAcknowledgment.purchase_entries[0]?.handled_by_employee || null
      );
    }
    return null;
  };

  const getJobWorksheetsDescription = (step) => {
    const sc = ack.status_counts || {};
    const activeJobsTotal =
      (sc.open || 0) + (sc.in_progress || 0) + (sc.done || 0);

    let statusDescription = `Job Worksheets - Total: ${activeJobsTotal}, Open: ${
      sc.open || 0
    }, In progress: ${sc.in_progress || 0}, Done: ${sc.done || 0}`;

    if (step.status !== "pending" && purchaseAcknowledgment?.stickering?.length) {
      const handledBy = [];
      const handledByMap = {};

      purchaseAcknowledgment.stickering.forEach((item) => {
        if (
          item.supervisor?.employee_name &&
          !handledBy.includes(item.supervisor.employee_name)
        ) {
          handledBy.push(item.supervisor.employee_name);
          handledByMap[item.supervisor.employee_name] =
            item.supervisor.profile_img_url;
        }
      });

      if (step.status === "done") {
        statusDescription = `Done - Total: ${activeJobsTotal}`;
      }

      return (
        <Flex flexDirection="column" gap="4px">
          <Text>{statusDescription}</Text>
          {handledBy.length > 0 && (
            <Flex gap="6px" flexWrap="wrap" align="center">
              <Text>Handled by</Text>
              {handledBy.map((name) => (
                <Tooltip
                  key={name}
                  content={<CustomImage src={handledByMap[name]} alt={name} />}
                >
                  <Text
                    as="span"
                    fontSize="12px"
                    color="#C95C18"
                    fontWeight="600"
                  >
                    {name}
                  </Text>
                </Tooltip>
              ))}
            </Flex>
          )}
        </Flex>
      );
    }

    return statusDescription;
  };

  const getRepackEntriesDescription = (step) => {
    const statusDescription = `Repack entries - ${
      ack.repacking_entry_count || 0
    } of ${ack.repack_supervisor_entry_count || 0} items`;

    if (step.status !== "pending" && purchaseAcknowledgment?.stickering?.length) {
      const handledBy = [];
      const handledByMap = {};

      purchaseAcknowledgment.stickering.forEach((item) => {
        if (
          item.repack_supervisor?.employee_name &&
          !handledBy.includes(item.repack_supervisor.employee_name)
        ) {
          handledBy.push(item.repack_supervisor.employee_name);
          handledByMap[item.repack_supervisor.employee_name] =
            item.repack_supervisor.profile_img_url;
        }
      });

      if (handledBy.length > 0) {
        return (
          <Flex flexDirection="column" gap="4px">
            <Text>{statusDescription}</Text>
            <Flex gap="6px" flexWrap="wrap" align="center">
              <Text>Handled by</Text>
              {handledBy.map((name) => (
                <Tooltip
                  key={name}
                  content={<CustomImage src={handledByMap[name]} alt={name} />}
                >
                  <Text
                    as="span"
                    fontSize="12px"
                    color="#C95C18"
                    fontWeight="600"
                  >
                    {name}
                  </Text>
                </Tooltip>
              ))}
            </Flex>
          </Flex>
        );
      }
    }

    return statusDescription;
  };

  const totalJobCount =
    (ack?.status_counts?.open || 0) +
    (ack?.status_counts?.in_progress || 0) +
    (ack?.status_counts?.done || 0) +
    (ack?.status_counts?.cancelled || 0);

  const showChart =
    ack?.status === "job_entry_in_progress" ||
    ack?.status === "repack_entry_in_progress" ||
    totalJobCount > 0;

  const isRepackChart = ack?.status === "repack_entry_in_progress";

  return (
    <CustomContainer
      headerBand
      onBack={onBack}
      title={`Purchase Ack #${ack?.purchase_acknowledgment_id ?? ""} · Progress`}
      rightSection={
        <FigmaBadge colorScheme={ack?.status === "done" ? "green" : "orange"}>
          {formattedStatus}
        </FigmaBadge>
      }
    >
      {/* Top summary card */}
      <Box
        bg="#FFFBF8"
        borderWidth="1px"
        borderColor="#F1E3D9"
        borderRadius="10px"
        p={{ base: "16px", md: "20px" }}
      >
        <Grid
          templateColumns={{
            base: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, minmax(0, 1fr))",
          }}
          gap="20px"
        >
          <SummaryField label="Invoice" value={ack?.invoice_no} />
          <SummaryField
            label="Invoice Date"
            value={
              ack?.invoice_date
                ? moment(ack.invoice_date).format("DD/MM/YYYY")
                : "-"
            }
          />
          <SummaryField
            label="Supplier"
            value={
              ack?.supplier?.name
                ? `${ack.supplier.name} (${ack.supplier_id})`
                : String(ack?.supplier_id ?? "-")
            }
          />
          <SummaryField label="Current Status" value={formattedStatus} />
        </Grid>
      </Box>

      {/* Single-page side-by-side layout: Progress Timeline + Status Chart */}
      <Grid
        templateColumns={{
          base: "1fr",
          lg: showChart ? "1.15fr 1fr" : "1fr",
        }}
        gap="20px"
        alignItems="start"
      >
        <Box
          bg="white"
          borderWidth="1px"
          borderColor="#F1E3D9"
          borderRadius="10px"
          overflow="hidden"
        >
          <Box
            px="20px"
            py="14px"
            bg="#FFF5ED"
            borderBottomWidth="1px"
            borderColor="#F1E3D9"
          >
            <Text fontSize="14px" fontWeight="600" color="#C95C18">
              Workflow Progress
            </Text>
          </Box>
          <Stack gap={0} p="20px">
            {steps.map((step, index) => {
              const st = STEP_STYLE[step.status] || STEP_STYLE.pending;
              let description = "Pending";
              if (step.key === "purchase_ack") {
                description = (
                  <>
                    Created at{" "}
                    <Text as="span" fontWeight="500" color="#C95C18">
                      {moment(ack.created_at).format("DD/MM/YYYY hh:mm A")}
                    </Text>
                  </>
                );
              } else if (step.key === "job_worksheets") {
                description = getJobWorksheetsDescription(step);
              } else if (step.key === "repack_sheets") {
                description = getRepackEntriesDescription(step);
              } else if (
                step.key === "grn" &&
                step.status === "done" &&
                ack.grn_created_at
              ) {
                const employee = getGRNEmployee();
                description = (
                  <Flex flexDirection="column" gap="2px">
                    <Text>
                      Done at{" "}
                      <Text as="span" fontWeight="500" color="#C95C18">
                        {moment(ack.grn_created_at).format("DD/MM/YYYY hh:mm A")}
                      </Text>
                    </Text>
                    <Text>
                      Handled by{" "}
                      <Text as="span" fontWeight="600" color="#C95C18">
                        {employee?.employee_name ?? "-"}
                      </Text>
                    </Text>
                  </Flex>
                );
              } else if (
                step.key === "purchase_entry" &&
                step.status === "done" &&
                ack.wms_purchase_entry_created_at
              ) {
                const employee = getPurchaseEntryEmployee();
                description = (
                  <Flex flexDirection="column" gap="2px">
                    <Text>
                      Done at{" "}
                      <Text as="span" fontWeight="500" color="#C95C18">
                        {moment(ack.wms_purchase_entry_created_at).format(
                          "DD/MM/YYYY hh:mm A"
                        )}
                      </Text>
                    </Text>
                    <Text>
                      Handled by{" "}
                      <Text as="span" fontWeight="600" color="#C95C18">
                        {employee?.employee_name ?? "-"}
                      </Text>
                    </Text>
                  </Flex>
                );
              } else if (step.status === "done") {
                description = "Done";
              } else if (step.status === "in_progress") {
                description = "In progress";
              }

              const showBorder = index !== steps.length - 1;

              return (
                <Flex
                  key={step.key}
                  align="flex-start"
                  position="relative"
                  borderBottomWidth={showBorder ? "1px" : 0}
                  borderColor="#F3F4F6"
                  pb={showBorder ? "14px" : 0}
                  pt={index === 0 ? 0 : "14px"}
                >
                  <Box
                    mt="4px"
                    w="10px"
                    h="10px"
                    borderRadius="full"
                    bg={st.dotBg}
                    flexShrink={0}
                  />
                  <Box ml="14px" minW={0}>
                    <Text
                      fontSize="13.5px"
                      fontWeight="600"
                      color={st.titleColor}
                    >
                      {step.label}
                    </Text>
                    <Box mt="3px" fontSize="12px" color="#637188">
                      {description}
                    </Box>
                  </Box>
                </Flex>
              );
            })}
          </Stack>
        </Box>

        {showChart && (
          <Box
            bg="white"
            borderWidth="1px"
            borderColor="#F1E3D9"
            borderRadius="10px"
            overflow="hidden"
          >
            <Box
              px="20px"
              py="14px"
              bg="#FFF5ED"
              borderBottomWidth="1px"
              borderColor="#F1E3D9"
            >
              <Text fontSize="14px" fontWeight="600" color="#C95C18">
                {isRepackChart ? "Repack Entry Status" : "Job Worksheet Status"}
              </Text>
            </Box>
            <Box p="20px">
              {isRepackChart ? (
                <DashboardBarChart
                  data={[
                    {
                      name: "Repacked",
                      value: ack.repacking_entry_count || 0,
                      color: "#11976A",
                    },
                    {
                      name: "Pending",
                      value: Math.max(
                        0,
                        totalJobCount - (ack.repacking_entry_count || 0)
                      ),
                      color: "#E3B63E",
                    },
                  ]}
                  xDataKey="name"
                  bars={[{ dataKey: "value", perBarColor: true }]}
                  showLegend={true}
                  emptyMessage="No data to display"
                />
              ) : (
                <DashboardBarChart
                  data={[
                    {
                      name: "Open",
                      value: ack.status_counts?.open || 0,
                      color: "#2563EB",
                    },
                    {
                      name: "In Progress",
                      value: ack.status_counts?.in_progress || 0,
                      color: "#7C3AED",
                    },
                    {
                      name: "Done",
                      value: ack.status_counts?.done || 0,
                      color: "#11976A",
                    },
                    {
                      name: "Cancelled",
                      value: ack.status_counts?.cancelled || 0,
                      color: "#9AAAC1",
                    },
                  ]}
                  xDataKey="name"
                  bars={[{ dataKey: "value", perBarColor: true }]}
                  showLegend={true}
                  emptyMessage="No data to display"
                />
              )}
            </Box>
          </Box>
        )}
      </Grid>
    </CustomContainer>
  );
}
