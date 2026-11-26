"use client";

import React from "react";
import { Box, Flex } from "@chakra-ui/react";

/**
 * Shimmering placeholder table shown while a grid's data loads
 * (same card, header band and row rhythm as the real AG Grid theme).
 */
export default function TableSkeleton({ columns = 6, rows = 6 }) {
  const cols = Math.min(Math.max(columns, 3), 9);
  const bar = (w, h = "10px") => (
    <Box
      h={h}
      w={w}
      borderRadius="6px"
      className="a1-skeleton"
      flexShrink={0}
    />
  );

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="border"
      borderRadius="12px"
      overflow="hidden"
      aria-busy="true"
      aria-label="Loading table"
      role="status"
    >
      <Flex bg="app.tableHeader" h="46px" alignItems="center" px="14px" gap="24px">
        {Array.from({ length: cols }).map((_, i) => (
          <Box key={i} flex={i === 0 ? "0 0 60px" : 1}>
            {bar(i === 0 ? "28px" : `${45 + ((i * 17) % 35)}%`, "9px")}
          </Box>
        ))}
      </Flex>
      {Array.from({ length: rows }).map((_, r) => (
        <Flex
          key={r}
          h="48px"
          alignItems="center"
          px="14px"
          gap="24px"
          borderTopWidth="1px"
          borderColor="border.muted"
          opacity={1 - r * 0.1}
        >
          {Array.from({ length: cols }).map((_, i) => (
            <Box key={i} flex={i === 0 ? "0 0 60px" : 1}>
              {bar(i === 0 ? "22px" : `${40 + ((r * 11 + i * 23) % 50)}%`)}
            </Box>
          ))}
        </Flex>
      ))}
      <Flex
        h="52px"
        alignItems="center"
        justifyContent="flex-end"
        px="14px"
        gap="16px"
        borderTopWidth="1px"
        borderColor="border.muted"
      >
        {bar("90px")}
        {bar("70px")}
        {bar("110px")}
      </Flex>
    </Box>
  );
}
