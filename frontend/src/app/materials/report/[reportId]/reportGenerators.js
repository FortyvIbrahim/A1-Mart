import moment from "moment";
import { capitalizeWords } from "@/utils/string";

// Helper function to filter by date range
const filterByDateRange = (items, dateField, startDate, endDate) => {
  if (!startDate && !endDate) return items;
  return items.filter((item) => {
    if (!item[dateField]) return false;
    const itemDate = moment(item[dateField]);
    if (startDate && itemDate.isBefore(moment(startDate), "day")) return false;
    if (endDate && itemDate.isAfter(moment(endDate), "day")) return false;
    return true;
  });
};

// Inventory Report
export const generateInventoryReport = (data, filters) => {
  let filtered = [...data.materials];

  if (filters.category) {
    if (filters.category === "no-category") {
      filtered = filtered.filter(
        (m) => !m.material_category_id || m.material_category_id === null
      );
    } else {
      filtered = filtered.filter(
        (m) => m.material_category_id === parseInt(filters.category)
      );
    }
  }
  if (filters.supplier) {
    filtered = filtered.filter(
      (m) => m.supplier_id === parseInt(filters.supplier)
    );
  }

  return filtered.map((material) => ({
    imageUrl: material.image_url || null,
    materialId: material.material_id || null,
    materialName: capitalizeWords(material.name || ""),
    currentStock: material.live_stock || 0,
    category: material.category?.category_name
      ? capitalizeWords(material.category.category_name)
      : "-",
    supplier: material.supplier_name
      ? capitalizeWords(material.supplier_name)
      : "-",
    unit: material.unit?.unit_name || "-",
  }));
};

// Low Stock Alert Report
export const generateLowStockReport = (data, filters) => {
  let filtered = [...data.materials];

  if (filters.category) {
    if (filters.category === "no-category") {
      filtered = filtered.filter(
        (m) => !m.material_category_id || m.material_category_id === null
      );
    } else {
      filtered = filtered.filter(
        (m) => m.material_category_id === parseInt(filters.category)
      );
    }
  }

  const threshold = parseFloat(filters.thresholdLevel) || 0;
  filtered = filtered.filter((m) => !m.live_stock || m.live_stock <= threshold);

  return filtered.map((material) => ({
    imageUrl: material.image_url || null,
    materialId: material.material_id || null,
    materialName: capitalizeWords(material.name || ""),
    currentStock: material.live_stock || 0,
    category: material.category?.category_name
      ? capitalizeWords(material.category.category_name)
      : "-",
    supplier: material.supplier_name
      ? capitalizeWords(material.supplier_name)
      : "-",
  }));
};

// Material Valuation Report
export const generateMaterialValuationReport = (data, filters) => {
  let filtered = [...data.materials];

  if (filters.category) {
    if (filters.category === "no-category") {
      filtered = filtered.filter(
        (m) => !m.material_category_id || m.material_category_id === null
      );
    } else {
      filtered = filtered.filter(
        (m) => m.material_category_id === parseInt(filters.category)
      );
    }
  }
  if (filters.supplier) {
    filtered = filtered.filter(
      (m) => m.supplier_id === parseInt(filters.supplier)
    );
  }

  return filtered.map((material) => {
    const stock = material.live_stock || 0;
    const rate = material.latest_rate || 0;
    const totalValue = stock * rate;

    return {
      imageUrl: material.image_url || null,
      materialId: material.material_id || null,
      materialName: capitalizeWords(material.name || ""),
      stock: stock,
      latestRate: rate.toFixed(2),
      totalValue: totalValue.toFixed(2),
      category: material.category?.category_name
        ? capitalizeWords(material.category.category_name)
        : "-",
    };
  });
};

// Material Category Summary
export const generateCategorySummaryReport = (data, filters) => {
  const materials = filterByDateRange(
    data.materials,
    "created_at",
    filters.startDate,
    filters.endDate
  );

  const categoryMap = {};
  materials.forEach((material) => {
    const categoryId = material.material_category_id;
    const categoryName = material.category?.category_name || "Uncategorized";

    if (!categoryMap[categoryId]) {
      categoryMap[categoryId] = {
        category: capitalizeWords(categoryName),
        materialCount: 0,
        totalStock: 0,
        totalValue: 0,
      };
    }

    categoryMap[categoryId].materialCount++;
    categoryMap[categoryId].totalStock += material.live_stock || 0;
    categoryMap[categoryId].totalValue +=
      (material.live_stock || 0) * (material.latest_rate || 0);
  });

  return Object.values(categoryMap).map((cat) => ({
    ...cat,
    totalStock: Math.round(cat.totalStock),
    totalValue: cat.totalValue.toFixed(2),
  }));
};

// Supplier-wise Material Report
export const generateSupplierMaterialsReport = (data, filters) => {
  let filtered = [...data.materials];

  if (filters.supplier) {
    filtered = filtered.filter(
      (m) => m.supplier_id === parseInt(filters.supplier)
    );
  }
  if (filters.category) {
    if (filters.category === "no-category") {
      filtered = filtered.filter(
        (m) => !m.material_category_id || m.material_category_id === null
      );
    } else {
      filtered = filtered.filter(
        (m) => m.material_category_id === parseInt(filters.category)
      );
    }
  }

  return filtered.map((material) => ({
    imageUrl: material.image_url || null,
    supplier: material.supplier_name
      ? capitalizeWords(material.supplier_name)
      : "-",
    materialId: material.material_id || null,
    materialName: capitalizeWords(material.name || ""),
    stock: material.live_stock || 0,
    category: material.category?.category_name
      ? capitalizeWords(material.category.category_name)
      : "-",
    latestRate: material.latest_rate ? material.latest_rate.toFixed(2) : "-",
  }));
};

