import { capitalizeWordsLatest } from "./string";

/** Normalized category name → Chakra `colorPalette` for AgGrid `badge-column`. */
export const EMPLOYEE_CATEGORY_BADGE_COLOR = {
  employees: "purple",
  "admin excutive": "pink",
  administrator: "cyan",
};

/**
 * Resolve employee_category from a payroll/employee row.
 * @param {object | null | undefined} row
 * @param {Record<string, object>} [mappedEmployees]
 * @returns {string | null}
 */
export function getEmployeeCategoryFromRow(row, mappedEmployees = {}) {
  const category =
    row?.employee_category ??
    row?.employee?.employee_category ??
    mappedEmployees[row?.employee_code]?.employee_category;

  if (category == null || String(category).trim() === "") return null;
  return String(category).trim();
}

/**
 * Value for AgGrid `type: "badge-column"` — employee_category from Digisme CategoryName.
 * @param {unknown} employeeCategory
 * @returns {{ label: string, colorScheme: string }}
 */
export function getEmployeeCategoryBadgeValue(employeeCategory) {
  const label =
    employeeCategory != null && String(employeeCategory).trim() !== ""
      ? String(employeeCategory).trim()
      : null;

  if (!label) {
    return {
      label: "Not set",
      colorScheme: "gray",
    };
  }

  return {
    label: capitalizeWordsLatest(label),
    colorScheme:
      EMPLOYEE_CATEGORY_BADGE_COLOR[label.toLowerCase()] || "secondary",
  };
}
