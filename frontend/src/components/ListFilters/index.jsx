"use client";

import React, { useMemo, useState } from "react";
import { Box, Grid, Input, NativeSelect, Text } from "@chakra-ui/react";
import { capitalizeWordsLatest } from "@/utils/string";

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

export function useListFilters(rows, fields, { columns } = {}) {
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
    return list.filter((row) =>
      fields.every((f) => {
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
        if (f.type === "dateFrom") return day >= toDay(v);
        if (f.type === "dateTo") return day <= toDay(v);
        return true;
      })
    );
  }, [list, fields, values]);

  const field = (f) => {
    const control =
      f.type === "search" ? (
        <Input
          h="40px"
          fontSize="13px"
          placeholder={f.placeholder ?? "Search..."}
          value={values[f.key] ?? ""}
          onChange={(e) => set(f.key, e.target.value)}
          aria-label={f.label ?? f.placeholder ?? "Search"}
        />
      ) : f.type === "select" ? (
        <NativeSelect.Root>
          <NativeSelect.Field
            h="40px"
            fontSize="13px"
            value={values[f.key] ?? ""}
            color={values[f.key] ? "gray.800" : "gray.500"}
            onChange={(e) => set(f.key, e.target.value)}
            aria-label={f.label ?? f.placeholder}
          >
            <option value="">{f.placeholder ?? "All"}</option>
            {(options[f.key] || []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      ) : (
        <Input
          type="date"
          h="40px"
          fontSize="13px"
          value={values[f.key] ?? ""}
          onChange={(e) => set(f.key, e.target.value)}
          color={values[f.key] ? "gray.800" : "gray.500"}
          aria-label={f.label}
        />
      );

    return (
      <Box key={f.key} minW={0}>
        {f.label && (
          <Text fontSize="12.5px" fontWeight="500" color="gray.600" mb="6px">
            {f.label}
          </Text>
        )}
        {control}
      </Box>
    );
  };

  const cols = columns ?? Math.min(Math.max(fields.length, 1), 4);
  const filterCard = (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="border"
      borderRadius="14px"
      px={{ base: "14px", md: "18px" }}
      py="14px"
    >
      <Grid
        templateColumns={{
          base: "1fr",
          sm: `repeat(${Math.min(cols, 2)}, minmax(0, 1fr))`,
          lg: `repeat(${cols}, minmax(0, 1fr))`,
        }}
        gap="12px"
        alignItems="end"
      >
        {fields.map(field)}
      </Grid>
    </Box>
  );

  return { filtered, filterCard };
}

export default useListFilters;
