import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import React, { createContext, useCallback, useContext, useState } from "react";
import { LuChevronDown } from "react-icons/lu";

/**
 * Nesting + table detection for containers.
 * - depth: 0 for a page-level container, >0 when nested in another one.
 * - registerGrid: AgGrid calls this so a page-level container can switch to the
 *   Figma listing layout (title on the page, table as its own card).
 */
export const ContainerContext = createContext({ depth: -1, registerGrid: null });

export function useRegisterGrid() {
  return useContext(ContainerContext).registerGrid;
}

/**
 * Figma content container.
 * - Page-level with a table: heading row on the page background
 *   ("Sales Target – Branch" + actions), then the content (table card) below.
 * - Otherwise: white card, 14px radius, peach hairline border, title row.
 * `color` is kept for backwards compatibility; the accent stays brand orange.
 */
function CustomContainer({
  children,
  title,
  rightSection = null,
  size = "md",
  // eslint-disable-next-line no-unused-vars
  color = "brand",
  fullWidth = false,
  containerStyle,
  collapsible = false,
  defaultOpen = true,
}) {
  const parent = useContext(ContainerContext);
  const depth = parent.depth + 1;
  const [hasGrid, setHasGrid] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
  const showBody = !collapsible || open;

  const registerGrid = useCallback(() => {
    if (depth === 0) {
      setHasGrid(true);
      return () => {};
    }
    return parent.registerGrid?.() ?? (() => {});
  }, [depth, parent]);

  const pageLayout = depth === 0 && hasGrid && !collapsible;

  const sizeStyles = {
    sm: {
      headerPx: { base: "16px", md: "18px" },
      headerPy: { base: "12px", md: "13px" },
      fontSize: { base: "14px", md: "14.5px" },
      containerPadding: { base: "16px", md: "18px" },
    },
    md: {
      headerPx: { base: "18px", md: "22px" },
      headerPy: { base: "14px", md: "16px" },
      fontSize: { base: "16px", md: "18px" },
      containerPadding: { base: "18px", md: "22px" },
    },
  };
  const styles = sizeStyles[size] ?? sizeStyles.md;

  const provider = (node) => (
    <ContainerContext.Provider value={{ depth, registerGrid }}>
      {node}
    </ContainerContext.Provider>
  );

  if (pageLayout) {
    return provider(
      <Flex
        direction="column"
        gap="16px"
        w={fullWidth ? "100%" : "auto"}
        style={containerStyle}
        {...containerStyle}
      >
        {title && (
          <Flex alignItems="center" justifyContent="space-between" gap="12px" flexWrap="wrap">
            <Text
              as="h1"
              fontSize={{ base: "20px", md: "24px" }}
              fontWeight="600"
              letterSpacing="-0.02em"
              color="gray.800"
              minW="160px"
            >
              {title}
            </Text>
            {rightSection && <Box>{rightSection}</Box>}
          </Flex>
        )}
        <Box w="100%">{children}</Box>
      </Flex>
    );
  }

  return provider(
    <Flex
      bg="white"
      borderColor="border"
      borderWidth="1px"
      borderRadius="14px"
      boxShadow="0 1px 2px rgba(244, 119, 33, 0.04)"
      flexDirection="column"
      overflow="hidden"
      w={fullWidth ? "100%" : "auto"}
      style={containerStyle}
      {...containerStyle}
    >
      {title && (
        <Flex
          as={collapsible ? "button" : undefined}
          type={collapsible ? "button" : undefined}
          onClick={collapsible ? () => setOpen((current) => !current) : undefined}
          aria-expanded={collapsible ? open : undefined}
          px={styles.headerPx}
          py={styles.headerPy}
          gap="12px"
          alignItems="center"
          flexWrap="wrap"
          w="100%"
          textAlign="left"
          bg="white"
          cursor={collapsible ? "pointer" : undefined}
          borderWidth={0}
          borderBottomWidth={showBody ? "1px" : 0}
          borderColor="border.muted"
        >
          <Text
            fontSize={styles.fontSize}
            fontWeight="700"
            letterSpacing="-0.01em"
            color="gray.800"
            flex={1}
            minW="160px"
          >
            {title}
          </Text>
          {rightSection && (
            <Box onClick={collapsible ? (event) => event.stopPropagation() : undefined}>
              {rightSection}
            </Box>
          )}
          {collapsible && (
            <Icon
              as={LuChevronDown}
              boxSize="4"
              color="brand.500"
              transform={open ? "rotate(180deg)" : "rotate(0deg)"}
              transition="transform 0.2s ease"
            />
          )}
        </Flex>
      )}

      {showBody && (
        <Box p={styles.containerPadding} w="100%">
          {children}
        </Box>
      )}
    </Flex>
  );
}

export default CustomContainer;
