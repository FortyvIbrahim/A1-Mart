import { capitalizeWords } from "./string";

function formatDateDDMMYYYY(value) {
  if (value == null || value === "") return "";
  let d = value;
  if (!(d instanceof Date)) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    d = parsed;
  }
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Sanitize a string for export so it does not contain characters that may not
 * render or behave correctly on Windows (Excel, CSV, file system).
 * - Removes ASCII control characters except tab, newline, carriage return
 * - Removes zero-width and other non-printable Unicode
 * - Replaces invalid surrogate pairs
 * - Removes leading Rs/₹ currency prefix only (not arbitrary leading letters)
 */
function sanitizeExportValue(value) {
  if (value == null) return "";
  let str = String(value);
  str = str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/[\u200B-\u200D\u200E\u200F\u202A-\u202E\u2060\uFEFF]/g, "")
    .replace(/\uFFFD/g, "?")
    .replace(/(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF])/g, "");
  str = str.replace(/^\s*(\u20B9|Rs\.?)\s*/i, "").trim();
  return str;
}

/**
 * Extract text or labels from a value that may be an object, array, or React-like element.
 * Returns a list of strings suitable for joining with " | " for export.
 *
 * @param {*} value - Cell value (primitive, object, array, or element-like)
 * @returns {string[]} Non-empty text/label strings
 */
function extractTextOrLabels(value) {
  if (value == null) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return [];
    return [trimmed];
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (value instanceof Date) {
    return [value.toISOString()];
  }
  if (Array.isArray(value)) {
    const parts = value.flatMap((item) => extractTextOrLabels(item));
    return parts.filter((s) => s.length > 0);
  }
  if (typeof value === "object") {
    // React-like element: props.children
    if (value.props && typeof value.props === "object" && "children" in value.props) {
      return extractTextOrLabels(value.props.children);
    }
    // Common display keys (order matters for preference)
    const displayKeys = ["label", "text", "name", "value", "title", "children"];
    for (const key of displayKeys) {
      if (key in value && value[key] != null && value[key] !== "") {
        const v = value[key];
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          return [String(v)];
        }
        return extractTextOrLabels(v);
      }
    }
    // Plain object: collect all primitive values
    const primitives = Object.values(value).filter(
      (v) =>
        v != null &&
        v !== "" &&
        (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    );
    if (primitives.length > 0) {
      return primitives.map(String);
    }
    return Object.values(value).flatMap((v) => extractTextOrLabels(v));
  }
  return [];
}

/**
 * Format a value that may be an object or JSON string as "key: value" rows
 */
