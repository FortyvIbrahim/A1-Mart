/**
 * Normalizes product stock input (GoFrugal, bulk API, etc.) for DECIMAL storage.
 * @param {unknown} raw
 * @returns {number}
 */
function parseProductStockQty(raw) {
  if (raw == null || raw === "") return 0;
  const n =
    typeof raw === "number"
      ? raw
      : parseFloat(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1000) / 1000;
}

module.exports = { parseProductStockQty };
