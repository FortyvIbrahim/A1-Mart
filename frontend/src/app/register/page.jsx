"use client";

import { Box, Button, Input, Link } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { handleRegister } from "@/api/helpers/user";
import toast from "react-hot-toast";
import { useUser } from "@/contexts/UserContext";
import { PasswordInput } from "@/components/ui/password-input";
import { useRouter } from "next/navigation";
import { AuthShell, AuthField, authInputProps } from "@/components/AuthShell";

function Register() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login: handleSaveLogin, isAuthenticated } = useUser();

  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;

  useEffect(() => {
    if (isAuthenticated && typeof window !== "undefined") {
      window.location = "/";
    }
  }, [isAuthenticated]);

  // Same API contract as before: POST /user/register { username, password }.
  // Employee name/branch come from the employee record matched by phone number.
  const handleRegisterClick = async () => {
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const data = await handleRegister(username, password);

      if (data.code === 404) {
        toast.error("Phone number not found!");
      } else if (data.code === 400) {
        toast.error("Phone number already registered!");
      } else if (data.code !== 200) {
        throw data;
      } else if (data.code === 200) {
        toast.success("Registered successfully!");

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

        router.push("/login");
      }
    } catch (err) {
      toast.error("Error registering!");
      console.log(err);
    }
  };

  return (
    <AuthShell
      title="Register"
      subtitle="Create your A1 MART employee account"
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" color="brand.600" fontWeight="600">
            Login
          </Link>
        </>
      }
    >
      <Box
        as="form"
        display="flex"
        flexDirection="column"
        gap="16px"
        onSubmit={async (e) => {
          e.preventDefault();
          if (submitting) return;
          setSubmitting(true);
          try {
            await handleRegisterClick();
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
            placeholder="Enter your registered phone number"
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
            placeholder="Create a password"
            autoComplete="new-password"
            required
          />
        </AuthField>
        <AuthField
          label="Confirm Password"
          invalid={mismatch}
          errorText={mismatch ? "Passwords do not match" : undefined}
        >
          <PasswordInput
            {...authInputProps}
            rootProps={{ w: "100%" }}
            value={confirmPassword}
            onChange={(val) => setConfirmPassword(val.target.value)}
            placeholder="Confirm your password"
            autoComplete="new-password"
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
          loadingText="Registering"
          disabled={mismatch}
        >
          Register
        </Button>
      </Box>
    </AuthShell>
  );
}

export default Register;
