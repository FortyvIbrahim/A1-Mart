import { Badge } from "@chakra-ui/react";
import {
  daysDisplayComparator,
  formatDaysDisplay,
  getChainBillLevelBadge,
  getPurchaseTypeBadge,
  getStatusBadge,
  getStockAvailabilityBadge,
} from "@/utils/stockHoldingDashboard";
import { capitalizeWordsLatest } from "@/utils/string";

const renderBadgeCell = (props) => {
  if (!props.value?.label) return "—";
  return (
    <Badge colorPalette={props.value.colorScheme}>{props.value.label}</Badge>
  );
};

export const STOCK_HOLDING_ITEMS_TABLE_KEY = "stock-holding-dashboard-items";

export function getStockHoldingItemsColumnDefs({ showLowStock = false } = {}) {
  return [
    { field: "product_id", headerName: "P. ID", type: "id" },
    { field: "product_image", headerName: "Image", type: "image" },
    {
      field: "product_name",
      headerName: "Product",
      flex: 1,
      valueGetter: (params) =>
        params.data?.product_name
          ? capitalizeWordsLatest(params.data.product_name)
          : "—",
    },
    {
      field: "department_label",
      headerName: "Department",
      flex: 1,
      hideByDefault: true,
    },
    {
      field: "category_label",
      headerName: "Category",
      flex: 1,
      hideByDefault: true,
    },
    {
      field: "subcategory_label",
      headerName: "Subcategory",
      flex: 1,
      hideByDefault: true,
    },
    {
      field: "branch_label",
      headerName: "Branch",
      flex: 1,
      hideByDefault: true,
    },
    {
      field: "supplier_label",
      headerName: "Supplier",
      flex: 1,
      hideByDefault: true,
    },
    {
      field: "distributor_label",
      headerName: "Distributor",
      flex: 1,
      hideByDefault: true,
    },
    {
      field: "buyer_label",
      headerName: "Buyer",
      flex: 1,
      hideByDefault: true,
    },
    {
      field: "purchase_type",
      headerName: "P. Type",
      type: "badge-column",
      valueGetter: (params) => getPurchaseTypeBadge(params.data?.purchase_type),
      cellRenderer: renderBadgeCell,
    },
    { field: "stock_qty", headerName: "S. Qty", type: "number" },
    { field: "stock_value", headerName: "S. Value", type: "number" },
    // { field: "stock_on_order", headerName: "S. On Order", type: "number" },
    {
      field: "stock_duration",
      headerName: "S. Duration",
      valueGetter: (params) => formatDaysDisplay(params.data?.stock_duration),
      comparator: daysDisplayComparator,
    },
    {
      field: "per_day_stock",
      headerName: "Per Day Stock",
      type: "number",
      valueGetter: (params) => params.data?.per_day_stock,
    },
    {
      field: "holding_days",
      headerName: "H. Days",
      valueGetter: (params) => formatDaysDisplay(params.data?.holding_days),
      comparator: daysDisplayComparator,
    },
    {
      field: "stock_availability",
      headerName: "Availability",
      type: "badge-column",
      valueGetter: (params) =>
        getStockAvailabilityBadge(params.data, { showLowStock }),
    },
    {
      field: "status",
      headerName: "Item Status",
      type: "badge-column",
      valueGetter: (params) => getStatusBadge(params.data?.status),
    },
    {
      field: "chain_bill_count_level",
      headerName: "C. Bill Level",
      type: "badge-column",
      valueGetter: (params) =>
        getChainBillLevelBadge(params.data?.chain_bill_count_level),
      cellRenderer: renderBadgeCell,
    },
  ];
}
