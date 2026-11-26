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
          <DialogHeader pt="22px" px="24px" pb={2}>
            <Text fontSize="17px" fontWeight="700" color="gray.800">
              {title}
            </Text>
          </DialogHeader>

          <DialogBody pt={0} px="24px">
            <VStack spacing={4} align="stretch">
              <Text color="gray.600" fontSize="sm" lineHeight="1.5">
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
              colorPalette="brand"
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
