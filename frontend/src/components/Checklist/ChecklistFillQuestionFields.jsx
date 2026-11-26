"use client";

import ChecklistFillBooleanChoice from "@/components/Checklist/ChecklistFillBooleanChoice";
import ChecklistFillMediaIconTrigger from "@/components/Checklist/ChecklistFillMediaIconTrigger";
import ChecklistFillValidationMessages from "@/components/Checklist/ChecklistFillValidationMessages";
import CustomInput from "@/components/CustomInput";
import {
  formatCountdown,
  getFillWindowState,
} from "@/utils/checklistFillWindow";
import { getFillValidationMessages } from "@/utils/checklistFillValidation";
import { getQuestionKey } from "@/utils/checklistSubmissionPayload";
import { getNestedValue } from "@/utils/object";
import {
  Badge,
  Box,
  Flex,
  Grid,
  Heading,
  HStack,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useFormikContext } from "formik";
import React, { useMemo } from "react";

function optLabel(base, optional) {
  return optional ? `${base} (optional)` : base;
}

const PRIMARY_TYPES = new Set([
  "boolean",
  "numeric",
  "text",
  "date",
  "date_time",
  "media",
]);

/** Image / video / audio / comment toggles from the form builder (validation tab). */
export function hasValidationExtras(q) {
  if (!q) return false;
  return Boolean(
    q.take_image ||
      q.take_video ||
      q.record_audio ||
      q.allow_comment
  );
}

function WindowHints({ question, now }) {
  const win = useMemo(
    () => getFillWindowState(now, question.fill_at_from, question.fill_at_to),
    [now, question.fill_at_from, question.fill_at_to]
  );

  if (win.status === "all_day") return null;

  if (win.status === "before") {
    return (
      <Badge colorPalette="orange" variant="subtle" size="sm">
        Opens in {formatCountdown(win.msUntilOpen)}
      </Badge>
    );
  }

  if (win.status === "open" && win.msUntilClose != null) {
    return (
      <Badge colorPalette="green" variant="subtle" size="sm">
        {formatCountdown(win.msUntilClose)} left
      </Badge>
    );
  }

  if (win.status === "after") {
    return (
      <Badge colorPalette="orange" variant="subtle" size="sm">
        Late entry
      </Badge>
    );
  }

  return null;
}

function ExtraDetailsFields({ question, base, disabled }) {
  return (
    <Grid gap={4}>
      {question.take_image && (
        <ChecklistFillMediaIconTrigger
          kind="image"
          accept="image/*"
          name={`${base}.image`}
          disabled={disabled}
          label={optLabel("Photo", question.is_image_optional)}
          maxSize={5242880}
        />
      )}
      {question.take_video && (
        <ChecklistFillMediaIconTrigger
          kind="video"
          accept="video/*"
          name={`${base}.video`}
          disabled={disabled}
          label={optLabel("Video", question.is_video_optional)}
          maxSize={52428800}
        />
      )}
      {question.record_audio && (
        <CustomInput
          label="Audio recording"
          name={`${base}.audio`}
          method="voice-recorder"
          disabled={disabled}
        />
      )}
      {question.allow_comment && (
        <CustomInput
          label={optLabel("Comment", question.is_comment_optional)}
          name={`${base}.comment`}
          method="text"
          type="text"
          disabled={disabled}
          placeholder="Add a comment…"
        />
      )}
    </Grid>
  );
}

