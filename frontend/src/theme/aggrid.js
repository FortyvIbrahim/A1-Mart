import { themeQuartz } from "ag-grid-community";
import { DESIGN } from "./index";

/**
 * AG Grid theme matching the Figma table spec: white card, peach header band,
 * soft peach row dividers, orange accent. `colorPalette` is accepted for
 * backwards compatibility with existing callers but every table now shares the
 * same brand look, as in the design.
 */
const brandGridTheme = themeQuartz.withParams({
  accentColor: DESIGN.primary,
  backgroundColor: "#FFFFFF",
  foregroundColor: DESIGN.text,
  textColor: "#374151",
  headerBackgroundColor: DESIGN.tableHeader,
  headerTextColor: "#4B5563",
  headerFontWeight: 600,
  headerFontSize: "12.5px",
  fontFamily: "inherit",
  fontSize: "13px",
  borderColor: DESIGN.borderSubtle,
  wrapperBorder: { color: DESIGN.border, width: 1 },
  wrapperBorderRadius: "12px",
  borderRadius: "8px",
  rowBorder: { color: DESIGN.borderSubtle, width: 1 },
  columnBorder: false,
  headerColumnBorder: false,
  oddRowBackgroundColor: "#FFFFFF",
  rowHoverColor: DESIGN.rowAlt,
  selectedRowBackgroundColor: "#FEF1E9",
  rowHeight: 48,
  headerHeight: 46,
  cellHorizontalPadding: 14,
  checkboxCheckedBackgroundColor: DESIGN.primary,
  checkboxCheckedBorderColor: DESIGN.primary,
  inputFocusBorder: { color: DESIGN.primary },
  focusShadow: "0 0 0 3px rgba(244, 119, 33, 0.18)",
  menuBackgroundColor: "#FFFFFF",
  menuBorder: { color: DESIGN.border },
  pinnedRowBackgroundColor: DESIGN.tableHeader,
  pinnedRowFontWeight: 600,
});

// eslint-disable-next-line no-unused-vars
export const agGridTheme = (_colorPalette = "brand") => brandGridTheme;

export default agGridTheme;
