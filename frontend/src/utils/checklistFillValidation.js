/**
 * Extra-details rules (image / video / audio / comment): when a flag is on and not marked
 * optional, the field is required once the user has answered the question (primary answer
 * or any extra field started).
 */

import { isMediaQuestion, toBool } from "@/utils/checklistSubmissionPayload";

export function hasValue(v) {
  if (v == null || v === "") return false;
  if (typeof v === "string" && v.trim() === "") return false;
  return true;
}

function hasValidationExtras(q) {
  if (!q) return false;
  return Boolean(
    q.take_image ||
      q.take_video ||
      q.record_audio ||
      q.allow_comment
  );
}

/**
 * True when the user has a primary answer (boolean / text / number / date / file, etc.).
 */
export function hasAnsweredPrimaryQuestion(q, row) {
  if (!q || !row) return false;
  const t = (q.question_type ?? "").toString().toLowerCase().trim();
  switch (t) {
    case "boolean":
      return row.boolean === true || row.boolean === false;
    case "numeric":
      return (
        row.number !== "" &&
        row.number != null &&
        String(row.number).trim() !== ""
      );
    case "text":
      return hasValue(row.text);
    case "date":
      return row.date != null;
    case "date_time":
      return hasValue(row.datetime);
    case "media":
      return hasValue(row.file);
    default:
      return false;
  }
}

/** True if the user has started any extra (photo / video / audio / comment) or primary file. */
export function hasStartedMediaAnswer(q, row) {
  if (!q || !isMediaQuestion(q) || !row) return false;
  if (
    hasValue(row.file) ||
    hasValue(row.image) ||
    hasValue(row.video) ||
    hasValue(row.audio)
  ) {
    return true;
  }
  if (q.allow_comment && hasValue(row.comment)) return true;
  return false;
}

function shouldEnforceRequiredExtras(q, row) {
  if (!hasValidationExtras(q)) return false;
  return (
    hasAnsweredPrimaryQuestion(q, row) || hasStartedMediaAnswer(q, row)
  );
}

/**
 * Validation messages for extra-details completeness.
 * @returns {string[]}
 */
export function getFillValidationMessages(q, row) {
  const messages = [];
  if (!q || !row || !hasValidationExtras(q)) return messages;
  if (!shouldEnforceRequiredExtras(q, row)) return messages;

  if (q.take_image && !toBool(q.is_image_optional) && !hasValue(row.image)) {
    messages.push("Photo required");
  }
  if (q.take_video && !toBool(q.is_video_optional) && !hasValue(row.video)) {
    messages.push("Video required");
  }
  if (q.allow_comment && !toBool(q.is_comment_optional) && !hasValue(row.comment)) {
    messages.push("Comment required");
  }

  return messages;
}
