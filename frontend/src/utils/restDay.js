/**
 * Employee `rest_day` / attendance encoding: 1 = Sunday … 7 = Saturday.
 * Same as attendance dashboard `selectedDayOfWeek` (moment Sunday → 1, else day + 1).
 * @param {unknown} restDay
 * @returns {string} Day name, or "" if unset / invalid
 */
export function formatRestDayName(restDay) {
  const n = Number(restDay);
  if (!Number.isFinite(n) || n < 1 || n > 7) return "";
  const dayNames = [
    "",
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return dayNames[n] || "";
}

/** Dropdown options: empty selection = not set (stored as null on save). */
export const REST_DAY_DROPDOWN_OPTIONS = [
  ...[1, 2, 3, 4, 5, 6, 7].map((d) => ({
    value: d,
    label: formatRestDayName(d),
  })),
];
