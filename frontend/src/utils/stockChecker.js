/**
 * Utility functions for stock checker functionality
 */

/**
 * Creates a map of product_id to checked_stock for quick lookup
 * @param {Array} stockCirclesChecked - Array of checked stock items
 * @returns {Object} Map of product_id to checked_stock
 */
export const createCheckedStockMap = (stockCirclesChecked) => {
  const map = {};
  if (Array.isArray(stockCirclesChecked)) {
    stockCirclesChecked.forEach((item) => {
      if (
        item.product_id &&
        item.checked_stock !== null &&
        item.checked_stock !== undefined
      ) {
        map[item.product_id] = item.checked_stock;
      }
    });
  }
  return map;
};

/** Department ids from API shape: `departments[]` or legacy `department_id`. */
export const getCircleDepartmentIds = (stockCircle) => {
  if (!stockCircle) return [];
  if (
    Array.isArray(stockCircle.departments) &&
    stockCircle.departments.length > 0
  ) {
    return stockCircle.departments
      .map((d) => d.department_id)
      .filter((id) => id != null && id !== "");
  }
  if (
    stockCircle.department_id != null &&
    stockCircle.department_id !== ""
  ) {
    return [stockCircle.department_id];
  }
  return [];
};

/**
 * Filters products based on circle data (branch_id, department_id, category_id, subcategory_id)
 * @param {Array} products - Array of products
 * @param {Object} stockCircle - Circle data with filter criteria
 * @returns {Array} Filtered products
 */
export const filterProductsByCircle = (products, stockCircle) => {
  if (!products || products.length === 0 || !stockCircle) return [];

  const circleDeptIds = getCircleDepartmentIds(stockCircle);
  const deptIdSet =
    circleDeptIds.length > 0
      ? new Set(circleDeptIds.map((id) => String(id)))
      : null;

  return products.filter((product) => {
    // Filter by branch (check if product has branch_id in stock_price)
    if (stockCircle.branch_id) {
      const hasBranchStock = product.stock_price?.some(
        (stock) => String(stock.branch_id) === String(stockCircle.branch_id)
      );
      if (!hasBranchStock) return false;
    }

    // Filter by department (any linked department)
    if (deptIdSet) {
      if (!deptIdSet.has(String(product.department_id))) {
        return false;
      }
    }

    // Filter by category
    if (stockCircle.category_id) {
      if (String(product.category_id) !== String(stockCircle.category_id)) {
        return false;
      }
    }

    // Filter by subcategory
    if (stockCircle.subcategory_id) {
      if (
        String(product.subcategory_id) !== String(stockCircle.subcategory_id)
      ) {
        return false;
      }
    }

    return true;
  });
};

/** Normalize EAN / barcode values for comparison (digits only). */
export const normalizeEan = (value) => {
  if (value == null || value === "") return "";
  return String(value).replace(/\D/g, "");
};

/**
 * Find a product from a barcode decode: EAN match first, then numeric product_id.
 * @param {Array<object>} products
 * @param {string} rawDecoded
 * @returns {object | null}
 */
export const findProductByBarcodeScan = (products, rawDecoded) => {
  const trimmed = String(rawDecoded ?? "").trim();
  if (!trimmed || !Array.isArray(products) || products.length === 0) {
    return null;
  }
  const targetEan = normalizeEan(trimmed);
  if (targetEan) {
    for (const p of products) {
      const e = normalizeEan(p?.ean_number);
      if (e && e === targetEan) return p;
    }
  }
  const idStr = String(trimmed).replace(/\D/g, "");
  if (idStr) {
    const idNum = Number(idStr);
    if (Number.isFinite(idNum)) {
      for (const p of products) {
        if (Number(p?.product_id) === idNum) return p;
      }
    }
  }
  return null;
};

/**
 * Filters products based on user-selected filters
 * @param {Array} products - Array of products
 * @param {Object} filters - Filter object with branch_id, department_id, department_ids, category_id, subcategory_id, brand_id, ean_number, product_search
 * @returns {Array} Filtered products with filtered stock_price
 */
