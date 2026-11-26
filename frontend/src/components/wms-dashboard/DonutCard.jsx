"use client";

import React, { useState } from "react";
import { Box, Flex, Grid, GridItem, IconButton, Text } from "@chakra-ui/react";
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

function DonutCard({ title, data, showCountsInLegend = true }) {
  const [showLegend, setShowLegend] = useState(false);

  return (
    <CustomContainer
      title={title}
      size="sm"
      fullWidth
      rightSection={
        <Box position="relative" onMouseLeave={() => setShowLegend(false)}>
          <IconButton
            aria-label="Toggle legend"
            size="2xs"
            variant="ghost"
            onMouseEnter={() => setShowLegend(true)}
          >
            <i className="fa fa-info-circle" aria-hidden="true" />
          </IconButton>

          {showLegend && (
            <Box
              position="absolute"
              top="24px"
              right="0"
              bg="white"
              borderRadius="md"
              boxShadow="md"
              p={3}
              zIndex={10}
              minW="180px"
            >
              <Grid templateColumns={"repeat(1, 1fr)"} gap="8px">
                {data.map((item, index) => {
                  const label = item.name;
                  const count = item.value;

                  if (!label) return null;

                  return (
                    <GridItem key={`${label}-${index}`}>
                      <Flex align="center" fontSize="xs">
                        <Box
                          w="10px"
                          h="10px"
                          borderRadius="2px"
                          bg={item.color || DONUT_COLORS[index % DONUT_COLORS.length]}
                          mr={2}
                        />
                        <Text>
                          {showCountsInLegend && typeof count === "number"
                            ? `${label} (${count})`
                            : label}
                        </Text>
                      </Flex>
                    </GridItem>
                  );
                })}
              </Grid>
            </Box>
          )}
        </Box>
      }
    >
      <Box height="220px">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              paddingAngle={1}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || DONUT_COLORS[index % DONUT_COLORS.length]}
                />
              ))}
            </Pie>
            <RechartsTooltip />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </CustomContainer>
  );
}

export default DonutCard;