// Material Tax & HSN Report
export const generateMaterialTaxReport = (data, filters) => {
  let filtered = [...data.materials];

  if (filters.category) {
    if (filters.category === "no-category") {
      filtered = filtered.filter(
        (m) => !m.material_category_id || m.material_category_id === null
      );
    } else {
      filtered = filtered.filter(
        (m) => m.material_category_id === parseInt(filters.category)
      );
    }
  }

  const minTax = parseFloat(filters.minTax);
  const maxTax = parseFloat(filters.maxTax);

  if (!isNaN(minTax) || !isNaN(maxTax)) {
    filtered = filtered.filter((m) => {
      const tax = m.tax_percentage || 0;
      if (!isNaN(minTax) && tax < minTax) return false;
      if (!isNaN(maxTax) && tax > maxTax) return false;
      return true;
    });
  }

  return filtered.map((material) => ({
    imageUrl: material.image_url || null,
    materialId: material.material_id || null,
    materialName: capitalizeWords(material.name || ""),
    taxPercentage: material.tax_percentage || 0,
    hsnNumber: material.hsn_number || "-",
    category: material.category?.category_name
      ? capitalizeWords(material.category.category_name)
      : "-",
    supplier: material.supplier_name
      ? capitalizeWords(material.supplier_name)
      : "-",
  }));
};

// Request Summary by Branch
export const generateRequestByBranchReport = (data, filters) => {
  let filtered = [...data.materialRequests];

  if (filters.branch) {
    filtered = filtered.filter(
      (req) => req.outlet_id === parseInt(filters.branch)
    );
  }

  filtered = filterByDateRange(
    filtered,
    "created_at",
    filters.startDate,
    filters.endDate
  );

  const branchMap = {};
  filtered.forEach((request) => {
    const branchId = request.outlet_id;
    const branchName = request.outlet?.branch_name || `Branch ${branchId}`;

    if (!branchMap[branchId]) {
      branchMap[branchId] = {
        branch: capitalizeWords(branchName),
        totalRequests: 0,
        pending: 0,
        approved: 0,
        totalItems: 0,
      };
    }

    branchMap[branchId].totalRequests++;
    if (request.is_approved === 1) {
      branchMap[branchId].approved++;
    } else {
      branchMap[branchId].pending++;
    }
    branchMap[branchId].totalItems += request.items?.length || 0;
  });

  return Object.values(branchMap);
};

// Pending Requests Report
export const generatePendingRequestsReport = (data, filters) => {
  let filtered = data.materialRequests.filter((req) => req.is_approved !== 1);

  if (filters.branch) {
    filtered = filtered.filter(
      (req) => req.outlet_id === parseInt(filters.branch)
    );
  }

  filtered = filterByDateRange(
    filtered,
    "created_at",
    filters.startDate,
    filters.endDate
  );

  return filtered.map((request) => ({
    requestId: request.material_request_id,
    branch: request.outlet?.branch_name
      ? capitalizeWords(request.outlet.branch_name)
      : "-",
    creator: request.creator_employee_name
      ? capitalizeWords(request.creator_employee_name)
      : "-",
    itemsCount: request.items?.length || 0,
    requestDate: request.created_at
      ? moment(request.created_at).format("DD/MM/YYYY")
      : "-",
    status: "Pending",
  }));
};

// Approved Requests Report
export const generateApprovedRequestsReport = (data, filters) => {
  let filtered = data.materialRequests.filter((req) => req.is_approved === 1);

  if (filters.branch) {
    filtered = filtered.filter(
      (req) => req.outlet_id === parseInt(filters.branch)
    );
  }

  filtered = filterByDateRange(
    filtered,
    "created_at",
    filters.startDate,
    filters.endDate
  );

  return filtered.map((request) => ({
    requestId: request.material_request_id,
    branch: request.outlet?.branch_name
      ? capitalizeWords(request.outlet.branch_name)
      : "-",
    creator: request.creator_employee_name
      ? capitalizeWords(request.creator_employee_name)
      : "-",
    itemsCount: request.items?.length || 0,
    approvalDate: request.updated_at
      ? moment(request.updated_at).format("DD/MM/YYYY")
      : "-",
  }));
};

