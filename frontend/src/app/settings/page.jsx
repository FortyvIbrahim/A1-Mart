"use client";

import {
  Box,
  Button,
  Flex,
  Text,
  VStack,
  HStack,
  Badge,
} from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import {
  setupTOTP,
  verifyTOTPSetup,
  disableTOTP,
  getDetails,
} from "@/api/helpers/user";
import TOTPSetupModal from "@/components/ui/totp-setup-modal";
import useDeleteModal from "@/customHooks/useDeleteModal";
import toast from "react-hot-toast";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";

function Settings() {
  const { token, employeeData, logout } = useUser();
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Check 2FA status on mount
  useEffect(() => {
    const checkStatus = async () => {
      setIsCheckingStatus(true);
      try {
        // Check localStorage first (set when 2FA is enabled/disabled)
        const storedStatus = localStorage.getItem("totp_enabled");
        if (storedStatus !== null) {
          setIs2FAEnabled(storedStatus === "true");
          setIsCheckingStatus(false);
          // return;
        }

        // Try to get user details - backend might return totp_enabled
        const data = await getDetails();
        if (data.code === 200 && data.data) {
          // If backend returns totp_enabled field, use it
          if (data.data.totp_enabled !== undefined) {
            setIs2FAEnabled(data.data.totp_enabled == 1);
            localStorage.setItem(
              "totp_enabled",
              data.data.totp_enabled.toString()
            );
          } else {
            // Default to false if we can't determine
            setIs2FAEnabled(false);
          }
        }
      } catch (err) {
        console.log("Error checking 2FA status:", err);
        // Default to false if we can't determine
        setIs2FAEnabled(false);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    if (token) {
      checkStatus();
    }
  }, [token]);

  const {
    openDeleteModal,
    DeleteModalComponent,
    setLoading: setDeleteModalLoading,
  } = useDeleteModal();

  const handleSetupComplete = () => {
    setIs2FAEnabled(true);
    localStorage.setItem("totp_enabled", "true");
    toast.success("2FA has been enabled successfully!");
  };

  const handleDisable2FA = async () => {
    setIsDisabling(true);
    setDeleteModalLoading(true);
    try {
      const data = await disableTOTP();

      if (data.code === 200) {
        setIs2FAEnabled(false);
        localStorage.setItem("totp_enabled", "false");
        toast.success("2FA has been disabled successfully!");
      } else {
        toast.error(data.msg || "Failed to disable 2FA");
      }
    } catch (err) {
      toast.error("Error disabling 2FA");
      console.log(err);
    } finally {
      setIsDisabling(false);
      setDeleteModalLoading(false);
    }
  };

  const handleDisableClick = () => {
    openDeleteModal({
      title: "Disable Two-Factor Authentication",
      message:
        "Are you sure you want to disable 2FA? Your account will be less secure. You can re-enable it at any time.",
      onDelete: handleDisable2FA,
      onBack: () => {},
    });
  };

  return (
    <GlobalWrapper>
      <CustomContainer title="Settings" size="md">
        <VStack gap={"22px"} align="stretch">
          {/* User Information Section */}
          {/* <Box>
            <Text fontSize="lg" fontWeight="semibold" mb={4} color="gray.800">
              Account Information
            </Text>
            <VStack spacing={3} align="stretch" pl={4}>
              <HStack>
                <Text fontSize="sm" color="gray.600" minW="120px">
                  Name:
                </Text>
                <Text fontSize="sm" fontWeight="medium" color="gray.800">
                  {employeeData?.employee_name || "N/A"}
                </Text>
              </HStack>
              <HStack>
                <Text fontSize="sm" color="gray.600" minW="120px">
                  Designation:
                </Text>
                <Text fontSize="sm" fontWeight="medium" color="gray.800">
                  {employeeData?.designation_name || "N/A"}
                </Text>
              </HStack>
              <HStack>
                <Text fontSize="sm" color="gray.600" minW="120px">
                  Branch:
                </Text>
                <Text fontSize="sm" fontWeight="medium" color="gray.800">
                  {employeeData?.branch_name || "N/A"}
                </Text>
              </HStack>
            </VStack>
          </Box>

          <Box height="1px" bg="gray.200" width="100%" my={2} /> */}

          {/* Security Section */}
          <Box>
            <VStack spacing={4} align="stretch">
              <Flex
                justify="space-between"
                align={{ base: "start", md: "center" }}
                direction={{ base: "column", md: "row" }}
                gap={{ base: 3, md: 0 }}
                p={{ base: 3, md: 4 }}
                bg="gray.50"
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.200"
              >
                <VStack align="start" spacing={1} flex={1}>
                  <HStack wrap="wrap" gap={2}>
                    <Text
                      fontSize={{ base: "sm", md: "md" }}
                      fontWeight="medium"
                      color="gray.800"
                    >
                      Two-Factor Authentication (2FA)
                    </Text>
                    {is2FAEnabled && (
                      <Badge colorPalette="green" variant="solid" size="sm">
                        Enabled
                      </Badge>
                    )}
                    {!is2FAEnabled && (
                      <Badge colorPalette="gray" variant="solid" size="sm">
                        Disabled
                      </Badge>
                    )}
                  </HStack>
                  <Text fontSize="xs" color="gray.600">
                    Add an extra layer of security to your account by requiring
                    a code from your authenticator app when logging in.
                  </Text>
                </VStack>
                <HStack spacing={2} w={{ base: "100%", md: "auto" }}>
                  {isCheckingStatus ? (
                    <Button
                      size="sm"
                      isLoading
                      w={{ base: "100%", md: "auto" }}
                    >
                      Checking...
                    </Button>
                  ) : is2FAEnabled ? (
                    <Button
                      colorScheme="red"
                      variant="outline"
                      size="sm"
                      onClick={handleDisableClick}
                      isLoading={isDisabling}
                      loadingText="Disabling..."
                      w={{ base: "100%", md: "auto" }}
                    >
                      Disable 2FA
                    </Button>
                  ) : (
                    <Button
                      colorScheme="blue"
                      size="sm"
                      onClick={() => setShowSetupModal(true)}
                      w={{ base: "100%", md: "auto" }}
                    >
                      Enable 2FA
                    </Button>
                  )}
                </HStack>
              </Flex>
            </VStack>
          </Box>

          {/* Logout Section */}
          <Box>
            <VStack spacing={4} align="stretch">
              <Flex
                justify="space-between"
                align={{ base: "start", md: "center" }}
                direction={{ base: "column", md: "row" }}
                gap={{ base: 3, md: 0 }}
                p={{ base: 3, md: 4 }}
                bg="gray.50"
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.200"
              >
                <VStack align="start" spacing={1} flex={1}>
                  <Text
                    fontSize={{ base: "sm", md: "md" }}
                    fontWeight="medium"
                    color="gray.800"
                  >
                    Logout
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    Sign out of your account. You will need to log in again to
                    access the system.
                  </Text>
                </VStack>
                <HStack spacing={2} w={{ base: "100%", md: "auto" }}>
                  <Button
                    colorPalette="secondary"
                    variant="subtle"
                    size="sm"
                    onClick={logout}
                    w={{ base: "100%", md: "auto" }}
                  >
                    <i
                      className="fa fa-power-off"
                      style={{ marginRight: "8px", fontSize: "12px" }}
                    />
                    Logout
                  </Button>
                </HStack>
              </Flex>
            </VStack>
          </Box>
        </VStack>
      </CustomContainer>

      <TOTPSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onSetupComplete={handleSetupComplete}
        setupTOTP={setupTOTP}
        verifyTOTPSetup={verifyTOTPSetup}
      />

      <DeleteModalComponent />
    </GlobalWrapper>
  );
}

export default Settings;
