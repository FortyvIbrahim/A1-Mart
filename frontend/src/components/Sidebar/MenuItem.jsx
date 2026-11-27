"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { LuChevronDown } from "react-icons/lu";
import styles from "./index.module.css";
import { Tooltip } from "../ui/tooltip";
import {
  TABBED_SECTIONS_IN_INLINE,
  getSectionPresentation,
} from "@/constants/navigation";

/**
 * One sidebar section.
 * - Main workspace: a flat row linking to the section's first page; sibling
 *   pages are reached through the module tabs above the content.
 * - Warehouse workspace (`inlineSubmenu`): the row expands to list its pages,
 *   as in the Figma warehouse sidebar.
 */
function MenuItem({
  section,
  isActive,
  activeLocation,
  collapsed,
  inlineSubmenu,
}) {
  const { label, icon: Icon } = getSectionPresentation(section.title);
  const pages = section.subMenu || [];
  // Pages tagged with a `group` collapse into one sidebar row per group.
  const groups = pages.some((p) => p.group)
    ? pages.reduce((acc, p) => {
        const name = p.group ?? p.sidebarTitle ?? p.title;
        const g = acc.find((x) => x.name === name);
        if (g) g.pages.push(p);
        else acc.push({ name, pages: [p] });
        return acc;
      }, [])
    : null;
  // Figma warehouse "Dashboard" is one row; its dashboards are module tabs.
  if (TABBED_SECTIONS_IN_INLINE.has(section.title)) inlineSubmenu = false;
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  if (!pages.length) return null;

  const rowClass = `${styles.item} ${isActive ? styles.itemActive : ""} ${
    collapsed ? styles.itemCollapsed : ""
  } ${inlineSubmenu && isActive ? styles.itemActiveSoft : ""}`;

  const content = (
    <>
      <span className={styles.itemIcon}>
        <Icon size={15} />
      </span>
      {!collapsed && <span className={styles.itemLabel}>{label}</span>}
      {!collapsed && inlineSubmenu && pages.length > 1 && (
        <LuChevronDown
          size={14}
          className={`${styles.itemChevron} ${open ? styles.itemChevronOpen : ""}`}
        />
      )}
    </>
  );

  const showInline = inlineSubmenu && !collapsed && pages.length > 1;

  const row = showInline ? (
    <button
      type="button"
      className={rowClass}
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
    >
      {content}
    </button>
  ) : (
    <Link
      href={pages[0].location}
      className={rowClass}
      aria-current={isActive ? "page" : undefined}
    >
      {content}
    </Link>
  );

  return (
    <div>
      {collapsed ? (
        <Tooltip content={label} positioning={{ placement: "right" }} showArrow>
          {row}
        </Tooltip>
      ) : (
        row
      )}

      {showInline && open && (
        <div className={styles.subMenu}>
          {groups
            ? // Figma warehouse list frames: the sidebar lists the groups; the
              // pages of the active group appear as tabs above the content.
              groups.map((g) => {
                const active = g.pages.some((p) => p.location === activeLocation);
                return (
                  <Link
                    key={g.name}
                    href={g.pages[0].location}
                    className={`${styles.subItem} ${active ? styles.subItemActive : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    {g.name}
                  </Link>
                );
              })
            : pages.map((page) => (
                <Link
                  key={page.location + page.title}
                  href={page.location}
                  className={`${styles.subItem} ${
                    activeLocation === page.location ? styles.subItemActive : ""
                  }`}
                  aria-current={activeLocation === page.location ? "page" : undefined}
                >
                  {page.sidebarTitle ?? page.title}
                </Link>
              ))}
        </div>
      )}
    </div>
  );
}

export default MenuItem;
