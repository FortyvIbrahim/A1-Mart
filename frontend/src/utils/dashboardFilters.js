export const ALL_FILTER_OPTION = { label: "All", value: "" };

export function withAllFilterOptions(options) {
  return [ALL_FILTER_OPTION, ...(options || [])];
}

export function stringOptionsFromValues(values) {
  return (values || [])
    .filter((v) => v != null && String(v).trim() !== "")
    .map((v) => {
      const s = String(v);
      return { label: s, value: s };
    });
}

export const matchesMultiFilter = (selected, rowValue) =>
  !selected?.length || selected.includes(rowValue);

export const pruneMultiFilter = (selected, options) => {
  const next = (selected || []).filter((value) =>
    (options || []).some((option) => option.value === value)
  );
  const current = selected || [];
  return next.length === current.length ? current : next;
};
