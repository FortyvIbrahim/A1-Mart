/**
 * Distinct accent (icon) color per top-level sidebar section, keyed by MENU title.
 * Hover/selected row backgrounds use this via CSS `color-mix` on white.
 */
export const SIDEBAR_MENU_ACCENT_BY_TITLE = {
  Dashboard: "#2563eb",
  "Master Data": "#7c3aed",
  "Task Management System": "#ea580c",
  "Performance Entry": "#0d9488",
  "Sales Target": "#16a34a",
  "Checklist Management System": "#0891b2",
  "Materials Management System": "#ca8a04",
  "Warehouse Management System": "#db2777",
  Uploads: "#c026d3",
  Stock: "#4f46e5",
  Reports: "#0284c7",
  Approvals: "#059669",
  "Incentive Management System": "#9333ea",
  Logs: "#64748b",
  "Payroll Management System": "#0f766e",
  Accounts: "#d97706",
  "Purchase Return": "#dc2626",
  "Transport Management System": "#0369a1",
};

const FALLBACK_ACCENT = "#64748b";

export function getSidebarMenuAccent(title) {
  return SIDEBAR_MENU_ACCENT_BY_TITLE[title] ?? FALLBACK_ACCENT;
}

export function getModuleRailAccent(moduleId, moduleConfig) {
  return moduleConfig?.accent ?? FALLBACK_ACCENT;
}
