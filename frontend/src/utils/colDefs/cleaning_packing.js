const { capitalizeWords } = require("../string");

export const colDefsCleaning = [
  {
    field: "article_name",
    headerName: "Name",
    resizable: true,
    valueGetter: (props) => capitalizeWords(props.data.article_name),
  },
  {
    field: "parent_stock",
    headerName: "Current Stock",
    resizable: true,
  },
  {
    field: "repackage_conversion",
    headerName: "Repack Conversion",
    resizable: true,
  },
  {
    field: "bulk_weight",
    headerName: "Bulk Weight",
    resizable: false,
  },
  {
    field: "priority_score",
    headerName: "Priority Score",
    resizable: false,
  },
];

export const colDefsPacking = [
  {
    field: "article_id",
    headerName: "ID",
    resizable: false,
    maxWidth: 100,
  },
  {
    field: "article_name",
    headerName: "Name",
    resizable: true,
    valueGetter: (props) => capitalizeWords(props.data.article_name),
  },
  {
    field: "priority_score",
    headerName: "Priority Score",
    resizable: true,
  },
  {
    field: "repackage_conversion",
    headerName: "Repack Conversion",
    resizable: true,
  },
  {
    field: "repack_quantity",
    headerName: "Pack Qty",
    resizable: false,
  },
  {
    field: "packing_material_val",
    headerName: "Packing Material",
    resizable: false,
  },
  {
    field: "packing_material_size_val",
    headerName: "Packing Material Size",
    resizable: false,
  },
  {
    field: "sticker_val",
    headerName: "Sticker",
    resizable: false,
  },
  {
    field: "store_uom",
    headerName: "Store UOM",
    resizable: false,
  },
];
