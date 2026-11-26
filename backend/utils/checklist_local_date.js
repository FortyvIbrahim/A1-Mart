/**
 * Normalize values from MySQL DATE / API strings to `YYYY-MM-DD` for comparison and JSON.
 * Drivers often return JS `Date` (UTC midnight); clients send `"YYYY-MM-DD"`.
 */
function formatUtcYmd(d) {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function toCalendarDateString(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const t = value.trim();
    const m = t.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) return formatUtcYmd(d);
    return null;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return formatUtcYmd(value);
  }
  return null;
}

module.exports = { toCalendarDateString };
