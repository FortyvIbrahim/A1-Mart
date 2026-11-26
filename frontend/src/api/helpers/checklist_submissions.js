import axiosInstance from "..";
import { countAnsweredAndLateFromSubmissionAnswers } from "@/utils/checklistSubmissionPayload";

/**
 * GET /checklist-submissions returns one object (branch-scoped) or an array (access_all_branches).
 * Pick the row for the user's branch when possible.
 */
export function pickChecklistSubmissionFromGetData(data, userBranchId) {
  if (data == null) return null;
  if (!Array.isArray(data)) return data;
  if (userBranchId != null && userBranchId !== "") {
    const n = Number(userBranchId);
    if (!Number.isNaN(n)) {
      const found = data.find((s) => Number(s?.branch_id) === n);
      if (found) return found;
    }
  }
  return data[0] ?? null;
}

/**
 * Shared submission for a form + calendar day (local_date).
 * See docs/checklist-fill-submissions-api.md — aligned with backend
 * `a1-store-backend/docs/checklist-fill-submissions-api.md`.
 */
export function getChecklistSubmission(checklistFormId, localDate) {
  return axiosInstance
    .get("/checklist-submissions", {
      params: {
        checklist_form_id: checklistFormId,
        local_date: localDate,
      },
    })
    .then((r) => r.data);
}

export function getChecklistSubmissionById(submissionId) {
  return axiosInstance
    .get(`/checklist-submissions/${submissionId}`)
    .then((r) => r.data);
}

/**
 * Answered + late counts for a form’s submission on `localDate` (same rules as fill page).
 * Uses list GET first; if answers are missing, fetches GET /checklist-submissions/:id.
 */
export async function getTodaySubmissionListingProgress(
  checklistFormId,
  localDate,
  userBranchId
) {
  const res = await getChecklistSubmission(checklistFormId, localDate);
  if (res.code !== 200 || res.data == null) {
    return { answeredCount: 0, lateCount: 0 };
  }
  const row = pickChecklistSubmissionFromGetData(res.data, userBranchId);
  if (!row) {
    return { answeredCount: 0, lateCount: 0 };
  }
  let answers = row.answers;
  if (
    row.id &&
    (!Array.isArray(answers) || answers.length === 0)
  ) {
    const detail = await getChecklistSubmissionById(row.id);
    if (detail.code === 200 && detail.data?.answers) {
      answers = detail.data.answers;
    }
  }
  return countAnsweredAndLateFromSubmissionAnswers(answers ?? [], localDate);
}

function submissionWriteBody(payload) {
  const { checklist_form_id, local_date, answers } = payload;
  return { checklist_form_id, local_date, answers };
}

/**
 * POST when no submission id yet; PUT when updating. Backend may return **409** on POST if a row
 * already exists (race) — we then GET the id and **PUT** once.
 */
export function upsertChecklistSubmission(payload, options = {}) {
  const { userBranchId } = options;
  const { id, checklist_form_id, local_date } = payload;
  const body = submissionWriteBody(payload);

  if (id) {
    return axiosInstance
      .put(`/checklist-submissions/${id}`, body)
      .then((r) => r.data);
  }

  return axiosInstance
    .post("/checklist-submissions", body)
    .then(async (r) => {
      const res = r.data;
      if (res.code === 409) {
        const existing = await getChecklistSubmission(
          checklist_form_id,
          local_date
        );
        const row = pickChecklistSubmissionFromGetData(
          existing.data,
          userBranchId
        );
        if (existing.code === 200 && row?.id) {
          return axiosInstance
            .put(`/checklist-submissions/${row.id}`, body)
            .then((inner) => inner.data);
        }
      }
      return res;
    });
}

/** Success codes from POST (201) / PUT (200) per backend contract. */
export function isChecklistSubmissionSaveSuccess(res) {
  return res && (res.code === 200 || res.code === 201);
}
