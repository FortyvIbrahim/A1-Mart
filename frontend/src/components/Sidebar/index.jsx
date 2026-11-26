"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Box, useBreakpointValue } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight, LuX } from "react-icons/lu";
import styles from "./index.module.css";
import { DEFAULT_MODULE_ID, MENU_MODULES } from "@/constants/Menu";
import {
  WORKSPACE_PRESENTATION,
  INLINE_SUBMENU_WORKSPACES,
  groupSections,
  findActiveEntry,
} from "@/constants/navigation";
import { useUser } from "@/contexts/UserContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { Tooltip } from "../ui/tooltip";
import MenuItem from "./MenuItem";
import {
  filterMenuByPermissions,
  getVisibleModuleIds,
  resolveActiveNav,
} from "@/utils/menuModules";

function SideBar() {
  const pathname = usePathname();
  const { permissions, permissionsLoading } = useUser();
  const { isCollapsed, toggleCollapsed, isMobileOpen, setIsMobileOpen } =
    useSidebar();
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;
  const collapsed = !isMobile && isCollapsed;

  const visibleWorkspaceIds = useMemo(
    () => getVisibleModuleIds(permissions),
    [permissions]
  );

  const [workspaceId, setWorkspaceId] = useState(DEFAULT_MODULE_ID);

  // Follow the URL: landing on a warehouse page selects the Warehouse workspace.
  useEffect(() => {
    if (!visibleWorkspaceIds.length) return;
    const fromPath = resolveActiveNav(pathname, permissions)?.workspaceId;
    setWorkspaceId((prev) => {
      if (fromPath) return fromPath;
      if (visibleWorkspaceIds.includes(prev)) return prev;
      return visibleWorkspaceIds.includes(DEFAULT_MODULE_ID)
        ? DEFAULT_MODULE_ID
        : visibleWorkspaceIds[0];
    });
  }, [pathname, visibleWorkspaceIds, permissions]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, setIsMobileOpen]);

  const sections = useMemo(
    () =>
      filterMenuByPermissions(
        MENU_MODULES[workspaceId]?.menu ?? MENU_MODULES.all.menu,
        permissions
      ),
    [workspaceId, permissions]
  );

  const groups = useMemo(
    () => groupSections(workspaceId, sections),
    [workspaceId, sections]
  );

  const activeEntry = useMemo(
    () => findActiveEntry(sections, pathname),
    [sections, pathname]
  );

  if (pathname === "/login" || pathname === "/register") return null;

  const workspace =
    WORKSPACE_PRESENTATION[workspaceId] ?? WORKSPACE_PRESENTATION.all;
  const WorkspaceIcon = workspace.icon;
  const inlineSubmenus = INLINE_SUBMENU_WORKSPACES.has(workspaceId);

  const rail = (
    <nav className={styles.rail} aria-label="Workspaces">
      {(visibleWorkspaceIds.length ? visibleWorkspaceIds : [DEFAULT_MODULE_ID]).map(
        (id) => {
          const ws = WORKSPACE_PRESENTATION[id] ?? {
            label: MENU_MODULES[id]?.title ?? id,
            icon: WORKSPACE_PRESENTATION.all.icon,
          };
          const Icon = ws.icon;
          const active = id === workspaceId;
          return (
            <Tooltip key={id} content={ws.label} positioning={{ placement: "right" }} showArrow>
              <button
                type="button"
                aria-label={ws.label}
                aria-current={active ? "true" : undefined}
                className={`${styles.railButton} ${
                  active ? styles.railButtonActive : ""
                }`}
                onClick={() => setWorkspaceId(id)}
              >
                <Icon size={15} />
              </button>
            </Tooltip>
          );
        }
      )}
    </nav>
  );

  const panel = (
    <div className={`${styles.panel} ${collapsed ? styles.panelCollapsed : ""}`}>
      <div className={styles.brandRow}>
        {!collapsed && (
          <Link href="/" className={styles.brand} aria-label="A1 MART home">
            <Image
              src="/images/A1MartLogo.jpeg"
              alt="A1 MART — Daily Savings Daily Discount"
              width={651}
              height={178}
              priority
              className={styles.brandLogo}
            />
          </Link>
        )}
        {isMobile ? (
          <button
            type="button"
            className={styles.collapseButton}
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close menu"
          >
            <LuX size={16} />
          </button>
        ) : (
          <button
            type="button"
            className={styles.collapseButton}
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <LuChevronRight size={16} /> : <LuChevronLeft size={16} />}
          </button>
        )}
      </div>

      {!collapsed && (
        <div className={styles.workspacePill}>
          <WorkspaceIcon size={15} className={styles.workspacePillIcon} />
          <span>{workspace.label}</span>
        </div>
      )}

      <div className={styles.menuScroll}>
        {groups.map((group) => (
          <div key={`${workspaceId}-${group.label}`} className={styles.group}>
            {!collapsed && (
              <div className={styles.groupLabel}>{group.label}</div>
            )}
            {collapsed && <div className={styles.groupDivider} />}
            {group.items.map((section) => (
              <MenuItem
                key={`${workspaceId}-${section.title}`}
                section={section}
                pathname={pathname}
                isActive={activeEntry?.section?.title === section.title}
                activeLocation={activeEntry?.item?.location}
                collapsed={collapsed}
                inlineSubmenu={inlineSubmenus}
              />
            ))}
          </div>
        ))}
        {groups.length === 0 && !collapsed && permissionsLoading && (
          <div className={styles.skeletonList} aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.skeletonItem} />
            ))}
          </div>
        )}
        {groups.length === 0 && !collapsed && !permissionsLoading && (
          <div className={styles.emptyMenu}>No modules assigned yet.</div>
        )}
      </div>

      {!collapsed && (
        <div className={styles.footer}>A1 MART · Retail Operations</div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Box
          className={`${styles.backdrop} ${isMobileOpen ? styles.backdropOpen : ""}`}
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
        <aside
          className={`${styles.shell} ${styles.mobileShell} ${
            isMobileOpen ? styles.mobileShellOpen : ""
          }`}
          aria-label="Main navigation"
        >
          {rail}
          {panel}
        </aside>
      </>
    );
  }

  return (
    <aside className={styles.shell} aria-label="Main navigation">
      {rail}
      {panel}
    </aside>
  );
}

export default SideBar;