function formatObjectValue(value) {
  if (value == null) return "";
  let obj = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        obj = JSON.parse(value);
      } catch {
        return value;
      }
    } else {
      return value;
    }
  }
  if (typeof obj !== "object" || obj instanceof Date) return String(obj);
  if (Array.isArray(obj)) {
    return obj.map((item, i) => `${i}: ${formatObjectValue(item)}`).join("\n");
  }
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${v != null && v !== "" ? v : ""}`)
    .join("\n");
}

/**
 * Transforms AgGrid row data based on column definitions for export
 * Applies valueGetter, optional exportRenderer, type transformations, and extracts text from cellRenderers
 *
 * @param {Array} rowData - The raw row data from AgGrid (may include pinned total rows at the end)
 * @param {Array} columnDefs - The AgGrid column definitions
 * @param {{ dataRowCount?: number }} options - If dataRowCount is set, rows at index >= dataRowCount are "total" rows (e.g. pinned bottom); badge columns export empty only for those rows
 * @returns {Array} Transformed data ready for export
 */
export function transformDataForExport(rowData, columnDefs, options = {}) {
  if (!rowData || rowData.length === 0) return [];

  const { dataRowCount } = options;
  const isTotalRow = (rowIndex) =>
    typeof dataRowCount === "number" && rowIndex >= dataRowCount;

  // Do not export action-column or columns without a field/headerName
  const exportableCols = columnDefs.filter((col) => {
    if (col.type === "action-column") return false;
    const key = col.field ?? col.colId ?? col.headerName;
    return key != null && key !== "";
  });

  return rowData.map((row, rowIndex) => {
    const transformedRow = {};

    exportableCols.forEach((colDef) => {
      const headerName = colDef.headerName || colDef.field || colDef.colId;
      const fieldKey = colDef.field ?? colDef.colId;
      let value;

      // Apply valueGetter if present
      if (colDef.valueGetter) {
        try {
          value = colDef.valueGetter({
            data: row,
            value: fieldKey != null ? row[fieldKey] : undefined,
          });
        } catch {
          value = fieldKey != null ? row[fieldKey] : undefined;
        }
      } else {
        value = fieldKey != null ? row[fieldKey] : undefined;
      }

      // Optional exportRenderer: custom export value for this column
      if (typeof colDef.exportRenderer === "function") {
        try {
          const exportValue = colDef.exportRenderer({
            data: row,
            value,
            colDef,
            field: fieldKey,
          });
          value = exportValue != null && exportValue !== "" ? String(exportValue) : "";
          transformedRow[headerName] = sanitizeExportValue(value);
          return;
        } catch {
          // Fall through to default handling on error
        }
      }

      // If caller explicitly wants to use the rendered value for export,
      // try to derive text from the cellRenderer output (React element or string).
      if (colDef.useRenderedForExport && typeof colDef.cellRenderer === "function") {
        try {
          const rendered = colDef.cellRenderer({
            data: row,
            value,
            colDef,
            field: fieldKey,
          });
          const parts = extractTextOrLabels(rendered);
          const renderedText =
            parts.length > 0
              ? parts.join(" | ")
              : value != null && value !== ""
                ? String(value)
                : "";
          transformedRow[headerName] = sanitizeExportValue(renderedText);
          return;
        } catch {
          // Fall through to default handling on error
        }
      }

      // Badge column: export empty only for total (pinned) row; for data rows export the label
      if (colDef.type === "badge-column") {
        if (isTotalRow(rowIndex)) {
          value = "";
        } else {
          const parts = extractTextOrLabels(value);
          value = parts.length > 0 ? parts.join(" | ") : (value?.label != null ? String(value.label) : "");
        }
        transformedRow[headerName] = sanitizeExportValue(String(value));
        return;
      }

      // Apply transformations based on type (use empty string for missing values so export has empty cells)
      if (colDef.type === "capitalized") {
        value = value != null && value !== "" ? capitalizeWords(value) : "";
      } else if (colDef.type === "currency") {
        if (value != null && value !== undefined) {
          const numValue =
            typeof value === "number" ? value : parseFloat(value);
          if (!isNaN(numValue)) {
            value = numValue;
          } else {
            value = "";
          }
        } else {
          value = "";
        }
      } else if (colDef.type === "date" || colDef.type === "datetime") {
        value = formatDateDDMMYYYY(value);
      } else if (
        value != null &&
        typeof value === "object" &&
        !(value instanceof Date)
      ) {
        // Object or JSX-like: extract text/labels and join with |
        const parts = extractTextOrLabels(value);
        value = parts.length > 0 ? parts.join(" | ") : formatObjectValue(value);
      } else if (typeof value === "string" && (value.startsWith("{") || value.startsWith("["))) {
        try {
          const parsed = JSON.parse(value);
          const parts = extractTextOrLabels(parsed);
          value = parts.length > 0 ? parts.join(" | ") : formatObjectValue(value);
        } catch {
          value = formatObjectValue(value);
        }
      } else if (colDef.cellRenderer) {
        if (
          colDef.field === "stock_price" &&
          colDef.headerName === "Total Stock"
        ) {
          const totalStock =
            row.stock_price?.reduce(
              (acc, curr) => acc + Number(curr.stock || 0),
              0
            ) || 0;
          const inStock = totalStock > 0;
          value = `${inStock ? "In Stock" : "Out of Stock"} (${totalStock})`;
        } else if (
          value != null &&
          typeof value === "object" &&
          !(value instanceof Date)
        ) {
          const parts = extractTextOrLabels(value);
          value = parts.length > 0 ? parts.join(" | ") : "";
        } else {
          value = value != null && value !== "" ? String(value) : "";
        }
      } else if (
        value != null &&
        typeof value === "object" &&
        !(value instanceof Date)
      ) {
        const parts = extractTextOrLabels(value);
        value = parts.length > 0 ? parts.join(" | ") : "";
      } else {
        value = value != null && value !== "" ? String(value) : "";
      }

      const isNaNOrBad =
        (typeof value === "number" && Number.isNaN(value)) ||
        value === "NaN" ||
        (typeof value === "string" && value.trim() === "NaN");
      if (isNaNOrBad) value = "";

      transformedRow[headerName] = sanitizeExportValue(String(value));
    });

    return transformedRow;
  });
}
