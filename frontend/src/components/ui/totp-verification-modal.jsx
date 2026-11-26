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
  Input,
  Flex,
  Box,
} from "@chakra-ui/react";
import React, { useState, useRef, useEffect } from "react";

function TOTPVerificationModal({
  isOpen,
  onClose,
  onVerify,
  isLoading = false,
}) {
  const [totpCode, setTotpCode] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Focus input when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      // Reset code when modal closes
      setTotpCode("");
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setTotpCode(value);
  };

  const handleSubmit = () => {
    if (totpCode.length === 6) {
      onVerify(totpCode);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && totpCode.length === 6) {
      handleSubmit();
    }
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
        <DialogBackdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <DialogContent mx={4} borderRadius="6px" overflow="hidden" maxW="md">
          <DialogHeader pb={2}>
            <Text fontSize="md" fontWeight="semibold" color="gray.800">
              Two-Factor Authentication
            </Text>
          </DialogHeader>

          <DialogBody pt={4}>
            <VStack spacing={4} align="stretch">
              <Text color="gray.600" fontSize="sm" lineHeight="1.5">
                Enter the 6-digit code from your authenticator app to complete
                login.
              </Text>
              <Box>
                <Input
                  ref={inputRef}
                  value={totpCode}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  placeholder="000000"
                  maxLength={6}
                  textAlign="center"
                  fontSize="2xl"
                  letterSpacing="0.5em"
                  fontWeight="semibold"
                  size="lg"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
              </Box>
            </VStack>
          </DialogBody>

          <DialogFooter pt={4} gap={3}>
            <Button
              variant="outline"
              colorScheme="gray"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={isLoading}
              loadingText="Verifying..."
              disabled={totpCode.length !== 6}
            >
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog.Root>
    </Flex>
  );
}

export default TOTPVerificationModal;