// Material-wise Request Summary
export const generateMaterialRequestSummaryReport = (data, filters) => {
  let requests = [...data.materialRequests];

  if (filters.material) {
    requests = requests.filter((req) =>
      req.items?.some((item) => item.material_id === parseInt(filters.material))
    );
  }

  if (filters.category) {
    if (filters.category === "no-category") {
      requests = requests.filter((req) =>
        req.items?.some(
          (item) =>
            !item.material?.material_category_id ||
            item.material?.material_category_id === null
        )
      );
    } else {
      requests = requests.filter((req) =>
        req.items?.some(
          (item) =>
            item.material?.material_category_id === parseInt(filters.category)
        )
      );
    }
  }

  requests = filterByDateRange(
    requests,
    "created_at",
    filters.startDate,
    filters.endDate
  );

  const materialMap = {};
  requests.forEach((request) => {
    const isApproved = request.is_approved === 1;
    request.items?.forEach((item) => {
      const materialId = item.material_id;
      const materialName = item.material?.name || `Material ${materialId}`;

      if (!materialMap[materialId]) {
        materialMap[materialId] = {
          imageUrl: item.material?.image_url || null,
          materialId: materialId,
          materialName: capitalizeWords(materialName),
          totalRequested: 0,
          totalIssued: 0,
          branchesCount: new Set(),
          latestRequest: null,
        };
      }

      materialMap[materialId].totalRequested += item.quantity || 0;
      if (isApproved) {
        materialMap[materialId].totalIssued += item.quantity || 0;
      }
      materialMap[materialId].branchesCount.add(request.outlet_id);
      if (
        !materialMap[materialId].latestRequest ||
        moment(request.created_at).isAfter(
          moment(materialMap[materialId].latestRequest)
        )
      ) {
        materialMap[materialId].latestRequest = request.created_at;
      }
    });
  });

  return Object.values(materialMap).map((mat) => ({
    ...mat,
    branchesCount: mat.branchesCount.size,
    latestRequest: mat.latestRequest
      ? moment(mat.latestRequest).format("DD/MM/YYYY")
      : "-",
  }));
};

// Branch-wise Request Summary
export const generateBranchRequestSummaryReport = (data, filters) => {
  let requests = [...data.materialRequests];

  if (filters.branch) {
    requests = requests.filter(
      (req) => req.outlet_id === parseInt(filters.branch)
    );
  }

  if (filters.material) {
    requests = requests.filter((req) =>
      req.items?.some((item) => item.material_id === parseInt(filters.material))
    );
  }

  if (filters.category) {
    if (filters.category === "no-category") {
      requests = requests.filter((req) =>
        req.items?.some(
          (item) =>
            !item.material?.material_category_id ||
            item.material?.material_category_id === null
        )
      );
    } else {
      requests = requests.filter((req) =>
        req.items?.some(
          (item) =>
            item.material?.material_category_id === parseInt(filters.category)
        )
      );
    }
  }

  requests = filterByDateRange(
    requests,
    "created_at",
    filters.startDate,
    filters.endDate
  );

  // Get branches data for branch names
  const branchesMap = {};
  (data.branches || []).forEach((branch) => {
    branchesMap[branch.branch_id] = branch.branch_name;
  });

  // Get materials data for latest_rate
  const materialsMap = {};
  (data.materials || []).forEach((material) => {
    materialsMap[material.material_id] = {
      latest_rate: material.latest_rate || 0,
      image_url: material.image_url || null,
    };
  });

  const branchMaterialMap = {};
  requests.forEach((request) => {
    const branchId = request.outlet_id;
    const branchName =
      request.outlet?.branch_name ||
      branchesMap[branchId] ||
      `Branch ${branchId}`;
    const isApproved = request.is_approved === 1;

    request.items?.forEach((item) => {
      const materialId = item.material_id;
      const materialName = item.material?.name || `Material ${materialId}`;
      const key = `${branchId}_${materialId}`;
      const materialData = materialsMap[materialId] || {};
      const latestRate = materialData.latest_rate || 0;

      if (!branchMaterialMap[key]) {
        branchMaterialMap[key] = {
          imageUrl: item.material?.image_url || materialData.image_url || null,
          branch: capitalizeWords(branchName),
          materialId: materialId,
          materialName: capitalizeWords(materialName),
          totalRequested: 0,
          totalIssued: 0,
          latestRate: latestRate,
        };
      }

      branchMaterialMap[key].totalRequested += item.quantity || 0;
      if (isApproved) {
        branchMaterialMap[key].totalIssued += item.quantity || 0;
      }
    });
  });

  return Object.values(branchMaterialMap).map((item) => {
    const totalValue = (item.totalRequested || 0) * (item.latestRate || 0);
    return {
      ...item,
      latestRate: item.latestRate ? item.latestRate.toFixed(2) : "0.00",
      totalValue: totalValue.toFixed(2),
    };
  });
};

// PO Summary by Vendor
export const generatePOSummaryByVendorReport = (data, filters) => {
  let filtered = [...data.purchaseOrders];

  if (filters.vendor) {
    filtered = filtered.filter(
      (po) => po.vendor_id === parseInt(filters.vendor)
    );
  }

  filtered = filterByDateRange(
    filtered,
    "date",
    filters.startDate,
    filters.endDate
  );

  const vendorMap = {};
  filtered.forEach((po) => {
    const vendorId = po.vendor_id;
    const vendorName = po.vendor?.name || `Vendor ${vendorId}`;

    if (!vendorMap[vendorId]) {
      vendorMap[vendorId] = {
        vendor: capitalizeWords(vendorName),
        totalPOs: 0,
        totalValue: 0,
        pending: 0,
        approved: 0,
      };
    }

    vendorMap[vendorId].totalPOs++;
    const totalAmount = calculatePOTotal(po);
    vendorMap[vendorId].totalValue += totalAmount;

    if (po.status === "raised") vendorMap[vendorId].pending++;
    if (po.status === "approved") vendorMap[vendorId].approved++;
  });

  return Object.values(vendorMap).map((vendor) => ({
    ...vendor,
    totalValue: vendor.totalValue.toFixed(2),
    averagePOValue: (vendor.totalValue / vendor.totalPOs).toFixed(2),
  }));
};

