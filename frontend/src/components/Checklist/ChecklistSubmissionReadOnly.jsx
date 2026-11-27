"use client";

import {
  Badge,
  Box,
  Flex,
  Heading,
  HStack,
  Link,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import React from "react";
import {
  getQuestionKey,
  isMediaQuestion,
  submissionAnswerIsLate,
  submissionValueHasAnswerContent,
} from "@/utils/checklistSubmissionPayload";

function trimStr(v) {
  if (v == null) return "";
  const s = String(v).trim();
  return s;
}

/** Prefer display name; optional `employeeByCode` resolves code when API omits name. */
function answeredByLabel(row, employeeByCode) {
  const v = row?._server?.value;
  if (!v || typeof v !== "object") return null;

  const nameFromValue = trimStr(v.answered_by_employee_name);
  const nameFromRow = trimStr(row?.answeredByEmployeeName);
  if (nameFromValue) return nameFromValue;
  if (nameFromRow) return nameFromRow;

  const code = trimStr(
    v.answered_by ?? v.answered_by_employee_code ?? row?.answeredByEmployeeCode
  );
  if (code && employeeByCode?.size) {
    const emp = employeeByCode.get(code);
    const fromDir = trimStr(emp?.employee_name);
    if (fromDir) return fromDir;
  }
  if (code) return code;
  return null;
}

function MediaThumb({ href, label, isVideo }) {
  if (!href) return null;
  const safe = String(href).trim();
  if (!safe) return null;
  return (
    <Box>
      <Text fontSize="xs" color="gray.500" mb={1}>
        {label}
      </Text>
      {!isVideo ? (
        <Link href={safe} target="_blank" rel="noopener noreferrer">
          <Box
            as="img"
            src={safe}
            alt=""
            maxH="96px"
            maxW="200px"
            objectFit="cover"
            borderRadius="md"
            borderWidth="1px"
            borderColor="gray.200"
          />
        </Link>
      ) : (
        <Link
          href={safe}
          target="_blank"
          rel="noopener noreferrer"
          fontSize="sm"
          color="brand.600"
          textDecoration="underline"
        >
          Open video in new tab
        </Link>
      )}
    </Box>
  );
}

function AnswerBody({ q, row }) {
  const v = row?._server?.value ?? {};
  const t = (q?.question_type ?? "").toString().toLowerCase().trim();

  if (!submissionValueHasAnswerContent(q, v)) {
    return (
      <Text fontSize="sm" color="gray.500" fontStyle="italic">
        No answer
      </Text>
    );
  }

  if (t === "boolean") {
    return (
      <Text fontSize="sm" color="gray.800">
        {v.boolean === true ? "Yes" : v.boolean === false ? "No" : "—"}
      </Text>
    );
  }
  if (t === "numeric") {
    return (
      <Text fontSize="sm" color="gray.800">
        {v.number != null ? String(v.number) : "—"}
      </Text>
    );
  }
  if (t === "text") {
    return (
      <Text fontSize="sm" color="gray.800" whiteSpace="pre-wrap">
        {v.text ?? "—"}
      </Text>
    );
  }
  if (t === "date") {
    return (
      <Text fontSize="sm" color="gray.800">
        {v.date != null ? String(v.date) : "—"}
      </Text>
    );
  }
  if (t === "date_time") {
    return (
      <Text fontSize="sm" color="gray.800">
        {v.datetime != null ? String(v.datetime) : "—"}
      </Text>
    );
  }
  if (t === "media" || isMediaQuestion(q)) {
    return (
      <VStack align="stretch" gap={3}>
        {v.image_url ? (
          <MediaThumb href={v.image_url} label="Image" isVideo={false} />
        ) : null}
        {v.video_url ? (
          <MediaThumb href={v.video_url} label="Video" isVideo />
        ) : null}
        {v.audio_url ? (
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Audio
            </Text>
            <Link
              href={String(v.audio_url)}
              target="_blank"
              rel="noopener noreferrer"
              fontSize="sm"
              color="brand.600"
              textDecoration="underline"
            >
              Open audio in new tab
            </Link>
          </Box>
        ) : null}
        {v.file_url ? (
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              File
            </Text>
            <Link
              href={String(v.file_url)}
              target="_blank"
              rel="noopener noreferrer"
              fontSize="sm"
              color="brand.600"
              textDecoration="underline"
            >
              Open file in new tab
            </Link>
          </Box>
        ) : null}
        {v.comment != null && String(v.comment).trim() !== "" ? (
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Comment
            </Text>
            <Text fontSize="sm" color="gray.800" whiteSpace="pre-wrap">
              {v.comment}
            </Text>
          </Box>
        ) : null}
      </VStack>
    );
  }

  return (
    <Text fontSize="sm" color="gray.700">
      {JSON.stringify(v)}
    </Text>
  );
}

/**
 * Read-only checklist answers (merged Formik-shaped map from `mergeSubmissionIntoAnswers`).
 */
export default function ChecklistSubmissionReadOnly({
  localDateYmd,
  questions,
  answersMap,
  /** `Map<employee_code, employee>` for resolving names when only code is stored */
  employeeByCode,
}) {
  const sorted = [...(questions ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  return (
    <VStack align="stretch" gap={{ base: 4, md: 5 }}>
      {sorted.map((q, idx) => {
        const key = getQuestionKey(q, idx);
        const row = answersMap?.[key] ?? {};
        const title = q.title ?? q.question ?? `Question ${idx + 1}`;
        const by = answeredByLabel(row, employeeByCode);
        const late =
          submissionValueHasAnswerContent(q, row?._server?.value) &&
          submissionAnswerIsLate(row?._server, localDateYmd);

        return (
          <Box
            key={q.id ?? key}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="xl"
            bg="white"
            px={{ base: 4, md: 5 }}
            py={4}
          >
            <Flex
              flexDir={{ base: "column", sm: "row" }}
              gap={2}
              justify="space-between"
              align={{ sm: "flex-start" }}
              mb={2}
            >
              <Box flex={1} minW={0}>
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  color="brand.700"
                  textTransform="uppercase"
                >
                  Question {idx + 1}
                </Text>
                <Heading as="h3" size="sm" fontWeight="semibold" mt={1}>
                  {title}
                </Heading>
                {q.description ? (
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    {q.description}
                  </Text>
                ) : null}
              </Box>
              <HStack flexWrap="wrap" gap={2} justify={{ base: "flex-start", sm: "flex-end" }}>
                {late ? (
                  <Badge colorPalette="orange" variant="subtle" size="sm">
                    Late
                  </Badge>
                ) : null}
                {by ? (
                  <Badge colorPalette="gray" variant="subtle" size="sm">
                    Filled by {by}
                  </Badge>
                ) : null}
              </HStack>
            </Flex>
            <Separator my={3} />
            <AnswerBody q={q} row={row} />
          </Box>
        );
      })}
    </VStack>
  );
}
