import {
  getFillWindowState,
  getFillWindowStateForLocalDate,
} from "@/utils/checklistFillWindow";
import { mapChecklistFormFromApi } from "@/utils/checklistFormPayload";
import moment from "moment";

/** Coerce API booleans (0/1, "true"/"false", camelCase) for checklist questions. */
export function toBool(v) {
  if (v === true || v === 1) return true;
  if (v === false || v === 0 || v === null || v === undefined) return false;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no" || s === "") return false;
  }
  return Boolean(v);
}

/**
 * Normalizes questions from GET /checklist-forms/:id for the fill UI.
 * Coerces booleans and camelCase fields; keeps `question_type` from the API so text/boolean/etc.
 * stay visible alongside validation toggles on the fill page.
 */
export function normalizeChecklistQuestionForFill(q) {
  if (!q) return q;
  const take_image = toBool(q.take_image ?? q.takeImage);
  const take_video = toBool(q.take_video ?? q.takeVideo);
  const record_audio = toBool(q.record_audio ?? q.recordAudio);
  const allow_comment = toBool(q.allow_comment ?? q.allowComment);
  const is_image_optional = toBool(q.is_image_optional ?? q.isImageOptional);
  const is_video_optional = toBool(q.is_video_optional ?? q.isVideoOptional);
  const is_comment_optional = toBool(q.is_comment_optional ?? q.isCommentOptional);
  const is_required = toBool(q.is_required ?? q.isRequired);

  const question_type = (q.question_type ?? q.questionType ?? "")
    .toString()
    .trim()
    .toLowerCase();

  return {
    ...q,
    take_image,
    take_video,
    record_audio,
    allow_comment,
    is_image_optional,
    is_video_optional,
    is_comment_optional,
    is_required,
    question_type: question_type || q.question_type || "",
  };
}

/** True if this question should use media UI + payloads (type `media` or any media/comment flag). */
export function isMediaQuestion(q) {
  if (!q) return false;
  const t = (q.question_type ?? q.questionType ?? "")
    .toString()
    .trim()
    .toLowerCase();
  if (t === "media") return true;
  return (
    toBool(q.take_image ?? q.takeImage) ||
    toBool(q.take_video ?? q.takeVideo) ||
    toBool(q.record_audio ?? q.recordAudio) ||
    toBool(q.allow_comment ?? q.allowComment)
  );
}

/** `?? []` does not coerce a plain object; API may send wrong shape. */
export function asQuestionArray(questions) {
  return Array.isArray(questions) ? questions : [];
}

/** Submission `answers` must be a list of rows; tolerate a single object from API. */
export function asAnswerArray(apiAnswers) {
  if (apiAnswers == null) return [];
  if (Array.isArray(apiAnswers)) return apiAnswers;
  if (typeof apiAnswers === "object") return [apiAnswers];
  return [];
}

/** Stable key for Formik `answers` map (must match across save/load). */
export function getQuestionKey(question, index) {
  const id = question?.id;
  if (id != null && String(id).trim() !== "") return `q_${id}`;
  const so = question?.sort_order;
  if (so != null && String(so).trim() !== "") return `q_so_${so}`;
  return `q_idx_${index}`;
}

export function snapshotQuestion(question, index) {
  return {
    id: question?.id ?? null,
    sort_order: question?.sort_order ?? index + 1,
    title: question?.question ?? question?.title ?? "",
    description: question?.description ?? null,
    question_type: question?.question_type ?? null,
    fill_at_from: question?.fill_at_from ?? null,
    fill_at_to: question?.fill_at_to ?? null,
    is_required: toBool(question?.is_required),
    record_audio: toBool(question?.record_audio),
    take_image: toBool(question?.take_image),
    is_image_optional: toBool(question?.is_image_optional),
    take_video: toBool(question?.take_video),
    is_video_optional: toBool(question?.is_video_optional),
    allow_comment: toBool(question?.allow_comment),
    is_comment_optional: toBool(question?.is_comment_optional),
  };
}

