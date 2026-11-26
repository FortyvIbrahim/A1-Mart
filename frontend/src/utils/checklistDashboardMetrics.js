import moment from "moment";
import {
  formCreatedOnOrBeforeDate,
  submissionStatForFormDate,
  submissionStatsEntriesForFormDate,
} from "@/utils/checklistSubmissionStatsCalendar";
import {
  submissionAnswerIsLate,
  submissionValueHasAnswerContent,
} from "@/utils/checklistSubmissionPayload";

/** Inclusive YYYY-MM-DD range; swaps if from > to. */
export function normalizeChecklistDateRange(fromYmd, toYmd) {
  const a = moment(fromYmd, "YYYY-MM-DD", true);
  const b = moment(toYmd, "YYYY-MM-DD", true);
  if (!a.isValid() || !b.isValid()) return { start: fromYmd, end: toYmd };
  if (a.isAfter(b, "day")) return { start: b.format("YYYY-MM-DD"), end: a.format("YYYY-MM-DD") };
  return { start: a.format("YYYY-MM-DD"), end: b.format("YYYY-MM-DD") };
}

export function eachDayInclusiveYmd(startYmd, endYmd) {
  const { start, end } = normalizeChecklistDateRange(startYmd, endYmd);
  const s = moment(start, "YYYY-MM-DD", true);
  const e = moment(end, "YYYY-MM-DD", true);
  if (!s.isValid() || !e.isValid()) return [];
  const out = [];
  const cur = s.clone();
  while (cur.isSameOrBefore(e, "day")) {
    out.push(cur.format("YYYY-MM-DD"));
    cur.add(1, "day");
  }
  return out;
}

/**
 * Sum on-time answered, late answered, and pending slots across every eligible
 * form × day in range. `late` per stat is capped by `answered`. Skips future days.
 *
 * When `branchCatalog` is non-empty, counts **per branch** (missing branch row =
 * zero answers, full question count pending). Otherwise uses aggregated stats
 * per form × day (legacy).
 *
 * @param {{ id: number, name?: string }[] | null | undefined} [branchCatalog]
 * @param {Array<number|string>|null|undefined} [branchIdsFilter] When set and non-empty, only these branch ids are counted (catalog mode or per-entry legacy). Omit or empty = all branches.
 */
export function aggregateAnsweredAndPendingAcrossRange(
  forms,
  fromYmd,
  toYmd,
  options = {}
) {
  const { branchCatalog = null, branchIdsFilter = null, now = moment() } =
    options;
  const list = Array.isArray(forms) ? forms : [];
  let onTimeAnsweredTotal = 0;
  let lateAnsweredTotal = 0;
  let pendingTotal = 0;
  const todayStart = now.clone().startOf("day");
  const catalog =
    Array.isArray(branchCatalog) && branchCatalog.length > 0
      ? branchCatalog
      : null;
  const branchIdAllow =
    Array.isArray(branchIdsFilter) && branchIdsFilter.length > 0
      ? new Set(branchIdsFilter.map((id) => String(id)))
      : null;

  for (const ymd of eachDayInclusiveYmd(fromYmd, toYmd)) {
    if (moment(ymd, "YYYY-MM-DD", true).isAfter(todayStart, "day")) continue;
    for (const form of list) {
      if (!formCreatedOnOrBeforeDate(form, ymd)) continue;

      if (catalog) {
        const entries = submissionStatsEntriesForFormDate(form, ymd);
        const qc = Number(form?.questions_count ?? 0);
        for (const br of catalog) {
          if (branchIdAllow && !branchIdAllow.has(String(br.id))) continue;
          const entry = entries.find(
            (e) => Number(e?.branch_id) === Number(br.id)
          );
          const cap =
            entry?.total_questions != null
              ? Number(entry.total_questions)
              : qc;
          const ans = entry != null ? Number(entry.answered ?? 0) : 0;
          const lateRaw = entry != null ? Number(entry.late ?? 0) : 0;
          const late = Math.min(Math.max(0, lateRaw), ans);
          onTimeAnsweredTotal += ans - late;
          lateAnsweredTotal += late;
          pendingTotal += Math.max(0, cap - ans);
        }
        continue;
      }

      if (branchIdAllow) {
        const entries = submissionStatsEntriesForFormDate(form, ymd);
        for (const entry of entries) {
          const bid = entry?.branch_id;
          if (bid == null || bid === "" || !branchIdAllow.has(String(bid))) {
            continue;
          }
          const cap =
            entry?.total_questions != null
              ? Number(entry.total_questions)
              : Number(form?.questions_count ?? 0);
          const ans = Number(entry?.answered ?? 0);
          const lateRaw = Number(entry?.late ?? 0);
          const late = Math.min(Math.max(0, lateRaw), ans);
          onTimeAnsweredTotal += ans - late;
          lateAnsweredTotal += late;
          pendingTotal += Math.max(0, cap - ans);
        }
        continue;
      }

      const stat = submissionStatForFormDate(form, ymd);
      const cap =
        stat?.total_questions != null
          ? Number(stat.total_questions)
          : Number(form?.questions_count ?? 0);
      const ans = stat != null ? Number(stat.answered ?? 0) : 0;
      const lateRaw = stat != null ? Number(stat.late ?? 0) : 0;
      const late = Math.min(Math.max(0, lateRaw), ans);
      onTimeAnsweredTotal += ans - late;
      lateAnsweredTotal += late;
      pendingTotal += Math.max(0, cap - ans);
    }
  }
  return { onTimeAnsweredTotal, lateAnsweredTotal, pendingTotal };
}

