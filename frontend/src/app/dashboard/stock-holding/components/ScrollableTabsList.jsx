"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Flex, IconButton } from "@chakra-ui/react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

const SCROLL_STEP = 220;

const scrollableTabsCss = {
  overflowX: "auto",
  overflowY: "hidden",
  width: "100%",
  paddingBottom: "2px",
  WebkitOverflowScrolling: "touch",
  scrollBehavior: "smooth",
  scrollbarWidth: "thin",
  scrollbarColor: "#cbd5e0 transparent",
  "& > *": {
    marginBottom: "10px",
  },
  "&::-webkit-scrollbar": {
    height: "4px",
  },
  "&::-webkit-scrollbar-track": {
    background: "transparent",
    marginInline: "4px",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "#cbd5e0",
    borderRadius: "999px",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    background: "#a0aec0",
  },
};

export default function ScrollableTabsList({ children }) {
  const scrollRef = useRef(null);
  const [needsScroll, setNeedsScroll] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setNeedsScroll(false);
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    const overflow = maxScroll > 1;
    setNeedsScroll(overflow);
    setCanScrollLeft(overflow && scrollLeft > 1);
    setCanScrollRight(overflow && scrollLeft < maxScroll - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    updateScrollState();

    el.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [updateScrollState, children]);

  const scrollByStep = (direction) => {
    scrollRef.current?.scrollBy({
      left: direction * SCROLL_STEP,
      behavior: "smooth",
    });
  };

  return (
    <Flex align="center" gap={needsScroll ? 1 : 0} w="100%">
      {needsScroll ? (
        <IconButton
          aria-label="Scroll tabs left"
          size="xs"
          variant="ghost"
          colorPalette="gray"
          flexShrink={0}
          disabled={!canScrollLeft}
          onClick={() => scrollByStep(-1)}
        >
          <FaChevronLeft />
        </IconButton>
      ) : null}

      <Box ref={scrollRef} css={scrollableTabsCss} flex={1} minW={0}>
        {children}
      </Box>

      {needsScroll ? (
        <IconButton
          aria-label="Scroll tabs right"
          size="xs"
          variant="ghost"
          colorPalette="gray"
          flexShrink={0}
          disabled={!canScrollRight}
          onClick={() => scrollByStep(1)}
        >
          <FaChevronRight />
        </IconButton>
      ) : null}
    </Flex>
  );
}