export function buildEmptyAnswerRow() {
  return {
    boolean: undefined,
    number: "",
    text: "",
    file: null,
    image: null,
    video: null,
    audio: null,
    comment: "",
    date: null,
    datetime: "",
    _server: null,
    /** From last saved submission value (display only). */
    answeredByEmployeeId: null,
    answeredByEmployeeName: null,
    answeredByEmployeeCode: null,
  };
}

/** True if API value object has a real answer (excluding attribution meta). */
export function submissionValueHasAnswerContent(q, val) {
  if (!val || typeof val !== "object") return false;
  const v = { ...val };
  delete v.answered_by;
  delete v.answered_by_employee_code;
  delete v.answered_by_employee_id;
  delete v.answered_by_employee_name;
  delete v.is_late;
  delete v.isLate;
  const t = (q?.question_type ?? "").toString().toLowerCase().trim();
  if (t === "boolean") return typeof v.boolean === "boolean";
  if (t === "numeric") return v.number !== undefined && v.number !== null;
  if (t === "text") return v.text != null && String(v.text).trim() !== "";
  if (t === "date") return v.date != null && String(v.date).trim() !== "";
  if (t === "date_time")
    return v.datetime != null && String(v.datetime).trim() !== "";
  if (t === "media" || isMediaQuestion(q)) {
    return Boolean(
      v.file_url ||
        v.image_url ||
        v.video_url ||
        v.audio_url ||
        (v.comment != null && String(v.comment).trim() !== "")
    );
  }
  return Object.keys(v).some((k) => v[k] !== undefined && v[k] !== null);
}

/** Count answered rows in a GET submission `answers` array (same rules as fill page). */
export function countAnsweredQuestionsFromSubmissionAnswers(apiAnswers) {
  if (!Array.isArray(apiAnswers)) return 0;
  let n = 0;
  for (const row of apiAnswers) {
    const q = row?.question_snapshot || row?.question;
    const val = row?.value;
    if (q && submissionValueHasAnswerContent(q, val)) n++;
  }
  return n;
}

/** When the server stored this answer (for late detection). */
export function parseSubmissionAnswerTimestamp(row) {
  if (!row || typeof row !== "object") return null;
  const val = row.value;
  const raw =
    row.answered_at ??
    row.answeredAt ??
    (val && typeof val === "object" ? val.answered_at ?? val.answeredAt : null) ??
    row.updated_at ??
    row.updatedAt ??
    row.created_at ??
    row.createdAt;
  if (raw == null) return null;
  const m = moment(raw);
  return m.isValid() ? m : null;
}

/** Prefer `value.is_late`; optional legacy top-level `is_late`; else timestamps. */
export function submissionAnswerIsLate(row, localDateStr) {
  const val = row?.value;
  if (val && typeof val === "object") {
    if (val.is_late === true || val.isLate === true) return true;
    if (val.is_late === false || val.isLate === false) return false;
  }
  if (row?.is_late === true || row?.isLate === true) return true;
  if (row?.is_late === false || row?.isLate === false) return false;
  const q = row?.question_snapshot || row?.question;
  const ts = parseSubmissionAnswerTimestamp(row);
  if (!ts || !q) return false;
  const from = q.fill_at_from ?? q.fillAtFrom;
  const to = q.fill_at_to ?? q.fillAtTo;
  const win = getFillWindowStateForLocalDate(localDateStr, ts, from, to);
  return win.status === "after";
}

/**
 * Answered count + late count. Uses stored `is_late` on each answer when present;
 * otherwise falls back to timestamp + window on `localDateStr`.
 */
export function countAnsweredAndLateFromSubmissionAnswers(apiAnswers, localDateStr) {
  if (!Array.isArray(apiAnswers)) {
    return { answeredCount: 0, lateCount: 0 };
  }
  let answeredCount = 0;
  let lateCount = 0;
  for (const row of apiAnswers) {
    const q = row?.question_snapshot || row?.question;
    const val = row?.value;
    if (!q || !submissionValueHasAnswerContent(q, val)) continue;
    answeredCount++;
    if (submissionAnswerIsLate(row, localDateStr)) lateCount++;
  }
  return { answeredCount, lateCount };
}

