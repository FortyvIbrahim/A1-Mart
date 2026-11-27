"use client";

import React from "react";
import { Box, Flex, Grid, Text } from "@chakra-ui/react";

/**
 * Figma "Chart / Compact legend": 7px dot, label 11/400 #637188 centred in
 * its cell, value 12/600 #202938 at the end. Columns 16px apart, rows 10px.
 *
 * @param {Array<{ name: string, value?: number, fill: string, labelColor?: string, onClick?: () => void }>} props.items
 * @param {number} [props.columns=2]
 * @param {boolean} [props.showDivider=false] - Legacy rule above the legend (not in Figma).
 */
function DashboardChartLegend({
  items = [],
  columns = 2,
  showDivider = false,
  // eslint-disable-next-line no-unused-vars
  truncateLabelOnly = false,
}) {
  if (!items?.length) return null;

  return (
    <>
      {showDivider && <Box h="1px" bg="border" my="16px" />}
      <Grid
        templateColumns={`repeat(${columns}, minmax(0, 1fr))`}
        columnGap="16px"
        rowGap="10px"
        mt={showDivider ? 0 : "16px"}
      >
        {items.map((item, idx) => (
          <Flex
            key={`${item.name}-${idx}`}
            align="center"
            gap="6px"
            minW={0}
            as={item.onClick ? "button" : "div"}
            type={item.onClick ? "button" : undefined}
            onClick={item.onClick}
            cursor={item.onClick ? "pointer" : "default"}
          >
            <Box
              w="7px"
              h="7px"
              borderRadius="full"
              bg={item.fill}
              flexShrink={0}
            />
            <Text
              flex="1"
              minW={0}
              textAlign="center"
              fontSize="11px"
              lineHeight="13px"
              color={item.labelColor ?? "fg.muted"}
              truncate
              title={String(item.name)}
            >
              {item.name}
            </Text>
            {item.value != null && (
              <Text
                fontSize="12px"
                fontWeight="600"
                lineHeight="15px"
                color="fg"
                flexShrink={0}
              >
                {item.value}
              </Text>
            )}
          </Flex>
        ))}
      </Grid>
    </>
  );
}

export default DashboardChartLegend;
