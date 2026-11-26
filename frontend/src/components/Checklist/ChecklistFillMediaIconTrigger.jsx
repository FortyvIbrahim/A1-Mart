"use client";

import { getNestedValue } from "@/utils/object";
import { Box, Flex, IconButton, Text } from "@chakra-ui/react";
import { useFormikContext } from "formik";
import React, { useRef } from "react";
import toast from "react-hot-toast";
import { FaImage, FaTimes, FaVideo } from "react-icons/fa";

/**
 * Pick image or video via icon button → opens native file browser (no dropzone).
 */
export default function ChecklistFillMediaIconTrigger({
  name,
  accept,
  kind,
  disabled,
  label,
  maxSize,
}) {
  const { values, setFieldValue } = useFormikContext();
  const inputRef = useRef(null);
  const value = getNestedValue(values, name);

  const Icon = kind === "image" ? FaImage : FaVideo;
  const pickLabel = kind === "image" ? "Choose image" : "Choose video";

  const displayName = () => {
    if (!value) return null;
    if (typeof value === "string") {
      const tail = value.split("/").pop()?.split("?")[0];
      return tail || "Attached";
    }
    return value?.name ?? "Selected file";
  };

  return (
    <Box>
      {label ? (
        <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
          {label}
        </Text>
      ) : null}
      <Flex align="center" gap={3} flexWrap="wrap">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && maxSize != null && f.size > maxSize) {
              toast.error("File is too large for this field.");
              e.target.value = "";
              return;
            }
            if (f) setFieldValue(name, f);
            e.target.value = "";
          }}
        />
        <IconButton
          type="button"
          aria-label={pickLabel}
          title={pickLabel}
          disabled={disabled}
          colorPalette="brand"
          variant="outline"
          size="lg"
          borderRadius="xl"
          minW="48px"
          h="48px"
          onClick={() => inputRef.current?.click()}
        >
          <Icon size={22} />
        </IconButton>
        {value ? (
          <>
            <Text fontSize="sm" color="gray.600" noOfLines={1} maxW={{ base: "160px", md: "280px" }}>
              {displayName()}
            </Text>
            <IconButton
              type="button"
              aria-label="Remove file"
              size="sm"
              variant="ghost"
              colorPalette="gray"
              disabled={disabled}
              onClick={() => setFieldValue(name, null)}
            >
              <FaTimes />
            </IconButton>
          </>
        ) : (
          <Text fontSize="xs" color="gray.500">
            Tap to browse
          </Text>
        )}
      </Flex>
    </Box>
  );
}
