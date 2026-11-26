/**
 * Shared logic for normalizing values when importing from Excel/CSV.
 * - Numbers (including with commas) stay numbers; Excel serial (epoch) in date range → Date.
 * - Dates: Excel serial 0-59 reverted to number (spurious); string with / or - parsed as dd/mm/yyyy.
 */

const EXCEL_EPOCH_MS = new Date(1899, 11, 30).getTime();
const MS_PER_DAY = 86400 * 1000;

/** String looks like a number (optional minus, digits, optional decimal/exponent) */
const NUMBER_REGEX = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

/** String contains date-like pattern with / or - (e.g. 08/03/2026, 8-3-26) */
const DATE_LIKE_REGEX = /\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}/;

/** Excel serial 0-365: treat as numbers (whole year 1900 often mistaken as dates), not real dates */
const SPURIOUS_SERIAL_MIN = 0;
const SPURIOUS_SERIAL_MAX = 365;

/** Excel serial >= MIN_REAL_SERIAL (366 = 1901-01-01) treated as date when value is number */
const MIN_REAL_DATE_SERIAL = 366;

/**
 * Compute Excel serial (days since 1899-12-30) from a Date.
 */
export function dateToExcelSerial(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return (date.getTime() - EXCEL_EPOCH_MS) / MS_PER_DAY;
}

/**
 * Convert Excel serial number to a Date (for serials that represent real dates).
 */
export function excelSerialToDate(serial) {
  if (typeof serial !== "number" || Number.isNaN(serial)) return null;
  const d = new Date(EXCEL_EPOCH_MS + serial * MS_PER_DAY);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * True if the string looks like a date (contains / or - with digit groups).
 */
export function isDateLikeString(str) {
  if (typeof str !== "string") return false;
  return DATE_LIKE_REGEX.test(str.trim());
}

/**
 * Parse string as number: strip commas and spaces (e.g. "1,234.56" or "1, 234.56"), then parseFloat.
 * Returns number or original value.
 */
export function parseNumberFromString(value) {
  if (value == null || value === "") return value;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return value;
  const cleaned = trimmed.replace(/,/g, "").replace(/\s/g, "");
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? value : num;
}

/**
 * Parse date string as dd/mm/yyyy (or d/m/yy). Handles 08→8 (leading zero stripped), 26→2026.
 * Returns Date or null. Rejects ambiguous values that look like numbers (e.g. "1-2-3", "5-6-7").
 */
function parseDDMMYYYY(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || !DATE_LIKE_REGEX.test(trimmed)) return null;
  const parts = trimmed.split(/[\/\-]/).map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  let day, month, year;
  let [a, b, c] = parts;
  if (a < 10 && b < 10 && c < 10) return null;
  if (a === 0 && b >= 1 && b <= 12) a = 8;
  if (b === 0 && a >= 1 && a <= 12) b = 8;
  if (c < 100) {
    year = c >= 50 ? 1900 + c : 2000 + c;
  } else {
    year = c;
  }
  if (a > 31 || b > 31) return null;
  if (a > 12 && b <= 12) {
    day = a;
    month = b;
  } else if (b > 12 && a <= 12) {
    day = b;
    month = a;
  } else {
    day = a;
    month = b;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  )
    return null;
  return d;
}

/**
 * Parse string as date only if it unambiguously looks like a date (/ or - with dd/mm/yyyy).
 * Never use new Date(trimmed) for short strings that could be numbers (e.g. "1").
 */
export function parseDateFromString(value) {
  const d = parseDDMMYYYY(value);
  if (d != null) return d;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || !DATE_LIKE_REGEX.test(trimmed)) return null;
  if (trimmed.length < 8) return null;
  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * If value is a Date that equals Excel serial 0-365 (number mistaken as date), return that number.
 * Otherwise return the Date unchanged.
 */
export function undoSpuriousDate(value) {
  if (!(value instanceof Date)) return value;
  if (Number.isNaN(value.getTime())) return value;
  const serial = dateToExcelSerial(value);
  if (serial == null) return value;
  const rounded = Math.round(serial);
  if (
    rounded >= SPURIOUS_SERIAL_MIN &&
    rounded <= SPURIOUS_SERIAL_MAX &&
    Math.abs(serial - rounded) < 1e-6
  ) {
    return rounded;
  }
  return value;
}

