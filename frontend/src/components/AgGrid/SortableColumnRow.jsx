"use client";

import { Box, Checkbox, Flex } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LuGripVertical } from "react-icons/lu";

/** One draggable column chip in the table settings grid (Figma "Column row"). */
export default function SortableColumnRow({
  id,
  headerName,
  visible,
  onToggleVisible,
  disabled,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <Flex
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 2 : undefined,
      }}
      alignItems="center"
      gap="8px"
      h="38px"
      px="8px"
      bg="white"
      borderWidth="1px"
      borderColor={isDragging ? "brand.300" : "border"}
      borderRadius="9px"
      boxShadow={isDragging ? "0 8px 20px rgba(244,119,33,0.18)" : "none"}
      opacity={visible ? 1 : 0.7}
      minW={0}
    >
      <Box
        cursor="grab"
        color="gray.400"
        _active={{ cursor: "grabbing" }}
        touchAction="none"
        display="flex"
        flexShrink={0}
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${headerName ?? id}`}
      >
        <LuGripVertical size={14} />
      </Box>
      <Checkbox.Root
        checked={visible}
        onCheckedChange={(e) => onToggleVisible?.(e.checked)}
        colorPalette="brand"
        size="sm"
        disabled={disabled}
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Label fontSize="13px" color="gray.700" fontWeight="400" truncate>
          {headerName ?? id}
        </Checkbox.Label>
      </Checkbox.Root>
    </Flex>
  );
}
