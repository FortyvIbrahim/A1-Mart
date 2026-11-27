"use client";

import React, { useMemo, useState } from "react";
import { Box, Grid, Input } from "@chakra-ui/react";
import { capitalizeWordsLatest as capitalizeWords } from "@/utils/string";
import { calculateDaysLeft } from "@/utils/stockCirclePeriod";
import CustomSelect from "@/components/CustomSelect";

/**
 * Figma "INV / Stock Circles" + "INV / Stock Checker" filter card:
 * Search · Branches · Type · Status / Department · Category · Sub category.
 * Pure client-side filtering over the circles already returned by
 * GET /stock-circles, so no API changes are needed.
 */

const TYPES = ["yearly", "biyearly", "quarterly", "term", "monthly", "daily"];

function circleDepartmentNames(c) {
  if (Array.isArray(c?.departments) && c.departments.length) {
    return c.departments.map((d) => d.department_name).filter(Boolean);
  }
  return c?.department_name ? [c.department_name] : [];
}

export function circleStatus(c) {
  if (c?.is_active === 0 || c?.is_active === false) return "inactive";
  const days = calculateDaysLeft(c);
  if (days === null || days === undefined) return "active";
  return days < 0 ? "overdue" : "active";
}

function Select({ value, onChange, placeholder, options }) {
  return (
    <CustomSelect
      h="44px"
      fontSize="12px"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      options={options}
      ariaLabel={placeholder}
    />
  );
}

export function useStockCircleFilters(circles, { searchPlaceholder = "Search..." } = {}) {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");

  const list = Array.isArray(circles) ? circles : [];

  const uniq = (values) =>
    [...new Set(values.filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b)))
      .map((v) => ({ value: v, label: capitalizeWords(String(v)) }));

  const branchOptions = useMemo(() => uniq(list.map((c) => c.branch_name)), [list]);
  const departmentOptions = useMemo(
    () => uniq(list.flatMap(circleDepartmentNames)),
    [list]
  );
  const categoryOptions = useMemo(
    () =>
      uniq(
        list
          .filter((c) => !department || circleDepartmentNames(c).includes(department))
          .map((c) => c.category_name)
      ),
    [list, department]
  );
  const subcategoryOptions = useMemo(
    () =>
      uniq(
        list
          .filter((c) => !category || c.category_name === category)
          .map((c) => c.subcategory_name)
      ),
    [list, category]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((c) => {
      if (branch && c.branch_name !== branch) return false;
      if (type && c.period_type !== type) return false;
      if (status && circleStatus(c) !== status) return false;
      if (department && !circleDepartmentNames(c).includes(department)) return false;
      if (category && c.category_name !== category) return false;
      if (subcategory && c.subcategory_name !== subcategory) return false;
      if (q) {
        const hay = [
          c.id,
          c.branch_name,
          c.period_type,
          c.period,
          c.category_name,
          c.subcategory_name,
          ...circleDepartmentNames(c),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [list, search, branch, type, status, department, category, subcategory]);

  const filterCard = (
    // Figma "Search and filters": radius 12, 1px #E9E3DF, padding 20,
    // 16px between rows and 12px between fields, 44px controls.
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="#E9E3DF"
      borderRadius="12px"
      p={{ base: "14px", md: "20px" }}
    >
      <Grid
        templateColumns={{
          base: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(4, minmax(0, 1fr))",
        }}
        columnGap="12px"
        rowGap="16px"
      >
        <Input
          h="44px"
          px="12px"
          fontSize="12px"
          fontWeight="500"
          borderRadius="8px"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search circles"
        />
        <Select value={branch} onChange={setBranch} placeholder="Branches" options={branchOptions} />
        <Select
          value={type}
          onChange={setType}
          placeholder="Type"
          options={TYPES.map((t) => ({ value: t, label: capitalizeWords(t) }))}
        />
        <Select
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          options={[
            { value: "active", label: "Active" },
            { value: "overdue", label: "Overdue" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
        <Select
          value={department}
          onChange={(v) => {
            setDepartment(v);
            setCategory("");
            setSubcategory("");
          }}
          placeholder="Department"
          options={departmentOptions}
        />
        <Select
          value={category}
          onChange={(v) => {
            setCategory(v);
            setSubcategory("");
          }}
          placeholder="Category"
          options={categoryOptions}
        />
        <Select
          value={subcategory}
          onChange={setSubcategory}
          placeholder="Sub category"
          options={subcategoryOptions}
        />
      </Grid>
    </Box>
  );

  return { filtered, filterCard };
}
