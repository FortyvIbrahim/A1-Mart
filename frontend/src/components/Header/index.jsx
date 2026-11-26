"use client";

import useMyTasks from "@/api/customHooks/useMyTasks";
import { useSidebar } from "@/contexts/SidebarContext";
import { useUser } from "@/contexts/UserContext";
import usePermission from "@/customHooks/usePermission";
import { Box, Flex, IconButton, Menu, Portal, Text } from "@chakra-ui/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  LuBell,
  LuChevronDown,
  LuListChecks,
  LuLogOut,
  LuMenu,
  LuSettings,
} from "react-icons/lu";
import TaskNotificationModal from "@/components/TaskNotificationModal";
import SearchBar from "./SearchBar";
import { Tooltip } from "../ui/tooltip";

const thirtyMinutes = 30 * 60 * 1000;

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "A1";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] ?? "";
  return `${first}${last}`.toUpperCase();
}

function Header() {
  const router = useRouter();
  const { setIsMobileOpen } = useSidebar();
  const { employeeData, logout, isAuthenticated } = useUser();
  const { tasks } = useMyTasks({ ping: true, pingInterval: thirtyMinutes });
  const [shouldShake, setShouldShake] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const canViewTasks = usePermission("view_my_tasks");

  const openTasksCount = tasks.filter((task) => task.status === "open").length;
  const inProgressTasksCount = tasks.filter(
    (task) => task.status === "in_progress"
  ).length;
  const hasTasks = openTasksCount > 0;

  // Show the task reminder modal at most every 30 minutes while tasks are pending.
  useEffect(() => {
    if (!canViewTasks) return;

    const hasPendingTasks = openTasksCount > 0 || inProgressTasksCount > 0;
    if (!hasPendingTasks) return;

    const checkAndShowNotification = () => {
      const lastShownTimestamp = sessionStorage.getItem(
        "taskNotificationLastShown"
      );
      const now = Date.now();

      if (
        !lastShownTimestamp ||
        now - parseInt(lastShownTimestamp, 10) >= thirtyMinutes
      ) {
        setTimeout(() => {
          setShowNotificationModal(true);
          sessionStorage.setItem("taskNotificationLastShown", now.toString());
        }, 1000);
      }
    };

    checkAndShowNotification();
    const interval = setInterval(checkAndShowNotification, 60000);
    return () => clearInterval(interval);
  }, [canViewTasks, openTasksCount, inProgressTasksCount]);

  useEffect(() => {
    if (!hasTasks) {
      setShouldShake(false);
      return;
    }

    setShouldShake(true);
    const timeout = setTimeout(() => setShouldShake(false), 500);
    const interval = setInterval(() => {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [hasTasks]);

  if (!isAuthenticated) {
    return null;
  }

  const name = employeeData?.employee_name ?? "";
  const branch = employeeData?.branch_name ?? "";
  const designation = employeeData?.designation_name ?? "";

  const bell = (
    <IconButton
      variant="ghost"
      aria-label={
        openTasksCount ? `${openTasksCount} open tasks` : "Notifications"
      }
      size="md"
      borderRadius="10px"
      color="gray.700"
      position="relative"
      _hover={{ bg: "brand.50", color: "brand.600" }}
    >
      <span className={shouldShake ? "bell-shake" : undefined}>
        <LuBell size={20} />
      </span>
      {openTasksCount > 0 && (
        <Box
          position="absolute"
          top="5px"
          right="5px"
          minW="17px"
          h="17px"
          px="4px"
          borderRadius="999px"
          bg="brand.500"
          color="white"
          fontSize="10px"
          fontWeight="700"
          display="flex"
          alignItems="center"
          justifyContent="center"
          border="2px solid var(--a1-base)"
        >
          {openTasksCount > 99 ? "99+" : openTasksCount}
        </Box>
      )}
    </IconButton>
  );

  return (
    <>
      <Flex
        as="header"
        w="100%"
        position="sticky"
        top="0"
        zIndex="900"
        alignItems="center"
        gap={{ base: "10px", md: "16px" }}
        px={{ base: "14px", md: "28px" }}
        py={{ base: "10px", md: "14px" }}
        bg="rgba(255, 251, 248, 0.92)"
        backdropFilter="saturate(1.2) blur(8px)"
      >
        <IconButton
          display={{ base: "inline-flex", md: "none" }}
          variant="ghost"
          aria-label="Open menu"
          onClick={() => setIsMobileOpen(true)}
          color="gray.700"
          borderRadius="10px"
        >
          <LuMenu size={20} />
        </IconButton>

        <Box flex="1" minW={0}>
          <SearchBar />
        </Box>

        <Flex alignItems="center" gap={{ base: "4px", md: "10px" }}>
          {canViewTasks ? (
            <Tooltip content="My tasks">
              <Link href="/tasks/mine">{bell}</Link>
            </Tooltip>
          ) : (
            <Box display={{ base: "none", md: "block" }}>{bell}</Box>
          )}

          <Menu.Root positioning={{ placement: "bottom-end" }}>
            <Menu.Trigger asChild>
              <Flex
                as="button"
                alignItems="center"
                gap="10px"
                pl="6px"
                pr={{ base: "6px", md: "12px" }}
                py="6px"
                bg="white"
                borderRadius="12px"
                boxShadow="0 1px 3px rgba(31, 41, 55, 0.06)"
                cursor="pointer"
                transition="box-shadow 0.15s ease"
                _hover={{ boxShadow: "0 2px 8px rgba(31, 41, 55, 0.1)" }}
                aria-label="Open profile menu"
              >
                <Box
                  w="34px"
                  h="34px"
                  borderRadius="999px"
                  bg="brand.100"
                  color="brand.600"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="12px"
                  fontWeight="700"
                  position="relative"
                  overflow="hidden"
                  flexShrink={0}
                >
                  {employeeData?.profile_img_url ? (
                    <Image
                      src={employeeData.profile_img_url}
                      alt=""
                      fill
                      sizes="34px"
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    getInitials(name)
                  )}
                </Box>
                <Box
                  display={{ base: "none", md: "block" }}
                  textAlign="left"
                  maxW="220px"
                >
                  <Text
                    fontSize="12.5px"
                    fontWeight="700"
                    color="gray.800"
                    textTransform="uppercase"
                    lineHeight="1.2"
                    truncate
                  >
                    {name || "A1 MART"}
                  </Text>
                  <Text
                    fontSize="10.5px"
                    color="gray.500"
                    textTransform="uppercase"
                    lineHeight="1.3"
                    mt="2px"
                    truncate
                  >
                    {branch || designation}
                  </Text>
                </Box>
                <Box display={{ base: "none", md: "block" }} color="brand.500">
                  <LuChevronDown size={16} />
                </Box>
              </Flex>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content
                  minW="220px"
                  borderRadius="12px"
                  p="6px"
                  bg="white"
                  borderWidth="1px"
                  borderColor="border"
                  boxShadow="0 12px 32px rgba(31, 41, 55, 0.12)"
                  zIndex={1500}
                >
                  <Box px="10px" py="8px" mb="4px">
                    <Text fontSize="13px" fontWeight="700" color="gray.800">
                      {name || "A1 MART"}
                    </Text>
                    {designation && (
                      <Text fontSize="11.5px" color="gray.500">
                        {designation}
                      </Text>
                    )}
                    {branch && (
                      <Text fontSize="11.5px" color="gray.500">
                        {branch}
                      </Text>
                    )}
                  </Box>
                  <Menu.Separator borderColor="border.muted" />
                  {canViewTasks && (
                    <Menu.Item
                      value="tasks"
                      borderRadius="8px"
                      fontSize="13px"
                      py="8px"
                      cursor="pointer"
                      onSelect={() => router.push("/tasks/mine")}
                    >
                      <LuListChecks color="var(--a1-primary)" />
                      My tasks
                      {openTasksCount > 0 && (
                        <Text ml="auto" fontSize="11px" color="brand.600" fontWeight="600">
                          {openTasksCount} open
                        </Text>
                      )}
                    </Menu.Item>
                  )}
                  <Menu.Item
                    value="settings"
                    borderRadius="8px"
                    fontSize="13px"
                    py="8px"
                    cursor="pointer"
                    onSelect={() => router.push("/settings")}
                  >
                    <LuSettings color="var(--a1-primary)" />
                    Settings
                  </Menu.Item>
                  <Menu.Separator borderColor="border.muted" />
                  <Menu.Item
                    value="logout"
                    borderRadius="8px"
                    fontSize="13px"
                    py="8px"
                    cursor="pointer"
                    color="red.600"
                    _hover={{ bg: "red.50" }}
                    onSelect={logout}
                  >
                    <LuLogOut />
                    Logout
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        </Flex>
      </Flex>

      {canViewTasks && (
        <TaskNotificationModal
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          openTasksCount={openTasksCount}
          inProgressTasksCount={inProgressTasksCount}
        />
      )}
    </>
  );
}

export default Header;