/** True when this question row was saved on the server with an answer (hide from fill list). */
export function hasPersistedSubmissionAnswer(q, row) {
  if (!row?._server?.value) return false;
  return submissionValueHasAnswerContent(q, row._server.value);
}

export function buildInitialAnswers(questions) {
  const answers = {};
  asQuestionArray(questions).forEach((q, idx) => {
    answers[getQuestionKey(q, idx)] = buildEmptyAnswerRow();
  });
  return answers;
}

/**
 * Maps GET /checklist-submissions payload into Formik `answers` shape.
 * `apiAnswers` is an array of `{ question_id, question_snapshot, value }`.
 */
export function mergeSubmissionIntoAnswers(
  questions,
  apiAnswers,
  initial = {}
) {
  const out = { ...initial };
  const byQid = new Map();
  asAnswerArray(apiAnswers).forEach((row) => {
    const qid =
      row?.question_id ??
      row?.question_snapshot?.id ??
      row?.question?.id;
    if (qid != null) byQid.set(Number(qid), row);
  });

  asQuestionArray(questions).forEach((q, idx) => {
    const key = getQuestionKey(q, idx);
    const row = out[key] ? { ...out[key] } : buildEmptyAnswerRow();
    const match =
      q?.id != null ? byQid.get(Number(q.id)) : null;
    const val = match?.value ?? {};
    row.boolean =
      typeof val.boolean === "boolean" ? val.boolean : row.boolean;
    row.number =
      val.number !== undefined && val.number !== null
        ? String(val.number)
        : row.number;
    row.text = val.text ?? row.text;
    row.file = val.file_url ?? val.file ?? row.file;
    row.image = val.image_url ?? val.image ?? row.image;
    row.video = val.video_url ?? val.video ?? row.video;
    row.audio = val.audio_url ?? val.audio ?? row.audio;
    row.comment = val.comment ?? row.comment;
    row.date = val.date ? new Date(val.date) : row.date;
    row.datetime =
      val.datetime ?? val.date_time ?? row.datetime ?? "";
    row._server = match ?? null;
    row.answeredByEmployeeId =
      val.answered_by_employee_id ?? row.answeredByEmployeeId ?? null;
    row.answeredByEmployeeName =
      val.answered_by_employee_name ?? row.answeredByEmployeeName ?? null;
    row.answeredByEmployeeCode =
      val.answered_by ??
      val.answered_by_employee_code ??
      row.answeredByEmployeeCode ??
      null;
    out[key] = row;
  });

  return out;
}

/**
 * Answered-by for `value`: `answered_by` = employee_code (primary), plus id/name when present.
 * Current user from `answeredBy`, else row / GET merge.
 */