export const filterProductsByUserFilters = (products, filters) => {
  if (!products || products.length === 0) return [];

  const {
    branch_id,
    department_id,
    department_ids,
    category_id,
    subcategory_id,
    brand_id,
    ean_number,
    product_search,
  } = filters;

  const eanTarget = ean_number ? normalizeEan(ean_number) : "";
  const searchRaw =
    product_search != null ? String(product_search).trim() : "";
  const searchLower = searchRaw.toLowerCase();

  return products
    .filter((product) => {
      // Filter by branch (check if product has branch_id in stock_price)
      if (branch_id) {
        const hasBranchStock = product.stock_price?.some(
          (stock) => String(stock.branch_id) === String(branch_id)
        );
        if (!hasBranchStock) return false;
      }

      // Filter by department (multiple ids take precedence over single department_id)
      if (Array.isArray(department_ids) && department_ids.length > 0) {
        const allowed = new Set(department_ids.map((id) => String(id)));
        if (!allowed.has(String(product.department_id))) {
          return false;
        }
      } else if (department_id) {
        if (String(product.department_id) !== String(department_id)) {
          return false;
        }
      }

      // Filter by category
      if (category_id) {
        if (String(product.category_id) !== String(category_id)) {
          return false;
        }
      }

      // Filter by subcategory
      if (subcategory_id) {
        if (String(product.subcategory_id) !== String(subcategory_id)) {
          return false;
        }
      }

      // Filter by brand
      if (brand_id) {
        if (String(product.brand_id) !== String(brand_id)) {
          return false;
        }
      }

      if (eanTarget) {
        const productEan = normalizeEan(product.ean_number);
        if (productEan !== eanTarget) {
          return false;
        }
      }

      if (searchRaw) {
        const pidStr = String(product.product_id ?? "");
        const nameLower = (product.product_name ?? "").toLowerCase();
        const idMatch =
          pidStr === searchRaw || pidStr.includes(searchRaw);
        const nameMatch = nameLower.includes(searchLower);
        if (!idMatch && !nameMatch) {
          return false;
        }
      }

      return true;
    })
    .map((product) => {
      // Filter stock_price array by selected branch
      let filteredStockPrice = product.stock_price || [];

      if (branch_id) {
        filteredStockPrice = filteredStockPrice.filter(
          (stock) => String(stock.branch_id) === String(branch_id)
        );
      }

      // Return product with filtered stock_price
      return {
        ...product,
        stock_price: filteredStockPrice,
      };
    });
};

/**
 * Exact `product_id` lookup (digits-only query).
 * @param {Array<object>} products
 * @param {string} rawQuery
 * @returns {object | null}
 */
export const findProductByIdQuery = (products, rawQuery) => {
  const q = String(rawQuery ?? "").trim();
  if (!q || !Array.isArray(products) || products.length === 0) {
    return null;
  }
  if (!/^\d+$/.test(q)) {
    return null;
  }
  const idNum = Number(q);
  return products.find((p) => Number(p.product_id) === idNum) ?? null;
};

/**
 * Filters categories by one or more department ids
 * @param {Array} categories - Array of categories
 * @param {string|number|Array<string|number>} departmentIdOrIds - Department ID(s)
 * @returns {Array} Filtered categories
 */
export const filterCategoriesByDepartment = (
  categories,
  departmentIdOrIds
) => {
  if (!Array.isArray(categories)) return [];
  const ids = Array.isArray(departmentIdOrIds)
    ? departmentIdOrIds
    : departmentIdOrIds != null && departmentIdOrIds !== ""
      ? [departmentIdOrIds]
      : [];
  if (ids.length === 0) return [];
  const idSet = new Set(ids.map((id) => String(id)));
  return categories.filter((category) =>
    idSet.has(String(category.department_id))
  );
};