export default function ChecklistFillQuestionFields({
  question,
  index,
  displayIndex,
  now,
  disabled: disabledProp,
}) {
  const { values } = useFormikContext();
  const key = getQuestionKey(question, index);
  const base = `answers.${key}`;
  const row = getNestedValue(values, base) ?? {};

  const win = useMemo(
    () => getFillWindowState(now, question.fill_at_from, question.fill_at_to),
    [now, question.fill_at_from, question.fill_at_to]
  );

  /** Only block before the window opens; after close, allow entry (late). */
  const windowLockedBeforeOpen = win.status === "before" || disabledProp;
  const isLate = win.status === "after";
  const disabled = windowLockedBeforeOpen;

  const title = question.title ?? question.question ?? "Question";
  const rawQt = (question.question_type ?? "")
    .toString()
    .toLowerCase()
    .trim();
  const effectiveQt = PRIMARY_TYPES.has(rawQt) ? rawQt : "text";

  const hasValExtra = hasValidationExtras(question);

  const validationMessages = getFillValidationMessages(question, row);

  const showTimeHints = win.status !== "all_day";

  const badgeNum = displayIndex != null ? displayIndex : index + 1;
  const answeredByName =
    row.answeredByEmployeeName ??
    row._server?.value?.answered_by_employee_name ??
    row.answeredByEmployeeCode ??
    row._server?.value?.answered_by ??
    null;

  return (
    <Box
      borderRadius="2xl"
      borderWidth="1px"
      borderColor={isLate ? "orange.200" : "gray.200"}
      bg={windowLockedBeforeOpen ? "gray.50" : isLate ? "orange.50" : "white"}
      boxShadow="0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.03)"
      overflow="hidden"
      opacity={windowLockedBeforeOpen ? 0.88 : 1}
      transition="box-shadow 0.2s ease, opacity 0.2s ease"
      _hover={
        windowLockedBeforeOpen
          ? undefined
          : {
              boxShadow:
                "0 1px 3px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.05)",
            }
      }
    >
      <Flex align="flex-start" gap={4} p={{ base: 4, md: 5 }}>
        <Flex
          align="center"
          justify="center"
          flexShrink={0}
          w="40px"
          h="40px"
          borderRadius="xl"
          bg={windowLockedBeforeOpen ? "gray.300" : isLate ? "orange.400" : "brand.500"}
          color="white"
          fontSize="sm"
          fontWeight="bold"
          boxShadow="sm"
        >
          {badgeNum}
        </Flex>

        <VStack align="stretch" gap={0} flex={1} minW={0}>
          <Box pb={3}>
            <Heading
              as="h2"
              fontSize={{ base: "md", md: "lg" }}
              fontWeight="semibold"
              color="gray.800"
              lineHeight="1.45"
              wordBreak="break-word"
              whiteSpace="pre-wrap"
              letterSpacing="-0.02em"
            >
              {title}
            </Heading>

            {question.description ? (
              <Text
                fontSize="sm"
                color="gray.500"
                mt={2}
                lineHeight="1.65"
              >
                {question.description}
              </Text>
            ) : null}

            {showTimeHints ? (
              <HStack mt={3} flexWrap="wrap" gap={2}>
                <WindowHints question={question} now={now} />
              </HStack>
            ) : null}

            {windowLockedBeforeOpen && win.status === "before" ? (
              <Badge colorPalette="gray" variant="solid" size="sm" mt={3}>
                Not open yet
              </Badge>
            ) : null}

            {answeredByName ? (
              <Text fontSize="xs" color="gray.500" mt={2}>
                Answered by: <strong>{answeredByName}</strong>
              </Text>
            ) : null}
          </Box>

          <Separator borderColor="gray.100" />

          <Box pt={4}>
            {effectiveQt === "boolean" && (
              <ChecklistFillBooleanChoice
                name={`${base}.boolean`}
                disabled={disabled}
              />
            )}
            {effectiveQt === "numeric" && (
              <CustomInput
                label="Value"
                name={`${base}.number`}
                method="text"
                type="number"
                disabled={disabled}
              />
            )}
            {effectiveQt === "text" && (
              <CustomInput
                label="Your response"
                name={`${base}.text`}
                method="text"
                type="text"
                disabled={disabled}
                placeholder="Type here…"
              />
            )}
            {effectiveQt === "date" && (
              <CustomInput
                label="Date"
                name={`${base}.date`}
                method="date-picker"
                disabled={disabled}
              />
            )}
            {effectiveQt === "date_time" && (
              <CustomInput
                label="Date & time"
                name={`${base}.datetime`}
                method="text"
                type="datetime-local"
                disabled={disabled}
              />
            )}
            {effectiveQt === "media" && (
              <CustomInput
                label="Upload file"
                name={`${base}.file`}
                method="file"
                disabled={disabled}
              />
            )}
          </Box>

          {hasValExtra && (
            <Box
              mt={4}
              pt={4}
              borderTopWidth="1px"
              borderTopColor="gray.100"
            >
              <Text
                fontSize="xs"
                fontWeight="semibold"
                color="gray.500"
                mb={3}
              >
                Optional extras
              </Text>
              <Box
                borderRadius="xl"
                borderWidth="1px"
                borderStyle="dashed"
                borderColor="gray.300"
                bg="gray.50"
                px={{ base: 3, md: 4 }}
                py={4}
              >
                <ExtraDetailsFields
                  question={question}
                  base={base}
                  disabled={disabled}
                />
              </Box>
            </Box>
          )}

          <Box mt={3}>
            <ChecklistFillValidationMessages messages={validationMessages} />
          </Box>
        </VStack>
      </Flex>
    </Box>
  );
}
