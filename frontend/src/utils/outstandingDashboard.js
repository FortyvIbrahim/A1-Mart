export const OUTSTANDING_CATEGORY_KEYS = {
  PURCHASE_RETURN: "purchase_return",
  PURCHASE_OUTSTANDING: "purchase_outstanding",
  ON_ACCOUNT: "on_account",
  UNKNOWN: "unknown",
};

export const OUTSTANDING_CATEGORIES = [
  {
    key: OUTSTANDING_CATEGORY_KEYS.PURCHASE_RETURN,
    label: "Purchase Return",
    color: "orange",
  },
  {
    key: OUTSTANDING_CATEGORY_KEYS.PURCHASE_OUTSTANDING,
    label: "Purchase Outstanding",
    color: "blue",
  },
  {
    key: OUTSTANDING_CATEGORY_KEYS.ON_ACCOUNT,
    label: "Advance Payment",
    color: "purple",
  },
];

export const AGE_BUCKETS = [
  { key: "0_7", label: "0 to 7 days", min: 0, max: 7 },
  { key: "8_14", label: "8 to 14 days", min: 8, max: 14 },
  { key: "15_21", label: "15 to 21 days", min: 15, max: 21 },
  { key: "22_31", label: "22 to 31 days", min: 22, max: 31 },
  { key: "gt_31", label: "Over 31 days", min: 32, max: Infinity },
];

export const AGE_BUCKET_BADGE_LABELS = {
  "0_7": "0 to 7",
  "8_14": "8 to 15",
  "15_21": "15 to 21",
  "22_31": "22 to 31",
  gt_31: "Overdue",
};

export const AGE_BUCKET_BADGE_COLORS = {
  "0_7": "blue",
  "8_14": "green",
  "15_21": "purple",
  "22_31": "orange",
  gt_31: "red",
};

export function getAgeBucketBadge(ageBucketKey) {
  if (!ageBucketKey) {
    return { label: "—", colorScheme: "gray" };
  }
  return {
    label: AGE_BUCKET_BADGE_LABELS[ageBucketKey] ?? "Unknown",
    colorScheme: AGE_BUCKET_BADGE_COLORS[ageBucketKey] ?? "gray",
  };
}

const CATEGORY_BY_KEY = Object.fromEntries(
  OUTSTANDING_CATEGORIES.map((c) => [c.key, c])
);

export const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

export const toNum = (v) => {
  const n = Number(v ?? 0);
  return Number.isNaN(n) ? 0 : n;
};

/** Absolute net balance for charts and dashboard totals (negatives count as positive). */
export const balanceValue = (v) => round2(Math.abs(toNum(v)));

export const labelOf = (v) =>
  v == null || String(v).trim() === "" ? "Unknown" : String(v).trim();