// PO Status Report
export const generatePOStatusReport = (data, filters) => {
  let filtered = [...data.purchaseOrders];

  if (filters.vendor) {
    filtered = filtered.filter(
      (po) => po.vendor_id === parseInt(filters.vendor)
    );
  }

  filtered = filterByDateRange(
    filtered,
    "date",
    filters.startDate,
    filters.endDate
  );

  return filtered.map((po) => {
    const status = po.pe_created ? "PE Created" : po.status || "raised";
    return {
      poNumber: po.purchase_order_ref || `PO-${po.purchase_order_id}`,
      vendor: po.vendor?.name ? capitalizeWords(po.vendor.name) : "-",
      date: po.date ? moment(po.date).format("DD/MM/YYYY") : "-",
      itemsCount: po.items?.length || 0,
      totalAmount: calculatePOTotal(po).toFixed(2),
      status: status === "PE Created" ? status : capitalizeWords(status),
    };
  });
};

// Material-wise PO Summary
export const generateMaterialPOSummaryReport = (data, filters) => {
  let pos = [...data.purchaseOrders];

  if (filters.material) {
    pos = pos.filter((po) =>
      po.items?.some((item) => item.material_id === parseInt(filters.material))
    );
  }

  if (filters.category) {
    if (filters.category === "no-category") {
      pos = pos.filter((po) =>
        po.items?.some(
          (item) =>
            !item.material?.material_category_id ||
            item.material?.material_category_id === null
        )
      );
    } else {
      pos = pos.filter((po) =>
        po.items?.some(
          (item) =>
            item.material?.material_category_id === parseInt(filters.category)
        )
      );
    }
  }

  pos = filterByDateRange(pos, "date", filters.startDate, filters.endDate);

  const materialMap = {};
  pos.forEach((po) => {
    po.items?.forEach((item) => {
      const materialId = item.material_id;
      const materialName = item.material?.name || `Material ${materialId}`;

      if (!materialMap[materialId]) {
        materialMap[materialId] = {
          imageUrl: item.material?.image_url || null,
          materialId: materialId,
          materialName: capitalizeWords(materialName),
          totalPOQuantity: 0,
          totalPORate: 0,
          totalPOValue: 0,
          poCount: 0,
        };
      }

      materialMap[materialId].totalPOQuantity += item.quantity || 0;
      materialMap[materialId].totalPORate += item.rate || 0;
      materialMap[materialId].totalPOValue +=
        (item.quantity || 0) * (item.rate || 0);
      materialMap[materialId].poCount++;
    });
  });

  return Object.values(materialMap).map((mat) => ({
    materialId: mat.materialId,
    materialName: mat.materialName,
    totalPOQuantity: mat.totalPOQuantity,
    averageRate:
      mat.poCount > 0 ? (mat.totalPORate / mat.poCount).toFixed(2) : "0.00",
    totalPOValue: mat.totalPOValue.toFixed(2),
    poCount: mat.poCount,
  }));
};

// PO Value Analysis
export const generatePOValueAnalysisReport = (data, filters) => {
  let filtered = [...data.purchaseOrders];

  if (filters.vendor) {
    filtered = filtered.filter(
      (po) => po.vendor_id === parseInt(filters.vendor)
    );
  }

  filtered = filterByDateRange(
    filtered,
    "date",
    filters.startDate,
    filters.endDate
  );

  return filtered.map((po) => {
    const items = po.items || [];
    const subtotal = items.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.rate || 0),
      0
    );
    const discount = parseFloat(po.discount) || 0;
    const discountAmount = (subtotal * discount) / 100;
    const tax = parseFloat(po.tax) || 0;
    const adjustment = parseFloat(po.adjustment) || 0;
    const total = subtotal - discountAmount + tax + adjustment;

    return {
      poNumber: po.purchase_order_ref || `PO-${po.purchase_order_id}`,
      vendor: po.vendor?.name ? capitalizeWords(po.vendor.name) : "-",
      subtotal: subtotal.toFixed(2),
      discount: discountAmount.toFixed(2),
      tax: tax.toFixed(2),
      adjustment: adjustment.toFixed(2),
      total: total.toFixed(2),
    };
  });
};

// PO Aging Report
export const generatePOAgingReport = (data, filters) => {
  let filtered = data.purchaseOrders.filter(
    (po) => po.status === "raised" || po.status === "approved"
  );

  if (filters.vendor) {
    filtered = filtered.filter(
      (po) => po.vendor_id === parseInt(filters.vendor)
    );
  }

  const minOverdueDays = parseFloat(filters.overdueDays) || 0;
  const today = moment();

  filtered = filtered
    .map((po) => {
      if (!po.delivery_date) return null;
      const deliveryDate = moment(po.delivery_date);
      const overdueDays = today.diff(deliveryDate, "days");
      if (overdueDays >= minOverdueDays) {
        const status = po.pe_created ? "PE Created" : po.status || "raised";
        return {
          poNumber: po.purchase_order_ref || `PO-${po.purchase_order_id}`,
          vendor: po.vendor?.name ? capitalizeWords(po.vendor.name) : "-",
          orderDate: po.date ? moment(po.date).format("DD/MM/YYYY") : "-",
          expectedDelivery: deliveryDate.format("DD/MM/YYYY"),
          daysOverdue: overdueDays,
          status: status === "PE Created" ? status : capitalizeWords(status),
        };
      }
      return null;
    })
    .filter(Boolean);

  return filtered;
};

