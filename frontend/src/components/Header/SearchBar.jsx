"use client";

import { routes } from "@/constants/routes";
import { useUser } from "@/contexts/UserContext";
import { Box, Flex, IconButton, Input, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { LuSearch, LuX } from "react-icons/lu";
import React, { useEffect, useMemo, useRef, useState } from "react";

const TOP_LEVEL_ORDER = ["all", "wms"];

function SearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { permissions = [] } = useUser();
  const router = useRouter();
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const allRoutes = useMemo(() => {
    const result = [];
    Object.values(routes).forEach((section) => {
      section.routes.forEach((route) => {
        result.push({
          ...route,
          topLevelModuleId: section.topLevelModuleId,
          topLevelModuleName: section.topLevelModuleName,
          topLevelModuleIcon: section.topLevelModuleIcon,
          topLevelModuleColorPalette: section.topLevelModuleColorPalette,
          sectionName: section.moduleName,
          sectionColorPalette: section.moduleColorPalette,
          sectionIcon: section.moduleIcon,
        });
      });
    });
    return result;
  }, []);

  const filteredRoutes = useMemo(() => {
    const searchQuery = query.toLowerCase().trim();
    return allRoutes.filter((route) => {
      const hasPermission = permissions.includes(route.permissionKey);
      if (!hasPermission) return false;
      if (!searchQuery) return true;
      return (
        route.routeName.toLowerCase().includes(searchQuery) ||
        route.sectionName.toLowerCase().includes(searchQuery) ||
        route.topLevelModuleName.toLowerCase().includes(searchQuery)
      );
    });
  }, [query, allRoutes, permissions]);

  const groupedByTopLevel = useMemo(() => {
    const topLevelMap = new Map();

    filteredRoutes.forEach((route) => {
      if (!topLevelMap.has(route.topLevelModuleId)) {
        topLevelMap.set(route.topLevelModuleId, {
          topLevelModuleId: route.topLevelModuleId,
          topLevelModuleName: route.topLevelModuleName,
          topLevelModuleIcon: route.topLevelModuleIcon,
          topLevelModuleColorPalette: route.topLevelModuleColorPalette,
          sections: new Map(),
        });
      }

      const topLevel = topLevelMap.get(route.topLevelModuleId);
      if (!topLevel.sections.has(route.sectionName)) {
        topLevel.sections.set(route.sectionName, {
          sectionName: route.sectionName,
          sectionColorPalette: route.sectionColorPalette,
          sectionIcon: route.sectionIcon,
          routes: [],
        });
      }
      topLevel.sections.get(route.sectionName).routes.push(route);
    });

    return TOP_LEVEL_ORDER.filter((id) => topLevelMap.has(id))
      .concat(
        [...topLevelMap.keys()].filter((id) => !TOP_LEVEL_ORDER.includes(id))
      )
      .map((id) => {
        const topLevel = topLevelMap.get(id);
        return {
          ...topLevel,
          sections: [...topLevel.sections.values()],
        };
      });
  }, [filteredRoutes]);

  const flatFilteredRoutes = useMemo(() => {
    return groupedByTopLevel.flatMap((topLevel) =>
      topLevel.sections.flatMap((section) => section.routes)
    );
  }, [groupedByTopLevel]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < flatFilteredRoutes.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const selectedRoute = flatFilteredRoutes[selectedIndex];
      if (selectedRoute) {
        navigateToRoute(selectedRoute);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
  };

  const navigateToRoute = (route) => {
    router.push(route.routePath);
    setIsOpen(false);
    setQuery("");
  };

  const highlightMatch = (text, searchQuery) => {
    if (!searchQuery.trim()) return text;

    const regex = new RegExp(`(${escapeRegex(searchQuery)})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <Text as="span" key={index} fontWeight="bold" color="brand.700">
          {part}
        </Text>
      ) : (
        <Text as="span" key={index}>
          {part}
        </Text>
      )
    );
  };

  const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  let currentFlatIndex = -1;

  return (
    <Box position="relative" ref={containerRef} w="100%" maxW="360px">
      <Flex
        as="label"
        alignItems="center"
        gap="9px"
        h="40px"
        px="14px"
        bg="white"
        borderRadius="999px"
        borderWidth="1px"
        borderColor={isOpen ? "brand.200" : "transparent"}
        boxShadow="0 1px 3px rgba(31, 41, 55, 0.06), 0 1px 2px rgba(244, 119, 33, 0.04)"
        transition="border-color 0.15s ease, box-shadow 0.15s ease"
        cursor="text"
        _focusWithin={{
          borderColor: "brand.300",
          boxShadow: "0 0 0 3px rgba(244, 119, 33, 0.12)",
        }}
      >
        <LuSearch size={15} color="var(--a1-primary)" aria-hidden="true" />
        <Input
          ref={inputRef}
          placeholder="Search anything..."
          aria-label="Search pages"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          variant="flushed"
          border="none"
          bg="transparent"
          h="100%"
          px="0"
          fontSize="13px"
          color="fg"
          _placeholder={{ color: "gray.400" }}
          _focusVisible={{ boxShadow: "none", outline: "none" }}
        />
        {query && (
          <IconButton
            variant="ghost"
            size="2xs"
            aria-label="Clear search"
            onClick={(e) => {
              e.preventDefault();
              setQuery("");
              inputRef.current?.focus();
            }}
            color="gray.500"
          >
            <LuX />
          </IconButton>
        )}
      </Flex>

      {isOpen && (
        <Box
          position="absolute"
          top="100%"
          left="0"
          mt="8px"
          width="100%"
          minW="320px"
          maxHeight="400px"
          overflowY="auto"
          bg="white"
          borderRadius="12px"
          boxShadow="0 12px 32px rgba(31, 41, 55, 0.12)"
          border="1px solid"
          borderColor="border"
          zIndex="1001"
          animation="fadeSlideIn 0.2s ease-out"
          css={{
            "@keyframes fadeSlideIn": {
              from: {
                opacity: 0,
                transform: "translateY(-8px)",
              },
              to: {
                opacity: 1,
                transform: "translateY(0)",
              },
            },
          }}
        >
          {groupedByTopLevel.length === 0 ? (
            <Flex
              p="16px"
              alignItems="center"
              justifyContent="center"
              color="gray.500"
            >
              <Text fontSize="sm">
                {query.trim()
                  ? "No matching pages found"
                  : "No pages available"}
              </Text>
            </Flex>
          ) : (
            groupedByTopLevel.map((topLevel) => (
              <Box key={topLevel.topLevelModuleId}>
                <Flex
                  alignItems="center"
                  gap="8px"
                  px="12px"
                  py="8px"
                  bg="app.tableHeader"
                  borderBottom="1px solid"
                  borderColor="border"
                >
                  <i
                    className={`fa ${topLevel.topLevelModuleIcon}`}
                    style={{
                      fontSize: "12px",
                      color: "var(--a1-primary)",
                    }}
                  />
                  <Text
                    fontSize="xs"
                    fontWeight="bold"
                    color="brand.700"
                    textTransform="uppercase"
                  >
                    {topLevel.topLevelModuleName}
                  </Text>
                </Flex>

                {topLevel.sections.map((section) => (
                  <Box key={`${topLevel.topLevelModuleId}-${section.sectionName}`}>
                    <Flex
                      alignItems="center"
                      gap="8px"
                      px="12px"
                      py="6px"
                      pl="20px"
                      bg="gray.50"
                      borderBottom="1px solid"
                      borderColor="gray.100"
                    >
                      <i
                        className={`fa ${section.sectionIcon}`}
                        style={{
                          fontSize: "11px",
                          color: "var(--a1-primary)",
                        }}
                      />
                      <Text
                        fontSize="xs"
                        fontWeight="semibold"
                        color="gray.700"
                      >
                        {section.sectionName}
                      </Text>
                    </Flex>

                    {section.routes.map((route) => {
                      currentFlatIndex++;
                      const isSelected = currentFlatIndex === selectedIndex;

                      return (
                        <Flex
                          key={route.routePath}
                          alignItems="center"
                          gap="12px"
                          px="16px"
                          py="10px"
                          pl="28px"
                          cursor="pointer"
                          bg={
                            isSelected ? "brand.50" : "white"
                          }
                          transition="all 0.15s ease"
                          _hover={{
                            bg: "brand.50",
                          }}
                          onClick={() => navigateToRoute(route)}
                          borderLeft="3px solid"
                          borderLeftColor={
                            isSelected
                              ? "brand.500"
                              : "transparent"
                          }
                        >
                          <Box
                            width="6px"
                            height="6px"
                            borderRadius="full"
                            bg="brand.300"
                            flexShrink={0}
                          />
                          <Text fontSize="sm" color="gray.700">
                            {highlightMatch(route.routeName, query)}
                          </Text>
                        </Flex>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            ))
          )}
        </Box>
      )}
    </Box>
  );
}

export default SearchBar;
