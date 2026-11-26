"use client";

import React, { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Flex, Text } from "@chakra-ui/react";
import { useUser } from "@/contexts/UserContext";
import {
  INLINE_SUBMENU_WORKSPACES,
  SECTIONS_WITHOUT_TABS,
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

  const pages = nav.section.subMenu || [];
  const showTabs =
    pages.length > 1 &&
    !INLINE_SUBMENU_WORKSPACES.has(nav.workspaceId) &&
    !SECTIONS_WITHOUT_TABS.has(nav.section.title);
  const isNested = pathname !== nav.item.location;
  const sectionLabel = getSectionPresentation(nav.section.title).label;

  if (!showTabs && !isNested) return null;

  return (
    <Box px={{ base: "14px", md: "28px" }} pt={{ base: "4px", md: "6px" }}>
      {showTabs && (
        <Flex
          as="nav"
          aria-label={`${sectionLabel} pages`}
          gap="4px"
          overflowX="auto"
          pb="2px"
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
                style={{ flexShrink: 0 }}
              >
                <Box
                  px={{ base: "12px", md: "18px" }}
                  py="9px"
                  borderRadius="9px"
                  fontSize="12px"
                  fontWeight={active ? "600" : "500"}
                  whiteSpace="nowrap"
                  color={active ? "brand.600" : "gray.600"}
                  bg={active ? "brand.100" : "transparent"}
                  transition="background-color 0.15s ease, color 0.15s ease"
                  _hover={
                    active ? undefined : { bg: "brand.50", color: "gray.800" }
                  }
                >
                  {page.title}
                </Box>
              </Link>
            );
          })}
        </Flex>
      )}

      {isNested && (
        <Flex
          alignItems="center"
          gap="6px"
          mt={showTabs ? "14px" : "4px"}
          fontSize="12.5px"
          color="gray.500"
          flexWrap="wrap"
        >
          <Text as="span">{sectionLabel}</Text>
          <Text as="span" color="gray.300">
            /
          </Text>
          <Link href={nav.item.location}>
            <Text as="span" _hover={{ color: "brand.600" }}>
              {nav.item.title}
            </Text>
          </Link>
          <Text as="span" color="gray.300">
            /
          </Text>
          <Text as="span" color="gray.700" fontWeight="500">
            {describeNested(pathname, nav.item.location)}
          </Text>
        </Flex>
      )}
    </Box>
  );
}

/** "/employees/edit/12" under "/employees" → "Edit". */
function describeNested(pathname, base) {
  const rest = pathname.slice(base.length).split("/").filter(Boolean);
  const word = rest.find((seg) => !/^\d+$/.test(seg) && seg.length < 40) ?? "Details";
  return word
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default ModuleTabs;
