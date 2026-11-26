const { parseDaysValue } = require("./parseDaysValue");

const COL = {
  ARTICLE_ID: 0,
  STORE_ID: 2,
  PURCHASE_TYPE: 4,
  CURRENT_STOCK: 6,
  CURRENT_STOCK_VALUE: 7,
  STOCK_DURATION: 8,
  STOCK_ON_ORDER: 9,
  STATUS: 11,
  BUYER_CODE: 21,
  BUYER_NAME: 22,
  MANUFACTURER_CODE: 27,
  MANUFACTURER_NAME: 28,
  DISTRIBUTOR_CODE: 29,
  DISTRIBUTOR_NAME: 30,
  CHAIN_BILL_COUNT_LEVEL: 37,
};

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  fields.push(current);
  return fields;
}

function toNumOrZero(value) {
  if (value == null || value === "") return 0;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : 0;
}

function toIntOrNull(value) {
  if (value == null || value === "") return null;
  const n = parseInt(String(value).trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function normalizeStringOrNull(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Parse Delium articles_stock_info CSV into stock-holding item rows.
 * Uses fixed leading column positions (duplicate "name" headers in CSV).
 */
function parseDeliumStockInfoCsv(csvText, expectedBranchId = null) {
  if (!csvText || !String(csvText).trim()) {
    return [];
  }

  const lines = String(csvText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return [];
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (!fields.length) continue;

    const productId = toIntOrNull(fields[COL.ARTICLE_ID]);
    const branchId = toIntOrNull(fields[COL.STORE_ID]);
    if (productId == null || branchId == null) continue;

    if (
      expectedBranchId != null &&
      Number(expectedBranchId) !== Number(branchId)
    ) {
      continue;
    }

    rows.push({
      product_id: productId,
      branch_id: branchId,
      purchase_type: normalizeStringOrNull(fields[COL.PURCHASE_TYPE]),
      current_stock: toNumOrZero(fields[COL.CURRENT_STOCK]),
      current_stock_value: toNumOrZero(fields[COL.CURRENT_STOCK_VALUE]),
      stock_duration: parseDaysValue(fields[COL.STOCK_DURATION]),
      stock_on_order: fields[COL.STOCK_ON_ORDER],
      status: normalizeStringOrNull(fields[COL.STATUS]),
      buyer_code: normalizeStringOrNull(fields[COL.BUYER_CODE]),
      buyer_name: normalizeStringOrNull(fields[COL.BUYER_NAME]),
      manufacturer: normalizeStringOrNull(fields[COL.MANUFACTURER_CODE]),
      manufacturer_name: normalizeStringOrNull(fields[COL.MANUFACTURER_NAME]),
      distributor: normalizeStringOrNull(fields[COL.DISTRIBUTOR_CODE]),
      distributor_name: normalizeStringOrNull(fields[COL.DISTRIBUTOR_NAME]),
      chain_bill_count_level: normalizeStringOrNull(
        fields[COL.CHAIN_BILL_COUNT_LEVEL]
      ),
    });
  }

  return rows;
}

module.exports = {
  parseDeliumStockInfoCsv,
};
