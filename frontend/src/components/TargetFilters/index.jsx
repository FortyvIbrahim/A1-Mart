"use client";

import React, { useMemo, useState } from "react";
import moment from "moment";
import { Button, Flex, Grid } from "@chakra-ui/react";
import { DashboardFilterField } from "@/components/dashboard/DashboardUI";
import { capitalizeWords } from "@/utils/string";

/**
 * Figma "Sales Target / Filters" card: white, radius 8, 1px #F1E3D9,
 * padding 12/16, one row of 44px fields (12px apart) and a peach Reset.
 *
 * fields: subset of "branch" | "department" | "section" | "month" | "status"
 * opts.monthField: row key holding the target month (target_month / target_date)
 * opts.statusField: boolean row key ("Targets Set" vs "Pending")
 */
const LABELS = {
  branch: ["Branch", "All branches", "branch_name"],
  department: ["Department", "All departments", "department_name"],
  section: ["Section", "All sections", "section_name"],
  month: ["Target Month", "All months"],
  status: ["Status", "All statuses"],
};

export function useTargetFilters(rows, fields, { monthField = "target_month", statusField } = {}) {
  const [values, setValues] = useState({});
  const list = Array.isArray(rows) ? rows : [];

  const keyOf = (f, r) => {
    if (f === "month") {
      const m = r?.[monthField];
      return m ? moment(m).format("YYYY-MM") : "";
    }
    if (f === "status") return r?.[statusField] == true ? "set" : "pending";
    return r?.[LABELS[f][2]] ?? "";
  };

  const options = useMemo(() => {
    const out = {};
    for (const f of fields) {
      if (f === "status") {
        out[f] = [
          { value: "set", label: "Targets Set" },
          { value: "pending", label: "Pending" },
        ];
        continue;
      }
      const seen = [...new Set(list.map((r) => keyOf(f, r)).filter(Boolean))];
      out[f] = seen
        .sort((a, b) => (f === "month" ? b.localeCompare(a) : String(a).localeCompare(String(b))))
        .map((v) => ({
          value: v,
          label: f === "month" ? moment(v, "YYYY-MM").format("MMM YYYY") : capitalizeWords(String(v)),
        }));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, fields.join(",")]);

  const filtered = useMemo(
    () =>
      list.filter((r) =>
        fields.every((f) => !values[f] || String(keyOf(f, r)) === String(values[f]))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, values, fields.join(",")]
  );

  const filterCard = (
    <Flex
      bg="white"
      borderWidth="1px"
      borderColor="border"
      borderRadius="8px"
      px="16px"
      py="12px"
      gap="12px"
      align="flex-end"
      wrap={{ base: "wrap", lg: "nowrap" }}
    >
      <Grid
        flex="1"
        minW={0}
        gap="12px"
        templateColumns={{
          base: "minmax(0, 1fr)",
          md: `repeat(${Math.min(fields.length, 3)}, minmax(0, 1fr))`,
          lg: `repeat(${fields.length}, minmax(0, 1fr))`,
        }}
      >
        {fields.map((f) => (
          <DashboardFilterField
            key={f}
            size="lg"
            field={{
              key: f,
              label: LABELS[f][0],
              placeholder: LABELS[f][1],
              value: values[f] ?? "",
              onChange: (v) => setValues((prev) => ({ ...prev, [f]: v })),
              options: options[f] ?? [],
            }}
          />
        ))}
      </Grid>
      <Button
        h="42px"
        px="20px"
        fontSize="13px"
        bg="#FFF5ED"
        color="#C95C18"
        _hover={{ bg: "#FDE9DA" }}
        onClick={() => setValues({})}
        flexShrink={0}
      >
        Reset
      </Button>
    </Flex>
  );

  return { filtered, filterCard };
}

export default useTargetFilters;