function resolveAnsweredByFieldsForValue(row, answeredBy) {
  let answered_by = null;
  let answered_by_employee_id;
  let answered_by_employee_name = null;

  if (answeredBy) {
    if (
      answeredBy.employeeCode != null &&
      String(answeredBy.employeeCode).trim() !== ""
    ) {
      answered_by = String(answeredBy.employeeCode).trim();
    }
    if (
      answeredBy.employeeId != null &&
      String(answeredBy.employeeId).trim() !== ""
    ) {
      answered_by_employee_id = Number(answeredBy.employeeId);
      answered_by_employee_name =
        answeredBy.employeeName != null
          ? String(answeredBy.employeeName)
          : null;
    }
  }

  if (!answered_by) {
    const c =
      row?.answeredByEmployeeCode ??
      row?._server?.value?.answered_by ??
      row?._server?.value?.answered_by_employee_code ??
      null;
    if (c != null && String(c).trim() !== "") answered_by = String(c).trim();
  }

  if (answered_by_employee_id === undefined) {
    const id =
      row?.answeredByEmployeeId ??
      row?._server?.value?.answered_by_employee_id ??
      null;
    const name =
      row?.answeredByEmployeeName ??
      row?._server?.value?.answered_by_employee_name ??
      null;
    if (id != null && String(id).trim() !== "") {
      answered_by_employee_id = Number(id);
      answered_by_employee_name = name != null ? String(name) : null;
    }
  }

  if (!answered_by && answered_by_employee_id === undefined) return null;

  const out = {};
  if (answered_by) out.answered_by = answered_by;
  if (answered_by_employee_id !== undefined) {
    out.answered_by_employee_id = answered_by_employee_id;
    out.answered_by_employee_name = answered_by_employee_name;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Builds request body for POST/PUT /checklist-submissions.
 * Include full `question` snapshot on each answer for version drift when forms are edited later.
 */
export function buildSubmissionPayload({
  submissionId,
  checklistFormId,
  localDate,
  questions,
  answersMap,
  resolvedUrlsByKey,
  answeredBy,
  /** Epoch ms when saving (used for `is_late`). */
  nowMs = Date.now(),
}) {
  const answers = [];

  asQuestionArray(questions).forEach((q, idx) => {
    const key = getQuestionKey(q, idx);
    const row = answersMap[key] ?? buildEmptyAnswerRow();
    const urls = resolvedUrlsByKey?.[key] ?? {};

    const media = isMediaQuestion(q);
    const value = {
      boolean:
        q.question_type === "boolean" &&
        (row.boolean === true || row.boolean === false)
          ? row.boolean
          : undefined,
      number:
        q.question_type === "numeric" && row.number !== "" && row.number != null
          ? Number(row.number)
          : q.question_type === "numeric"
            ? null
            : undefined,
      text:
        q.question_type === "text"
          ? row.text || null
          : undefined,
      file_url:
        media &&
        !q.take_image &&
        !q.take_video &&
        !q.record_audio
          ? urls.file ?? (typeof row.file === "string" ? row.file : null)
          : undefined,
      image_url:
        media && q.take_image
          ? urls.image ?? (typeof row.image === "string" ? row.image : null)
          : undefined,
      video_url:
        media && q.take_video
          ? urls.video ?? (typeof row.video === "string" ? row.video : null)
          : undefined,
      audio_url:
        media && q.record_audio
          ? urls.audio ?? (typeof row.audio === "string" ? row.audio : null)
          : undefined,
      comment:
        media && q.allow_comment
          ? row.comment || null
          : undefined,
      date:
        q.question_type === "date" && row.date
          ? row.date instanceof Date
            ? row.date.toISOString()
            : row.date
          : undefined,
      datetime:
        q.question_type === "date_time" && row.datetime
          ? String(row.datetime)
          : undefined,
    };

    Object.keys(value).forEach((k) => {
      if (value[k] === undefined) delete value[k];
    });

    const hasContent = submissionValueHasAnswerContent(q, value);
    const answeredByFields = resolveAnsweredByFieldsForValue(row, answeredBy);
    if (hasContent && answeredByFields) {
      if (answeredByFields.answered_by != null) {
        value.answered_by = answeredByFields.answered_by;
      }
      if (answeredByFields.answered_by_employee_id !== undefined) {
        value.answered_by_employee_id =
          answeredByFields.answered_by_employee_id;
        value.answered_by_employee_name =
          answeredByFields.answered_by_employee_name;
      }
    }

    if (hasContent) {
      const win = getFillWindowState(
        nowMs,
        q.fill_at_from ?? q.fillAtFrom,
        q.fill_at_to ?? q.fillAtTo
      );
      value.is_late = win.status === "after";
    }

    answers.push({
      question_id: q.id ?? null,
      question: snapshotQuestion(q, idx),
      value,
    });
  });

  return {
    id: submissionId ?? undefined,
    checklist_form_id: checklistFormId,
    local_date: localDate,
    answers,
  };
}

export function mapFormFromApiForFill(raw) {
  const mapped = mapChecklistFormFromApi(raw);
  if (!mapped) return null;
  return {
    ...mapped,
    questions: asQuestionArray(mapped.questions).map(
      normalizeChecklistQuestionForFill
    ),
  };
}
