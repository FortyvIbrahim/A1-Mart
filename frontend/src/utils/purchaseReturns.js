/**
 * Purchase return issue entry utilities: name resolution, form value building, validation.
 */

function normalizeForMatch(str) {
  return (str || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Replace "A1 MART" with "A1MART" in outlet/branch names before matching */
function normalizeOutletNameForMatch(str) {
  return (str || "").replace(/\bA1\s+MART\b/gi, "A1MART").trim();
}

/** Import location names that do not match branches directly */
const OUTLET_NAME_ALIASES = {
  "a1mart- distribution": "A1MART-DISTRIBUTION WAREHOUSE",
  "a1mart-vellore road": "A1MART-VELLORE ROAD",
  "a1mart-manalurpet road": "A1MART-MANALURPET ROAD",
  "a1mart-saron": "A1MART-SARON",
  "a1mart-ho": "A1MART-PRODUCTION WAREHOUSE",
};

function findOutletBranch(outletName, branches) {
  const n = normalizeForMatch(normalizeOutletNameForMatch(outletName));
  return (
    branches.find((b) => {
      const branchNorm = normalizeForMatch(
        normalizeOutletNameForMatch(b.branch_name || "")
      );
      return (
        branchNorm === n || branchNorm.includes(n) || n.includes(branchNorm)
      );
    }) ?? null
  );
}

export function resolveOutletId(outletName, branches) {
  if (!outletName || !Array.isArray(branches)) return null;
  const directMatch = findOutletBranch(outletName, branches);
  if (directMatch) return directMatch.branch_id;

  const normalized = normalizeForMatch(normalizeOutletNameForMatch(outletName));
  const aliasTarget = OUTLET_NAME_ALIASES[normalized];
  if (!aliasTarget) return null;

  const aliasMatch = findOutletBranch(aliasTarget, branches);
  return aliasMatch ? aliasMatch.branch_id : null;
}

export function resolveEmployeeCode(buyerName, employees) {
  if (!buyerName || !Array.isArray(employees)) return null;
  const n = normalizeForMatch(buyerName);
  const found = employees.find(
    (e) =>
      normalizeForMatch(e.employee_name) === n ||
      normalizeForMatch(e.employee_code) === n ||
      (e.employee_name && normalizeForMatch(e.employee_name).includes(n)) ||
      (e.employee_code && n.includes(normalizeForMatch(e.employee_code)))
  );
  return found ? found.employee_code : null;
}

/**
 * Resolve supplier name to supplier id (master_id or id from master_list).
 * When personType is set, only entries with that person_type are considered.
 * Returns the same type the backend expects (string or number).
 */
export function resolveSupplierId(supplierName, masterList, personType) {
  if (!supplierName || !Array.isArray(masterList)) return null;
  const n = normalizeForMatch(supplierName);
  const found = masterList.find((m) => {
    if (personType != null && Number(m.person_type) !== Number(personType)) {
      return false;
    }
    return normalizeForMatch(m.name) === n;
  });
  if (!found) return null;
  return found.master_id != null ? found.master_id : found.id;
}

/**
 * Resolve item name to product id and image url from products list.
 * Matches on product_name, de_name, gf_item_name.
 */
export function resolveProduct(itemName, products) {
  if (!itemName || !Array.isArray(products))
    return { product_id: null, product_image_url: null };
  const n = normalizeForMatch(itemName);
  const nameMatch = (p) => {
    const name =
      p.product_name ?? p.de_name ?? p.gf_item_name ?? p.de_display_name ?? "";
    if (!name) return false;
    const norm = normalizeForMatch(name);
    return norm === n;
  };
  const found = products.find(nameMatch);
  return found
    ? {
        product_id: found.product_id != null ? found.product_id : found.id,
        product_image_url: found.image_url || null,
      }
    : { product_id: null, product_image_url: null };
}

export const EMPTY_INITIAL = {
  driver_id: null,
  receiving_branch_id: null,
  attachment: null,
  buyers: [],
};

export function buildFormValuesFromParsed(
  parsedData,
  { branches, employees, masterList, products }
) {
  if (!parsedData || !parsedData.buyers || !Array.isArray(parsedData.buyers)) {
    return { buyers: [] };
  }
  return {
    driver_id: null,
    receiving_branch_id: null,
    attachment: null,
    buyers: parsedData.buyers.map((b) => ({
      buyer_name: b.buyer_name || "",
      employee_code: resolveEmployeeCode(b.buyer_name, employees),
      suppliers: (b.suppliers || []).map((s) => ({
        supplier_name: s.supplier_name || "",
        master_id: resolveSupplierId(s.supplier_name, masterList),
        no_of_boxes: "",
        items: (s.items || []).map((it) => {
          const product = resolveProduct(it.item_name, products);
          return {
            ...it,
            outlet_id: resolveOutletId(it.outlet_name, branches),
            product_id: product.product_id,
            product_image_url: product.product_image_url,
          };
        }),
      })),
    })),
  };
}

/** Map API response (get one) to form values for edit/view. API returns total_amount, pr_date, pr_no, outlet_id on each item. */
export function buildFormValuesFromApi(
  api,
  { employees, masterList, branches }
) {
  if (!api || !Array.isArray(api.employees)) {
    return {
      driver_id: api?.driver_id ?? null,
      receiving_branch_id: api?.receiving_branch_id ?? null,
      attachment: api?.attachment ?? null,
      buyers: [],
    };
  }
  const empMap = {};
  (employees || []).forEach((e) => {
    if (e.employee_code) empMap[e.employee_code] = e;
  });
  const masterMap = {};
  (masterList || []).forEach((m) => {
    const id = m.master_id ?? m.id;
    if (id != null) {
      masterMap[String(id)] = m.name;
      if (typeof id === "number") masterMap[id] = m.name;
    }
  });
  const branchById = {};
  (branches || []).forEach((b) => {
    if (b.branch_id != null) branchById[b.branch_id] = b.branch_name;
  });
  return {
    driver_id: api.driver_id ?? null,
    receiving_branch_id: api.receiving_branch_id ?? null,
    attachment: api.attachment ?? null,
    buyers: api.employees.map((emp) => ({
      buyer_name:
        emp.employee?.employee_name ??
        emp.employee?.name ??
        empMap[emp.employee_code]?.employee_name ??
        emp.employee_code ??
        "",
      employee_code: emp.employee_code ?? "",
      suppliers: (emp.suppliers || []).map((s) => ({
        supplier_name:
          s.supplier?.name ??
          s.supplier?.supplier_name ??
          masterMap[String(s.supplier_id)] ??
          masterMap[s.supplier_id] ??
          (s.supplier_id != null ? String(s.supplier_id) : "—"),
        master_id: s.supplier_id,
        no_of_boxes: s.no_of_boxes != null ? String(s.no_of_boxes) : "",
        items: (s.items || []).map((it) => ({
          product_id: it.product_id,
          qty: it.qty ?? 0,
          total_amount: it.total_amount ?? null,
          pr_date: it.pr_date ?? "",
          pr_no: it.pr_no ?? "",
          outlet_id: it.outlet_id ?? null,
          outlet_name:
            it.outlet?.branch_name ??
            it.outlet?.name ??
            branchById[it.outlet_id] ??
            it.outlet_name ??
            "",
          item_name:
            it.product?.de_display_name ??
            it.product?.de_name ??
            it.product?.product_name ??
            "",
          product_image_url: it.product?.image_url ?? null,
        })),
      })),
    })),
  };
}

/** Returns Formik errors for no_of_boxes and grouped lists of missing names (employee, supplier, product, outlet). */
export function getIssueEntryValidationErrors(values) {
  const errors = {};
  const missingNoOfBoxes = [];
  const missingEmployeeNames = new Set();
  const missingSupplierNames = new Set();
  const missingProductNames = new Set();
  const missingOutletNames = new Set();

  const buyers = values?.buyers ?? [];
  buyers.forEach((buyer, bi) => {
    const buyerName = (buyer.buyer_name || "").trim() || "—";
    const hasEmployeeCode =
      buyer.employee_code != null && String(buyer.employee_code).trim() !== "";

    if (buyerName && !hasEmployeeCode) {
      missingEmployeeNames.add(buyerName);
    }

    (buyer.suppliers ?? []).forEach((supplier, si) => {
      const supplierName = (supplier.supplier_name || "").trim() || "—";
      const hasMasterId =
        supplier.master_id != null && supplier.master_id !== "";
      const noOfBoxesVal = supplier.no_of_boxes;
      const hasNoOfBoxes =
        noOfBoxesVal != null && String(noOfBoxesVal).trim() !== "";

      const items = supplier.items ?? [];
      const fullyMappedItemCount = items.filter(
        (it) =>
          it.outlet_id != null &&
          it.outlet_id !== "" &&
          it.product_id != null &&
          it.product_id !== ""
      ).length;
      const needsNoOfBoxes =
        hasEmployeeCode && hasMasterId && fullyMappedItemCount > 0;

      if (needsNoOfBoxes && !hasNoOfBoxes) {
        const path = `buyers.${bi}.suppliers.${si}.no_of_boxes`;
        errors[path] =
          "No of Boxes is required when items have employee, supplier, product, and outlet mapped.";
        missingNoOfBoxes.push({ buyerName, supplierName });
      }

      if (supplierName && !hasMasterId) {
        missingSupplierNames.add(supplierName);
      }

      items.forEach((it) => {
        const itemName = (it.item_name || "").trim() || "—";
        const outletName = (it.outlet_name || "").trim() || "—";
        if (itemName && (it.product_id == null || it.product_id === "")) {
          missingProductNames.add(itemName);
        }
        if (outletName && (it.outlet_id == null || it.outlet_id === "")) {
          missingOutletNames.add(outletName);
        }
      });
    });
  });

  return {
    errors,
    missingNoOfBoxes,
    missingEmployeeNames: [...missingEmployeeNames],
    missingSupplierNames: [...missingSupplierNames],
    missingProductNames: [...missingProductNames],
    missingOutletNames: [...missingOutletNames],
  };
}
