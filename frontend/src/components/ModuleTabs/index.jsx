"use client";

import React, { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Flex } from "@chakra-ui/react";
import { useUser } from "@/contexts/UserContext";
import {
  SECTIONS_WITHOUT_TABS,
  usesInlineSubmenu,
  getSectionPresentation,
} from "@/constants/navigation";
import { resolveActiveNav } from "@/utils/menuModules";

/**
 * Figma module tab bar ("Accounts Dashboard · Employee Dashboard · …") plus a
 * breadcrumb for nested pages. Rendered once in the app shell, so every page of
 * a module gets the same navigation without touching the page itself.
 */
function ModuleTabs() {
  const pathname = usePathname();
  const { permissions } = useUser();
  const activeRef = useRef(null);

  const nav = useMemo(
    () => resolveActiveNav(pathname, permissions),
    [pathname, permissions]
  );

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [nav?.item?.location]);

  if (!nav) return null;

  // Grouped sections (warehouse): tabs list the pages of the active group.
  const group = nav.item.group;
  const pages = group
    ? (nav.section.subMenu || []).filter((p) => p.group === group)
    : nav.section.subMenu || [];
  const spread = Boolean(group) || nav.workspaceId === "wms";
  const showTabs =
    pages.length > 1 &&
    (Boolean(group) || !usesInlineSubmenu(nav.workspaceId, nav.section.title)) &&
    !SECTIONS_WITHOUT_TABS.has(nav.section.title);
  const sectionLabel = getSectionPresentation(nav.section.title).label;

  // Figma add / edit / view frames show no "Section / Page / Create" trail —
  // pages carry their own title (and breadcrumb where the design has one).
  if (!showTabs) return null;

  return (
    // Figma "Header / Quick dashboard navigation": 56px row, 28px sides,
    // 36px items 12px apart, radius 8, 11/500; active #FFF5ED / #C95C18.
    <Box px={{ base: "14px", md: "28px" }}>
      {showTabs && (
        <Flex
          as="nav"
          aria-label={`${sectionLabel} pages`}
          gap={{ base: "4px", md: "12px" }}
          overflowX="auto"
          minH="56px"
          alignItems="center"
          css={{ scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
        >
          {pages.map((page) => {
            const active = page.location === nav.item.location;
            return (
              <Link
                key={page.location + page.title}
                href={page.location}
                ref={active ? activeRef : undefined}
                aria-current={active ? "page" : undefined}
                style={spread ? { flex: 1, minWidth: 0 } : { flexShrink: 0 }}
              >
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent={spread ? "center" : undefined}
                  h="36px"
                  px={{ base: "12px", md: "26px" }}
                  borderRadius="8px"
                  fontSize="11px"
                  lineHeight="13px"
                  fontWeight="500"
                  whiteSpace="nowrap"
                  color={active ? "#C95C18" : "fg.muted"}
                  bg={active ? "app.tableHeader" : "transparent"}
                  transition="background-color 0.15s ease, color 0.15s ease"
                  _hover={
                    active ? undefined : { bg: "app.tableHeader", color: "fg" }
                  }
                >
                  {page.sidebarTitle ?? page.title}
                </Box>
              </Link>
            );
          })}
        </Flex>
      )}

    </Box>
  );
}

export default ModuleTabs;
