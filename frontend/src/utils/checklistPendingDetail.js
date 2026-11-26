import {
  getChecklistFormById,
  getChecklistFormsWithSubmissionAnswers,
} from "@/api/helpers/checklist_forms";
import { eachDayInclusiveYmd } from "@/utils/checklistDashboardMetrics";
import {
  formCreatedOnOrBeforeDate,
  submissionStatsEntriesForFormDate,
  submissionStatsKeyForYmd,
} from "@/utils/checklistSubmissionStatsCalendar";
import {
  asAnswerArray,
  mapFormFromApiForFill,
  submissionValueHasAnswerContent,
} from "@/utils/checklistSubmissionPayload";
import moment from "moment";

function branchLabelFromEntry(entry) {
  if (!entry) return "-";
  const n = (entry.branch_name ?? "").toString().trim();
  if (n) return n;
  const id = entry.branch_id;
  if (id != null && id !== "") return `Branch #${id}`;
  return "-";
}

function branchLabelFromCatalog(br) {
  if (!br) return "-";
  if (br.name) return br.name;
  return `Branch #${br.id}`;
}

function pickAnswersForBranch(answersForm, statsKey, branchId) {
  if (!answersForm) return [];
  const raw = answersForm.submissions?.[statsKey];
  const subs = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
  if (subs.length === 0) return [];
  if (branchId != null && branchId !== "") {
    const n = Number(branchId);
    const sub = subs.find((s) => Number(s?.branch_id) === n);
    return asAnswerArray(sub?.answers);
  }
  return asAnswerArray(subs[0]?.answers);
}

function filterPendingQuestions(canonicalQs, answers) {
  const answered = new Set();
  for (const row of answers) {
    const q = row?.question_snapshot || row?.question;
    const val = row?.value;
    if (!q || !submissionValueHasAnswerContent(q, val)) continue;
    const id = q.id ?? row.question_id;
    if (id != null && !Number.isNaN(Number(id))) answered.add(Number(id));
  }
  return canonicalQs.filter(
    (q) =>
      q?.id == null ||
      Number.isNaN(Number(q.id)) ||
      !answered.has(Number(q.id))
  );
}

function questionDisplayLabel(q) {
  const t = (q?.title ?? q?.question ?? "").toString().trim();
  if (t) return t;
  const so = q?.sort_order;
  if (so != null && String(so).trim() !== "") return `Question (order ${so})`;
  return "Question";
}

/** Human-readable fill window from question; `null` when no window configured. */
export function formatChecklistQuestionTimeframe(q) {
  const from = q?.fill_at_from ?? q?.fillAtFrom ?? null;
  const to = q?.fill_at_to ?? q?.fillAtTo ?? null;
  const fs = from != null ? String(from).trim() : "";
  const ts = to != null ? String(to).trim() : "";
  if (!fs && !ts) return null;
  if (fs && ts) return `${fs} - ${ts}`;
  if (fs) return fs;
  return ts;
}

/**
 * One section per (form × branch × calendar day) in range: pending questions for
 * that day only. When `branchCatalog` is set, every catalog branch is evaluated;
 * no submission row => all questions pending that day for that branch.
 *
 * @param {{ id: number, name?: string }[]} [branchCatalog]
 */
