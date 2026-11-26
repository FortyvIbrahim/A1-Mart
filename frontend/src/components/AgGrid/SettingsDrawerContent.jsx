"use client";

import { Box, Button, Checkbox, Flex, Grid, Text } from "@chakra-ui/react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import SortableColumnRow from "./SortableColumnRow";

/** Figma "A1 MART / Table Settings / Approved toolbar popover" body. */
function Section({ title, hint, children, divider = false, spaced = false }) {
  return (
    <Box
      pt={divider ? "16px" : 0}
      mt={divider ? "16px" : spaced ? "20px" : 0}
      borderTopWidth={divider ? "1px" : 0}
      borderColor="border.muted"
    >
      <Text fontSize="14px" fontWeight="600" color="gray.800">
        {title}
      </Text>
      {hint && (
        <Text fontSize="12px" color="gray.500" mt="4px" lineHeight="1.5">
          {hint}
        </Text>
      )}
      <Box mt={hint ? "12px" : "10px"}>{children}</Box>
    </Box>
  );
}

export default function SettingsDrawerContent({
  onExportCsv,
  onExportXlsx,
  onExportPdf,
  defsById,
  columnOrder,
  hiddenIds,
  onToggleVisible,
  onDragEnd,
  showComputationSection,
  computationColumnIds,
  selectedComputationIds,
  onToggleComputation,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const exportButton = (label, onClick) => (
    <Button
      key={label}
      variant="outline"
      h="36px"
      justifyContent="flex-start"
      px="12px"
      fontSize="13px"
      fontWeight="500"
      color="gray.700"
      bg="white"
      borderColor="border"
      _hover={{ bg: "brand.50", borderColor: "brand.200", color: "brand.700" }}
      onClick={onClick}
    >
      {label}
    </Button>
  );

  return (
    <Box>
      <Section title="Export">
        <Grid templateColumns="repeat(3, minmax(0, 1fr))" gap="8px">
          {exportButton("CSV", onExportCsv)}
          {exportButton("XLSX", onExportXlsx)}
          {exportButton("PDF", onExportPdf)}
        </Grid>
      </Section>

      <Section
        title="Columns"
        hint="Drag to reorder, toggle visibility with the checkbox."
        spaced
      >
        <Box maxH="260px" overflowY="auto" pr="2px" mt="-2px">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={columnOrder} strategy={rectSortingStrategy}>
              <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap="8px">
                {columnOrder.map((id) => {
                  const colDef = defsById.get(id);
                  return (
                    <SortableColumnRow
                      key={id}
                      id={id}
                      headerName={colDef?.headerName ?? id}
                      visible={!hiddenIds.has(id)}
                      onToggleVisible={(checked) => onToggleVisible(id, !!checked)}
                    />
                  );
                })}
              </Grid>
            </SortableContext>
          </DndContext>
        </Box>
      </Section>

      <Section
        title="Computation"
        divider
        hint={
          showComputationSection
            ? "Select columns to total in the pinned bottom row."
            : "Shown when this table has a pinned totals row and numeric columns (e.g. currency or columns with values)."
        }
      >
        {showComputationSection && (
          <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap="8px">
            {computationColumnIds.map((id) => {
              const headerName = defsById.get(id)?.headerName ?? id;
              const checked = selectedComputationIds.includes(id);
              return (
                <Flex
                  key={id}
                  as="label"
                  alignItems="center"
                  gap="10px"
                  h="38px"
                  px="10px"
                  borderWidth="1px"
                  borderColor={checked ? "brand.200" : "border"}
                  borderRadius="9px"
                  bg="white"
                  cursor="pointer"
                  _hover={{ bg: "brand.50" }}
                >
                  <Checkbox.Root
                    checked={checked}
                    onCheckedChange={(e) => onToggleComputation(id, e?.checked === true)}
                    colorPalette="brand"
                    size="sm"
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox.Root>
                  <Text fontSize="13px" color="gray.700" truncate>
                    {headerName}
                  </Text>
                </Flex>
              );
            })}
          </Grid>
        )}
      </Section>
    </Box>
  );
}
