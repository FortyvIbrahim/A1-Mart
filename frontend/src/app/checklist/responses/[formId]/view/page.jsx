"use client";

import useEmployee from "@/api/customHooks/useEmployee";
import { getChecklistFormById } from "@/api/helpers/checklist_forms";
import {
  getChecklistSubmission,
  getChecklistSubmissionById,
  pickChecklistSubmissionFromGetData,
} from "@/api/helpers/checklist_submissions";
import ChecklistSubmissionReadOnly from "@/components/Checklist/ChecklistSubmissionReadOnly";
import GlobalWrapper from "@/components/GlobalWrapper";
import { CHECKLIST_RESPONSE_ROUTES } from "@/constants/routes";
import { useUser } from "@/contexts/UserContext";
import {
  buildInitialAnswers,
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
} from "@chakra-ui/react";
import moment from "moment";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, {
  Suspense,
  use,
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";

function ChecklistResponseViewInner({ params }) {
  const { formId: formIdParam } = use(params);
  const formId = parseInt(formIdParam, 10);
  const router = useRouter();
  const { employeeData } = useUser();
  const { employees } = useEmployee({ allBranches: true });
  const searchParams = useSearchParams();

  const employeeByCode = useMemo(() => {
    const m = new Map();
    for (const e of employees ?? []) {
      const c = e?.employee_code != null ? String(e.employee_code).trim() : "";
      if (c) m.set(c, e);
    }
    return m;
  }, [employees]);
  const dateParam = searchParams.get("date");
  const branchIdParam = searchParams.get("branch_id");

  const dateStr = useMemo(() => {
    if (!dateParam) return null;
    const m = moment(dateParam, "YYYY-MM-DD", true);
    return m.isValid() ? m.format("YYYY-MM-DD") : null;
  }, [dateParam]);

  const preferredBranchId = useMemo(() => {
    if (branchIdParam == null || branchIdParam === "") return undefined;
    const n = Number(branchIdParam);
    return Number.isNaN(n) ? undefined : n;
  }, [branchIdParam]);

  const [loading, setLoading] = useState(true);
  const [formTitle, setFormTitle] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answersMap, setAnswersMap] = useState({});
  const [hasSubmission, setHasSubmission] = useState(false);
  const [submissionBranchLabel, setSubmissionBranchLabel] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!formId || Number.isNaN(formId)) {
        toast.error("Invalid form");
        router.push(CHECKLIST_RESPONSE_ROUTES.listing.path);
        return;
      }
      if (!dateStr) {
        toast.error("Pick a date from the calendar");
        router.push(CHECKLIST_RESPONSE_ROUTES.listing.path);
        return;
      }

      setLoading(true);
      setSubmissionBranchLabel(null);
      try {
        const formRes = await getChecklistFormById(formId);
        if (cancelled) return;
        if (formRes.code !== 200 || !formRes.data) {
          toast.error(formRes.message || "Form not found");
          router.push(CHECKLIST_RESPONSE_ROUTES.listing.path);
          return;
        }

        const mapped = mapFormFromApiForFill(formRes.data);
        const qs = [...(mapped?.questions ?? [])].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        );
        setFormTitle(mapped?.title || "Checklist");
        setQuestions(qs);

        const subRes = await getChecklistSubmission(formId, dateStr);
        if (cancelled) return;

        if (subRes.code !== 200) {
          toast.error(subRes.message || "Could not load submission");
          setHasSubmission(false);
          setSubmissionBranchLabel(null);
          setAnswersMap(buildInitialAnswers(qs));
          return;
        }

        const row = pickChecklistSubmissionFromGetData(
          subRes.data,
          preferredBranchId ?? employeeData?.branch_id
        );

        if (!row) {
          setHasSubmission(false);
          setSubmissionBranchLabel(null);
          setAnswersMap(buildInitialAnswers(qs));
          return;
        }

        const bn = (row.branch_name ?? "").toString().trim();
        setSubmissionBranchLabel(
          bn ||
            (row.branch_id != null && row.branch_id !== ""
              ? `Branch #${row.branch_id}`
              : null)
        );

        let answers = row.answers;
        const sid = row.id;

        if (
          sid &&
          (!Array.isArray(answers) || answers.length === 0)
        ) {
          const detail = await getChecklistSubmissionById(sid);
          if (cancelled) return;
          if (detail.code === 200 && detail.data?.answers) {
            answers = detail.data.answers;
          }
        }

        setHasSubmission(true);
        const merged = mergeSubmissionIntoAnswers(
          qs,
          answers ?? [],
          buildInitialAnswers(qs)
        );
        setAnswersMap(merged);
      } catch {
        if (!cancelled) toast.error("Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [formId, dateStr, router, employeeData?.branch_id, preferredBranchId]);

  if (loading) {
    return (
      <GlobalWrapper
        permissionKey={CHECKLIST_RESPONSE_ROUTES.view.permissionKey}
      >
        <Box maxW="720px" mx="auto" w="100%" py={16}>
          <Center>
            <Spinner size="lg" color="brand.500" />
          </Center>
        </Box>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey={CHECKLIST_RESPONSE_ROUTES.view.permissionKey}>
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
                    View responses
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
                    {submissionBranchLabel ? (
                      <Badge colorPalette="gray" variant="subtle" size="sm">
                        {submissionBranchLabel}
                      </Badge>
                    ) : null}
                    {!hasSubmission ? (
                      <Badge colorPalette="orange" variant="subtle" size="sm">
                        No submission for this date
                      </Badge>
                    ) : null}
                  </HStack>
                </Box>
                <Link href={CHECKLIST_RESPONSE_ROUTES.listing.path}>
                  <Button variant="outline" size="sm" borderRadius="lg">
                    ← Checklist responses
                  </Button>
                </Link>
              </Flex>
            </Box>

            <Box px={{ base: 4, md: 6 }} py={{ base: 5, md: 6 }}>
              {!hasSubmission ? (
                <Text fontSize="sm" color="gray.600">
                  There is no saved checklist for this day yet.
                </Text>
              ) : (
                <ChecklistSubmissionReadOnly
                  localDateYmd={dateStr}
                  questions={questions}
                  answersMap={answersMap}
                  employeeByCode={employeeByCode}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </GlobalWrapper>
  );
}

export default function ChecklistResponseViewPage({ params }) {
  return (
    <Suspense
      fallback={
        <GlobalWrapper
          permissionKey={CHECKLIST_RESPONSE_ROUTES.view.permissionKey}
        >
          <Box maxW="720px" mx="auto" w="100%" py={16}>
            <Center>
              <Spinner size="lg" color="brand.500" />
            </Center>
          </Box>
        </GlobalWrapper>
      }
    >
      <ChecklistResponseViewInner params={params} />
    </Suspense>
  );
}
