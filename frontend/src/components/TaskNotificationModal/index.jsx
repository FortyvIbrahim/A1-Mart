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
  Icon,
  HStack,
  Flex,
} from "@chakra-ui/react";
import { FaBell } from "react-icons/fa";
import React from "react";
import Link from "next/link";

function TaskNotificationModal({
  isOpen,
  onClose,
  openTasksCount,
  inProgressTasksCount,
}) {
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
        <DialogBackdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <DialogContent mx={4} borderRadius="6px" overflow="hidden" maxW="md">
          <DialogHeader pb={2}>
            <HStack spacing={3}>
              <Icon as={FaBell} color="brand500" boxSize={4} />
              <Text fontSize="md" fontWeight="semibold" color="gray.800">
                Task Notification
              </Text>
            </HStack>
          </DialogHeader>

          <DialogBody pt={0}>
            <VStack spacing={3} align="stretch">
              <Text color="gray.600" fontSize="sm" lineHeight="1.5">
                You have pending tasks:
              </Text>
              {openTasksCount > 0 && (
                <Text color="gray.800" fontSize="sm" fontWeight="medium">
                  • {openTasksCount} task{openTasksCount !== 1 ? "s" : ""} open
                </Text>
              )}
              {inProgressTasksCount > 0 && (
                <Text color="gray.800" fontSize="sm" fontWeight="medium">
                  • {inProgressTasksCount} task
                  {inProgressTasksCount !== 1 ? "s" : ""} in progress
                </Text>
              )}
            </VStack>
          </DialogBody>

          <DialogFooter pt={4} gap={3}>
            <Button variant="outline" colorScheme="gray" onClick={onClose}>
              Dismiss
            </Button>
            <Link href="/tasks/mine" onClick={onClose}>
              <Button colorScheme="brand">View Tasks</Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog.Root>
    </Flex>
  );
}

export default TaskNotificationModal;
