/**
 * Parses the supplier-centric PR Excel format (raw rows from XLSX) into the
 * supplier-centric JSON contract. Matches the layout used in files like
 * "548_PR_-_PR_Wi_m_Detailed_*.xls":
 *
 * Row 0: Header [BUYER, Supplier Name, Outlet Name, PR Date, PR No(T), Item Name, Qty, Total Amt]
 * Data: same columns; hierarchy is expressed by leaving cells empty (repeat from above).
 *
 * @param {Array<Array<any>>} rawRows - Rows from sheet_to_json(worksheet, { header: 1 })
 * @returns {{ buyers: Array<{ buyer_name: string, suppliers: Array<{ supplier_name: string, items: Array<{ outlet_name: string, pr_date: string, pr_no: string, item_name: string, qty: number, total_amount: number }> }}> }}
 */

import {
  parseDateFromString,
  parseNumberFromString,
  excelSerialToDate,
} from "@/utils/importValues";

const COL = {
  BUYER: 0,
  SUPPLIER_NAME: 1,
  OUTLET_NAME: 2,
  PR_DATE: 3,
  PR_NO: 4,
  ITEM_NAME: 5,
  QTY: 6,
  TOTAL_AMT: 7,
};

function cellStr(val) {
  if (val == null) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "number" && !Number.isNaN(val)) return String(val);
  return String(val).trim();
}

function isEmptyRow(row) {
  if (!Array.isArray(row)) return true;
  return row.every((c) => cellStr(c) === "");
}

/** First row is header if first cell looks like "BUYER" */
function isHeaderRow(row) {
  if (!Array.isArray(row) || row.length === 0) return false;
  const first = cellStr(row[0]).toUpperCase();
  return first === "BUYER" || first === "BUYER NAME";
}

/** Format Date to YYYY-MM-DD */
function toISODate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse PR date from cell: Excel serial (number) or date string */
function parsePRDate(val) {
  if (val == null || val === "") return "";
  if (typeof val === "number" && !Number.isNaN(val)) {
    const d = excelSerialToDate(val);
    return d ? toISODate(d) : "";
  }
  const d = parseDateFromString(String(val).trim());
  return d ? toISODate(d) : "";
}

/**
 * Parse raw Excel rows (column-based PR format) into supplier-centric JSON.
 * Row 0 is treated as header and skipped. Returns an array of buyers; each
 * buyer has buyer_name and suppliers. When a new buyer appears in col 0,
 * the previous buyer is closed and a new one started.
 */
export function parseSupplierCentricExcel(rawRows) {
  const buyers = [];
  let current_buyer_name = "";
  let suppliers = [];
  let supplierMap = new Map();

  let current_supplier = "";
  let current_outlet = "";
  let current_pr_no = "";
  let current_pr_date = "";

  const flushCurrentBuyer = () => {
    if (current_buyer_name) {
      buyers.push({ buyer_name: current_buyer_name, suppliers: [...suppliers] });
    }
    suppliers = [];
    supplierMap = new Map();
  };

  const ensureSupplier = (name) => {
    const n = (name || "").trim();
    if (!n) return null;
    if (!supplierMap.has(n)) {
      supplierMap.set(n, suppliers.length);
      suppliers.push({ supplier_name: n, items: [] });
    }
    return suppliers[supplierMap.get(n)];
  };

  const rows = Array.isArray(rawRows) ? rawRows : [];
  let startIndex = 0;
  if (rows.length > 0 && isHeaderRow(rows[0])) startIndex = 1;

  for (let r = startIndex; r < rows.length; r++) {
    const row = rows[r];
    if (isEmptyRow(row)) continue;

    const get = (col) => (row[col] != null ? cellStr(row[col]) : "");

    const buyerVal = get(COL.BUYER);
    if (buyerVal && !/^(Grand\s*)?Total$/i.test(buyerVal)) {
      if (current_buyer_name && current_buyer_name !== buyerVal) {
        flushCurrentBuyer();
      }
      current_buyer_name = buyerVal;
    }
    if (get(COL.SUPPLIER_NAME)) current_supplier = get(COL.SUPPLIER_NAME);
    if (get(COL.OUTLET_NAME)) current_outlet = get(COL.OUTLET_NAME);
    if (row[COL.PR_DATE] != null && cellStr(row[COL.PR_DATE]) !== "") {
      current_pr_date = parsePRDate(row[COL.PR_DATE]);
    }
    if (get(COL.PR_NO)) current_pr_no = get(COL.PR_NO);

    const itemName = get(COL.ITEM_NAME);
    const qtyRaw = row[COL.QTY];
    const amtRaw = row[COL.TOTAL_AMT];

    const qty =
      typeof qtyRaw === "number" && !Number.isNaN(qtyRaw)
        ? qtyRaw
        : parseNumberFromString(cellStr(qtyRaw));
    const total_amount =
      typeof amtRaw === "number" && !Number.isNaN(amtRaw)
        ? amtRaw
        : parseNumberFromString(cellStr(amtRaw));

    const hasQty = typeof qty === "number" && !Number.isNaN(qty);
    const hasAmt = typeof total_amount === "number" && !Number.isNaN(total_amount);

    if (itemName && hasQty && hasAmt && current_supplier) {
      const sup = ensureSupplier(current_supplier);
      if (sup) {
        sup.items.push({
          outlet_name: current_outlet,
          pr_date: current_pr_date,
          pr_no: current_pr_no,
          item_name: itemName,
          qty,
          total_amount,
        });
      }
    }
  }

  flushCurrentBuyer();

  return { buyers };
}
