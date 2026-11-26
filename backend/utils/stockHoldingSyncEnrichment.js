const { parseDaysValue } = require("./parseDaysValue");

const SUPPLIER_PERSON_TYPE = 1;

const normalizeForMatch = (str) =>
  String(str ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeMatchText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeStringOrNull = (value) => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
};

const buyerTextMatchesTarget = (value, target) => {
  const normalized = normalizeMatchText(value);
  if (!normalized) return false;
  if (normalized === target) return true;
  return normalized
    .split(",")
    .map((part) => normalizeMatchText(part))
    .some((part) => part && part === target);
};

const getBuyerId = (buyer) =>
  buyer?.employee_id ?? buyer?.employee_code ?? buyer?.id ?? null;

function normalizeStockOnOrder(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed === 0) return null;
  return parsed;
}

function buildEnrichmentLookups({ productsById, masterList, employees }) {
  const supplierIdByNormName = new Map();
  const buyersBySupplierId = {};

  (masterList || []).forEach((entry) => {
    if (Number(entry.person_type) !== SUPPLIER_PERSON_TYPE) return;
    const masterId = entry.master_id ?? entry.id;
    if (masterId == null) return;
    const normName = normalizeForMatch(entry.name);
    if (normName) supplierIdByNormName.set(normName, masterId);
    buyersBySupplierId[masterId] = Array.isArray(entry.buyers)
      ? entry.buyers
      : [];
  });

  const employeesByCode = new Map();
  (employees || []).forEach((employee) => {
    if (employee?.employee_code != null) {
      employeesByCode.set(String(employee.employee_code), employee);
    }
  });

  return {
    productsById,
    supplierIdByNormName,
    buyersBySupplierId,
    employees,
    employeesByCode,
  };
}

function resolveSupplierIdFromLookups(supplierName, supplierIdByNormName) {
  if (!supplierName) return null;
  return supplierIdByNormName.get(normalizeForMatch(supplierName)) ?? null;
}

function getBuyersForSupplier(supplierId, buyersBySupplierId) {
  if (supplierId == null) return [];
  return (
    buyersBySupplierId[supplierId] ||
    buyersBySupplierId[String(supplierId)] ||
    []
  );
}

function resolveBuyerIdFromName(buyerName, supplierBuyers, employees) {
  const target = normalizeMatchText(buyerName);
  if (!target) return null;

  const supplierMatch = (supplierBuyers || []).find((buyer) => {
    const name = normalizeMatchText(buyer.employee_name);
    const code = normalizeMatchText(getBuyerId(buyer));
    return (
      name === target ||
      code === target ||
      buyerTextMatchesTarget(buyer.buyer_alias, target)
    );
  });
  if (supplierMatch) return getBuyerId(supplierMatch);

  const employeeMatch = (employees || []).find((employee) => {
    const name = normalizeMatchText(employee.employee_name);
    const code = normalizeMatchText(employee.employee_code);
    return (
      name === target ||
      code === target ||
      buyerTextMatchesTarget(employee.buyer_alias, target)
    );
  });
  return employeeMatch?.employee_code ?? null;
}

function resolveBuyerIdFromCode(candidateCode, employeesByCode) {
  if (candidateCode == null || candidateCode === "") return null;
  const code = String(candidateCode).trim();
  if (!code) return null;
  return employeesByCode.has(code) ? code : null;
}

function enrichSyncItem(row, lookups) {
  const {
    productsById,
    supplierIdByNormName,
    buyersBySupplierId,
    employees,
    employeesByCode,
  } = lookups;

  const productId = Number(row.product_id);
  const product = Number.isNaN(productId) ? null : productsById[productId];

  const supplierName =
    normalizeStringOrNull(row.supplier_name) ||
    normalizeStringOrNull(row.manufacturer_name) ||
    normalizeStringOrNull(row.manufacturer);

  const distributorName =
    normalizeStringOrNull(row.distributor_name) ||
    normalizeStringOrNull(row.distributor);

  const supplierId = resolveSupplierIdFromLookups(
    supplierName,
    supplierIdByNormName
  );
  const supplierBuyers = getBuyersForSupplier(supplierId, buyersBySupplierId);

  const importBuyerName =
    normalizeStringOrNull(row.buyer_name) ||
    normalizeStringOrNull(product?.de_buyer_name);

  const resolvedBuyerId =
    resolveBuyerIdFromCode(row.buyer_code, employeesByCode) ??
    resolveBuyerIdFromName(importBuyerName, supplierBuyers, employees) ??
    getBuyerId(supplierBuyers[0]) ??
    null;

  return {
    product_id: productId,
    branch_id: Number(row.branch_id),
    purchase_type: normalizeStringOrNull(row.purchase_type),
    current_stock: row.current_stock,
    current_stock_value: row.current_stock_value,
    stock_on_order: normalizeStockOnOrder(row.stock_on_order),
    stock_duration: parseDaysValue(row.stock_duration),
    holding_days: parseDaysValue(row.holding_days ?? product?.holding_days),
    status: normalizeStringOrNull(row.status),
    chain_bill_count_level: normalizeStringOrNull(row.chain_bill_count_level),
    supplier_name: supplierName,
    distributor_name: distributorName,
    buyer_id: resolvedBuyerId,
  };
}

function enrichSyncItems(rows, lookups) {
  return (rows || []).map((row) => enrichSyncItem(row, lookups));
}

module.exports = {
  buildEnrichmentLookups,
  enrichSyncItems,
};
