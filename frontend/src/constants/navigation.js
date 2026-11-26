/**
 * Sidebar presentation layer (Figma "Concept C · Pearl Orange").
 *
 * Routing + permissions still come from `MENU_MODULES` in ./Menu.js — this file
 * only decides how those sections are grouped, labelled and iconed in the new
 * sidebar. Any section that is not listed here still renders (under "More"),
 * so nothing from the existing menu can disappear.
 */
import {
  LuLayoutGrid,
  LuUsers,
  LuListChecks,
  LuChartColumn,
  LuTarget,
  LuClipboardList,
  LuPackage,
  LuArchive,
  LuUndo2,
  LuTruck,
  LuShieldCheck,
  LuGift,
  LuWallet,
  LuCalculator,
  LuFileText,
  LuScrollText,
  LuWarehouse,
  LuUpload,
  LuBox,
  LuCircleDot,
} from "react-icons/lu";

export const SECTION_PRESENTATION = {
  Dashboard: { label: "Dashboard", icon: LuLayoutGrid },
  "Master Data": { label: "Master Data", icon: LuUsers },
  "Task Management System": {
    label: "Task Management System",
    icon: LuListChecks,
  },
  "Performance Entry": { label: "Performance Entry", icon: LuChartColumn },
  "Sales Target": { label: "Sales Target", icon: LuTarget },
  "Checklist Management System": {
    label: "Checklist Management",
    icon: LuClipboardList,
  },
  "Materials Management System": {
    label: "Materials Management",
    icon: LuPackage,
  },
  Stock: { label: "Stock Circle", icon: LuArchive },
  "Purchase Return": { label: "Purchase Return", icon: LuUndo2 },
  "Transport Management System": {
    label: "Transport Management",
    icon: LuTruck,
  },
  Approvals: { label: "Approvals", icon: LuShieldCheck },
  "Incentive Management System": {
    label: "Incentive Management",
    icon: LuGift,
  },
  "Payroll Management System": { label: "Payroll Management", icon: LuWallet },
  Accounts: { label: "Accounts", icon: LuCalculator },
  Reports: { label: "Reports", icon: LuFileText },
  Logs: { label: "Logs", icon: LuScrollText },
  "Warehouse Management System": {
    label: "Warehouse Management",
    icon: LuWarehouse,
  },
  Uploads: { label: "Uploads", icon: LuUpload },
};

export const FALLBACK_SECTION_ICON = LuCircleDot;

/** Group headings per workspace, in display order. */
export const WORKSPACE_GROUPS = {
  all: [
    { label: "Overview", sections: ["Dashboard", "Master Data"] },
    {
      label: "Operations",
      sections: [
        "Task Management System",
        "Performance Entry",
        "Sales Target",
        "Checklist Management System",
      ],
    },
    {
      label: "Inventory & Logistics",
      sections: [
        "Materials Management System",
        "Stock",
        "Purchase Return",
        "Transport Management System",
      ],
    },
    {
      label: "People & Finance",
      sections: [
        "Approvals",
        "Incentive Management System",
        "Payroll Management System",
        "Accounts",
      ],
    },
    { label: "Insights", sections: ["Reports", "Logs"] },
  ],
  wms: [
    {
      label: "Warehouse Operations",
      sections: ["Dashboard", "Warehouse Management System", "Uploads"],
    },
  ],
};

/** Workspace switcher (icon rail + "Main workspace" pill). */
export const WORKSPACE_PRESENTATION = {
  all: { label: "Main workspace", short: "Main", icon: LuBox },
  wms: { label: "Warehouse", short: "Warehouse", icon: LuWarehouse },
};

/**
 * Workspaces whose sidebar shows nested sub-pages inline (Figma warehouse
 * sidebar). Other workspaces use a flat sidebar + module tabs above content.
 */
export const INLINE_SUBMENU_WORKSPACES = new Set(["wms"]);

/**
 * Sections whose pages carry their own in-page switcher in the Figma (e.g. the
 * All Tasks / My Tasks toggle), so the module tab bar is not shown for them.
 */
export const SECTIONS_WITHOUT_TABS = new Set(["Task Management System"]);

export function getSectionPresentation(title) {
  return (
    SECTION_PRESENTATION[title] ?? { label: title, icon: FALLBACK_SECTION_ICON }
  );
}

/**
 * Groups filtered menu sections for a workspace. Unknown sections are appended
 * under "More" so new menu entries never vanish from the sidebar.
 */
export function groupSections(workspaceId, sections) {
  const groups = WORKSPACE_GROUPS[workspaceId] ?? [];
  const byTitle = new Map(sections.map((s) => [s.title, s]));
  const used = new Set();
  const result = [];

  for (const group of groups) {
    const items = group.sections
      .map((title) => byTitle.get(title))
      .filter(Boolean);
    items.forEach((s) => used.add(s.title));
    if (items.length) result.push({ label: group.label, items });
  }

  const rest = sections.filter((s) => !used.has(s.title));
  if (rest.length) result.push({ label: "More", items: rest });
  return result;
}

/** True when `pathname` is `location` or a nested page under it. */
export function pathMatches(pathname, location) {
  if (!pathname || !location) return false;
  if (location === "/") return pathname === "/";
  return pathname === location || pathname.startsWith(`${location}/`);
}

/**
 * Finds the section + sub-page that best matches the current path, preferring
 * the longest matching location (so /stickering/mine beats /stickering).
 */
export function findActiveEntry(sections, pathname) {
  let best = null;
  for (const section of sections || []) {
    for (const item of section.subMenu || []) {
      if (pathMatches(pathname, item.location)) {
        if (!best || item.location.length > best.item.location.length) {
          best = { section, item };
        }
      }
    }
  }
  return best;
}
