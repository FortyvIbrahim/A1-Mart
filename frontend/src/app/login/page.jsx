"use client";

import { Box, Button, Input, Link } from "@chakra-ui/react";
import { AuthShell, AuthField, authInputProps } from "@/components/AuthShell";
import React, { useEffect, useState } from "react";
import { handleLogin, verifyTOTPLogin } from "@/api/helpers/user";
import toast from "react-hot-toast";
import { useUser } from "@/contexts/UserContext";
import { PasswordInput } from "@/components/ui/password-input";
import TOTPVerificationModal from "@/components/ui/totp-verification-modal";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showTOTPModal, setShowTOTPModal] = useState(false);
  const [tempToken, setTempToken] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login: handleSaveLogin, isAuthenticated } = useUser();

  useEffect(() => {
    if (isAuthenticated && typeof window !== "undefined") {
      window.location = "/";
    }
  }, [isAuthenticated]);

  const handleLoginClick = async () => {
    try {
      const data = await handleLogin(username, password);

      if (data.code !== 200) {
        toast.error("Incorrect username or password!");
        return;
      }

      // Check if 2FA is required
      if (data.requires_2fa && data.temp_token) {
        setTempToken(data.temp_token);
        setShowTOTPModal(true);
        toast.success("Please enter your 2FA code");
      } else if (data.token) {
        // Normal login without 2FA
        toast.success("Logged in!");

        handleSaveLogin({
          newToken: data.token,
          newUserType: data.user_data.user_type,
          newDesignationId: data.user_data.designation_id,
          newEmployeeData: {
            employee_name: data.user_data.employee_name,
            branch_name: data.user_data.branch_name,
            branch_id: data.user_data.branch_id,
          },
        });

        if (window) {
          window.location = "/";
        }
      } else {
        throw new Error("Unexpected response from server");
      }
    } catch (err) {
      toast.error("Error logging in!");
      console.log(err);
    }
  };

  const handleTOTPVerify = async (totpCode) => {
    if (!tempToken) {
      toast.error("Session expired. Please login again.");
      setShowTOTPModal(false);
      return;
    }

    setIsVerifying(true);
    try {
      const data = await verifyTOTPLogin(tempToken, totpCode);

      if (data.code === 200 && data.token) {
        toast.success("Logged in!");

        handleSaveLogin({
          newToken: data.token,
          newUserType: data.user_data.user_type,
          newDesignationId: data.user_data.designation_id,
          newEmployeeData: {
            employee_name: data.user_data.employee_name,
            branch_name: data.user_data.branch_name,
            branch_id: data.user_data.branch_id,
          },
        });

        setShowTOTPModal(false);
        setTempToken(null);

        if (window) {
          window.location = "/";
        }
      } else {
        toast.error(data.msg || "Invalid TOTP code. Please try again.");
      }
    } catch (err) {
      toast.error("Error verifying 2FA code!");
      console.log(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCloseTOTPModal = () => {
    setShowTOTPModal(false);
    setTempToken(null);
  };

  return (
    <>
      <AuthShell
        title="Login"
        subtitle="Welcome back to A1 MART"
        footer={
          <>
            New employee?{" "}
            <Link href="/register" color="brand.600" fontWeight="600">
              Register here
            </Link>
          </>
        }
      >
        <Box
          as="form"
          display="flex"
          flexDirection="column"
          gap="16px"
          w="full"
          onSubmit={async (e) => {
            e.preventDefault();
            if (submitting) return;
            setSubmitting(true);
            try {
              await handleLoginClick();
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <AuthField label="Phone Number">
            <Input
              {...authInputProps}
              value={username}
              onChange={(val) => setUsername(val.target.value)}
              placeholder="Enter your phone number"
              autoComplete="username"
              inputMode="tel"
              type="text"
              required
            />
          </AuthField>
          <AuthField label="Password">
            <PasswordInput
              {...authInputProps}
              rootProps={{ w: "100%" }}
              value={password}
              onChange={(val) => setPassword(val.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </AuthField>

          <Button
            type="submit"
            mt="6px"
            h="46px"
            borderRadius="10px"
            fontSize="14px"
            fontWeight="600"
            bg="brand.500"
            color="white"
            _hover={{ bg: "brand.600" }}
            loading={submitting}
            loadingText="Logging in"
          >
            Login
          </Button>
        </Box>
      </AuthShell>

      <TOTPVerificationModal
        isOpen={showTOTPModal}
        onClose={handleCloseTOTPModal}
        onVerify={handleTOTPVerify}
        isLoading={isVerifying}
      />
    </>
  );
}

export default LoginPage;
