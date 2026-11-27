import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import React, { createContext, useCallback, useContext, useState } from "react";
import { LuChevronDown } from "react-icons/lu";

export const EMPTY_CONTAINER_CONTEXT = {
  depth: -1,
  registerGrid: null,
  isPageLayout: false,
  mainCard: false,
  settingsSlotEl: null,
  settingsOwnerId: null,
  claimSettingsSlot: null,
  releaseSettingsSlot: null,
};

/**
 * Nesting + table detection for containers.
 * - depth: 0 for a page-level container, >0 when nested in another one.
 * - registerGrid: AgGrid calls this so a page-level container can switch to the
 *   Figma listing layout.
 * - settingsSlotEl: DOM node inside the top peach banner where the primary AgGrid
 *   portals its Settings button next to Add / rightSection.
 */
export const ContainerContext = createContext(EMPTY_CONTAINER_CONTEXT);

export function useRegisterGrid() {
  return useContext(ContainerContext).registerGrid;
}

export function useHeaderSettingsSlot() {
  return useContext(ContainerContext);
}

/** True when the nearest container is a titled white card (not a page). */
export function useInsideCard() {
  const ctx = useContext(ContainerContext);
  return ctx.depth >= 0 && !ctx.isPageLayout;
}

/** True inside a Figma Master Data "Main card" page. */
export function useInsideMainCard() {
  return Boolean(useContext(ContainerContext).mainCard);
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
  // Figma Master Data pages: title, filters and table inside one white card.
  mainCard = false,
  // Figma "Workspace" pages (Performance Entry …): white card, radius 8, with a
  // 72px peach heading band (title 20/600 + actions) and a 24px body.
  headerBand = false,
  // Optional "Section  /  Page" trail above a page title (Figma Sales Target).
  breadcrumb,
  // Optional subtitle directly under the banner title (e.g. "TASK-026").
  subtitle,
  // Figma Accounts lists: title outside, filters + table in one white card
  // (radius 12, 1px #F0E1D7, padding 20).
  contentCard = false,
  // Add / edit / view page: title outside, form in a white card (Figma forms).
  pageForm = false,
}) {
  const parent = useContext(ContainerContext);
  const depth = parent.depth + 1;
  const [hasGrid, setHasGrid] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
  const [settingsSlotEl, setSettingsSlotEl] = useState(null);
  const [settingsOwnerId, setSettingsOwnerId] = useState(null);
  const showBody = !collapsible || open;

  const claimSettingsSlot = useCallback((id) => {
    setSettingsOwnerId((prev) => prev ?? id);
  }, []);

  const releaseSettingsSlot = useCallback((id) => {
    setSettingsOwnerId((prev) => (prev === id ? null : prev));
  }, []);

  const registerGrid = useCallback(() => {
    if (depth === 0) {
      setHasGrid(true);
      return () => {};
    }
    return parent.registerGrid?.() ?? (() => {});
  }, [depth, parent]);

  const pageLayout = depth === 0 && hasGrid && !collapsible;
  const useBannerLayout =
    depth === 0 &&
    !collapsible &&
    Boolean(title) &&
    (headerBand || mainCard || contentCard || pageLayout || pageForm || size !== "sm");
  const hasSettingsSlot = useBannerLayout || (headerBand && Boolean(title));

  const provider = (node) => (
    <ContainerContext.Provider
      value={{
        depth,
        registerGrid,
        isPageLayout: useBannerLayout || pageLayout || mainCard || headerBand || contentCard,
        mainCard: useBannerLayout || mainCard || headerBand || contentCard,
        settingsSlotEl: hasSettingsSlot ? settingsSlotEl : null,
        settingsOwnerId: hasSettingsSlot ? settingsOwnerId : null,
        claimSettingsSlot: hasSettingsSlot ? claimSettingsSlot : null,
        releaseSettingsSlot: hasSettingsSlot ? releaseSettingsSlot : null,
      }}
    >
      {node}
    </ContainerContext.Provider>
  );

  if (useBannerLayout) {
    return provider(
      <Flex
        direction="column"
        bg="white"
        borderWidth="1px"
        borderColor="border"
        borderRadius="12px"
        overflow="hidden"
        w={fullWidth ? "100%" : "auto"}
        style={containerStyle}
      >
        <Flex
          align="center"
          justify="space-between"
          gap="16px"
          minH="72px"
          px={{ base: "16px", md: "24px" }}
          py="14px"
          bg="#FFF5ED"
          borderBottomWidth="1px"
          borderColor="border.subtle"
          flexWrap="wrap"
        >
          <Box minW={0}>
            <Text as="h1" fontSize="20px" lineHeight="26px" fontWeight="600" color="fg">
              {title}
            </Text>
            {subtitle && (
              <Text fontSize="12px" lineHeight="16px" color="fg.muted" mt="2px">
                {subtitle}
              </Text>
            )}
          </Box>
          <Flex align="center" gap="10px" flexShrink={0} flexWrap="wrap">
            <Flex
              ref={setSettingsSlotEl}
              align="center"
              gap="10px"
              css={{ "&:empty": { display: "none" } }}
            />
            {rightSection && <Box>{rightSection}</Box>}
          </Flex>
        </Flex>
        <Flex direction="column" gap="20px" p={{ base: "16px", md: "24px" }}>
          {children}
        </Flex>
      </Flex>
    );
  }

  if (headerBand) {
    return provider(
      <Flex
        direction="column"
        bg="white"
        borderWidth="1px"
        borderColor="border"
        borderRadius="12px"
        overflow="hidden"
        w={fullWidth ? "100%" : "auto"}
        style={containerStyle}
      >
        <Flex
          align="center"
          justify="space-between"
          gap="16px"
          minH="60px"
          px={{ base: "16px", md: "20px" }}
          py="12px"
          bg="#FFF5ED"
          borderBottomWidth="1px"
          borderColor="border.subtle"
          flexWrap="wrap"
        >
          <Box minW={0}>
            <Text as={depth === 0 ? "h1" : "h2"} fontSize={depth === 0 ? "20px" : "15px"} lineHeight="24px" fontWeight="600" color="fg">
              {title}
            </Text>
            {subtitle && (
              <Text fontSize="12px" lineHeight="16px" color="fg.muted" mt="2px">
                {subtitle}
              </Text>
            )}
          </Box>
          <Flex align="center" gap="10px" flexShrink={0} flexWrap="wrap">
            <Flex
              ref={setSettingsSlotEl}
              align="center"
              gap="10px"
              css={{ "&:empty": { display: "none" } }}
            />
            {rightSection && <Box>{rightSection}</Box>}
          </Flex>
        </Flex>
        <Box w="100%" p={size === "sm" ? { base: "14px", md: "16px" } : { base: "16px", md: "24px" }}>
          {children}
        </Box>
      </Flex>
    );
  }

  if (mainCard && depth === 0) {
    // Figma "Main card": white, radius 12, 1px #E4E7EB, padding 24, 16px gap,
    // title 18/600 #30384B.
    return provider(
      <Flex
        direction="column"
        gap="16px"
        bg="white"
        borderWidth="1px"
        borderColor="#E4E7EB"
        borderRadius="12px"
        p={{ base: "16px", md: "24px" }}
        style={containerStyle}
      >
        {title && (
          <Flex alignItems="center" justifyContent="space-between" gap="12px" flexWrap="wrap" minH="36px">
            <Text as="h1" fontSize="18px" lineHeight="23px" fontWeight="600" color="#30384B">
              {title}
            </Text>
            {rightSection && <Box>{rightSection}</Box>}
          </Flex>
        )}
        <Box w="100%">{children}</Box>
      </Flex>
    );
  }

  if (pageLayout || (depth === 0 && contentCard)) {
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
              fontSize="20px"
              lineHeight="24px"
              fontWeight="600"
              color="fg"
              minW="160px"
            >
              {title}
            </Text>
            {rightSection && <Box>{rightSection}</Box>}
          </Flex>
        )}
        {contentCard ? (
          <Flex
            direction="column"
            gap="16px"
            w="100%"
            bg="white"
            borderWidth="1px"
            borderColor="#F0E1D7"
            borderRadius="12px"
            p={{ base: "16px", md: "20px" }}
          >
            {children}
          </Flex>
        ) : (
          <Box w="100%">{children}</Box>
        )}
      </Flex>
    );
  }

  // Top-level form / detail page (no table): Figma puts the page title outside
  // (20/600 #202938) and the content in a white card (radius 12, 1px #F1E3D9,
  // padding 24) — "Add Task", "New Master", "Add Branch Target" …
  if (pageForm && depth === 0 && !collapsible) {
    return provider(
      <Flex direction="column" gap="16px" w={fullWidth ? "100%" : "auto"} style={containerStyle}>
        {title && (
          <Flex alignItems="center" justifyContent="space-between" gap="12px" flexWrap="wrap">
            <Text as="h1" fontSize="20px" lineHeight="24px" fontWeight="600" color="fg" minW="160px">
              {title}
            </Text>
            {rightSection && <Box>{rightSection}</Box>}
          </Flex>
        )}
        <Box
          bg="white"
          borderWidth="1px"
          borderColor="border"
          borderRadius="12px"
          p={{ base: "16px", md: "24px" }}
          w="100%"
        >
          {children}
        </Box>
      </Flex>
    );
  }

  // Figma "Card / …": white, radius 14, 1px #F1E3D9, padding 20, 16px gap,
  // title 16/600 #202938, no divider under the title.
  return provider(
    <Flex
      bg="white"
      borderColor="border"
      borderWidth="1px"
      borderRadius="14px"
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
          px={{ base: "16px", md: "20px" }}
          pt={{ base: "16px", md: "20px" }}
          pb={showBody ? 0 : { base: "16px", md: "20px" }}
          gap="12px"
          alignItems="center"
          flexWrap="wrap"
          w="100%"
          textAlign="left"
          bg="white"
          cursor={collapsible ? "pointer" : undefined}
          borderWidth={0}
        >
          <Text
            fontSize={size === "sm" ? "16px" : "18px"}
            lineHeight={size === "sm" ? "19px" : "22px"}
            fontWeight="600"
            color="fg"
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
              color="#C95C18"
              transform={open ? "rotate(180deg)" : "rotate(0deg)"}
              transition="transform 0.2s ease"
            />
          )}
        </Flex>
      )}

      {showBody && (
        <Box
          px={{ base: "16px", md: "20px" }}
          pb={{ base: "16px", md: "20px" }}
          pt={title ? "16px" : { base: "16px", md: "20px" }}
          w="100%"
        >
          {children}
        </Box>
      )}
    </Flex>
  );
}

export default CustomContainer;
