import React from "react";
import { Flex, Text } from "@chakra-ui/react";
import { LuX } from "react-icons/lu";

/** Active buyer filter (set from the Purchase Return Pending chart). */
export default function BuyerChip({ buyer, onClear }) {
  if (!buyer) return null;
  return (
    <Flex
      as="button"
      type="button"
      onClick={onClear}
      align="center"
      gap="6px"
      h="28px"
      px="10px"
      borderRadius="8px"
      bg="#FFF5ED"
      color="#C95C18"
      fontSize="11px"
      fontWeight="500"
      aria-label={`Clear buyer filter ${buyer}`}
    >
      <Text as="span">Buyer: {buyer}</Text>
      <LuX size={12} />
    </Flex>
  );
}
