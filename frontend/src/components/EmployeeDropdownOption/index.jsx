"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { capitalizeWords } from "@/utils/string";

/** Option row for employee searchable / multiple-dropdown (image + name + code). */
export default function EmployeeDropdownOption(item) {
  if (!item) {
    return (
      <Text fontSize="sm" color="gray.500">
        —
      </Text>
    );
  }
  const name = item.employee_name
    ? capitalizeWords(item.employee_name)
    : String(item.label ?? "").split(" (")[0] || "—";
  const code = item.employee_code ?? item.value ?? "—";
  const imgUrl = item.profile_img_url;

  return (
    <Flex align="center" gap={3} w="100%" py={0.5} textAlign="left">
      <Box
        flexShrink={0}
        w="56px"
        h="56px"
        borderRadius="md"
        overflow="hidden"
        bg="gray.100"
        borderWidth="1px"
        borderColor="gray.200"
      >
        {imgUrl ? (
          <Box
            as="img"
            src={imgUrl}
            alt=""
            w="100%"
            h="100%"
            objectFit="cover"
            loading="lazy"
          />
        ) : (
          <Flex
            w="100%"
            h="100%"
            align="center"
            justify="center"
            fontSize="xs"
            fontWeight="semibold"
            color="gray.500"
          >
            {String(name).slice(0, 2).toUpperCase()}
          </Flex>
        )}
      </Box>
      <Flex direction="column" align="flex-start" minW={0} flex={1}>
        <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
          {name}
        </Text>
        <Text fontSize="xs" color="gray.600" lineClamp={1}>
          Code: {code}
        </Text>
      </Flex>
    </Flex>
  );
}