/**
 * Filters subcategories by category_id
 * @param {Array} subcategories - Array of subcategories
 * @param {string|number} categoryId - Category ID to filter by
 * @returns {Array} Filtered subcategories
 */
export const filterSubcategoriesByCategory = (subcategories, categoryId) => {
  if (!categoryId || !Array.isArray(subcategories)) {
    return [];
  }
  return subcategories.filter(
    (subcategory) => String(subcategory.category_id) === String(categoryId)
  );
};

/** Sum of stock from product.stock_price rows. */
export const getProductTotalPhysicalStock = (product) => {
  if (!product?.stock_price?.length) return 0;
  return product.stock_price.reduce(
    (acc, curr) => acc + Number(curr.stock || 0),
    0
  );
};

/**
 * Stock for a single branch only — matches stock checker list after
 * `filterProductsByUserFilters` narrows `stock_price` to `branch_id`.
 */
export const getProductStockForBranch = (product, branchId) => {
  if (branchId == null || branchId === "") {
    return getProductTotalPhysicalStock(product);
  }
  if (!product?.stock_price?.length) return 0;
  return product.stock_price
    .filter((stock) => String(stock.branch_id) === String(branchId))
    .reduce((acc, curr) => acc + Number(curr.stock || 0), 0);
};

/** Branch selling price from product.stock_price (GoFrugal salePrice). */
export const getProductSellingPriceForBranch = (product, branchId) => {
  if (branchId == null || branchId === "" || !product?.stock_price?.length) {
    return 0;
  }
  const row = product.stock_price.find(
    (stock) => String(stock.branch_id) === String(branchId)
  );
  const price = Number(row?.selling_price);
  return Number.isFinite(price) ? price : 0;
};

/** checked_stock × branch selling price. */
export const getCheckedStockValue = (checkedStock, product, branchId) => {
  const qty = Number(checkedStock);
  if (!Number.isFinite(qty)) return 0;
  return qty * getProductSellingPriceForBranch(product, branchId);
};

/**
 * Total (circle × product) instances in scope — same cardinality as {@link buildDashboardProductRows}.
 * Summing per-circle counts avoids drift from a separate code path.
 */
export const countDashboardProductInstances = (circles, products) => {
  if (!circles?.length || !products?.length) return 0;
  let n = 0;
  for (const circle of circles) {
    n += filterProductsByCircle(products, circle).length;
  }
  return n;
};

/** Distinct branch_id values on stock circles (dashboard scope). */
export const uniqueBranchIdsFromCircles = (circles) => {
  if (!circles?.length) return [];
  const ids = new Set();
  for (const c of circles) {
    if (c.branch_id != null && c.branch_id !== "") {
      ids.add(String(c.branch_id));
    }
  }
  return Array.from(ids);
};

/**
 * Synthetic circle for filter UI when multiple stock circles are in scope (e.g. branch-only filter).
 * Unions departments and clears category/subcategory so the products table is not narrowed to the first circle only.
 */
export const buildUnionStockCircleForFilterScope = (circles) => {
  if (!circles?.length) return null;
  if (circles.length === 1) return circles[0];

  const withBranch = circles.filter(
    (c) => c.branch_id != null && c.branch_id !== ""
  );
  const branchIds = new Set(withBranch.map((c) => String(c.branch_id)));
  /** Multiple branches in scope: do not pin branch on synthetic circle (dashboard branch filter picks). */
  const branch_id =
    branchIds.size === 1 ? withBranch[0].branch_id : null;

  const deptSet = new Set();
  for (const c of circles) {
    for (const id of getCircleDepartmentIds(c)) {
      deptSet.add(id);
    }
  }
  const departments = Array.from(deptSet).map((department_id) => ({
    department_id,
  }));

  return {
    ...circles[0],
    branch_id,
    departments,
    category_id: null,
    subcategory_id: null,
  };
};

/**
 * One grid row per (circle, product) for dashboard “all circles” product list.
 * @param {Array<object>} circles - Stock circles in scope (branch + optional filters)
 * @param {Array<object>} products
 * @param {(circle: object) => string} getCircleLabel
 */