// Vendor PO Performance
export const generateVendorPOPerformanceReport = (data, filters) => {
  let filtered = [...data.purchaseOrders];

  filtered = filterByDateRange(
    filtered,
    "date",
    filters.startDate,
    filters.endDate
  );

  const vendorMap = {};
  filtered.forEach((po) => {
    const vendorId = po.vendor_id;
    const vendorName = po.vendor?.name || `Vendor ${vendorId}`;

    if (!vendorMap[vendorId]) {
      vendorMap[vendorId] = {
        vendor: capitalizeWords(vendorName),
        totalPOs: 0,
        totalValue: 0,
      };
    }

    vendorMap[vendorId].totalPOs++;
    vendorMap[vendorId].totalValue += calculatePOTotal(po);
  });

  return Object.values(vendorMap).map((vendor) => ({
    ...vendor,
    totalValue: vendor.totalValue.toFixed(2),
    averageDeliveryTime: "-", // TODO: Calculate from purchase entries
    onTimeRate: "-", // TODO: Calculate from purchase entries
  }));
};

// Received Materials Report
export const generateReceivedMaterialsReport = (data, filters) => {
  let filtered = [...data.purchaseEntries];

  if (filters.vendor) {
    filtered = filtered.filter(
      (pe) => pe.vendor?.master_id === parseInt(filters.vendor)
    );
  }

  if (filters.branch) {
    filtered = filtered.filter(
      (pe) => pe.outlet_id === parseInt(filters.branch)
    );
  }

  if (filters.poNumber) {
    const poRef = filters.poNumber.toLowerCase();
    filtered = filtered.filter(
      (pe) =>
        pe.purchase_order_ref?.toLowerCase().includes(poRef) ||
        String(pe.purchase_order_id).includes(poRef)
    );
  }

  filtered = filterByDateRange(
    filtered,
    "invoice_date",
    filters.startDate,
    filters.endDate
  );

  return filtered.map((pe) => ({
    invoiceNumber: pe.invoice_no || "-",
    poNumber: pe.purchase_order_ref || `PO-${pe.purchase_order_id}`,
    vendor: pe.vendor?.name ? capitalizeWords(pe.vendor.name) : "-",
    invoiceDate: pe.invoice_date
      ? moment(pe.invoice_date).format("DD/MM/YYYY")
      : "-",
    itemsReceived: pe.items?.length || 0,
    totalAmount: calculatePETotal(pe).toFixed(2),
  }));
};

// Invoice Summary Report
export const generateInvoiceSummaryReport = (data, filters) => {
  let filtered = [...data.purchaseEntries];

  if (filters.vendor) {
    filtered = filtered.filter(
      (pe) => pe.vendor?.master_id === parseInt(filters.vendor)
    );
  }

  filtered = filterByDateRange(
    filtered,
    "invoice_date",
    filters.startDate,
    filters.endDate
  );

  return filtered.map((pe) => {
    const items = pe.items || [];
    const subtotal = items.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.rate || 0),
      0
    );
    const discount = parseFloat(pe.discount) || 0;
    const discountAmount = (subtotal * discount) / 100;
    const tax = parseFloat(pe.tax) || 0;
    const adjustment = parseFloat(pe.adjustment) || 0;
    const total = subtotal - discountAmount + tax + adjustment;

    return {
      invoiceNumber: pe.invoice_no || "-",
      poNumber: pe.purchase_order_ref || `PO-${pe.purchase_order_id}`,
      vendor: pe.vendor?.name ? capitalizeWords(pe.vendor.name) : "-",
      invoiceDate: pe.invoice_date
        ? moment(pe.invoice_date).format("DD/MM/YYYY")
        : "-",
      subtotal: subtotal.toFixed(2),
      discount: discountAmount.toFixed(2),
      tax: tax.toFixed(2),
      adjustment: adjustment.toFixed(2),
      total: total.toFixed(2),
    };
  });
};

// Material Receipt by PO
export const generateMaterialReceiptByPOReport = (data, filters) => {
  let filtered = [...data.purchaseEntries];

  if (filters.poNumber) {
    const poRef = filters.poNumber.toLowerCase();
    filtered = filtered.filter(
      (pe) =>
        pe.purchase_order_ref?.toLowerCase().includes(poRef) ||
        String(pe.purchase_order_id).includes(poRef)
    );
  }

  if (filters.vendor) {
    filtered = filtered.filter(
      (pe) => pe.vendor?.master_id === parseInt(filters.vendor)
    );
  }

  filtered = filterByDateRange(
    filtered,
    "invoice_date",
    filters.startDate,
    filters.endDate
  );

  const poMap = {};
  filtered.forEach((pe) => {
    const poId = pe.purchase_order_id;
    const poRef = pe.purchase_order_ref || `PO-${poId}`;

    if (!poMap[poId]) {
      poMap[poId] = {
        poNumber: poRef,
        invoiceNumber: pe.invoice_no || "-",
        vendor: pe.vendor?.name ? capitalizeWords(pe.vendor.name) : "-",
        materialsReceived: 0,
        totalReceivedValue: 0,
      };
    }

    pe.items?.forEach((item) => {
      poMap[poId].materialsReceived++;
      poMap[poId].totalReceivedValue += (item.quantity || 0) * (item.rate || 0);
    });
  });

  return Object.values(poMap).map((po) => ({
    ...po,
    totalReceivedValue: po.totalReceivedValue.toFixed(2),
  }));
};

