"use client";

import usePermission from "@/customHooks/usePermission";
import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { useUser } from "@/contexts/UserContext";
import React from "react";
import { LuLock } from "react-icons/lu";

/** Page body wrapper: Figma content gutters + permission gate. */
function GlobalWrapper({ children, permissionKey = null }) {
  const canAccess = usePermission(permissionKey);
  const { permissionsLoading } = useUser();

  if (permissionKey && !canAccess && permissionsLoading) {
    return (
      <Flex w="100%" minH="50dvh" alignItems="center" justifyContent="center">
        <Spinner color="brand.500" size="md" />
      </Flex>
    );
  }

  if (permissionKey && !canAccess) {
    return (
      <Flex
        w="100%"
        minH="60dvh"
        alignItems="center"
        justifyContent="center"
        p="24px"
      >
        <Flex
          direction="column"
          alignItems="center"
          gap="10px"
          bg="white"
          borderWidth="1px"
          borderColor="border"
          borderRadius="14px"
          px="32px"
          py="28px"
          textAlign="center"
        >
          <Flex
            w="44px"
            h="44px"
            borderRadius="12px"
            bg="brand.100"
            color="brand.600"
            alignItems="center"
            justifyContent="center"
          >
            <LuLock size={20} />
          </Flex>
          <Text fontSize="15px" fontWeight="600" color="gray.800">
            Access restricted
          </Text>
          <Text fontSize="13px" color="gray.500" maxW="280px">
            You are not authorized to access this page. Ask an admin to grant
            the permission for your designation.
          </Text>
        </Flex>
      </Flex>
    );
  }

  return (
    <Box
      px={{ base: "14px", md: "28px" }}
      pt={{ base: "14px", md: "24px" }}
      pb={{ base: "24px", md: "32px" }}
    >
      {children}
    </Box>
  );
}

export default GlobalWrapper;
