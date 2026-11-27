import { LuX } from "react-icons/lu";
import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
  Text,
  VStack,
  Flex,
  Box,
} from "@chakra-ui/react";
import React from "react";

function DeleteModal({
  isOpen,
  onClose,
  onDelete,
  onBack,
  title = "Confirm Delete",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  isLoading = false,
}) {
  const handleDelete = () => {
    onDelete();
    onClose();
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
    onClose();
  };

  if (!isOpen) return null;

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
      <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
        <DialogBackdrop bg="rgba(31, 41, 55, 0.35)" backdropFilter="blur(3px)" />
        <DialogContent
          mx={4}
          borderRadius="14px"
          overflow="hidden"
          maxW="440px"
          boxShadow="0 24px 60px rgba(31, 41, 55, 0.18)"
        >
          {/* Figma PUR/03.03: 16/600 title with a peach close button. */}
          <DialogHeader pt="20px" px="24px" pb={2} display="flex" alignItems="center" justifyContent="space-between" gap="12px">
            <Text fontSize="16px" fontWeight="600" color="fg">
              {title}
            </Text>
            <Box
              as="button"
              type="button"
              aria-label="Close"
              onClick={handleBack}
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              w="28px"
              h="28px"
              borderRadius="8px"
              bg="#FFF5ED"
              color="#C95C18"
              flexShrink={0}
            >
              <LuX size={14} />
            </Box>
          </DialogHeader>

          <DialogBody pt={0} px="24px">
            <VStack spacing={4} align="stretch">
              <Text color="fg.muted" fontSize="12px" lineHeight="18px">
                {message}
              </Text>
            </VStack>
          </DialogBody>

          <DialogFooter pt={4} pb="22px" px="24px" gap={3}>
            <Button
              variant="subtle"
              colorPalette="brand"
              onClick={handleBack}
              disabled={isLoading}
              px="18px"
            >
              Cancel
            </Button>
            <Button
              bg="#C63732"
              color="white"
              _hover={{ bg: "#A92D29" }}
              onClick={handleDelete}
              loading={isLoading}
              loadingText="Deleting..."
              px="18px"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog.Root>
    </Flex>
  );
}

export default DeleteModal;
