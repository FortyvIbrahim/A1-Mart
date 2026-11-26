"use client";

import { Box, Field, Flex, Text } from "@chakra-ui/react";
import React from "react";
import Image from "next/image";

/** Figma "Authentication / Minimal centered brand" layout. */
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <Flex
      minH="100dvh"
      w="100%"
      bg="app.base"
      alignItems="center"
      justifyContent="center"
      px="16px"
      py="40px"
      position="relative"
      overflow="hidden"
    >
      <Box
        position="absolute"
        top="-180px"
        right="-140px"
        w="420px"
        h="420px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(244,119,33,0.10) 0%, rgba(244,119,33,0) 70%)"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        bottom="-200px"
        left="-160px"
        w="460px"
        h="460px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(244,119,33,0.08) 0%, rgba(244,119,33,0) 70%)"
        pointerEvents="none"
      />

      <Flex direction="column" alignItems="center" w="100%" maxW="400px" zIndex={1}>
        <Image
          src="/images/A1MartLogo.jpeg"
          alt="A1 MART — Daily Savings Daily Discount"
          width={651}
          height={178}
          priority
          style={{
            width: "260px",
            height: "auto",
            borderRadius: "14px",
            marginBottom: "24px",
            boxShadow: "0 10px 24px rgba(244, 119, 33, 0.25)",
          }}
        />

        <Box
          w="100%"
          bg="white"
          borderWidth="1px"
          borderColor="border"
          borderRadius="16px"
          boxShadow="0 10px 30px rgba(244, 119, 33, 0.06), 0 1px 2px rgba(31, 41, 55, 0.04)"
          px={{ base: "22px", md: "28px" }}
          py={{ base: "26px", md: "30px" }}
        >
          <Text textAlign="center" fontSize="24px" fontWeight="700" color="gray.800">
            {title}
          </Text>
          {subtitle && (
            <Text textAlign="center" fontSize="13px" color="gray.500" mt="4px">
              {subtitle}
            </Text>
          )}
          <Box mt="22px">{children}</Box>
          {footer && (
            <Text textAlign="center" fontSize="13px" color="gray.500" mt="18px">
              {footer}
            </Text>
          )}
        </Box>
      </Flex>
    </Flex>
  );
}

export function AuthField({ label, children, invalid, errorText }) {
  return (
    <Field.Root invalid={invalid}>
      <Field.Label fontSize="12.5px" fontWeight="600" color="gray.700" mb="2px">
        {label}
      </Field.Label>
      {children}
      {errorText && <Field.ErrorText fontSize="12px">{errorText}</Field.ErrorText>}
    </Field.Root>
  );
}

export const authInputProps = {
  h: "44px",
  bg: "white",
  borderColor: "border",
  borderRadius: "10px",
  fontSize: "14px",
  _placeholder: { color: "gray.400" },
  _focusVisible: {
    borderColor: "brand.400",
    boxShadow: "0 0 0 3px rgba(244, 119, 33, 0.14)",
    outline: "none",
  },
};

export default AuthShell;
