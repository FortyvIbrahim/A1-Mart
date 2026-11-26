export function capitalizeWords(str) {
  return str;
  // .split(" ") // split string into words
  // .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  // .join(" "); // join back to string
}

export function capitalizeWordsLatest(str) {
  if (str == null) return "";
  return String(str)
    .split(" ") // split string into words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" "); // join back to string
}

/** Label shown in badge-column cells / BadgeColumnFilter (must match WMS valueGetter). */
export function purchaseAckStatusBadgeLabel(statusCode) {
  if (statusCode == null || statusCode === "") return "";
  const code = String(statusCode);
  if (code === "pe_created") return "Purchase Entry Done";
  return capitalizeWordsLatest(code).replaceAll("_", " ");
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value);
}

export function formatAccountCurrency(value) {
  if (value === null || value === undefined) return "-";
  let postfix = "";

  if (value === 0) return formatCurrency(0);

  if (value > 0) {
    postfix = "dr";
  } else {
    postfix = "cr";
  }

  return `${formatCurrency(Math.abs(value))} ${postfix}`;
}

export function formatShorthandNumber(value) {
  if (value === null || value === undefined || value === "") return "0";
  const num = Number(value);
  if (Number.isNaN(num)) return "0";

  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  const formatUnit = (n, unit) => {
    const rounded = Math.round(n * 100) / 100;
    const text = Number.isInteger(rounded)
      ? String(rounded)
      : String(rounded).replace(/\.?0+$/, "");
    return `${sign}${text}${unit}`;
  };

  if (abs >= 10000000) return formatUnit(abs / 10000000, "Cr");
  if (abs >= 100000) return formatUnit(abs / 100000, "L");
  if (abs >= 1000) return formatUnit(abs / 1000, "k");

  const rounded = Math.round(abs * 100) / 100;
  return `${sign}${Number.isInteger(rounded) ? rounded : rounded.toString()}`;
}
