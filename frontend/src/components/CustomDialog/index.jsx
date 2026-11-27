"use client";

import React from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Flex,
  IconButton,
  Text,
} from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import { ContainerContext, EMPTY_CONTAINER_CONTEXT } from "../CustomContainer";

/**
 * A centered modal dialog. Renders a full-screen overlay with the dialog content
 * centered in the viewport.
 *
 * @param {boolean} open - Whether the dialog is open
 * @param {(e: { open: boolean }) => void} onOpenChange - Called when open state changes (e.g. backdrop click)
 * @param {React.ReactNode} title - Header title (string or custom node)
 * @param {React.ReactNode} children - Body content
 * @param {React.ReactNode} [footer] - Optional footer (e.g. Cancel / Save buttons)
 * @param {string} [maxW] - Max width (e.g. "90vw", "2xl")
 * @param {string} [maxH] - Max height (e.g. "90vh")
 * @param {object} [contentProps] - Extra props for DialogContent
 * @param {object} [bodyProps] - Extra props for DialogBody (e.g. overflow, flex layout)
 */
function CustomDialog({
  open,
  onOpenChange,
  title,
  children,
  footer = null,
  maxW = "90vw",
  maxH = "90vh",
  contentProps = {},
  bodyProps = {},
}) {
  if (!open) return null;

  return (
    <Flex
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={1000}
      justifyContent="center"
      alignItems="center"
      h="100dvh"
    >
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <DialogBackdrop bg="rgba(31, 41, 55, 0.35)" backdropFilter="blur(3px)" />
        <DialogContent
          mx={4}
          maxW={maxW}
          maxH={maxH}
          borderRadius="14px"
          borderWidth="1px"
          borderColor="#E4E7F2"
          overflow="hidden"
          bg="white"
          boxShadow="0 24px 60px rgba(31, 41, 55, 0.18)"
          {...contentProps}
        >
          {/* Figma "Modal header": 20/24 padding, title 21/600 #30384B, 32px close. */}
          <DialogHeader
            flexShrink={0}
            px="24px"
            py="20px"
            gap="12px"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            borderBottomWidth="1px"
            borderColor="#F0E9E5"
          >
            {typeof title === "string" || typeof title === "number" ? (
              <Text fontSize="21px" lineHeight="26px" fontWeight="600" color="#30384B">
                {title}
              </Text>
            ) : (
              title
            )}
            {onOpenChange && (
              <IconButton
                aria-label="Close"
                size="sm"
                w="32px"
                h="32px"
                minW="32px"
                bg="app.tableHeader"
                color="#C95C18"
                borderRadius="8px"
                _hover={{ bg: "brand.100" }}
                onClick={() => onOpenChange({ open: false })}
              >
                <LuX size={16} />
              </IconButton>
            )}
          </DialogHeader>
          <DialogBody overflowY="auto" px="28px" pt="24px" pb="22px" {...bodyProps}>
            <ContainerContext.Provider value={EMPTY_CONTAINER_CONTEXT}>
              {children}
            </ContainerContext.Provider>
          </DialogBody>
          {footer != null && (
            <DialogFooter
              flexShrink={0}
              gap="12px"
              px="24px"
              py="16px"
              borderTopWidth="1px"
              borderColor="#F0E9E5"
            >
              {footer}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog.Root>
    </Flex>
  );
}

export default CustomDialog;
