"use client";

import { getChecklistFormById } from "@/api/helpers/checklist_forms";
import {
  getChecklistSubmission,
  isChecklistSubmissionSaveSuccess,
  pickChecklistSubmissionFromGetData,
  upsertChecklistSubmission,
} from "@/api/helpers/checklist_submissions";
import ChecklistFillQuestionFields from "@/components/Checklist/ChecklistFillQuestionFields";
import GlobalWrapper from "@/components/GlobalWrapper";
import { CHECKLIST_FILL_ROUTES } from "@/constants/routes";
import { useUser } from "@/contexts/UserContext";
import { isChecklistFormForDesignation } from "@/utils/checklistFormDesignationFilter";
import { getFillValidationMessages } from "@/utils/checklistFillValidation";
import { resolveMediaUploadsForSubmission } from "@/utils/checklistFillUploads";
import {
  buildInitialAnswers,
  buildSubmissionPayload,
  getQuestionKey,
  hasPersistedSubmissionAnswer,
  mapFormFromApiForFill,
  mergeSubmissionIntoAnswers,
} from "@/utils/checklistSubmissionPayload";
import {
  Badge,
  Box,
  Button,
  Center,
  Flex,
  Heading,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Form, Formik } from "formik";
import moment from "moment";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { use, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

/** Compact toast for validation (short copy + small type). */
const FILL_VALIDATION_TOAST = {
  style: {
    fontSize: "13px",
    lineHeight: 1.35,
    maxWidth: "min(92vw, 340px)",
    padding: "10px 12px",
  },
  duration: 4500,
};

function localDateString() {
  return moment().format("YYYY-MM-DD");
}

/**
 * Current user for attribution. Prefer `employee_code` in `value.answered_by` (backend expects it);
 * include id/name when present. Uses context then `localStorage.employeeData`.
 */
function getEmployeePayloadForSubmission(employeeDataFromContext) {
  let data = employeeDataFromContext;
  if (data == null && typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem("employeeData");
      if (raw) data = JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }
  if (!data) return undefined;

  const employeeCode = data.employee_code ?? data.employeeCode ?? null;
  const employeeId =
    data.employee_id ?? data.employeeId ?? data.id ?? null;
  const employeeName =
    data.employee_name ?? data.employeeName ?? data.name ?? null;

  const hasCode =
    employeeCode != null && String(employeeCode).trim() !== "";
  const hasId =
    employeeId != null && String(employeeId).trim() !== "";

  if (!hasCode && !hasId) return undefined;

  return {
    ...(hasId ? { employeeId } : {}),
    employeeName,
    ...(hasCode ? { employeeCode: String(employeeCode).trim() } : {}),
  };
}

export default function FillChecklistFormPage({ params }) {
  const { id } = use(params);
  const formId = parseInt(id, 10);
  const router = useRouter();
  const { designationId, employeeData } = useUser();
  const [bootDesig, setBootDesig] = useState(null);
  useEffect(() => {
    setBootDesig(
      typeof window !== "undefined"
        ? localStorage.getItem("designationId")
        : null
    );
  }, []);
  const effectiveDesig = designationId ?? bootDesig;

  const [loading, setLoading] = useState(true);
  const [formTitle, setFormTitle] = useState("");
  const [questions, setQuestions] = useState([]);
  const [initialAnswers, setInitialAnswers] = useState({});
  const [submissionId, setSubmissionId] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const dateStr = useMemo(() => localDateString(), []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!formId || Number.isNaN(formId)) {
        toast.error("Invalid form");
        router.push(CHECKLIST_FILL_ROUTES.listing.path);
        return;
      }
      setLoading(true);
      try {
        const res = await getChecklistFormById(formId);
        if (cancelled) return;
        if (res.code !== 200 || !res.data) {
          toast.error(res.message || "Form not found");
          router.push(CHECKLIST_FILL_ROUTES.listing.path);
          return;
        }
        const raw = res.data;
        if (
          effectiveDesig &&
          !isChecklistFormForDesignation(raw, effectiveDesig)
        ) {
          toast.error("This checklist is not assigned to your designation.");
          router.push(CHECKLIST_FILL_ROUTES.listing.path);
          return;
        }

        const mapped = mapFormFromApiForFill(raw);
        const qs = [...(mapped.questions ?? [])].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        );
        setFormTitle(mapped.title || "Checklist");
        setQuestions(qs);

        let merged = buildInitialAnswers(qs);
        let sid = null;

        try {
          const sub = await getChecklistSubmission(formId, dateStr);
          if (cancelled) return;
          if (sub.code === 200 && sub.data != null) {
            const row = pickChecklistSubmissionFromGetData(
              sub.data,
              employeeData?.branch_id
            );
            if (row) {
              sid = row.id ?? null;
              merged = mergeSubmissionIntoAnswers(
                qs,
                row.answers,
                buildInitialAnswers(qs)
              );
            }
          }
        } catch {
          /* no submission yet — backend may 404 */
        }

        setSubmissionId(sid);
        setInitialAnswers(merged);
      } catch {
        if (!cancelled) toast.error("Failed to load checklist");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [formId, router, effectiveDesig, dateStr, employeeData?.branch_id]);

  const visibleQuestionEntries = useMemo(() => {
    return questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => {
        const key = getQuestionKey(q, idx);
        const row = initialAnswers[key];
        return !hasPersistedSubmissionAnswer(q, row);
      });
  }, [questions, initialAnswers]);

  const handleSubmit = async (values) => {
    const answersMap = values.answers ?? {};
    const blockers = [];
    visibleQuestionEntries.forEach(({ q, idx }) => {
      const key = getQuestionKey(q, idx);
      const row = answersMap[key] ?? {};
      getFillValidationMessages(q, row).forEach((msg) => {
        blockers.push(`Q${idx + 1}: ${msg}`);
      });
    });
    if (blockers.length > 0) {
      toast.error(blockers[0], FILL_VALIDATION_TOAST);
      return;
    }

    const answeredBy = getEmployeePayloadForSubmission(employeeData);

    const toastId = toast.loading("Saving…");
    try {
      const resolvedUrlsByKey = await resolveMediaUploadsForSubmission(
        questions,
        answersMap
      );
      const payload = buildSubmissionPayload({
        submissionId,
        checklistFormId: formId,
        localDate: dateStr,
        questions,
        answersMap,
        resolvedUrlsByKey,
        answeredBy,
        nowMs: Date.now(),
      });
      const res = await upsertChecklistSubmission(payload, {
        userBranchId: employeeData?.branch_id,
      });
      toast.dismiss(toastId);
      if (isChecklistSubmissionSaveSuccess(res)) {
        toast.success(res.message || "Saved");
        if (res.data?.id) setSubmissionId(res.data.id);
        if (res.data?.answers) {
          const merged = mergeSubmissionIntoAnswers(
            questions,
            res.data.answers,
            answersMap
          );
          setInitialAnswers(merged);
        }
      } else {
        toast.error(res.message || "Save failed");
      }
    } catch (e) {
      toast.dismiss(toastId);
      toast.error(e?.message || "Save failed");
    }
  };

  if (loading) {
    return (
      <GlobalWrapper permissionKey={CHECKLIST_FILL_ROUTES.fill.permissionKey}>
        <Box maxW="720px" mx="auto" w="100%">
          <Box
            bg="gray.100"
            borderRadius="2xl"
            p={{ base: 4, md: 6 }}
            borderWidth="1px"
            borderColor="gray.200"
          >
            <Box
              bg="white"
              borderRadius="xl"
              borderWidth="1px"
              borderColor="gray.200"
              py={16}
            >
              <Center>
                <Spinner size="lg" color="brand.500" />
              </Center>
            </Box>
          </Box>
        </Box>
      </GlobalWrapper>
    );
  }

  const qCount = visibleQuestionEntries.length;
  const totalQuestions = questions.length;
  const answeredCount = Math.max(0, totalQuestions - qCount);

  return (
    <GlobalWrapper permissionKey={CHECKLIST_FILL_ROUTES.fill.permissionKey}>
      <Box maxW="720px" mx="auto" w="100%" pb={10}>
        <Box
          bg="gray.100"
          borderRadius="2xl"
          p={{ base: 3, md: 5 }}
          borderWidth="1px"
          borderColor="gray.200"
        >
          <Box
            bg="white"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="gray.200"
            overflow="hidden"
            boxShadow="sm"
          >
            <Box
              px={{ base: 5, md: 8 }}
              py={{ base: 6, md: 8 }}
              borderBottomWidth="1px"
              borderColor="gray.100"
              bgGradient="linear(to-b, brand.50, white)"
            >
              <Flex
                flexDir={{ base: "column", sm: "row" }}
                gap={4}
                justify="space-between"
                align={{ base: "flex-start", sm: "flex-start" }}
              >
                <Box flex={1} minW={0}>
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    color="brand.700"
                    textTransform="uppercase"
                    mb={2}
                  >
                    Checklist
                  </Text>
                  <Heading
                    as="h1"
                    fontSize={{ base: "xl", md: "2xl" }}
                    fontWeight="semibold"
                    color="gray.800"
                    lineHeight="1.2"
                  >
                    {formTitle}
                  </Heading>
                  <HStack mt={3} gap={2} flexWrap="wrap">
                    <Badge colorPalette="brand" variant="subtle" size="sm">
                      {dateStr}
                    </Badge>
                    {totalQuestions > 0 ? (
                      <HStack gap={2} flexWrap="wrap" align="center">
                        <Badge colorPalette="green" variant="subtle" size="sm">
                          {answeredCount} of {totalQuestions} answered
                        </Badge>
                        {qCount > 0 ? (
                          <Text fontSize="sm" color="gray.500">
                            {qCount} remaining
                          </Text>
                        ) : (
                          <Text fontSize="sm" color="gray.500">
                            All done for today
                          </Text>
                        )}
                      </HStack>
                    ) : null}
                  </HStack>
                </Box>
                <Link href={CHECKLIST_FILL_ROUTES.listing.path}>
                  <Button variant="outline" size="sm" borderRadius="lg">
                    ← All checklists
                  </Button>
                </Link>
              </Flex>
            </Box>

            <Formik
              enableReinitialize
              initialValues={{ answers: initialAnswers }}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting }) => (
                <Form>
                  <VStack
                    gap={{ base: 4, md: 5 }}
                    align="stretch"
                    px={{ base: 4, md: 6 }}
                    py={{ base: 5, md: 6 }}
                  >
                    {visibleQuestionEntries.length === 0 ? (
                      <Box py={8} textAlign="center">
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">
                          All questions are answered for this day.
                        </Text>
                        <Text fontSize="xs" color="gray.500" mt={2}>
                          Saved answers stay on the server; you can reopen the form
                          tomorrow or if new questions are added.
                        </Text>
                      </Box>
                    ) : (
                      visibleQuestionEntries.map(({ q, idx }) => (
                        <ChecklistFillQuestionFields
                          key={q._id ?? q.id ?? idx}
                          question={q}
                          index={idx}
                          displayIndex={idx + 1}
                          now={now}
                          disabled={false}
                        />
                      ))
                    )}
                  </VStack>

                  <Flex
                    px={{ base: 4, md: 6 }}
                    py={4}
                    bg="gray.50"
                    borderTopWidth="1px"
                    borderColor="gray.100"
                    justifyContent={{ base: "stretch", sm: "flex-end" }}
                  >
                    <Button
                      type="submit"
                      loading={isSubmitting}
                      colorPalette="brand"
                      size="lg"
                      w={{ base: "100%", sm: "auto" }}
                      minW={{ sm: "160px" }}
                      borderRadius="xl"
                      fontWeight="semibold"
                      disabled={visibleQuestionEntries.length === 0}
                    >
                      Save
                    </Button>
                  </Flex>
                </Form>
              )}
            </Formik>
          </Box>
        </Box>
      </Box>
    </GlobalWrapper>
  );
}
