"use client";

import React from "react";
import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";

/**
 * Reusable chart legend. Use below a chart or anywhere you need a consistent legend.
 *
 * @param {Object} props
 * @param {Array<{ name: string, value?: number, fill: string }>} props.items - Legend entries
 * @param {number} [props.columns=2] - Grid columns
 * @param {boolean} [props.showDivider=true] - Show the brand100 divider line above legend
 */
function DashboardChartLegend({
  items = [],
  columns = 2,
  showDivider = true,
  truncateLabelOnly = false,
}) {
  if (!items?.length) return null;

  return (
    <>
      {showDivider && (
        <Box
          w="calc(100% + 44px)"
          h="1px"
          bgColor="brand100"
          ml="-22px"
          mt="22px"
          mb="22px"
        />
      )}
      <Grid
        templateColumns={`repeat(${columns}, minmax(0, 1fr))`}
        gap="6px"
        mt={showDivider ? 0 : 2}
      >
        {items.map((item, idx) => (
          <GridItem key={idx}>
            <Flex align="center" fontSize="xs" h="24px">
              <Box
                w="10px"
                h="10px"
                borderRadius="2px"
                bg={item.fill}
                mr={2}
              />
              {truncateLabelOnly ? (
                <Text
                  title={
                    item.value != null
                      ? `${item.name} (${item.value})`
                      : String(item.name)
                  }
                  whiteSpace="nowrap"
                  display="flex"
                  alignItems="center"
                  minW={0}
                  w="100%"
                >
                  <Box
                    as="span"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    minW={0}
                    flex="1"
                  >
                    {item.name}
                  </Box>
                  {item.value != null ? (
                    <Box as="span" flexShrink={0}>
                      {` (${item.value})`}
                    </Box>
                  ) : null}
                </Text>
              ) : (
                <Text>
                  {item.name}
                  {item.value != null ? ` (${item.value})` : ""}
                </Text>
              )}
            </Flex>
          </GridItem>
        ))}
      </Grid>
    </>
  );
}

export default DashboardChartLegend;
