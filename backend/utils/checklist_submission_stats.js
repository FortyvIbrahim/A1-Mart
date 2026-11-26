function parseAnswersJson(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

/** API / repository: normalize DB JSON (string, Buffer, or driver-parsed) for JSON responses. */
function parseAnswersForApi(raw) {
  if (raw == null || raw === "") return [];
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return v == null ? [] : v;
    } catch (_) {
      return [];
    }
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(raw)) {
    try {
      const v = JSON.parse(raw.toString("utf8"));
      return v == null ? [] : v;
    } catch (_) {
      return [];
    }
  }
  return raw;
}

function isTruthyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isAnswerFilled(value, questionType) {
  if (!value || typeof value !== "object") return false;
  switch (questionType) {
    case "boolean":
      return typeof value.boolean === "boolean";
    case "numeric":
      return (
        value.number !== null &&
        value.number !== undefined &&
        value.number !== "" &&
        !Number.isNaN(Number(value.number))
      );
    case "text":
      return isTruthyString(value.text);
    case "date":
      return value.date != null && String(value.date).trim() !== "";
    case "date_time":
      return value.datetime != null && String(value.datetime).trim() !== "";
    case "media":
      return !!(
        isTruthyString(value.image_url) ||
        isTruthyString(value.video_url) ||
        isTruthyString(value.audio_url) ||
        isTruthyString(value.file_url) ||
        isTruthyString(value.comment)
      );
    default:
      return Object.keys(value).some((k) => {
        if (["is_late", "answered_by"].includes(k)) return false;
        const v = value[k];
        if (v === null || v === undefined || v === "") return false;
        if (typeof v === "boolean") return true;
        if (typeof v === "number" && !Number.isNaN(v)) return true;
        if (typeof v === "string") return v.trim().length > 0;
        return false;
      });
  }
}

function isLateForFilledAnswer(entry, value, questionType) {
  if (!isAnswerFilled(value, questionType)) return false;
  if (entry.is_late === true) return true;
  if (value && value.is_late === true) return true;
  return false;
}

/**
 * @param {string|Date} localDate - YYYY-MM-DD or DB date
 * @returns {string} DD/MM/YYYY
 */
function toSubmissionStatsDateKey(localDate) {
  if (!localDate) return "";
  const s =
    typeof localDate === "string"
      ? localDate.slice(0, 10)
      : formatYmd(localDate);
  const parts = s.split("-");
  if (parts.length !== 3) return s;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function formatYmd(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * @param {*} rawAnswers - JSON from checklist_submissions.answers
 * @returns {{ answered: number, total_questions: number, late: number }}
 */
function computeSubmissionStats(rawAnswers) {
  const answers = parseAnswersJson(rawAnswers);
  const total_questions = answers.length;
  let answered = 0;
  let late = 0;
  for (const a of answers) {
    const q = a.question || a.question_snapshot || {};
    const questionType = q.question_type || "text";
    const value = a.value != null && typeof a.value === "object" ? a.value : {};
    if (isAnswerFilled(value, questionType)) answered += 1;
    if (isLateForFilledAnswer(a, value, questionType)) late += 1;
  }
  return { answered, total_questions, late };
}

module.exports = {
  parseAnswersJson,
  parseAnswersForApi,
  computeSubmissionStats,
  toSubmissionStatsDateKey,
  isAnswerFilled,
};
