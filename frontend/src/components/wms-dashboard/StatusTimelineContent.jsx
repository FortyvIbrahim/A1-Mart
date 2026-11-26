"use client";

import React, { useEffect, useMemo } from "react";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { capitalizeWordsLatest } from "@/utils/string";
import moment from "moment";
import CustomContainer from "../CustomContainer";
import DashboardBarChart from "@/components/dashboard/DashboardBarChart";
import usePurchaseAcknowledgmentById from "@/api/customHooks/usePurchaseAcknowledgmentById";
import { Tooltip } from "../ui/tooltip";
import CustomImage from "../CustomImage";

const COLORS_MAP = {
  grn_pending: "#3182CE",
  pe_created: "#63B3ED",
  po_linked: "#4299E1",
  job_entry_in_progress: "#9F7AEA",
  repack_entry_in_progress: "#805AD5",
  grn_done: "#ECC94B",
  job_entry_done: "#ED8936",
  done: "#38A169",
};

function buildStatusTimeline(ack) {
  const hasGrn = !!ack.has_grn;
  const hasPoLinked = ack.purchase_order_id != null;
  const hasPurchaseEntry = ack.purchase_entry_id != null;
  const isJobNeeded = ack.is_job_entry_needed === true;
  const statusCounts = ack.status_counts || {};
  const hasRepack = (ack.repacking_entry_count || 0) > 0;
  const totalJobs =
    (statusCounts.open || 0) +
    (statusCounts.in_progress || 0) +
    (statusCounts.done || 0) +
    (statusCounts.cancelled || 0);
  const statusCode = ack.status || "";

  // Show Purchase Order Linked step only when a purchase order actually exists
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

function StatusTimelineContent({ ack }) {
  const { purchaseAcknowledgment, fetchData } = usePurchaseAcknowledgmentById(
    ack.purchase_acknowledgment_id
  );
  const steps = useMemo(() => buildStatusTimeline(ack), [ack]);
  const formattedStatus = useMemo(
    () =>
      ack.status
        ? capitalizeWordsLatest(String(ack.status)).replaceAll("_", " ")
        : "",
    [ack.status]
  );

  useEffect(() => {
    if (ack.purchase_acknowledgment_id) {
      fetchData();
    }
  }, [ack.purchase_acknowledgment_id]);

  const getGRNEmployee = () => {
    if (purchaseAcknowledgment && purchaseAcknowledgment.grns.length > 0) {
      const grn = purchaseAcknowledgment.grns[0];

      if (grn.employee) {
        return grn.employee;
      }
    }

    return null;
  };

  const getPurchaseEntryEmployee = () => {
    if (
      purchaseAcknowledgment &&
      purchaseAcknowledgment.purchase_entries.length > 0
    ) {
      const purchaseEntry = purchaseAcknowledgment.purchase_entries[0];

      if (purchaseEntry.handled_by_employee) {
        return purchaseEntry.handled_by_employee;
      }
    }

    return null;
  };

  const getRepackEntriesDescription = (step) => {
    const statusDescription = `Repack entries - ${
      ack.repacking_entry_count || 0
    } of ${ack.repack_supervisor_entry_count || 0} items`;

    if (
      step.status !== "pending" &&
      purchaseAcknowledgment &&
      purchaseAcknowledgment.stickering.length > 0
    ) {
      const handledBy = [];
      const handledByMap = {};

      purchaseAcknowledgment.stickering.forEach((stickering) => {
        if (
          stickering.repack_supervisor &&
          !handledBy.includes(stickering.repack_supervisor.employee_name)
        ) {
          handledBy.push(stickering.repack_supervisor.employee_name);
          handledByMap[stickering.supervisor.employee_name] =
            stickering.supervisor.profile_img_url;
        }
      });

      return (
        <Flex flexDirection="column" gap={1}>
          <Text>{statusDescription}</Text>
          <Flex gap={1} flexWrap="wrap">
            <Text>Handled by </Text>
            {handledBy.map((name) => (
              <Tooltip
                key={name}
                content={<CustomImage src={handledByMap[name]} alt={name} />}
              >
                <Text fontSize="xs" color="brand.600" fontWeight="medium">
                  {name}
                </Text>
              </Tooltip>
            ))}
          </Flex>
        </Flex>
      );
    }

    return statusDescription;
  };

  const getJobWorksheetsDescription = (step) => {
    const sc = ack.status_counts || {};
    const activeJobsTotal =
      (sc.open || 0) + (sc.in_progress || 0) + (sc.done || 0);

    let statusDescription = `Job Worksheets - Total: ${activeJobsTotal}, Open: ${
      sc.open || 0
    }, In progress: ${sc.in_progress || 0}, Done: ${sc.done || 0}`;

    if (
      step.status !== "pending" &&
      purchaseAcknowledgment &&
      purchaseAcknowledgment.stickering.length > 0
    ) {
      const handledBy = [];
      const handledByMap = {};

      purchaseAcknowledgment.stickering.forEach((stickering) => {
        if (
          stickering.supervisor &&
          !handledBy.includes(stickering.supervisor.employee_name)
        ) {
          handledBy.push(stickering.supervisor.employee_name);
          handledByMap[stickering.supervisor.employee_name] =
            stickering.supervisor.profile_img_url;
        }
      });

      if (step.status === "done") {
        statusDescription = `Done - Total: ${activeJobsTotal}`;
      }

      return (
        <Flex flexDirection="column" gap={1}>
          <Text>{statusDescription}</Text>
          <Flex gap={1} flexWrap="wrap">
            <Text>Handled by </Text>
            {handledBy.map((name) => (
              <Tooltip
                key={name}
                content={<CustomImage src={handledByMap[name]} alt={name} />}
              >
                <Text fontSize="xs" color="brand.600" fontWeight="medium">
                  {name}
                </Text>
              </Tooltip>
            ))}
          </Flex>
        </Flex>
      );
    }

    return statusDescription;
  };

  return (
    <Box>
      <CustomContainer
        size="sm"
        title="Details"
        containerStyle={{ marginBottom: "22px" }}
      >
        <Stack spacing={1} fontSize="sm" color="gray.700">
          <Text>
            <Text as="span" fontWeight="semibold">
              Invoice:
            </Text>{" "}
            {ack.invoice_no}
          </Text>
          <Text>
            <Text as="span" fontWeight="semibold">
              Invoice Date:
            </Text>{" "}
            {moment(ack.invoice_date).format("DD/MM/YYYY")}
          </Text>
          <Text>
            <Text as="span" fontWeight="semibold">
              Supplier:
            </Text>{" "}
            {ack.supplier?.name} ({ack.supplier_id})
          </Text>
          <Text>
            <Text as="span" fontWeight="semibold">
              Current Status:
            </Text>{" "}
            {formattedStatus}
          </Text>
        </Stack>
      </CustomContainer>

      <Box position="relative" mt={4}>
        <Stack gap={3}>
          {steps.map((step, index) => {
            const colorScheme =
              step.status === "done"
                ? "green"
                : step.status === "in_progress"
                ? "blue"
                : "gray";

            let description = "Pending";
            if (step.key === "purchase_ack") {
              description = (
                <>
                  Created at{" "}
                  <Text
                    as="span"
                    fontSize="xs"
                    color="brand.600"
                    fontWeight="medium"
                  >
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
                <Flex flexDirection="column" gap={1}>
                  <Text>
                    Done at{" "}
                    <Text
                      as="span"
                      fontSize="xs"
                      color="brand.600"
                      fontWeight="medium"
                    >
                      {moment(ack.grn_created_at).format("DD/MM/YYYY hh:mm A")}
                    </Text>
                  </Text>
                  <Text>
                    Handled by{" "}
                    <Tooltip
                      key={employee?.employee_name}
                      content={
                        <CustomImage
                          src={employee?.profile_img_url}
                          alt={employee?.employee_name}
                        />
                      }
                    >
                      <Text
                        as="span"
                        fontSize="xs"
                        color="brand.600"
                        fontWeight="medium"
                      >
                        {employee?.employee_name ?? "-"}
                      </Text>
                    </Tooltip>
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
                <Flex flexDirection="column" gap={1}>
                  <Text>
                    Done at{" "}
                    <Text
                      as="span"
                      fontSize="xs"
                      color="brand.600"
                      fontWeight="medium"
                    >
                      {moment(ack.wms_purchase_entry_created_at).format(
                        "DD/MM/YYYY hh:mm A"
                      )}
                    </Text>
                  </Text>
                  <Text>
                    Handled by{" "}
                    <Tooltip
                      key={employee?.employee_name}
                      content={
                        <CustomImage
                          src={employee?.profile_img_url}
                          alt={employee?.employee_name}
                        />
                      }
                    >
                      <Text
                        as="span"
                        fontSize="xs"
                        color="brand.600"
                        fontWeight="medium"
                      >
                        {employee?.employee_name ?? "-"}
                      </Text>
                    </Tooltip>
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
                borderBottom={showBorder ? "1px solid" : "none"}
                borderColor="gray.200"
                pb={showBorder ? 3 : 0}
              >
                <Box
                  position="absolute"
                  top="4px"
                  w="12px"
                  h="12px"
                  borderRadius="full"
                  bg={`${colorScheme}.500`}
                  border="2px solid white"
                />
                <Box ml={6}>
                  <Text fontWeight="medium" color={`${colorScheme}.700`}>
                    {step.label}
                  </Text>
                  <Text
                    mt={1}
                    fontSize="xs"
                    textTransform="none"
                    color="gray.600"
                  >
                    {description}
                  </Text>
                </Box>
              </Flex>
            );
          })}
        </Stack>
      </Box>

      {ack.status === "job_entry_in_progress" && (
        <Box mt={6}>
          <CustomContainer title="Job Worksheet Status" size="sm">
            <DashboardBarChart
              data={[
                {
                  name: "Open",
                  value: ack.status_counts?.open || 0,
                  color: "#3182CE",
                },
                {
                  name: "In Progress",
                  value: ack.status_counts?.in_progress || 0,
                  color: "#805AD5",
                },
                {
                  name: "Done",
                  value: ack.status_counts?.done || 0,
                  color: "#38A169",
                },
                {
                  name: "Cancelled",
                  value: ack.status_counts?.cancelled || 0,
                  color: "#A0AEC0",
                },
              ]}
              xDataKey="name"
              bars={[{ dataKey: "value", perBarColor: true }]}
              showLegend={true}
              emptyMessage="No data to display"
            />
          </CustomContainer>
        </Box>
      )}

      {ack.status === "repack_entry_in_progress" && (
        <Box mt={6}>
          <CustomContainer title="Repack Entry Status" size="sm">
            <DashboardBarChart
              data={[
                {
                  name: "Repacked",
                  value: ack.repacking_entry_count || 0,
                  color: "#38A169",
                },
                {
                  name: "Pending",
                  value:
                    (ack.status_counts?.open || 0) +
                      (ack.status_counts?.in_progress || 0) +
                      (ack.status_counts?.done || 0) +
                      (ack.status_counts?.cancelled || 0) -
                      (ack.repacking_entry_count || 0) || 0,
                  color: "#ECC94B",
                },
              ]}
              xDataKey="name"
              bars={[{ dataKey: "value", perBarColor: true }]}
              showLegend={true}
              emptyMessage="No data to display"
            />
          </CustomContainer>
        </Box>
      )}
    </Box>
  );
}

export default StatusTimelineContent;
