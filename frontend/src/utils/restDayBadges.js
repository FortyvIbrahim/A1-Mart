import { formatRestDayName } from "@/utils/restDay";

/** Weekday name → Chakra `colorPalette` for AgGrid `badge-column` (matches employees list). */
export const REST_DAY_BADGE_COLOR_BY_NAME = {
  Sunday: "red",
  Monday: "orange",
  Tuesday: "yellow",
  Wednesday: "green",
  Thursday: "teal",
  Friday: "blue",
  Saturday: "purple",
};

/** Sort badge filter / column by weekday order (Sunday first). */
export const REST_DAY_BADGE_SORT_ORDER_BY_NAME = {
  Sunday: 1,
  Monday: 2,
  Tuesday: 3,
  Wednesday: 4,
  Thursday: 5,
  Friday: 6,
  Saturday: 7,
};

/**
 * Value for AgGrid `type: "badge-column"` — same shape as employees list Rest day column.
 * @param {unknown} restDay Employee `rest_day` (1 = Sunday … 7 = Saturday), or 0 / unset.
 * @returns {{ label: string, colorScheme: string, sortOrder: number }}
 */
export function getRestDayBadgeValue(restDay) {
  const label = formatRestDayName(restDay);
  if (!label) {
    return {
      label: "Not set",
      colorScheme: "gray",
      sortOrder: 999,
    };
  }
  return {
    label,
    colorScheme:
      REST_DAY_BADGE_COLOR_BY_NAME[label] || "secondary",
    sortOrder: REST_DAY_BADGE_SORT_ORDER_BY_NAME[label] ?? 999,
  };
}

/**
 * Hex fills for Recharts (aligned with `REST_DAY_BADGE_COLOR_BY_NAME` hues).
 */
export const REST_DAY_PIE_FILL_BY_NAME = {
  Sunday: "#E53E3E",
  Monday: "#DD6B20",
  Tuesday: "#D69E2E",
  Wednesday: "#38A169",
  Thursday: "#319795",
  Friday: "#3182CE",
  Saturday: "#805AD5",
};

export const REST_DAY_PIE_FILL_NOT_SET = "#718096";

/** Pie slice order: 1 = Sunday … 7 = Saturday, then unset. */
const REST_DAY_PIE_KEY_ORDER = [1, 2, 3, 4, 5, 6, 7, "unset"];

/** Short labels on the pie (and list filter chip). */
export const REST_DAY_PIE_SHORT_LABEL = {
  1: "Sun",
  2: "Mon",
  3: "Tue",
  4: "Wed",
  5: "Thu",
  6: "Fri",
  7: "Sat",
  unset: "Unset",
};

/** Long names for tooltips / filter summary. */
export const REST_DAY_PIE_FULL_LABEL = {
  1: "Sunday",
  2: "Monday",
  3: "Tuesday",
  4: "Wednesday",
  5: "Thursday",
  6: "Friday",
  7: "Saturday",
  unset: "Not set",
};

/**
 * Pie chart rows for Recharts: short `name`, `fullName` for tooltip, `restDayKey` for filters (1–7 | "unset").
 * Only categories with count &gt; 0 are returned.
 * @param {Array<{ rest_day?: unknown }>} employees
 * @returns {Array<{ name: string, fullName: string, value: number, color: string, restDayKey: number | "unset" }>}
 */
export function buildRestDayPieChartData(employees) {
  const counts = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    unset: 0,
  };
  for (const e of employees || []) {
    const n = Number(e?.rest_day);
    if (Number.isFinite(n) && n >= 1 && n <= 7) {
      counts[n] += 1;
    } else {
      counts.unset += 1;
    }
  }
  return REST_DAY_PIE_KEY_ORDER.filter((k) => counts[k] > 0).map((k) => {
    const fullName = REST_DAY_PIE_FULL_LABEL[k];
    return {
      name: REST_DAY_PIE_SHORT_LABEL[k],
      fullName,
      value: counts[k],
      restDayKey: k,
      color:
        k === "unset"
          ? REST_DAY_PIE_FILL_NOT_SET
          : REST_DAY_PIE_FILL_BY_NAME[fullName] || REST_DAY_PIE_FILL_NOT_SET,
    };
  });
}
