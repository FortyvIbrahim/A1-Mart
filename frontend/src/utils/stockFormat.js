export function formatStockDisplay(value) {
  const stock = Number(value);
  if (!Number.isFinite(stock)) return "0";
  if (Number.isInteger(stock)) return String(stock);
  return stock.toFixed(3);
}