/**
 * Per-person stacked counts: on-time vs late answered questions (real answer content).
 * Each answer row should include `_answerYmd` (YYYY-MM-DD) for `submissionAnswerIsLate`.
 *
 * @param {Array} apiAnswers
 * @param {{ employeeByCode?: Map<string, { employee_name?: string }> }} [options]
 */
export function aggregateContributorsStackedAnswerCounts(apiAnswers, options = {}) {
  const { employeeByCode } = options;
  const byKey = new Map();
  for (const row of apiAnswers ?? []) {
    const q = row?.question_snapshot || row?.question;
    const val = row?.value;
    if (!q || !submissionValueHasAnswerContent(q, val)) continue;
    const v = val && typeof val === "object" ? val : {};
    const code = (v.answered_by ?? v.answered_by_employee_code ?? "")
      .toString()
      .trim();
    const id = v.answered_by_employee_id;
    const ename = (v.answered_by_employee_name ?? "").toString().trim();

    let key;
    if (code) key = `c:${code}`;
    else if (id != null && String(id).trim() !== "") key = `i:${id}`;
    else if (ename) key = `n:${ename}`;
    else key = "unknown";

    const fallbackLabel =
      ename ||
      (code ? code : id != null ? `Employee #${id}` : "Unknown");

    const ymd = row._answerYmd;
    const late =
      ymd != null && String(ymd).trim() !== ""
        ? submissionAnswerIsLate(row, ymd)
        : false;

    const prev = byKey.get(key);
    if (prev) {
      if (late) prev.late += 1;
      else prev.onTime += 1;
      if (ename) prev.fallbackLabel = fallbackLabel;
    } else {
      byKey.set(key, {
        employeeCode: code || null,
        onTime: late ? 0 : 1,
        late: late ? 1 : 0,
        fallbackLabel,
      });
    }
  }

  const rows = Array.from(byKey.values())
    .map((bucket) => {
      const fromDirectory =
        bucket.employeeCode &&
        employeeByCode?.get(bucket.employeeCode)?.employee_name != null
          ? String(
              employeeByCode.get(bucket.employeeCode).employee_name
            ).trim()
          : "";
      const name = fromDirectory || bucket.fallbackLabel;
      const onTime = bucket.onTime;
      const late = bucket.late;
      const total = onTime + late;
      return { name, onTime, late, total };
    })
    .sort((a, b) => b.total - a.total);
  return rows;
}

/**
 * Per-branch stacked counts (on-time, late, pending question slots) for one form
 * over an inclusive date range, using submission stats (`branch_id` / `branch_name` per row).
 *
 * @param {object} [options]
 * @param {import("moment").Moment} [options.now]
 * @param {Array<number|string>|null|undefined} [options.branchIdsFilter] Non-empty = only these branches.
 */
export function aggregateBranchStackedSlotsForFormRange(
  form,
  fromYmd,
  toYmd,
  optionsOrNow = moment()
) {
  const opts =
    optionsOrNow != null &&
    typeof optionsOrNow === "object" &&
    !moment.isMoment(optionsOrNow)
      ? optionsOrNow
      : { now: optionsOrNow };
  const now = opts.now ?? moment();
  const branchIdsFilter = opts.branchIdsFilter;
  const branchIdAllow =
    Array.isArray(branchIdsFilter) && branchIdsFilter.length > 0
      ? new Set(branchIdsFilter.map((id) => String(id)))
      : null;

  if (!form) return [];
  const todayStart = now.clone().startOf("day");
  const byKey = new Map();

  for (const ymd of eachDayInclusiveYmd(fromYmd, toYmd)) {
    if (moment(ymd, "YYYY-MM-DD", true).isAfter(todayStart, "day")) continue;
    if (!formCreatedOnOrBeforeDate(form, ymd)) continue;
    const entries = submissionStatsEntriesForFormDate(form, ymd);
    for (const stat of entries) {
      const bidRaw = stat?.branch_id;
      const bid =
        bidRaw != null && bidRaw !== "" ? Number(bidRaw) : null;
      if (branchIdAllow) {
        if (bid == null || Number.isNaN(bid) || !branchIdAllow.has(String(bid))) {
          continue;
        }
      }
      const bname = (stat?.branch_name ?? "").toString().trim();
      const key =
        bid != null && !Number.isNaN(bid) ? `id:${bid}` : `n:${bname || "—"}`;
      const cap =
        stat?.total_questions != null
          ? Number(stat.total_questions)
          : Number(form?.questions_count ?? 0);
      const ans = Number(stat?.answered ?? 0);
      const lateRaw = Number(stat?.late ?? 0);
      const late = Math.min(Math.max(0, lateRaw), ans);
      const onTime = ans - late;
      const pending = Math.max(0, cap - ans);

      const label =
        bname ||
        (bid != null && !Number.isNaN(bid) ? `Branch #${bid}` : "Unknown branch");

      const prev = byKey.get(key);
      if (prev) {
        prev.onTime += onTime;
        prev.late += late;
        prev.pending += pending;
        if (bname) prev.name = label;
      } else {
        byKey.set(key, {
          name: label,
          branchId: bid != null && !Number.isNaN(bid) ? bid : null,
          onTime,
          late,
          pending,
        });
      }
    }
  }

  return Array.from(byKey.values())
    .map((r) => {
      const totalSlots = r.onTime + r.late + r.pending;
      const completionPct =
        totalSlots > 0
          ? Math.round(((r.onTime + r.late) / totalSlots) * 100)
          : 0;
      return {
        ...r,
        totalSlots,
        completionPct,
        stackLabel: totalSlots > 0 ? `${completionPct}%` : "",
      };
    })
    .sort((a, b) => b.onTime + b.late - (a.onTime + a.late));
}