/**
 * If value is a number that looks like Excel serial date (integer >= MIN_REAL_DATE_SERIAL),
 * convert to Date. Otherwise keep as number (avoids 1-365 being treated as dates).
 */
export function numberToDateIfSerial(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return value;
  if (value % 1 !== 0) return value;
  if (value < MIN_REAL_DATE_SERIAL) return value;
  const d = excelSerialToDate(value);
  return d != null ? d : value;
}

/**
 * Single normalizer for a raw cell value from Excel/CSV:
 * - null/empty → unchanged
 * - Date → undo spurious 0-59 serial (return number), else keep Date
 * - number → if integer >= 366 (Excel serial for real date), convert to Date; else keep number
 * - string → if date-like (/ or -), parse as dd/mm/yyyy; else parse as number (strip commas)
 */
export function normalizeImportValue(value) {
  if (value == null || value === "") return value;

  if (value instanceof Date) {
    return undoSpuriousDate(value);
  }

  if (typeof value === "number") {
    return numberToDateIfSerial(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return value;
    if (!DATE_LIKE_REGEX.test(trimmed)) {
      return parseNumberFromString(value);
    }
    const asDate = parseDateFromString(trimmed);
    if (asDate != null) return asDate;
    return parseNumberFromString(value);
  }

  return value;
}

/** Words in column name/label/key that indicate a date column (case-insensitive) */
const DATE_COLUMN_KEYWORDS = [
  "date",
  "dob",
  "birth",
  "day",
  "created",
  "updated",
  "joined",
  "time",
  "month",
  "year",
];

/**
 * True if the column should be treated as a date column:
 * - targetCol.type === 'date', or
 * - no type and column name/label/key contains date-related text.
 *
 * @param {string} sourceColumnName - File column header that was mapped
 * @param {{ type?: string; key?: string; label?: string }} targetCol - Target column def (optional type, key, label)
 */
export function isDateColumnByName(sourceColumnName, targetCol) {
  if (targetCol?.type === "date") return true;
  const text = [sourceColumnName, targetCol?.key, targetCol?.label]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return DATE_COLUMN_KEYWORDS.some((kw) => text.includes(kw));
}

/**
 * Normalize a cell value based on column type and name.
 * - type 'date' or column has date-related text: apply date + number normalization.
 * - type 'number': parse as number (strip commas).
 * - type 'string': leave as-is.
 * - no type and not date column: leave as-is (no conversion).
 *
 * @param {*} value - Raw cell value
 * @param {{ type?: 'date'|'number'|'string'; key?: string; label?: string }} targetCol - Target column (optional type)
 * @param {string} sourceColumnName - File column header that was mapped
 */
export function normalizeImportValueForColumn(
  value,
  targetCol,
  sourceColumnName
) {
  if (value == null || value === "") return value;
  const type = targetCol?.type?.toLowerCase?.();
  if (type === "number") return parseNumberFromString(value);
  if (type === "string")
    return typeof value === "string" ? value : String(value);
  if (type === "date" || isDateColumnByName(sourceColumnName, targetCol)) {
    return normalizeImportValue(value);
  }
  return value;
}

/**
 * For use in CustomFileUploader parseCellValue: parse a string cell.
 * - If matches NUMBER_REGEX (or with commas stripped), return number.
 * - If matches DATE_LIKE_REGEX (/ or -), parse as dd/mm/yyyy and return Date.
 * - Else return value unchanged.
 */
export function parseStringCell(value) {
  if (value == null || typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/,/g, "").replace(/\s/g, "");
  // If it's a pure integer with leading zeros (e.g. "0123"), keep as string
  if (/^0\d+$/.test(cleaned)) {
    return value;
  }
  if (NUMBER_REGEX.test(cleaned)) {
    const num = parseFloat(cleaned);
    return Number.isNaN(num) ? value : num;
  }
  if (DATE_LIKE_REGEX.test(trimmed)) {
    const d = parseDDMMYYYY(trimmed);
    if (d != null && !Number.isNaN(d.getTime())) return d;
    if (trimmed.length >= 8) {
      const fallback = new Date(trimmed);
      if (!Number.isNaN(fallback.getTime())) return fallback;
    }
  }
  return value;
}
