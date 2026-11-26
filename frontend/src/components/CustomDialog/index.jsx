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
  Text,
} from "@chakra-ui/react";

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
          overflow="hidden"
          bg="white"
          boxShadow="0 24px 60px rgba(31, 41, 55, 0.18)"
          {...contentProps}
        >
          <DialogHeader
            flexShrink={0}
            px={6}
            pt={5}
            pb={3}
            borderBottomWidth="1px"
            borderColor="border.muted"
          >
            {typeof title === "string" || typeof title === "number" ? (
              <Text fontSize="17px" fontWeight="700" color="gray.800">
                {title}
              </Text>
            ) : (
              title
            )}
          </DialogHeader>
          <DialogBody overflowY="auto" px={6} py={5} {...bodyProps}>
            {children}
          </DialogBody>
          {footer != null && (
            <DialogFooter
              flexShrink={0}
              gap={3}
              px={6}
              py={4}
              borderTopWidth="1px"
              borderColor="border.muted"
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
