"use client";

import React from "react";
import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import CustomContainer from "@/components/CustomContainer";

const DONUT_COLORS = [
  "#3182CE",
  "#38A169",
  "#ECC94B",
  "#ED8936",
  "#9F7AEA",
  "#4A5568",
];

function EmployeeDonutCard({
  title,
  data = [],
  showCountsInLegend = true,
  onItemClick,
}) {
  const renderTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <Flex
        bg="white"
        borderRadius="md"
        boxShadow="md"
        px={3}
        py={2}
        borderWidth="1px"
        borderColor="gray.100"
        align="center"
        gap={3}
        fontSize="sm"
        flexDirection="column"
        alignItems="flex-start"
      >
        {payload
          .sort((a, b) => b.value - a.value)
          .map((item, index) => {
            const color =
              item.color ||
              item.payload?.color ||
              DONUT_COLORS[index % DONUT_COLORS.length];
            const name = item.name || item.payload?.name;

            return (
              <Flex key={`${name}-${index}`} align="center" gap={1}>
                <Box w="8px" h="8px" borderRadius="2px" bg={color} />
                <Text>
                  {name} {item.value ? `(${item.value})` : ""}
                </Text>
              </Flex>
            );
          })}
      </Flex>
    );
  };

  const legendItems = (data || []).filter((item) => item.name);

  return (
    <CustomContainer title={title} size="sm" fullWidth>
      <Box height={{ base: "240px", md: "300px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" paddingAngle={1}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.color || DONUT_COLORS[index % DONUT_COLORS.length]
                  }
                  onClick={() =>
                    onItemClick && entry.name && onItemClick(entry.name)
                  }
                  style={{
                    cursor: onItemClick ? "pointer" : "default",
                  }}
                />
              ))}
            </Pie>
            <RechartsTooltip
              content={renderTooltip}
              cursor={{ fill: "transparent" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>

      <Box
        w="calc(100% + 44px)"
        h="1px"
        bgColor="brand100"
        ml="-22px"
        mt="22px"
        mb="22px"
      />

      {legendItems.length > 0 && (
        <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap="6px">
          {legendItems.map((item, index) => (
            <GridItem key={`${item.name}-${index}`}>
              <Flex
                align="center"
                fontSize="xs"
                h="24px"
                onClick={() =>
                  onItemClick && item.name && onItemClick(item.name)
                }
                cursor={onItemClick ? "pointer" : "default"}
              >
                <Box
                  w="10px"
                  h="10px"
                  borderRadius="2px"
                  bg={item.color || DONUT_COLORS[index % DONUT_COLORS.length]}
                  mr={2}
                />
                <Text>
                  {showCountsInLegend && typeof item.value === "number"
                    ? `${item.name} (${item.value})`
                    : item.name}
                </Text>
              </Flex>
            </GridItem>
          ))}
        </Grid>
      )}
    </CustomContainer>
  );
}

export default EmployeeDonutCard;