export const formatDateDisplay = (value) => {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Categorize an invoice from ref no and signed net balance.
 * PR → Purchase Return; MR → Purchase Outstanding.
 * HO: positive → Purchase Outstanding, negative → Advance Payment.
 * ONAC: positive → Purchase Outstanding; negative → Advance Payment.
 */
export function getCategoryFromRefNo(refNo, netBalance) {
  const ref = String(refNo ?? "")
    .trim()
    .toUpperCase();
  const amount = toNum(netBalance);

  if (ref.startsWith("PR")) return OUTSTANDING_CATEGORY_KEYS.PURCHASE_RETURN;
  if (ref.startsWith("MR")) return OUTSTANDING_CATEGORY_KEYS.PURCHASE_OUTSTANDING;

  if (ref.startsWith("HO")) {
    if (amount > 0) return OUTSTANDING_CATEGORY_KEYS.PURCHASE_OUTSTANDING;
    if (amount < 0) return OUTSTANDING_CATEGORY_KEYS.ON_ACCOUNT;
    return OUTSTANDING_CATEGORY_KEYS.UNKNOWN;
  }

  if (ref.startsWith("ONAC")) {
    if (amount > 0) return OUTSTANDING_CATEGORY_KEYS.PURCHASE_OUTSTANDING;
    if (amount < 0) return OUTSTANDING_CATEGORY_KEYS.ON_ACCOUNT;
    return OUTSTANDING_CATEGORY_KEYS.ON_ACCOUNT;
  }

  return OUTSTANDING_CATEGORY_KEYS.UNKNOWN;
}

export function getCategoryLabel(categoryKey) {
  return CATEGORY_BY_KEY[categoryKey]?.label ?? "Unknown";
}

export function getCategoryBadge(categoryKey) {
  const cat = CATEGORY_BY_KEY[categoryKey];
  if (!cat) {
    return { label: getCategoryLabel(categoryKey), colorScheme: "gray" };
  }
  return { label: cat.label, colorScheme: cat.color };
}

function parseDateOnly(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      y: value.getFullYear(),
      m: value.getMonth(),
      d: value.getDate(),
    };
  }
  const trimmed = String(value).trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return {
      y: Number(isoMatch[1]),
      m: Number(isoMatch[2]) - 1,
      d: Number(isoMatch[3]),
    };
  }
  const dt = new Date(trimmed);
  if (Number.isNaN(dt.getTime())) return null;
  return { y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() };
}

export function getAgeDays(invoiceDate, asOfDateStr) {
  const inv = parseDateOnly(invoiceDate);
  const asOf = parseDateOnly(asOfDateStr);
  if (!inv || !asOf) return null;
  const utcInv = Date.UTC(inv.y, inv.m, inv.d);
  const utcAsOf = Date.UTC(asOf.y, asOf.m, asOf.d);
  return Math.floor((utcAsOf - utcInv) / (1000 * 60 * 60 * 24));
}

export function getAgeBucketKey(ageDays) {
  if (ageDays == null || Number.isNaN(ageDays)) return "gt_31";
  const days = Number(ageDays);
  if (days < 0) return "0_7";
  if (days > 31) return "gt_31";
  const bucket = AGE_BUCKETS.find((b) => days >= b.min && days <= b.max);
  return bucket?.key ?? "gt_31";
}

export function enrichOutstandingInvoice(invoice, asOfDateStr) {
  const categoryKey = getCategoryFromRefNo(
    invoice?.ref_no,
    invoice?.net_balance
  );
  const ageDays = getAgeDays(invoice?.invoice_date, asOfDateStr);
  const ageBucketKey = getAgeBucketKey(ageDays);
  const buyer = invoice?.buyer ?? null;
  const buyerId = invoice?.buyer_id ?? buyer?.id ?? buyer?.employee_id ?? null;
  const branch = invoice?.branch ?? null;
  const branchId = invoice?.branch_id ?? branch?.branch_id ?? null;

  return {
    ...invoice,
    category_key: categoryKey,
    category_label: getCategoryLabel(categoryKey),
    age_days: ageDays,
    age_bucket_key: ageBucketKey,
    net_balance: round2(invoice?.net_balance),
    abs_net_balance: balanceValue(invoice?.net_balance),
    buyer_id: buyerId,
    buyer_name: labelOf(
      buyer?.employee_name ?? buyer?.name ?? invoice?.buyer_name
    ),
    supplier_name: labelOf(invoice?.supplier_name),
    branch_id: branchId,
    branch_name: labelOf(branch?.branch_name ?? invoice?.branch_name),
  };
}

