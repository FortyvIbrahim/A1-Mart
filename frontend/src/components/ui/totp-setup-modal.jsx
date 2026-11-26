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
  HStack,
} from "@chakra-ui/react";
import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";

function TOTPSetupModal({
  isOpen,
  onClose,
  onSetupComplete,
  setupTOTP,
  verifyTOTPSetup,
}) {
  const [step, setStep] = useState(1); // 1: Show QR, 2: Verify code
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [otpauth, setOtpauth] = useState(null);
  const [totpCode, setTotpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && step === 1) {
      handleSetup();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setStep(1);
      setQrCode(null);
      setSecret(null);
      setOtpauth(null);
      setTotpCode("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 2 && inputRef.current) {
      // Focus input when verification step opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [step]);

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const data = await setupTOTP();

      if (data.code === 200) {
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setOtpauth(data.otpauth);
        toast.success(
          "QR code generated. Please scan it with your authenticator app."
        );
      } else {
        toast.error(data.msg || "Failed to generate QR code");
        onClose();
      }
    } catch (err) {
      toast.error("Error setting up 2FA");
      console.log(err);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setTotpCode(value);
  };

  const handleVerify = async () => {
    if (totpCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setIsVerifying(true);
    try {
      const data = await verifyTOTPSetup(totpCode);

      if (data.code === 200) {
        toast.success("2FA enabled successfully!");
        onSetupComplete();
        onClose();
      } else {
        toast.error(data.msg || "Invalid code. Please try again.");
      }
    } catch (err) {
      toast.error("Error verifying code");
      console.log(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && totpCode.length === 6) {
      handleVerify();
    }
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setTotpCode("");
    } else {
      onClose();
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
              {step === 1 ? "Setup Two-Factor Authentication" : "Verify Setup"}
            </Text>
          </DialogHeader>

          <DialogBody pt={4}>
            <VStack spacing={4} align="stretch">
              {step === 1 ? (
                <>
                  <Text color="gray.600" fontSize="sm" lineHeight="1.5">
                    Scan this QR code with your authenticator app (Google
                    Authenticator, Microsoft Authenticator, Authy, etc.):
                  </Text>

                  {isLoading ? (
                    <Box
                      w="100%"
                      h="300px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text>Generating QR code...</Text>
                    </Box>
                  ) : qrCode ? (
                    <Flex
                      direction="column"
                      alignItems="center"
                      gap={4}
                      p={4}
                      bg="gray.50"
                      borderRadius="md"
                    >
                      <Box
                        border="2px solid"
                        borderColor="gray.200"
                        borderRadius="md"
                        p={2}
                        bg="white"
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        w="100%"
                      >
                        <img
                          src={qrCode}
                          alt="TOTP QR Code"
                          style={{
                            width: "100%",
                            maxWidth: "250px",
                            height: "auto",
                            display: "block",
                          }}
                        />
                      </Box>
                      {secret && (
                        <Box
                          w="100%"
                          p={3}
                          bg="gray.100"
                          borderRadius="md"
                          textAlign="center"
                        >
                          <Text fontSize="xs" color="gray.600" mb={1}>
                            Manual Entry Key:
                          </Text>
                          <Text
                            fontSize="sm"
                            fontFamily="mono"
                            fontWeight="semibold"
                            color="gray.800"
                            wordBreak="break-all"
                          >
                            {secret}
                          </Text>
                        </Box>
                      )}
                      <Text fontSize="xs" color="gray.500" textAlign="center">
                        After scanning, click "Next" to verify your setup.
                      </Text>
                    </Flex>
                  ) : null}
                </>
              ) : (
                <>
                  <Text color="gray.600" fontSize="sm" lineHeight="1.5">
                    Enter the 6-digit code from your authenticator app to
                    complete the setup:
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
                </>
              )}
            </VStack>
          </DialogBody>

          <DialogFooter pt={4} gap={3}>
            <Button
              variant="outline"
              colorScheme="gray"
              onClick={handleBack}
              disabled={isLoading || isVerifying}
            >
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            {step === 1 ? (
              <Button
                onClick={handleNext}
                isLoading={isLoading}
                loadingText="Generating..."
                disabled={!qrCode || isLoading}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleVerify}
                isLoading={isVerifying}
                loadingText="Verifying..."
                disabled={totpCode.length !== 6 || isVerifying}
              >
                Verify & Enable
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog.Root>
    </Flex>
  );
}

export default TOTPSetupModal;