// Vendor Payment Summary
export const generateVendorPaymentSummaryReport = (data, filters) => {
  let filtered = [...data.purchaseEntries];

  if (filters.vendor) {
    filtered = filtered.filter(
      (pe) => pe.vendor?.master_id === parseInt(filters.vendor)
    );
  }

  if (filters.branch) {
    filtered = filtered.filter(
      (pe) => pe.outlet_id === parseInt(filters.branch)
    );
  }

  filtered = filterByDateRange(
    filtered,
    "invoice_date",
    filters.startDate,
    filters.endDate
  );

  const vendorMap = {};
  filtered.forEach((pe) => {
    const vendorId = pe.vendor?.master_id;
    const vendorName = pe.vendor?.name || `Vendor ${vendorId}`;

    if (!vendorMap[vendorId]) {
      vendorMap[vendorId] = {
        vendor: capitalizeWords(vendorName),
        totalInvoices: 0,
        totalAmount: 0,
      };
    }

    vendorMap[vendorId].totalInvoices++;
    vendorMap[vendorId].totalAmount += calculatePETotal(pe);
  });

  return Object.values(vendorMap).map((vendor) => ({
    ...vendor,
    totalAmount: vendor.totalAmount.toFixed(2),
    averageInvoiceValue: (vendor.totalAmount / vendor.totalInvoices).toFixed(2),
  }));
};

// Material-wise Receipt Summary
export const generateMaterialReceiptSummaryReport = (data, filters) => {
  let entries = [...data.purchaseEntries];

  if (filters.material) {
    entries = entries.filter((pe) =>
      pe.items?.some((item) => item.material_id === parseInt(filters.material))
    );
  }

  if (filters.category) {
    if (filters.category === "no-category") {
      entries = entries.filter((pe) =>
        pe.items?.some(
          (item) =>
            !item.material?.material_category_id ||
            item.material?.material_category_id === null
        )
      );
    } else {
      entries = entries.filter((pe) =>
        pe.items?.some(
          (item) =>
            item.material?.material_category_id === parseInt(filters.category)
        )
      );
    }
  }

  entries = filterByDateRange(
    entries,
    "invoice_date",
    filters.startDate,
    filters.endDate
  );

  const materialMap = {};
  entries.forEach((pe) => {
    pe.items?.forEach((item) => {
      const materialId = item.material_id;
      const materialName = item.material?.name || `Material ${materialId}`;

      if (!materialMap[materialId]) {
        materialMap[materialId] = {
          imageUrl: item.material?.image_url || null,
          materialId: materialId,
          materialName: capitalizeWords(materialName),
          totalReceivedQuantity: 0,
          totalReceivedRate: 0,
          totalReceiptValue: 0,
          receiptCount: 0,
        };
      }

      materialMap[materialId].totalReceivedQuantity += item.quantity || 0;
      materialMap[materialId].totalReceivedRate += item.rate || 0;
      materialMap[materialId].totalReceiptValue +=
        (item.quantity || 0) * (item.rate || 0);
      materialMap[materialId].receiptCount++;
    });
  });

  return Object.values(materialMap).map((mat) => ({
    materialId: mat.materialId,
    materialName: mat.materialName,
    totalReceivedQuantity: mat.totalReceivedQuantity,
    averageRate:
      mat.receiptCount > 0
        ? (mat.totalReceivedRate / mat.receiptCount).toFixed(2)
        : "0.00",
    totalReceiptValue: mat.totalReceiptValue.toFixed(2),
    receiptCount: mat.receiptCount,
  }));
};

// PO to PE Flow Report
export const generatePOToPEFlowReport = (data, filters) => {
  const materialMap = {};

  // Process POs
  let pos = [...data.purchaseOrders];
  if (filters.vendor) {
    pos = pos.filter((po) => po.vendor_id === parseInt(filters.vendor));
  }
  pos = filterByDateRange(pos, "date", filters.startDate, filters.endDate);

  pos.forEach((po) => {
    po.items?.forEach((item) => {
      const materialId = item.material_id;
      if (!materialMap[materialId]) {
        materialMap[materialId] = {
          imageUrl: item.material?.image_url || null,
          materialId: materialId,
          materialName: item.material?.name
            ? capitalizeWords(item.material.name)
            : `Material ${materialId}`,
          poQuantity: 0,
          received: 0,
        };
      }
      materialMap[materialId].poQuantity += item.quantity || 0;
    });
  });

  // Process receipts (PEs)
  let entries = [...data.purchaseEntries];
  if (filters.vendor) {
    entries = entries.filter(
      (pe) => pe.vendor?.master_id === parseInt(filters.vendor)
    );
  }
  entries = filterByDateRange(
    entries,
    "invoice_date",
    filters.startDate,
    filters.endDate
  );

  entries.forEach((pe) => {
    pe.items?.forEach((item) => {
      const materialId = item.material_id;
      if (materialMap[materialId]) {
        materialMap[materialId].received += item.quantity || 0;
      }
    });
  });

  if (filters.material) {
    const materialId = parseInt(filters.material);
    const material = materialMap[materialId];
    if (!material) return [];
    return [
      {
        imageUrl: material.imageUrl,
        materialId: material.materialId,
        materialName: material.materialName,
        poQuantity: material.poQuantity,
        received: material.received,
        pendingReceipt: material.poQuantity - material.received,
        status:
          material.received >= material.poQuantity ? "Complete" : "Pending",
      },
    ];
  }

  return Object.values(materialMap).map((mat) => ({
    imageUrl: mat.imageUrl,
    materialId: mat.materialId,
    materialName: mat.materialName,
    poQuantity: mat.poQuantity,
    received: mat.received,
    pendingReceipt: mat.poQuantity - mat.received,
    status: mat.received >= mat.poQuantity ? "Complete" : "Pending",
  }));
};