export function buildCategoryDonutData(rows, ageBucketKey) {
  const inBucket = (rows || []).filter((r) => r.age_bucket_key === ageBucketKey);
  const signedTotals = new Map();
  const absTotals = new Map();
  OUTSTANDING_CATEGORIES.forEach((c) => {
    signedTotals.set(c.key, 0);
    absTotals.set(c.key, 0);
  });

  inBucket.forEach((row) => {
    const key = row.category_key;
    if (OUTSTANDING_CATEGORIES.some((c) => c.key === key)) {
      signedTotals.set(
        key,
        round2((signedTotals.get(key) || 0) + toNum(row.net_balance))
      );
      absTotals.set(
        key,
        round2((absTotals.get(key) || 0) + balanceValue(row.net_balance))
      );
    }
  });

  return OUTSTANDING_CATEGORIES.map((c, idx) => ({
    name: c.label,
    value: round2(absTotals.get(c.key) || 0),
    displayValue: round2(signedTotals.get(c.key) || 0),
    filterValue: c.key,
    categoryKey: c.key,
    colorIndex: idx,
  }));
}

export function hasChartData(data) {
  return (data || []).some((d) => toNum(d.value) > 0);
}

/** @deprecated Use hasChartData */
export const hasDonutChartData = hasChartData;

export function sumByCategory(rows, categoryKey) {
  return round2(
    (rows || [])
      .filter((r) => r.category_key === categoryKey)
      .reduce((sum, r) => sum + toNum(r.net_balance), 0)
  );
}

export function countByCategory(rows, categoryKey) {
  return (rows || []).filter((r) => r.category_key === categoryKey).length;
}

/** Sum signed net_balance across all rows (equals total of all grouped table rows). */
export function sumNetBalance(rows) {
  return round2(
    (rows || []).reduce((sum, r) => sum + toNum(r.net_balance), 0)
  );
}

export function buildGroupedTableRows(rows, groupKey) {
  const grouped = new Map();

  (rows || []).forEach((row) => {
    let key;
    let groupName;

    if (groupKey === "supplier") {
      key = row.supplier_id == null ? "unknown" : String(row.supplier_id);
      groupName =
        row.supplier_id == null ? "Unknown" : row.supplier_name || "Unknown";
    } else if (groupKey === "buyer") {
      key = row.buyer_id == null ? "unknown" : String(row.buyer_id);
      groupName =
        row.buyer_id == null
          ? "Unknown"
          : `${row.buyer_name} (${row.buyer_id})`;
    } else if (groupKey === "branch") {
      key = row.branch_id == null ? "unknown" : String(row.branch_id);
      groupName =
        row.branch_id == null ? "Unknown" : row.branch_name || "Unknown";
    } else {
      key = row.category_key || OUTSTANDING_CATEGORY_KEYS.UNKNOWN;
      groupName = row.category_label || getCategoryLabel(key);
    }

    const cur = grouped.get(key) || {
      group_name: groupName,
      group_value: key,
      total_value: 0,
      purchase_outstanding: 0,
      purchase_return: 0,
      on_account: 0,
      invoices: [],
    };

    const amount = toNum(row.net_balance);
    cur.total_value = round2(cur.total_value + amount);
    if (row.category_key === OUTSTANDING_CATEGORY_KEYS.PURCHASE_OUTSTANDING) {
      cur.purchase_outstanding = round2(cur.purchase_outstanding + amount);
    } else if (row.category_key === OUTSTANDING_CATEGORY_KEYS.PURCHASE_RETURN) {
      cur.purchase_return = round2(cur.purchase_return + amount);
    } else if (row.category_key === OUTSTANDING_CATEGORY_KEYS.ON_ACCOUNT) {
      cur.on_account = round2(cur.on_account + amount);
    }
    cur.invoices.push(row);
    grouped.set(key, cur);
  });

  return Array.from(grouped.values()).sort(
    (a, b) => b.total_value - a.total_value
  );
}

export function buildModalSlotTotals(invoices) {
  const totals = {};
  AGE_BUCKETS.forEach((b) => {
    totals[b.key] = 0;
  });
  (invoices || []).forEach((inv) => {
    const key = inv.age_bucket_key;
    if (key && totals[key] != null) {
      totals[key] = round2(totals[key] + toNum(inv.net_balance));
    }
  });
  return totals;
}
