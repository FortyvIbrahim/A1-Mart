import { Flex, Text } from "@chakra-ui/react";
import React from "react";

function EmptyImage({ width, height, noPadding = false }) {
  return (
    <Flex
      justifyContent="center"
      alignItems="center"
      height={height || "100%"}
      width={width || "100%"}
    >
      <Flex
        justifyContent="center"
        alignItems="center"
        height={height || "80%"}
        width={width || "100%"}
        backgroundColor="gray.100"
        borderRadius="sm"
        padding={noPadding ? "0" : "4px"}
      >
        <Text color="gray.500" fontSize="2xs">
          No Image
        </Text>
      </Flex>
    </Flex>
  );
}

export default EmptyImage;
