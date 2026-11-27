import { Box, Text } from "@chakra-ui/react";
import React from "react";

function StatsCard({ title, value, color = "fg", icon }) {
  return (
    <Box
      px="18px"
      py="16px"
      borderRadius="12px"
      borderWidth="1px"
      borderColor="border"
      bg="white"
    >
      {icon && (
        <Box mb={2} color={color}>
          {icon}
        </Box>
      )}
      <Text fontSize="12px" color="fg.muted" fontWeight="500" mb="8px">
        {title}
      </Text>
      <Box fontSize="22px" lineHeight="28px" fontWeight="600" color={color}>
        {value}
      </Box>
    </Box>
  );
}

export default StatsCard;
