import { Box, Text } from "@chakra-ui/react";
import React from "react";

function StatsCard({ title, value, color = "brand600", icon }) {
  return (
    <Box
      p={4}
      borderRadius="8px"
      borderWidth="1px"
      borderColor="gray.200"
      bg="white"
    >
      {icon && (
        <Box mb={2} color={color}>
          {icon}
        </Box>
      )}
      <Text fontSize="xs" color="gray.600" fontWeight="medium" mb={1}>
        {title}
      </Text>
      <Box fontSize="2xl" fontWeight="bold" color={color}>
        {value}
      </Box>
    </Box>
  );
}

export default StatsCard;