export const buildDashboardProductRows = (circles, products, getCircleLabel) => {
  const rows = [];
  if (!Array.isArray(circles) || !Array.isArray(products)) return rows;
  for (const circle of circles) {
    const cid = circle?.id ?? circle?.stock_circle_id;
    if (cid == null) continue;
    const circleProducts = filterProductsByCircle(products, circle);
    const branchId =
      circle.branch_id != null && circle.branch_id !== ""
        ? circle.branch_id
        : null;
    const label = getCircleLabel ? getCircleLabel(circle) : String(cid);
    for (const p of circleProducts) {
      rows.push({
        ...p,
        _checkKey: `${String(cid)}|${String(p.product_id)}`,
        stock_circle_id: cid,
        circle_label: label,
        circle_branch_id: branchId,
      });
    }
  }
  return rows;
};

/**
 * Map `${stock_circle_id}|${product_id}` → checked_stock for dashboard rows.
 */
export const buildCompositeCheckedMap = (allChecked, allowedCircleIds) => {
  const m = {};
  const set = new Set((allowedCircleIds ?? []).map((id) => String(id)));
  if (!Array.isArray(allChecked) || set.size === 0) return m;
  for (const r of allChecked) {
    const cid = String(r.stock_circle_id);
    if (!set.has(cid)) continue;
    const pid = r.product_id;
    if (
      pid != null &&
      r.checked_stock !== null &&
      r.checked_stock !== undefined
    ) {
      m[`${cid}|${String(pid)}`] = r.checked_stock;
    }
  }
  return m;
};

/**
 * Apply stock-checker filters + optional hide-OOS to dashboard flat rows.
 */
export const filterDashboardProductRows = (rows, filters, hideOutOfStock) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows.filter((row) => {
    if (filterProductsByUserFilters([row], filters).length === 0) return false;
    if (hideOutOfStock) {
      const stock = getProductStockForBranch(row, row.circle_branch_id);
      if (stock <= 0) return false;
    }
    return true;
  });
};

/**
 * Product-count summary for the stock checker panel (no stock quantity totals).
 * @param {object} [stockCircle] - When set, stock uses branch scope (same as checker list).
 *
 * Pending and completion % exclude out-of-stock SKUs: pending = in-stock & not checked;
 * percentCompleted = checked & in-stock / in-stock in scope.
 */
export const calculateSummaryStats = (
  stockCirclesChecked,
  circleFilteredProducts,
  stockCircle
) => {
  const totalProducts = circleFilteredProducts?.length ?? 0;
  const checkedMap = createCheckedStockMap(stockCirclesChecked ?? []);
  const branchId =
    stockCircle?.branch_id != null && stockCircle.branch_id !== ""
      ? stockCircle.branch_id
      : null;

  let completedProductCount = 0;
  let outOfStockProductCount = 0;
  let completedInStockCount = 0;
  let pendingProductCount = 0;

  (circleFilteredProducts ?? []).forEach((p) => {
    const pid = p.product_id;
    const stock = getProductStockForBranch(p, branchId);
    const inStock = stock > 0;
    if (!inStock) {
      outOfStockProductCount += 1;
    }
    const checked = checkedMap[pid] !== undefined;
    if (checked) {
      completedProductCount += 1;
      if (inStock) {
        completedInStockCount += 1;
      }
    } else if (inStock) {
      pendingProductCount += 1;
    }
  });

  const inStockProductCount = totalProducts - outOfStockProductCount;

  const percentCompleted =
    inStockProductCount > 0
      ? Math.round((completedInStockCount / inStockProductCount) * 100)
      : 0;

  return {
    totalChecked: completedProductCount,
    totalProducts,
    completedProductCount,
    completedInStockCount,
    inStockProductCount,
    pendingProductCount,
    outOfStockProductCount,
    percentCompleted,
  };
};
