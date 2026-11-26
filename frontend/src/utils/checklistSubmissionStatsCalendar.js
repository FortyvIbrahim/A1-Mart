import moment from "moment";

/** Backend `submissions` keys use `DD/MM/YYYY` (local_date). */
export function submissionStatsKeyForYmd(ymd) {
  const m = moment(ymd, "YYYY-MM-DD", true);
  return m.isValid() ? m.format("DD/MM/YYYY") : null;
}

export function ymdFromParts(year, monthIndex0, dayOfMonth) {
  return moment({ year, month: monthIndex0, day: dayOfMonth }).format(
    "YYYY-MM-DD"
  );
}

export function daysInMonth(year, monthIndex0) {
  return moment({ year, month: monthIndex0 }).daysInMonth();
}

/** Form exists on this calendar day (uses API `created_at`). */
export function formCreatedOnOrBeforeDate(form, ymd) {
  const raw = form?.created_at ?? form?.createdAt;
  if (raw == null || raw === "") return true;
  const c = moment(raw);
  if (!c.isValid()) return true;
  const day = moment(ymd, "YYYY-MM-DD", true);
  if (!day.isValid()) return false;
  return !c.clone().startOf("day").isAfter(day, "day");
}

/**
 * Raw API value for a date key: one object (branch-scoped token) or an array
 * of per-branch rows (`access_all_branches`).
 */
export function submissionStatsEntriesForFormDate(form, ymd) {
  const key = submissionStatsKeyForYmd(ymd);
  if (!key) return [];
  const raw = form?.submissions?.[key];
  if (raw == null) return [];
  return Array.isArray(raw) ? raw : [raw];
}

/**
 * Combined submission stats for that calendar day (sums all branches when API returns an array).
 * Returns a single object for table cells, pie aggregation, etc.
 */
export function submissionStatForFormDate(form, ymd) {
  const entries = submissionStatsEntriesForFormDate(form, ymd);
  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0];

  let answered = 0;
  let late = 0;
  let totalQuestions = 0;
  let latestTs = null;

  for (const e of entries) {
    const ans = Number(e.answered ?? 0);
    const lateRaw = Number(e.late ?? 0);
    const lateRow = Math.min(Math.max(0, lateRaw), ans);
    answered += ans;
    late += lateRow;
    totalQuestions += Number(
      e.total_questions ?? form?.questions_count ?? 0
    );
    for (const t of [e.updated_at, e.created_at, e.updatedAt, e.createdAt]) {
      if (t == null || t === "") continue;
      const m = moment(t);
      if (!m.isValid()) continue;
      if (!latestTs || m.isAfter(latestTs)) latestTs = m;
    }
  }
  return {
    ...entries[0],
    branch_id: null,
    branch_name: null,
    answered,
    late,
    total_questions: totalQuestions,
    created_at: latestTs ? latestTs.toISOString() : entries[0].created_at,
    updated_at: latestTs ? latestTs.toISOString() : entries[0].updated_at,
  };
}

/** Calendar day is strictly after today (local). */
export function isCalendarFutureDate(ymd, now = moment()) {
  const day = moment(ymd, "YYYY-MM-DD", true).startOf("day");
  if (!day.isValid()) return false;
  return day.isAfter(now.clone().startOf("day"), "day");
}

/**
 * Green threshold: form has no questions, or submission stats show at least one
 * filled answer (`answered >= 1`).
 */
export function isFormHasAtLeastOneAnswerForDate(form, ymd) {
  const qc = Number(form?.questions_count ?? 0);
  if (qc <= 0) return true;
  const stat = submissionStatForFormDate(form, ymd);
  if (!stat) return false;
  return Number(stat.answered ?? 0) >= 1;
}

/**
 * Map `YYYY-MM-DD` → calendar cell tone + tooltip (eligible forms from `created_at`).
 * Future dates are gray; green when every eligible form has ≥1 answer (or zero questions).
 */
export function buildChecklistCalendarDayOverrides(forms, year, monthIndex0) {
  const list = Array.isArray(forms) ? forms : [];
  const dim = daysInMonth(year, monthIndex0);
  const today = moment();
  /** @type {Record<string, { tone: "green" | "yellow" | "gray"; tooltip: string }>} */
  const out = {};
  for (let d = 1; d <= dim; d++) {
    const ymd = ymdFromParts(year, monthIndex0, d);
    const label = moment(ymd, "YYYY-MM-DD").format("DD/MM/YYYY");
    if (isCalendarFutureDate(ymd, today)) {
      out[ymd] = {
        tone: "gray",
        tooltip: `${label} — Future date`,
      };
      continue;
    }
    const eligible = list.filter((f) => formCreatedOnOrBeforeDate(f, ymd));
    if (eligible.length === 0) {
      out[ymd] = {
        tone: "gray",
        tooltip: `${label} — No forms existed yet`,
      };
      continue;
    }
    const nOk = eligible.filter((f) =>
      isFormHasAtLeastOneAnswerForDate(f, ymd)
    ).length;
    if (nOk === eligible.length) {
      out[ymd] = {
        tone: "green",
        tooltip: `${label} — All ${eligible.length} form(s) have at least one answer`,
      };
    } else {
      const gaps = eligible.length - nOk;
      out[ymd] = {
        tone: "yellow",
        tooltip: `${label} — ${gaps} form(s) with no answers yet`,
      };
    }
  }
  return out;
}

/**
 * For CalendarDots: one `{ date: YYYY-MM-DD }` per day in the month where any form
 * has stats on that day (tooltip = number of forms with a submission row).
 */
export function aggregateSubmissionRecordsForMonth(forms, year, monthIndex0) {
  const list = Array.isArray(forms) ? forms : [];
  const dim = daysInMonth(year, monthIndex0);
  const records = [];
  for (let d = 1; d <= dim; d++) {
    const ymd = ymdFromParts(year, monthIndex0, d);
    const key = submissionStatsKeyForYmd(ymd);
    if (!key) continue;
    for (const f of list) {
      if (f?.submissions?.[key]) records.push({ date: ymd });
    }
  }
  return records;
}

/**
 * @param {Record<string, { answered?: number, total_questions?: number, late?: number }>} submissions
 * @param {boolean} showAllDays
 * @returns {{ day: number, ymd: string, statsKey: string, stat: object | null, complete: boolean }[]}
 */
export function buildMonthDayCells(year, monthIndex0, submissions, showAllDays) {
  const subs = submissions && typeof submissions === "object" ? submissions : {};
  const dim = daysInMonth(year, monthIndex0);
  const out = [];
  for (let d = 1; d <= dim; d++) {
    const ymd = ymdFromParts(year, monthIndex0, d);
    const statsKey = submissionStatsKeyForYmd(ymd);
    const raw = statsKey ? subs[statsKey] : null;
    const entries =
      raw == null ? [] : Array.isArray(raw) ? raw : [raw];
    const stat =
      entries.length === 0
        ? null
        : entries.length === 1
          ? entries[0]
          : submissionStatForFormDate({ submissions: { [statsKey]: raw } }, ymd);
    if (!showAllDays && !stat) continue;
    const total = stat?.total_questions ?? 0;
    const answered = stat?.answered ?? 0;
    const complete =
      Boolean(stat) && total > 0 && answered >= total;
    out.push({ day: d, ymd, statsKey, stat, complete });
  }
  return out;
}