// Material Cost Analysis
export const generateMaterialCostAnalysisReport = (data, filters) => {
  const materialMap = {};

  // Process POs
  let pos = [...data.purchaseOrders];
  if (filters.vendor) {
    pos = pos.filter((po) => po.vendor_id === parseInt(filters.vendor));
  }
  pos = filterByDateRange(pos, "date", filters.startDate, filters.endDate);

  pos.forEach((po) => {
    po.items?.forEach((item) => {
      const materialId = item.material_id;
      if (!materialMap[materialId]) {
        materialMap[materialId] = {
          imageUrl: item.material?.image_url || null,
          materialId: materialId,
          materialName: item.material?.name
            ? capitalizeWords(item.material.name)
            : `Material ${materialId}`,
          poRate: 0,
          poCount: 0,
          receiptRate: 0,
          receiptCount: 0,
        };
      }
      materialMap[materialId].poRate += item.rate || 0;
      materialMap[materialId].poCount++;
    });
  });

  // Process receipts
  let entries = [...data.purchaseEntries];
  if (filters.vendor) {
    entries = entries.filter(
      (pe) => pe.vendor?.master_id === parseInt(filters.vendor)
    );
  }
  entries = filterByDateRange(
    entries,
    "invoice_date",
    filters.startDate,
    filters.endDate
  );

  entries.forEach((pe) => {
    pe.items?.forEach((item) => {
      const materialId = item.material_id;
      if (materialMap[materialId]) {
        materialMap[materialId].receiptRate += item.rate || 0;
        materialMap[materialId].receiptCount++;
      }
    });
  });

  if (filters.material) {
    const materialId = parseInt(filters.material);
    const material = materialMap[materialId];
    if (!material) return [];

    const avgPORate =
      material.poCount > 0 ? material.poRate / material.poCount : 0;
    const avgReceiptRate =
      material.receiptCount > 0
        ? material.receiptRate / material.receiptCount
        : 0;

    return [
      {
        imageUrl: material.imageUrl,
        materialId: material.materialId,
        materialName: material.materialName,
        poRate: avgPORate.toFixed(2),
        receiptRate: avgReceiptRate.toFixed(2),
        variance: (avgReceiptRate - avgPORate).toFixed(2),
        poCount: material.poCount,
        receiptCount: material.receiptCount,
      },
    ];
  }

  return Object.values(materialMap).map((mat) => {
    const avgPORate = mat.poCount > 0 ? mat.poRate / mat.poCount : 0;
    const avgReceiptRate =
      mat.receiptCount > 0 ? mat.receiptRate / mat.receiptCount : 0;

    return {
      imageUrl: mat.imageUrl,
      materialId: mat.materialId,
      materialName: mat.materialName,
      poRate: avgPORate.toFixed(2),
      receiptRate: avgReceiptRate.toFixed(2),
      variance: (avgReceiptRate - avgPORate).toFixed(2),
      poCount: mat.poCount,
      receiptCount: mat.receiptCount,
    };
  });
};

// Stock Movement Report
export const generateStockMovementReport = (data, filters) => {
  let materials = [...data.materials];

  if (filters.material) {
    materials = materials.filter(
      (m) => m.material_id === parseInt(filters.material)
    );
  }

  // Calculate received from purchase entries (stock additions)
  const receivedMap = {};
  let entries = [...data.purchaseEntries];
  entries = filterByDateRange(
    entries,
    "invoice_date",
    filters.startDate,
    filters.endDate
  );
  entries.forEach((pe) => {
    pe.items?.forEach((item) => {
      const materialId = item.material_id;
      receivedMap[materialId] =
        (receivedMap[materialId] || 0) + (item.quantity || 0);
    });
  });

  // Calculate issued from approved material requests (stock deductions)
  const issuedMap = {};
  let requests = [...data.materialRequests];
  requests = filterByDateRange(
    requests,
    "updated_at", // Use updated_at for approved requests
    filters.startDate,
    filters.endDate
  );
  requests.forEach((request) => {
    if (request.is_approved === 1) {
      request.items?.forEach((item) => {
        const materialId = item.material_id;
        issuedMap[materialId] =
          (issuedMap[materialId] || 0) + (item.quantity || 0);
      });
    }
  });

  return materials.map((material) => {
    const received = receivedMap[material.material_id] || 0;
    const issued = issuedMap[material.material_id] || 0;
    const currentStock = material.live_stock || 0;

    return {
      imageUrl: material.image_url || null,
      materialId: material.material_id || null,
      materialName: capitalizeWords(material.name || ""),
      openingStock: currentStock - received + issued, // Reverse calculate opening
      received: received,
      issuedUsed: issued,
      closingStock: currentStock,
    };
  });
};

