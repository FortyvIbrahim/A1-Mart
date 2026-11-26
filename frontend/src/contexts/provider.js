"use client";

import { system } from "@/theme";
import { ChakraProvider, Theme } from "@chakra-ui/react";
import { UserProvider } from "@/contexts/UserContext";

export function Providers({ children }) {
  return (
    <ChakraProvider value={system}>
      <Theme appearance="light" colorPalette="brand">
        <UserProvider>{children}</UserProvider>
      </Theme>
    </ChakraProvider>
  );
}
