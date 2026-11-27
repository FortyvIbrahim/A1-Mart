"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Flex, Portal, Text } from "@chakra-ui/react";
import { LuCheck, LuChevronDown, LuChevronUp } from "react-icons/lu";
import { useDialogPortal } from "@/components/CustomDialog";

/**
 * Custom styled select / multi-select dropdown matching the Figma design:
 * - Closed: white box, 1px #F1E3D9 border, orange down chevron.
 * - Open: #F47721 orange border, orange up chevron, floating white menu card.
 * - Selected item: #FFF5ED peach fill, #C95C18 text, orange checkmark on the right.
 * - Hover item: #FFF5ED peach fill.
 */
function CustomSelect({
  value,
  onChange,
  onBlur,
  options = [],
  placeholder = "Select...",
  allowEmpty = true,
  emptyLabel,
  emptyValue = "",
  multiple = false,
  disabled = false,
  h = "44px",
  fontSize = "13px",
  w = "100%",
  minW,
  width,
  borderRadius = "8px",
  ariaLabel,
  portalContainer,
  customRender,
}) {
  const dialogPortalRef = useDialogPortal();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const fallbackDialogRef = useRef(null);
  const [menuPos, setMenuPos] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
    placement: "bottom",
    inDialog: false,
  });

  const activePortalContainer = portalContainer?.current
    ? portalContainer
    : dialogPortalRef?.current
      ? dialogPortalRef
      : fallbackDialogRef.current
        ? fallbackDialogRef
        : undefined;

  const normalizedOptions = useMemo(
    () =>
      (Array.isArray(options) ? options : []).map((opt) =>
        typeof opt === "object" && opt !== null
          ? opt
          : { value: opt, label: String(opt) }
      ),
    [options]
  );

  const selectedArray = useMemo(() => {
    if (!multiple) return [];
    if (Array.isArray(value)) return value;
    return value != null && value !== "" ? [value] : [];
  }, [multiple, value]);

  const isSelected = useCallback(
    (optVal) => {
      if (multiple) {
        return selectedArray.some((v) => String(v) === String(optVal));
      }
      if (value === null || value === undefined) {
        return optVal === "" || optVal === null || optVal === undefined;
      }
      return String(value) === String(optVal);
    },
    [multiple, selectedArray, value]
  );

  const displayText = useMemo(() => {
    if (multiple) {
      if (!selectedArray.length) return placeholder;
      return selectedArray
        .map(
          (v) =>
            normalizedOptions.find((o) => String(o.value) === String(v))
              ?.label ?? String(v)
        )
        .join(", ");
    }
    const hasVal = value !== null && value !== undefined && value !== "";
    if (!hasVal) return emptyLabel ?? placeholder;
    return (
      normalizedOptions.find((o) => String(o.value) === String(value))?.label ??
      String(value)
    );
  }, [multiple, selectedArray, value, normalizedOptions, placeholder, emptyLabel]);

  const hasSelectedValue = multiple
    ? selectedArray.length > 0
    : value !== null && value !== undefined && value !== "";

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    if (!portalContainer?.current && !dialogPortalRef?.current) {
      fallbackDialogRef.current = triggerRef.current.closest(
        '[role="dialog"], [role="alertdialog"]'
      );
    }
    const hostEl = portalContainer?.current
      ? portalContainer.current
      : dialogPortalRef?.current
        ? dialogPortalRef.current
        : fallbackDialogRef.current;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 220 && rect.top > 220;
    if (hostEl) {
      const hostRect = hostEl.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom - hostRect.top + 6,
        bottom: hostRect.bottom - rect.top + 6,
        left: rect.left - hostRect.left,
        width: rect.width,
        placement: openUp ? "top" : "bottom",
        inDialog: true,
      });
    } else {
      setMenuPos({
        top: openUp ? rect.top - 6 : rect.bottom + 6,
        bottom: window.innerHeight - rect.top + 6,
        left: rect.left,
        width: rect.width,
        placement: openUp ? "top" : "bottom",
        inDialog: false,
      });
    }
  }, [portalContainer, dialogPortalRef]);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const handleOutside = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
      onBlur?.();
    };

    const handleKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        onBlur?.();
      }
    };

    const handleScrollOrResize = () => updatePosition();

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open, updatePosition, onBlur]);

  const handleSelect = (optValue) => {
    if (disabled) return;
    if (multiple) {
      const exists = selectedArray.some((v) => String(v) === String(optValue));
      const next = exists
        ? selectedArray.filter((v) => String(v) !== String(optValue))
        : [...selectedArray, optValue];
      onChange?.(next);
      return;
    }
    onChange?.(optValue);
    setOpen(false);
    onBlur?.();
  };

  const allItems = useMemo(() => {
    if (multiple || !allowEmpty) return normalizedOptions;
    const label = emptyLabel ?? placeholder;
    if (!label) return normalizedOptions;
    const alreadyHasEmpty = normalizedOptions.some(
      (o) => String(o.value) === String(emptyValue)
    );
    return alreadyHasEmpty
      ? normalizedOptions
      : [{ value: emptyValue, label }, ...normalizedOptions];
  }, [multiple, allowEmpty, emptyLabel, placeholder, emptyValue, normalizedOptions]);

  return (
    <Box w={width ?? w} minW={minW}>
      <Flex
        ref={triggerRef}
        as="button"
        type="button"
        disabled={disabled}
        aria-label={ariaLabel ?? placeholder}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          if (disabled) return;
          updatePosition();
          setOpen((prev) => !prev);
        }}
        w="100%"
        h={h}
        px="12px"
        bg={disabled ? "gray.50" : "white"}
        borderWidth="1px"
        borderColor={open ? "#F47721" : "border"}
        borderRadius={borderRadius}
        alignItems="center"
        justifyContent="space-between"
        gap="8px"
        cursor={disabled ? "not-allowed" : "pointer"}
        opacity={disabled ? 0.65 : 1}
        transition="border-color 0.15s ease, box-shadow 0.15s ease"
        _hover={disabled || open ? undefined : { borderColor: "border.emphasized" }}
        _focusVisible={{
          outline: "none",
          borderColor: "#F47721",
          boxShadow: "0 0 0 2px rgba(244, 119, 33, 0.14)",
        }}
      >
        <Text
          fontSize={fontSize}
          fontWeight="500"
          color={hasSelectedValue ? "fg" : "fg.muted"}
          truncate
          textAlign="left"
          flex={1}
        >
          {displayText}
        </Text>
        <Box color="#C95C18" flexShrink={0} display="flex" alignItems="center">
          {open ? <LuChevronUp size={15} /> : <LuChevronDown size={15} />}
        </Box>
      </Flex>

      {open && !disabled && (
        <Portal {...(activePortalContainer ? { container: activePortalContainer } : {})}>
          <Box
            ref={menuRef}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            position={menuPos.inDialog ? "absolute" : "fixed"}
            pointerEvents="auto"
            top={menuPos.placement === "top" ? undefined : `${menuPos.top}px`}
            bottom={
              menuPos.placement === "top" ? `${menuPos.bottom}px` : undefined
            }
            left={`${menuPos.left}px`}
            w={`${Math.max(menuPos.width, 160)}px`}
            maxH="260px"
            overflowY="auto"
            bg="white"
            borderWidth="1px"
            borderColor="border"
            borderRadius="12px"
            p="6px"
            boxShadow="0 12px 32px rgba(31, 41, 55, 0.12), 0 2px 6px rgba(244, 119, 33, 0.06)"
            zIndex={menuPos.inDialog ? 1800 : 1600}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {allItems.length === 0 ? (
              <Box px="12px" py="10px">
                <Text fontSize="13px" color="fg.muted">
                  No options
                </Text>
              </Box>
            ) : (
              allItems.map((opt) => {
                const selected = isSelected(opt.value);
                return (
                  <Flex
                    as="button"
                    type="button"
                    role="option"
                    aria-selected={selected}
                    key={String(opt.value)}
                    w="100%"
                    alignItems="center"
                    justifyContent="space-between"
                    gap="10px"
                    px="12px"
                    py="9px"
                    borderRadius="8px"
                    bg={selected ? "#FFF5ED" : "transparent"}
                    color={selected ? "#C95C18" : "fg"}
                    fontSize="13px"
                    fontWeight={selected ? "500" : "400"}
                    textAlign="left"
                    cursor="pointer"
                    transition="background-color 0.12s ease"
                    _hover={{ bg: "#FFF5ED" }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(opt.value);
                    }}
                  >
                    <Box flex={1} minW={0}>
                      {customRender ? (
                        customRender(opt)
                      ) : (
                        <Text truncate>{opt.label}</Text>
                      )}
                    </Box>
                    {selected && (
                      <Box color="#F47721" flexShrink={0} display="flex">
                        <LuCheck size={15} />
                      </Box>
                    )}
                  </Flex>
                );
              })
            )}
          </Box>
        </Portal>
      )}
    </Box>
  );
}

export default CustomSelect;
