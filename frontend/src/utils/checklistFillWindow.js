import moment from "moment";

/**
 * Interprets "HH:mm" (from checklist question) as a moment on today's calendar date (local).
 */
export function todayMomentWithTime(hhmm) {
  if (hhmm == null || String(hhmm).trim() === "") return null;
  const m = moment(String(hhmm).trim(), ["HH:mm", "H:mm"], true);
  if (!m.isValid()) return null;
  return moment().startOf("day").hour(m.hour()).minute(m.minute()).second(0).millisecond(0);
}

/**
 * Fill-at window for a single calendar day (local timezone).
 * @returns {{ status: 'open'|'before'|'after'|'all_day', msUntilOpen: number|null, msUntilClose: number|null, windowEnd: Date|null }}
 */
export function getFillWindowState(now, fillAtFrom, fillAtTo) {
  const fromM = todayMomentWithTime(fillAtFrom);
  const toM = todayMomentWithTime(fillAtTo);

  if (!fromM && !toM) {
    return {
      status: "all_day",
      msUntilOpen: 0,
      msUntilClose: null,
      windowEnd: null,
    };
  }

  let start = fromM ? fromM.clone() : moment().startOf("day");
  let end = toM ? toM.clone() : moment().endOf("day");

  if (fromM && toM && end.isBefore(start)) {
    end = end.add(1, "day");
  }

  const n = moment(now);
  if (n.isBefore(start)) {
    return {
      status: "before",
      msUntilOpen: start.diff(n),
      msUntilClose: end.diff(n),
      windowEnd: end.toDate(),
    };
  }
  if (n.isAfter(end)) {
    return {
      status: "after",
      msUntilOpen: null,
      msUntilClose: null,
      windowEnd: end.toDate(),
    };
  }
  return {
    status: "open",
    msUntilOpen: 0,
    msUntilClose: end.diff(n),
    windowEnd: end.toDate(),
  };
}

/**
 * Interprets "HH:mm" on a specific calendar day (`YYYY-MM-DD`, local).
 */
export function momentWithTimeOnLocalDate(localDateStr, hhmm) {
  if (hhmm == null || String(hhmm).trim() === "") return null;
  const t = moment(String(hhmm).trim(), ["HH:mm", "H:mm"], true);
  if (!t.isValid()) return null;
  const d = moment(String(localDateStr).trim(), "YYYY-MM-DD", true);
  if (!d.isValid()) return null;
  return d
    .startOf("day")
    .hour(t.hour())
    .minute(t.minute())
    .second(0)
    .millisecond(0);
}

/**
 * Fill-at window for a given submission calendar day (e.g. when scoring whether an answer was late).
 * Same status semantics as {@link getFillWindowState}.
 */
export function getFillWindowStateForLocalDate(
  localDateStr,
  instant,
  fillAtFrom,
  fillAtTo
) {
  const fromM = momentWithTimeOnLocalDate(localDateStr, fillAtFrom);
  const toM = momentWithTimeOnLocalDate(localDateStr, fillAtTo);
  const day = moment(String(localDateStr).trim(), "YYYY-MM-DD", true);
  const dayStart = day.clone().startOf("day");
  const dayEnd = day.clone().endOf("day");

  if (!fromM && !toM) {
    return {
      status: "all_day",
      msUntilOpen: 0,
      msUntilClose: null,
      windowEnd: null,
    };
  }

  let start = fromM ? fromM.clone() : dayStart.clone();
  let end = toM ? toM.clone() : dayEnd.clone();

  if (fromM && toM && end.isBefore(start)) {
    end = end.add(1, "day");
  }

  const n = moment(instant);
  if (n.isBefore(start)) {
    return {
      status: "before",
      msUntilOpen: start.diff(n),
      msUntilClose: end.diff(n),
      windowEnd: end.toDate(),
    };
  }
  if (n.isAfter(end)) {
    return {
      status: "after",
      msUntilOpen: null,
      msUntilClose: null,
      windowEnd: end.toDate(),
    };
  }
  return {
    status: "open",
    msUntilOpen: 0,
    msUntilClose: end.diff(n),
    windowEnd: end.toDate(),
  };
}

export function formatCountdown(ms) {
  if (ms == null || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