export async function loadChecklistPendingDetailRows(
  statsForms,
  fromYmd,
  toYmd,
  branchCatalog = []
) {
  const res = await getChecklistFormsWithSubmissionAnswers();
  if (res.code !== 200) {
    return {
      ok: false,
      message: res.message || "Failed to load submissions",
      sections: [],
    };
  }

  const answersForms = Array.isArray(res.data) ? res.data : [];
  const answersById = new Map(answersForms.map((f) => [Number(f.id), f]));
  const questionsById = new Map();
  const todayStart = moment().startOf("day");
  const catalog =
    Array.isArray(branchCatalog) && branchCatalog.length > 0
      ? branchCatalog
      : null;

  async function ensureQuestions(formId) {
    if (questionsById.has(formId)) return questionsById.get(formId);
    const af = answersById.get(formId);
    const rawQs = Array.isArray(af?.questions) ? af.questions : [];
    let qs = [];
    if (rawQs.length > 0) {
      const mapped = mapFormFromApiForFill({ ...af, questions: rawQs });
      qs = [...(mapped?.questions ?? [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      );
    } else {
      const fr = await getChecklistFormById(formId);
      if (fr.code === 200 && fr.data) {
        const mapped = mapFormFromApiForFill(fr.data);
        qs = [...(mapped?.questions ?? [])].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        );
      }
    }
    questionsById.set(formId, qs);
    return qs;
  }

  /** @type {Map<string, { formId: number, formTitle: string, branchId: number|string, branchLabel: string, responseYmd: string, questions: { question: string, timeframe: string|null }[] }>} */
  const acc = new Map();

  function addPendingForDay(
    ymd,
    fid,
    ftitle,
    branchId,
    branchLabel,
    pendingQs
  ) {
    if (!pendingQs.length) return;
    const k = `${fid}-${branchId}-${ymd}`;
    const sorted = [...pendingQs].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
    acc.set(k, {
      formId: fid,
      formTitle: ftitle,
      branchId,
      branchLabel,
      responseYmd: ymd,
      questions: sorted.map((q) => ({
        question: questionDisplayLabel(q),
        timeframe: formatChecklistQuestionTimeframe(q),
      })),
    });
  }

  const list = Array.isArray(statsForms) ? statsForms : [];

  for (const ymd of eachDayInclusiveYmd(fromYmd, toYmd)) {
    if (moment(ymd, "YYYY-MM-DD", true).isAfter(todayStart, "day")) continue;
    const statsKey = submissionStatsKeyForYmd(ymd);
    if (!statsKey) continue;

    const dayForms = list
      .filter((f) => formCreatedOnOrBeforeDate(f, ymd))
      .slice()
      .sort((a, b) =>
        String(a.title ?? "").localeCompare(String(b.title ?? ""))
      );

    for (const form of dayForms) {
      const fid = Number(form.id);
      if (Number.isNaN(fid)) continue;
      const answersForm = answersById.get(fid);
      const entries = submissionStatsEntriesForFormDate(form, ymd);
      const qs = await ensureQuestions(fid);
      if (qs.length === 0) continue;
      const ftitle = form.title ?? `Form ${fid}`;

      if (catalog) {
        for (const br of catalog) {
          const subAnswers = pickAnswersForBranch(
            answersForm,
            statsKey,
            br.id
          );
          const pending = filterPendingQuestions(qs, subAnswers);
          if (pending.length === 0) continue;
          addPendingForDay(
            ymd,
            fid,
            ftitle,
            br.id,
            branchLabelFromCatalog(br),
            pending
          );
        }
        continue;
      }

      if (entries.length === 0) {
        addPendingForDay(ymd, fid, ftitle, "none", "-", qs);
        continue;
      }

      for (const entry of entries) {
        const subAnswers = pickAnswersForBranch(
          answersForm,
          statsKey,
          entry.branch_id
        );
        const pending = filterPendingQuestions(qs, subAnswers);
        if (pending.length === 0) continue;
        addPendingForDay(
          ymd,
          fid,
          ftitle,
          entry.branch_id ?? "x",
          branchLabelFromEntry(entry),
          pending
        );
      }
    }
  }

  const sections = Array.from(acc.values())
    .map((sec) => ({
      sectionKey: `${sec.formId}-${sec.branchId}-${sec.responseYmd}`,
      formId: sec.formId,
      formTitle: sec.formTitle,
      branchId: sec.branchId,
      branchLabel: sec.branchLabel,
      responseYmd: sec.responseYmd,
      questions: sec.questions,
    }))
    .filter((s) => s.questions.length > 0)
    .sort((a, b) => {
      const d = String(a.responseYmd ?? "").localeCompare(
        String(b.responseYmd ?? "")
      );
      if (d !== 0) return d;
      const t = String(a.formTitle ?? "").localeCompare(
        String(b.formTitle ?? "")
      );
      if (t !== 0) return t;
      return String(a.branchLabel ?? "").localeCompare(
        String(b.branchLabel ?? "")
      );
    });

  return { ok: true, sections };
}

/** When `branchIdsFilter` is null/undefined/empty, returns all sections. Otherwise keeps sections whose `branchId` is in the filter (string-normalized). */
export function filterPendingSectionsByBranchIds(sections, branchIdsFilter) {
  const allow =
    Array.isArray(branchIdsFilter) && branchIdsFilter.length > 0
      ? new Set(branchIdsFilter.map((id) => String(id)))
      : null;
  if (!allow) return Array.isArray(sections) ? sections : [];
  return (sections ?? []).filter((s) => allow.has(String(s.branchId)));
}
