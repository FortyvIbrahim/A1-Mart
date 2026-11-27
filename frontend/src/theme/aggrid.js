import { themeQuartz } from "ag-grid-community";
import { DESIGN } from "./index";

/**
 * AG Grid theme matching the Figma list tables: peach header band (56px,
 * 12/600 #637188), 48px rows alternating white / #FFFBF8 with a 1px #F1E3D9
 * divider, 11px #202938 cells, 12px cell padding, orange accent. `colorPalette` is accepted for
 * backwards compatibility with existing callers but every table now shares the
 * same brand look, as in the design.
 */
const brandGridTheme = themeQuartz.withParams({
  accentColor: DESIGN.primary,
  backgroundColor: "#FFFFFF",
  foregroundColor: DESIGN.text,
  textColor: DESIGN.text,
  headerBackgroundColor: DESIGN.tableHeader,
  headerTextColor: DESIGN.textMuted,
  headerFontWeight: 600,
  headerFontSize: "12px",
  // List-page tables: Plus Jakarta Sans (Figma); dashboard tables override to Inter.
  fontFamily: "var(--font-jakarta), var(--font-inter), Inter, sans-serif",
  fontSize: "11px",
  borderColor: DESIGN.borderSubtle,
  // The surrounding card draws the frame (see AgGrid `framed`).
  wrapperBorder: false,
  wrapperBorderRadius: "0px",
  borderRadius: "8px",
  rowBorder: { color: DESIGN.border, width: 1 },
  columnBorder: false,
  headerColumnBorder: false,
  headerColumnResizeHandleColor: "transparent",
  oddRowBackgroundColor: DESIGN.rowAlt,
  rowHoverColor: DESIGN.tabActive,
  selectedRowBackgroundColor: "#FEF1E9",
  rowHeight: 48,
  headerHeight: 56,
  cellHorizontalPadding: 12,
  checkboxCheckedBackgroundColor: DESIGN.primary,
  checkboxCheckedBorderColor: DESIGN.primary,
  inputFocusBorder: { color: DESIGN.primary },
  focusShadow: "0 0 0 3px rgba(244, 119, 33, 0.18)",
  menuBackgroundColor: "#FFFFFF",
  menuBorder: { color: DESIGN.border },
  pinnedRowBackgroundColor: DESIGN.tableHeader,
  pinnedRowFontWeight: 600,
});

/**
 * Dashboard variant — table inside a Figma card: no outer frame, 52px header,
 * 44px rows striped without dividers.
 */
const bareGridTheme = brandGridTheme.withParams({
  wrapperBorder: false,
  wrapperBorderRadius: "0px",
  rowBorder: false,
  rowHeight: 44,
  headerHeight: 52,
  fontFamily: "inherit",
});

// eslint-disable-next-line no-unused-vars
export const agGridTheme = (_colorPalette = "brand", { bare = false } = {}) =>
  bare ? bareGridTheme : brandGridTheme;

export default agGridTheme;
