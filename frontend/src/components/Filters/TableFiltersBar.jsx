"use client";

import React from "react";
import { Grid } from "@chakra-ui/react";
import CustomInput from "@/components/CustomInput";

/**
 * Common table filters bar (multi-select dropdowns).
 * Keep this generic so other listing pages can reuse it.
 */
export default function TableFiltersBar({ filters = [], style }) {
  return (
    <Grid
      templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(3, 1fr)" }}
      gap="16px"
      alignItems="end"
      mb="12px"
      style={style}
    >
      {(filters ?? []).map((f) => (
        <CustomInput
          key={f.key}
          label={f.label}
          name={f.name ?? `filters_${f.key}`}
          method={f.method ?? "multiple-dropdown"}
          options={f.options ?? []}
          value={f.value ?? []}
          onChange={f.onChange}
          disabled={Boolean(f.disabled)}
          placeholder={f.placeholder}
        />
      ))}
    </Grid>
  );
}
