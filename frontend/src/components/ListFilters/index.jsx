"use client";

import React, { useMemo, useState } from "react";
import { Box, Button, Flex, Grid, Input, Text } from "@chakra-ui/react";
import { capitalizeWordsLatest } from "@/utils/string";
import { useInsideMainCard } from "@/components/CustomContainer";
import CustomSelect from "@/components/CustomSelect";
import { DashboardFilterField } from "@/components/dashboard/DashboardUI";

/**
 * Figma list filter card ("Branch · Voucher From · Voucher To · Created By",
 * "Search…", etc.). Client-side filtering over rows a page already loaded, so
 * no API changes are needed.
 *
 * fields: [
 *   { key, type: "search", label?, placeholder, getText: (row) => string }
 *   { key, type: "select", label?, placeholder, getValue: (row) => string|number,
 *     getLabel?: (value) => string }
 *   { key, type: "dateFrom" | "dateTo", label?, getValue: (row) => date-ish }
 * ]
 */
function toDay(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Card chrome for the filters. Inside a Figma header-band / main card page the
 * filters sit directly on that card, so the border and padding drop away.
 * Rendered as a component so it reads the container it is placed in.
 */
function FilterShell({ children, spaced = true }) {
  const plain = useInsideMainCard();
  return (
    <Box
      mb={plain || !spaced ? 0 : "16px"}
      bg="white"
      borderWidth={plain ? 0 : "1px"}
      borderColor="#E9E3DF"
      borderRadius="12px"
      p={plain ? 0 : { base: "14px", md: "20px" }}
    >
      {children}
    </Box>
  );
}

export function useListFilters(rows, fields, { columns, reset = false } = {}) {
  const [values, setValues] = useState({});

  const list = Array.isArray(rows) ? rows : [];
  const set = (key, v) => setValues((prev) => ({ ...prev, [key]: v }));

  const options = useMemo(() => {
    const out = {};
    for (const f of fields) {
      if (f.type !== "select") continue;
      const seen = new Map();
      for (const row of list) {
        const v = f.getValue(row);
        if (v === null || v === undefined || v === "") continue;
        if (!seen.has(String(v))) seen.set(String(v), v);
      }
      out[f.key] = [...seen.values()]
        .map((v) => ({
          value: String(v),
          label: f.getLabel ? f.getLabel(v) : capitalizeWordsLatest(String(v)),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, fields]);

  const filtered = useMemo(() => {
    const rows = list.filter((row) =>
      fields.every((f) => {
        if (f.type === "sort") return true;
        const v = values[f.key];
        if (v === undefined || v === "" || v === null) return true;
        if (f.type === "search") {
          return String(f.getText(row) ?? "")
            .toLowerCase()
            .includes(String(v).trim().toLowerCase());
        }
        if (f.type === "select") return String(f.getValue(row)) === String(v);
        const day = toDay(f.getValue(row));
        if (day === null) return false;
        if (f.type === "date") return day === toDay(v);
        if (f.type === "dateFrom") return day >= toDay(v);
        if (f.type === "dateTo") return day <= toDay(v);
        return true;
      })
    );
    // { type: "sort", options: [{ value, label, compare(a, b) }] } — first option is the default.
    const sortField = fields.find((f) => f.type === "sort");
    if (sortField?.options?.length) {
      const chosen =
        sortField.options.find((o) => o.value === values[sortField.key]) ??
        sortField.options[0];
      if (chosen?.compare) return [...rows].sort(chosen.compare);
    }
    return rows;
  }, [list, fields, values]);

  const field = (f) => {
    const control =
      f.type === "search" ? (
        <Input
          h="44px"
          px="12px"
          fontSize="12px"
          fontWeight="500"
          placeholder={f.placeholder ?? "Search..."}
          value={values[f.key] ?? ""}
          onChange={(e) => set(f.key, e.target.value)}
          aria-label={f.label ?? f.placeholder ?? "Search"}
        />
      ) : f.type === "sort" ? (
        <CustomSelect
          h="44px"
          fontSize="12px"
          allowEmpty={false}
          value={values[f.key] ?? f.options?.[0]?.value ?? ""}
          onChange={(v) => set(f.key, v)}
          options={f.options || []}
          ariaLabel={f.label}
        />
      ) : f.type === "select" ? (
        <CustomSelect
          h="44px"
          fontSize="12px"
          value={values[f.key] ?? ""}
          placeholder={f.placeholder ?? "All"}
          onChange={(v) => set(f.key, v)}
          options={options[f.key] || []}
          ariaLabel={f.label ?? f.placeholder}
        />
      ) : (
        // Figma date filter: dropdown-style field reading "All dates".
        <DashboardFilterField
          size="lg"
          field={{
            key: f.key,
            type: "date",
            placeholder: f.placeholder ?? "All dates",
            value: values[f.key] ? new Date(values[f.key]) : null,
            onChange: (d) => set(f.key, d ? d.toISOString() : ""),
            clearable: true,
          }}
        />
      );

    return (
      <Box key={f.key} minW={0}>
        {f.label && (
          <Text fontSize="12px" fontWeight="500" lineHeight="15px" color="#30384B" mb="7px">
            {f.label}
          </Text>
        )}
        {control}
      </Box>
    );
  };

  const cols = columns ?? Math.min(Math.max(fields.length, 1), 4);
  // Figma list filters end with a peach "Reset" button (44px, 12/500 #C95C18).
  const resetButton = reset ? (
    <Button
      h="44px"
      px="16px"
      fontSize="12px"
      bg="#FFF5ED"
      color="#C95C18"
      _hover={{ bg: "#FDE9DA" }}
      onClick={() => setValues({})}
      flexShrink={0}
    >
      Reset
    </Button>
  ) : null;
  const filterCard = (
    <FilterShell spaced={false}>
      <Grid
        templateColumns={{
          base: "1fr",
          sm: `repeat(${Math.min(cols, 2)}, minmax(0, 1fr))`,
          lg: `repeat(${cols}, minmax(0, 1fr))`,
        }}
        columnGap="12px"
        rowGap="16px"
        alignItems="end"
      >
        {fields.map(field)}
      </Grid>
    </FilterShell>
  );
  const card = reset ? (
    <FilterShell>
      <Flex gap="12px" align="flex-end" wrap={{ base: "wrap", lg: "nowrap" }}>
        <Grid
          flex="1"
          minW={0}
          templateColumns={{
            base: "1fr",
            sm: `repeat(${Math.min(cols, 2)}, minmax(0, 1fr))`,
            lg: `repeat(${cols}, minmax(0, 1fr))`,
          }}
          columnGap="12px"
          rowGap="16px"
          alignItems="end"
        >
          {fields.map(field)}
        </Grid>
        {resetButton}
      </Flex>
    </FilterShell>
  ) : (
    filterCard
  );

  return { filtered, filterCard: card };
}

export default useListFilters;