// Vendor Performance Report
export const generateVendorPerformanceReport = (data, filters) => {
  let pos = [...data.purchaseOrders];
  let entries = [...data.purchaseEntries];

  pos = filterByDateRange(pos, "date", filters.startDate, filters.endDate);
  entries = filterByDateRange(
    entries,
    "invoice_date",
    filters.startDate,
    filters.endDate
  );

  const vendorMap = {};
  pos.forEach((po) => {
    const vendorId = po.vendor_id;
    const vendorName = po.vendor?.name || `Vendor ${vendorId}`;

    if (!vendorMap[vendorId]) {
      vendorMap[vendorId] = {
        vendor: capitalizeWords(vendorName),
        poCount: 0,
        poValue: 0,
        receiptCount: 0,
        receiptValue: 0,
      };
    }

    vendorMap[vendorId].poCount++;
    vendorMap[vendorId].poValue += calculatePOTotal(po);
  });

  entries.forEach((pe) => {
    const vendorId = pe.vendor?.master_id;
    if (vendorMap[vendorId]) {
      vendorMap[vendorId].receiptCount++;
      vendorMap[vendorId].receiptValue += calculatePETotal(pe);
    }
  });

  return Object.values(vendorMap).map((vendor) => ({
    ...vendor,
    poValue: vendor.poValue.toFixed(2),
    receiptValue: vendor.receiptValue.toFixed(2),
    averageRateAccuracy: "-", // TODO: Calculate accuracy
  }));
};

// Material Utilization Report
export const generateMaterialUtilizationReport = (data, filters) => {
  let materials = [...data.materials];

  if (filters.material) {
    materials = materials.filter(
      (m) => m.material_id === parseInt(filters.material)
    );
  }

  if (filters.category) {
    if (filters.category === "no-category") {
      materials = materials.filter(
        (m) => !m.material_category_id || m.material_category_id === null
      );
    } else {
      materials = materials.filter(
        (m) => m.material_category_id === parseInt(filters.category)
      );
    }
  }

  // Calculate approved requests (stock reductions)
  const approvedRequestMap = {};
  let requests = [...data.materialRequests];
  requests = filterByDateRange(
    requests,
    "updated_at",
    filters.startDate,
    filters.endDate
  );

  requests.forEach((request) => {
    if (request.is_approved === 1) {
      request.items?.forEach((item) => {
        const materialId = item.material_id;
        approvedRequestMap[materialId] =
          (approvedRequestMap[materialId] || 0) + (item.quantity || 0);
      });
    }
  });

  // Calculate received from purchase entries (stock additions)
  const receivedMap = {};
  let entries = [...data.purchaseEntries];
  entries = filterByDateRange(
    entries,
    "invoice_date",
    filters.startDate,
    filters.endDate
  );

  entries.forEach((pe) => {
    pe.items?.forEach((item) => {
      const materialId = item.material_id;
      receivedMap[materialId] =
        (receivedMap[materialId] || 0) + (item.quantity || 0);
    });
  });

  return materials.map((material) => {
    const approvedRequests = approvedRequestMap[material.material_id] || 0;
    const received = receivedMap[material.material_id] || 0;
    const currentStock = material.live_stock || 0;
    const netMovement = received - approvedRequests;

    return {
      imageUrl: material.image_url || null,
      materialId: material.material_id || null,
      materialName: capitalizeWords(material.name || ""),
      totalApprovedRequests: approvedRequests,
      totalReceivedPE: received,
      currentStock: currentStock,
      netMovement: netMovement,
    };
  });
};

// Helper functions
const calculatePOTotal = (po) => {
  const items = po.items || [];
  const subtotal = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.rate || 0),
    0
  );
  const discount = parseFloat(po.discount) || 0;
  const discountAmount = (subtotal * discount) / 100;
  const tax = parseFloat(po.tax) || 0;
  const adjustment = parseFloat(po.adjustment) || 0;
  return subtotal - discountAmount + tax + adjustment;
};

const calculatePETotal = (pe) => {
  const items = pe.items || [];
  const subtotal = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.rate || 0),
    0
  );
  const discount = parseFloat(pe.discount) || 0;
  const discountAmount = (subtotal * discount) / 100;
  const tax = parseFloat(pe.tax) || 0;
  const adjustment = parseFloat(pe.adjustment) || 0;
  return subtotal - discountAmount + tax + adjustment;
};

// Export report generator map
export const REPORT_GENERATORS = {
  inventory: generateInventoryReport,
  "low-stock": generateLowStockReport,
  "material-valuation": generateMaterialValuationReport,
  "category-summary": generateCategorySummaryReport,
  "supplier-materials": generateSupplierMaterialsReport,
  "material-tax": generateMaterialTaxReport,
  "request-by-branch": generateRequestByBranchReport,
  "pending-requests": generatePendingRequestsReport,
  "approved-requests": generateApprovedRequestsReport,
  "material-request-summary": generateMaterialRequestSummaryReport,
  "branch-request-summary": generateBranchRequestSummaryReport,
  "po-by-vendor": generatePOSummaryByVendorReport,
  "po-status": generatePOStatusReport,
  "material-po-summary": generateMaterialPOSummaryReport,
  "po-value-analysis": generatePOValueAnalysisReport,
  "po-aging": generatePOAgingReport,
  "vendor-po-performance": generateVendorPOPerformanceReport,
  "received-materials": generateReceivedMaterialsReport,
  "invoice-summary": generateInvoiceSummaryReport,
  "material-receipt-by-po": generateMaterialReceiptByPOReport,
  "vendor-payment-summary": generateVendorPaymentSummaryReport,
  "material-receipt-summary": generateMaterialReceiptSummaryReport,
  "po-to-pe-flow": generatePOToPEFlowReport,
  "material-cost-analysis": generateMaterialCostAnalysisReport,
  "stock-movement": generateStockMovementReport,
  "vendor-performance": generateVendorPerformanceReport,
  "material-utilization": generateMaterialUtilizationReport,
};
