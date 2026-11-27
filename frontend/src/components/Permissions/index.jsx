"use client";

import React, { useMemo, useState } from "react";
import { Box, Button, Checkbox, Flex, Select, Portal, Text, createListCollection } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { PERMISSIONS } from "@/constants/permissions";

const CustomCheckbox = ({ checked, disabled, onClick }) => {
  return (
    <Checkbox.Root
      checked={checked}
      disabled={disabled}
      colorPalette="brand"
      onClick={(e) => {
        if (disabled) return;
        e.preventDefault();
        onClick(!checked);
      }}
      size="sm"
      cursor={disabled ? "default" : "pointer"}
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control
        borderColor={checked ? "#F47721" : "#9CA3AF"}
        bg={checked ? "#F47721" : "white"}
        borderRadius="4px"
      >
        <Checkbox.Indicator color="white" />
      </Checkbox.Control>
    </Checkbox.Root>
  );
};

const PermissionCheckbox = ({ permission, isChecked, viewOnly, onPermissionsChange }) => {
  if (!permission) {
    return (
      <Text color="fg.muted" fontSize="13px">
        –
      </Text>
    );
  }
  return (
    <CustomCheckbox
      checked={isChecked}
      disabled={viewOnly}
      onClick={(value) => onPermissionsChange(permission, value)}
    />
  );
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function Permissions({ permissions = [], onPermissionsChange, viewOnly = false }) {
  const groups = useMemo(() => Object.entries(PERMISSIONS), []);
  const [selectedGroupKey, setSelectedGroupKey] = useState(() => groups[0]?.[0] ?? "");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const activeGroup = useMemo(() => {
    const found = groups.find(([key]) => key === selectedGroupKey);
    return found ? found[1] : groups[0]?.[1];
  }, [groups, selectedGroupKey]);

  const groupItems = useMemo(() => {
    if (!activeGroup?.items) return [];
    return Object.entries(activeGroup.items);
  }, [activeGroup]);

  const totalPages = Math.max(1, Math.ceil(groupItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return groupItems.slice(start, start + pageSize);
  }, [groupItems, safePage, pageSize]);

  const pageSizeCollection = useMemo(
    () =>
      createListCollection({
        items: PAGE_SIZE_OPTIONS.map((n) => ({ label: String(n), value: String(n) })),
      }),
    []
  );

  return (
    <Flex
      direction={{ base: "column", md: "row" }}
      gap="20px"
      alignItems="flex-start"
      w="100%"
    >
      {/* Left category list (Figma Designations split view) */}
      <Flex
        direction={{ base: "row", md: "column" }}
        w={{ base: "100%", md: "240px" }}
        flexShrink={0}
        overflowX={{ base: "auto", md: "visible" }}
        gap="2px"
      >
        {groups.map(([groupKey, group]) => {
          const isActive = groupKey === (selectedGroupKey || groups[0]?.[0]);
          return (
            <Box
              key={groupKey}
              as="button"
              type="button"
              textAlign="left"
              whiteSpace={{ base: "nowrap", md: "normal" }}
              px="14px"
              py="10px"
              borderRadius="6px"
              fontSize="12.5px"
              lineHeight="17px"
              fontWeight={isActive ? "600" : "500"}
              bg={isActive ? "#FFF5ED" : "transparent"}
              color={isActive ? "#C95C18" : "#30384B"}
              _hover={{
                bg: isActive ? "#FFF5ED" : "#FFFBF8",
                color: "#C95C18",
              }}
              cursor="pointer"
              onClick={() => {
                setSelectedGroupKey(groupKey);
                setPage(1);
              }}
            >
              {group.title}
            </Box>
          );
        })}
      </Flex>

      {/* Right bordered permission table matching Figma */}
      <Box
        flex={1}
        minW={0}
        w="100%"
        borderWidth="1px"
        borderColor="#E4E7EB"
        borderRadius="10px"
        overflow="hidden"
        bg="white"
      >
        <Box overflowX="auto" w="100%">
          <Box minW="520px">
            <Flex
              bg="#FFF5ED"
              borderBottomWidth="1px"
              borderColor="#F1E3D9"
              px="18px"
              py="12px"
              fontSize="12px"
              fontWeight="600"
              color="#30384B"
              alignItems="center"
            >
              <Box flex="2" minW="180px">
                Permissions
              </Box>
              <Box flex="1" minW="70px">
                View
              </Box>
              <Box flex="1" minW="70px">
                Add
              </Box>
              <Box flex="1" minW="70px">
                Delete
              </Box>
            </Flex>

            {pagedItems.length === 0 ? (
              <Flex py="28px" justify="center" color="fg.muted" fontSize="13px">
                No permissions in this section.
              </Flex>
            ) : (
              pagedItems.map(([itemKey, item], idx) => (
                <Flex
                  key={itemKey}
                  px="18px"
                  py="12px"
                  alignItems="center"
                  bg={idx % 2 === 1 ? "#FFFDFB" : "white"}
                  borderBottomWidth={idx === pagedItems.length - 1 ? 0 : "1px"}
                  borderColor="#F3F4F6"
                >
                  <Box flex="2" minW="180px" fontSize="12.5px" color="#30384B">
                    {item.title}
                  </Box>
                  <Box flex="1" minW="70px">
                    <PermissionCheckbox
                      permission={item.permissions?.view}
                      isChecked={permissions.includes(item.permissions?.view)}
                      viewOnly={viewOnly}
                      onPermissionsChange={onPermissionsChange}
                    />
                  </Box>
                  <Box flex="1" minW="70px">
                    <PermissionCheckbox
                      permission={item.permissions?.add}
                      isChecked={permissions.includes(item.permissions?.add)}
                      viewOnly={viewOnly}
                      onPermissionsChange={onPermissionsChange}
                    />
                  </Box>
                  <Box flex="1" minW="70px">
                    <PermissionCheckbox
                      permission={item.permissions?.delete}
                      isChecked={permissions.includes(item.permissions?.delete)}
                      viewOnly={viewOnly}
                      onPermissionsChange={onPermissionsChange}
                    />
                  </Box>
                </Flex>
              ))
            )}
          </Box>
        </Box>

        {/* Footer pagination matching AgGrid Figma bar */}
        <Flex
          px="16px"
          py="10px"
          borderTopWidth="1px"
          borderColor="#E4E7EB"
          alignItems="center"
          justifyContent="space-between"
          gap="12px"
          flexWrap="wrap"
          bg="white"
        >
          <Flex alignItems="center" gap="8px">
            <Text fontSize="12px" color="fg.muted">
              Rows per page
            </Text>
            <Select.Root
              collection={pageSizeCollection}
              value={[String(pageSize)]}
              onValueChange={(e) => {
                setPageSize(Number(e.value?.[0] || 20));
                setPage(1);
              }}
              size="xs"
              w="72px"
            >
              <Select.HiddenSelect />
              <Select.Control>
                <Select.Trigger h="30px" borderColor="#E4E7EB" borderRadius="6px">
                  <Select.ValueText />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator color="#C95C18" />
                </Select.IndicatorGroup>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content>
                    {pageSizeCollection.items.map((item) => (
                      <Select.Item key={item.value} item={item}>
                        {item.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
          </Flex>

          <Flex alignItems="center" gap="4px">
            <Button
              type="button"
              size="xs"
              variant="outline"
              minW="28px"
              h="28px"
              px="0"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <LuChevronLeft size={14} />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
              <Button
                key={pNum}
                type="button"
                size="xs"
                variant="plain"
                minW="28px"
                h="28px"
                px="6px"
                fontSize="12px"
                fontWeight={pNum === safePage ? "600" : "500"}
                color={pNum === safePage ? "#F47721" : "#637188"}
                onClick={() => setPage(pNum)}
              >
                {pNum}
              </Button>
            ))}
            <Button
              type="button"
              size="xs"
              variant="outline"
              minW="28px"
              h="28px"
              px="0"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <LuChevronRight size={14} />
            </Button>
          </Flex>
        </Flex>
      </Box>
    </Flex>
  );
}

export default Permissions;
