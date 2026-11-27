import {
  DASHBOARD_MODULE,
  MASTER_DATA_MODULE,
  TASK_MANAGEMENT_MODULE,
  PERFORMANCE_MODULE,
  SALES_TARGET_MODULE,
  CHECKLIST_MODULE,
  MATERIALS_MODULE,
  WAREHOUSE_MODULE,
  UPLOADS_MODULE,
  STOCK_MODULE,
  REPORTS_MODULE,
  APPROVALS_MODULE,
  INCENTIVE_MODULE,
  LOGS_MODULE,
  PAYROLL_MODULE,
  ACCOUNTS_MODULE,
  PURCHASE_RETURN_MODULE,
  TRANSPORTS_MODULE,
} from "./routes/modules";

import {
  DASHBOARD_ROUTES,
  EMPLOYEES_ROUTES,
  DESIGNATIONS_ROUTES,
  BRANCHES_ROUTES,
  MASTER_LIST_ROUTES,
  BILLING_COUNTER_ROUTES,
  PRODUCTS_ROUTES,
  REPACK_ITEMS_ROUTES,
  TASKS_ROUTES,
  PERFORMANCE_ROUTES,
  TARGET_BRANCH_ROUTES,
  TARGET_DEPARTMENT_ROUTES,
  TARGET_SECTION_ROUTES,
  TARGET_EMPLOYEE_ROUTES,
  TARGET_STATS_ROUTES,
  EB_CONSUMPTION_ROUTES,
  TARGET_ENTRY_ROUTES,
  CHECKLIST_FORM_ROUTES,
  CHECKLIST_FILL_ROUTES,
  CHECKLIST_RESPONSE_ROUTES,
  PURCHASE_ORDER_ROUTES,
  PURCHASE_ENTRY_ROUTES,
  MATERIALS_REQUEST_ROUTES,
  STOCK_ADDITION_ROUTES,
  MATERIALS_ROUTES,
  MATERIALS_CATEGORY_ROUTES,
  PURCHASE_ACKNOWLEDGMENT_ROUTES,
  GRN_ROUTES,
  WMS_PURCHASE_ENTRY_ROUTES,
  PURCHASE_REORDER_ROUTES,
  PO_ROUTES,
  STICKERING_ROUTES,
  REPACK_ENTRY_SHEET_ROUTES,
  CLEANING_PACKING_ROUTES,
  PICKING_ROUTES,
  CIRCLE_ROUTES,
  STOCK_CHECKER_ROUTES,
  PRICE_CHECKER_ROUTES,
  DEAD_STOCK_REPORT_ROUTES,
  OUTSTANDING_REPORT_ROUTES,
  STOCK_HOLDING_REPORT_ROUTES,
  SALES_REPORT_ROUTES,
  MATERIALS_REPORT_ROUTES,
  INCENTIVE_APPROVALS_ROUTES,
  PAYROLL_APPROVALS_ROUTES,
  INCENTIVE_GENERATOR_ROUTES,
  STICKERING_INCENTIVE_ROUTES,
  SALES_INCENTIVE_ROUTES,
  GRN_INCENTIVE_ROUTES,
  PURCHASE_INCENTIVE_ROUTES,
  PICK_AND_PACK_INCENTIVE_ROUTES,
  PURCHASE_DATA_ENTRY_INCENTIVE_ROUTES,
  BILLING_OPERATOR_INCENTIVE_ROUTES,
  BILLING_CHECKER_INCENTIVE_ROUTES,
  LOGS_ROUTES,
  PAYROLL_ENTRY_ROUTES,
  BANK_SUBMISSION_ROUTES,
  PAYSLIPS_ROUTES,
  EMPLOYEE_ALLOCATION_ROUTES,
  LEDGERS_ROUTES,
  ACCOUNT_ASSETS_ROUTES,
  PAYMENTS_ROUTES,
  RECEIPTS_ROUTES,
  CASHBOOK_ROUTES,
  MONEY_TRANSFER_ROUTES,
  PURCHASE_RETURN_ISSUE_ROUTES,
  PURCHASE_RETURN_RECEIPT_ROUTES,
  DISTRIBUTOR_ISSUE_ROUTES,
  PURCHASE_RETURN_STOCK_ROUTES,
  TRANSPORTS_ROUTES,
} from "./routes/index";

const WMS_DASHBOARD_MENU_SECTION = {
  title: "Dashboard",
  icon: DASHBOARD_MODULE.icon,
  subMenu: [
    {
      title: DASHBOARD_ROUTES.wms.title,
      permission_key: DASHBOARD_ROUTES.wms.permissionKey,
      location: DASHBOARD_ROUTES.wms.path,
    },
    {
      title: DASHBOARD_ROUTES.stock.title,
      permission_key: DASHBOARD_ROUTES.stock.permissionKey,
      location: DASHBOARD_ROUTES.stock.path,
    },
    {
      title: DASHBOARD_ROUTES.outstanding.title,
      permission_key: DASHBOARD_ROUTES.outstanding.permissionKey,
      location: DASHBOARD_ROUTES.outstanding.path,
    },
    {
      title: DASHBOARD_ROUTES.stockHolding.title,
      permission_key: DASHBOARD_ROUTES.stockHolding.permissionKey,
      location: DASHBOARD_ROUTES.stockHolding.path,
    },
  ],
};

const WMS_WAREHOUSE_MENU_SECTION = {
  title: WAREHOUSE_MODULE.name,
  icon: WAREHOUSE_MODULE.icon,
  subMenu: [
    {
      title: PURCHASE_REORDER_ROUTES.listing.title,
      permission_key: PURCHASE_REORDER_ROUTES.listing.permissionKey,
      location: PURCHASE_REORDER_ROUTES.listing.path,
      group: "Purchase Planning",
      sidebarTitle: "Purchase Reorders",
    },
    {
      title: PO_ROUTES.listing.title,
      permission_key: PO_ROUTES.listing.permissionKey,
      location: PO_ROUTES.listing.path,
      group: "Purchase Planning",
      sidebarTitle: "Purchase Orders",
    },
    {
      title: PURCHASE_ACKNOWLEDGMENT_ROUTES.listing.title,
      permission_key: PURCHASE_ACKNOWLEDGMENT_ROUTES.listing.permissionKey,
      location: PURCHASE_ACKNOWLEDGMENT_ROUTES.listing.path,
      group: "Goods Receiving",
      sidebarTitle: "Purchase Acknowledgments",
    },
    {
      title: GRN_ROUTES.listing.title,
      permission_key: GRN_ROUTES.listing.permissionKey,
      location: GRN_ROUTES.listing.path,
      group: "Goods Receiving",
      sidebarTitle: "GRN",
    },
    {
      title: WMS_PURCHASE_ENTRY_ROUTES.listing.title,
      permission_key: WMS_PURCHASE_ENTRY_ROUTES.listing.permissionKey,
      location: WMS_PURCHASE_ENTRY_ROUTES.listing.path,
      group: "Purchase Processing",
      sidebarTitle: "WMS Purchase Entry",
    },
    {
      title: STICKERING_ROUTES.listing.title,
      permission_key: STICKERING_ROUTES.listing.permissionKey,
      location: STICKERING_ROUTES.listing.path,
      group: "Purchase Processing",
      sidebarTitle: "Job Worksheet",
    },
    {
      title: REPACK_ENTRY_SHEET_ROUTES.listing.title,
      permission_key: REPACK_ENTRY_SHEET_ROUTES.listing.permissionKey,
      location: REPACK_ENTRY_SHEET_ROUTES.listing.path,
      group: "Purchase Processing",
      sidebarTitle: "Repack Entry Sheet",
    },
    {
      title: CLEANING_PACKING_ROUTES.listing.title,
      permission_key: CLEANING_PACKING_ROUTES.listing.permissionKey,
      location: CLEANING_PACKING_ROUTES.listing.path,
      group: "Warehouse Preparation",
      sidebarTitle: "Cleaning & Packing",
    },
    {
      title: PICKING_ROUTES.listing.title,
      permission_key: PICKING_ROUTES.listing.permissionKey,
      location: PICKING_ROUTES.listing.path,
      group: "Warehouse Preparation",
      sidebarTitle: "Picking List",
    },
    {
      title: STICKERING_ROUTES.mine.title,
      permission_key: STICKERING_ROUTES.mine.permissionKey,
      location: STICKERING_ROUTES.mine.path,
      group: "My Worksheet",
      sidebarTitle: "My Job Worksheet",
    },
    {
      title: REPACK_ENTRY_SHEET_ROUTES.mine.title,
      permission_key: REPACK_ENTRY_SHEET_ROUTES.mine.permissionKey,
      location: REPACK_ENTRY_SHEET_ROUTES.mine.path,
      group: "My Worksheet",
      sidebarTitle: "My Repack Entry Sheet",
    },
  ],
};

const WMS_UPLOADS_MENU_SECTION = {
  title: UPLOADS_MODULE.name,
  icon: UPLOADS_MODULE.icon,
  subMenu: [
    {
      title: DEAD_STOCK_REPORT_ROUTES.listing.title,
      permission_key: DEAD_STOCK_REPORT_ROUTES.listing.permissionKey,
      location: DEAD_STOCK_REPORT_ROUTES.listing.path,
    },
    {
      title: OUTSTANDING_REPORT_ROUTES.listing.title,
      permission_key: OUTSTANDING_REPORT_ROUTES.listing.permissionKey,
      location: OUTSTANDING_REPORT_ROUTES.listing.path,
    },
    {
      title: STOCK_HOLDING_REPORT_ROUTES.listing.title,
      permission_key: STOCK_HOLDING_REPORT_ROUTES.listing.permissionKey,
      location: STOCK_HOLDING_REPORT_ROUTES.listing.path,
    },
    {
      title: SALES_REPORT_ROUTES.listing.title,
      permission_key: SALES_REPORT_ROUTES.listing.permissionKey,
      location: SALES_REPORT_ROUTES.listing.path,
    },
  ],
};

const WMS_MENU = [
  WMS_DASHBOARD_MENU_SECTION,
  WMS_WAREHOUSE_MENU_SECTION,
  WMS_UPLOADS_MENU_SECTION,
];

const ALL_PAGES_MENU = [
  {
    title: DASHBOARD_MODULE.name,
    icon: DASHBOARD_MODULE.icon,
    subMenu: [
      {
        title: DASHBOARD_ROUTES.accounts.title,
        permission_key: DASHBOARD_ROUTES.accounts.permissionKey,
        location: DASHBOARD_ROUTES.accounts.path,
      },
      {
        title: DASHBOARD_ROUTES.employee.title,
        permission_key: DASHBOARD_ROUTES.employee.permissionKey,
        location: DASHBOARD_ROUTES.employee.path,
      },
      {
        title: DASHBOARD_ROUTES.payroll.title,
        permission_key: DASHBOARD_ROUTES.payroll.permissionKey,
        location: DASHBOARD_ROUTES.payroll.path,
      },
      {
        title: DASHBOARD_ROUTES.attendance.title,
        permission_key: DASHBOARD_ROUTES.attendance.permissionKey,
        location: DASHBOARD_ROUTES.attendance.path,
      },
      {
        title: DASHBOARD_ROUTES.stockCircle.title,
        permission_key: DASHBOARD_ROUTES.stockCircle.permissionKey,
        location: DASHBOARD_ROUTES.stockCircle.path,
      },
      {
        title: DASHBOARD_ROUTES.checklist.title,
        permission_key: DASHBOARD_ROUTES.checklist.permissionKey,
        location: DASHBOARD_ROUTES.checklist.path,
      },
    ],
  },
  {
    title: MASTER_DATA_MODULE.name,
    icon: MASTER_DATA_MODULE.icon,
    subMenu: [
      {
        title: EMPLOYEES_ROUTES.listing.title,
        permission_key: EMPLOYEES_ROUTES.listing.permissionKey,
        location: EMPLOYEES_ROUTES.listing.path,
      },
      {
        title: DESIGNATIONS_ROUTES.listing.title,
        permission_key: DESIGNATIONS_ROUTES.listing.permissionKey,
        location: DESIGNATIONS_ROUTES.listing.path,
      },
      {
        title: BRANCHES_ROUTES.listing.title,
        permission_key: BRANCHES_ROUTES.listing.permissionKey,
        location: BRANCHES_ROUTES.listing.path,
      },
      {
        title: MASTER_LIST_ROUTES.listing.title,
        permission_key: MASTER_LIST_ROUTES.listing.permissionKey,
        location: MASTER_LIST_ROUTES.listing.path,
      },
      {
        title: BILLING_COUNTER_ROUTES.listing.title,
        permission_key: BILLING_COUNTER_ROUTES.listing.permissionKey,
        location: BILLING_COUNTER_ROUTES.listing.path,
      },
      {
        title: PRODUCTS_ROUTES.listing.title,
        permission_key: PRODUCTS_ROUTES.listing.permissionKey,
        location: PRODUCTS_ROUTES.listing.path,
      },
      {
        title: REPACK_ITEMS_ROUTES.listing.title,
        permission_key: REPACK_ITEMS_ROUTES.listing.permissionKey,
        location: REPACK_ITEMS_ROUTES.listing.path,
      },
    ],
  },
  {
    title: TASK_MANAGEMENT_MODULE.name,
    icon: TASK_MANAGEMENT_MODULE.icon,
    subMenu: [
      {
        title: TASKS_ROUTES.listing.title,
        permission_key: TASKS_ROUTES.listing.permissionKey,
        location: TASKS_ROUTES.listing.path,
      },
      {
        title: TASKS_ROUTES.mine.title,
        permission_key: TASKS_ROUTES.mine.permissionKey,
        location: TASKS_ROUTES.mine.path,
      },
    ],
  },
  {
    title: PERFORMANCE_MODULE.name,
    icon: PERFORMANCE_MODULE.icon,
    subMenu: [
      {
        title: PERFORMANCE_ROUTES.listing.title,
        permission_key: PERFORMANCE_ROUTES.listing.permissionKey,
        location: PERFORMANCE_ROUTES.listing.path,
      },
      {
        title: PERFORMANCE_ROUTES.create.title,
        permission_key: PERFORMANCE_ROUTES.create.permissionKey,
        location: PERFORMANCE_ROUTES.create.path,
      },
      {
        title: PERFORMANCE_ROUTES.loadData.title,
        permission_key: PERFORMANCE_ROUTES.loadData.permissionKey,
        location: PERFORMANCE_ROUTES.loadData.path,
      },
    ],
  },
  {
    title: SALES_TARGET_MODULE.name,
    icon: SALES_TARGET_MODULE.icon,
    subMenu: [
      {
        title: TARGET_BRANCH_ROUTES.listing.title,
        permission_key: TARGET_BRANCH_ROUTES.listing.permissionKey,
        location: TARGET_BRANCH_ROUTES.listing.path,
      },
      {
        title: TARGET_DEPARTMENT_ROUTES.listing.title,
        permission_key: TARGET_DEPARTMENT_ROUTES.listing.permissionKey,
        location: TARGET_DEPARTMENT_ROUTES.listing.path,
      },
      {
        title: TARGET_SECTION_ROUTES.listing.title,
        permission_key: TARGET_SECTION_ROUTES.listing.permissionKey,
        location: TARGET_SECTION_ROUTES.listing.path,
      },
      {
        title: TARGET_EMPLOYEE_ROUTES.listing.title,
        permission_key: TARGET_EMPLOYEE_ROUTES.listing.permissionKey,
        location: TARGET_EMPLOYEE_ROUTES.listing.path,
      },
      {
        title: TARGET_STATS_ROUTES.listing.title,
        permission_key: TARGET_STATS_ROUTES.listing.permissionKey,
        location: TARGET_STATS_ROUTES.listing.path,
      },
    ],
  },
  {
    title: CHECKLIST_MODULE.name,
    icon: CHECKLIST_MODULE.icon,
    subMenu: [
      {
        title: EB_CONSUMPTION_ROUTES.listing.title,
        permission_key: EB_CONSUMPTION_ROUTES.listing.permissionKey,
        location: EB_CONSUMPTION_ROUTES.listing.path,
      },
      {
        title: TARGET_ENTRY_ROUTES.listing.title,
        permission_key: TARGET_ENTRY_ROUTES.listing.permissionKey,
        location: TARGET_ENTRY_ROUTES.listing.path,
      },
      {
        title: CHECKLIST_FORM_ROUTES.listing.title,
        permission_key: CHECKLIST_FORM_ROUTES.listing.permissionKey,
        location: CHECKLIST_FORM_ROUTES.listing.path,
      },
      {
        title: CHECKLIST_FILL_ROUTES.listing.title,
        permission_key: CHECKLIST_FILL_ROUTES.listing.permissionKey,
        location: CHECKLIST_FILL_ROUTES.listing.path,
      },
      {
        title: CHECKLIST_RESPONSE_ROUTES.listing.title,
        permission_key: CHECKLIST_RESPONSE_ROUTES.listing.permissionKey,
        location: CHECKLIST_RESPONSE_ROUTES.listing.path,
      },
    ],
  },
  {
    title: MATERIALS_MODULE.name,
    icon: MATERIALS_MODULE.icon,
    subMenu: [
      {
        title: PURCHASE_ORDER_ROUTES.listing.title,
        permission_key: PURCHASE_ORDER_ROUTES.listing.permissionKey,
        location: PURCHASE_ORDER_ROUTES.listing.path,
      },
      {
        title: PURCHASE_ENTRY_ROUTES.listing.title,
        permission_key: PURCHASE_ENTRY_ROUTES.listing.permissionKey,
        location: PURCHASE_ENTRY_ROUTES.listing.path,
      },
      {
        title: MATERIALS_REQUEST_ROUTES.listing.title,
        permission_key: MATERIALS_REQUEST_ROUTES.listing.permissionKey,
        location: MATERIALS_REQUEST_ROUTES.listing.path,
      },
      {
        title: STOCK_ADDITION_ROUTES.listing.title,
        permission_key: STOCK_ADDITION_ROUTES.listing.permissionKey,
        location: STOCK_ADDITION_ROUTES.listing.path,
      },
      {
        title: MATERIALS_ROUTES.listing.title,
        permission_key: MATERIALS_ROUTES.listing.permissionKey,
        location: MATERIALS_ROUTES.listing.path,
      },
      {
        title: MATERIALS_CATEGORY_ROUTES.listing.title,
        permission_key: MATERIALS_CATEGORY_ROUTES.listing.permissionKey,
        location: MATERIALS_CATEGORY_ROUTES.listing.path,
      },
    ],
  },
  {
    title: STOCK_MODULE.name,
    icon: STOCK_MODULE.icon,
    subMenu: [
      {
        title: CIRCLE_ROUTES.listing.title,
        permission_key: CIRCLE_ROUTES.listing.permissionKey,
        location: CIRCLE_ROUTES.listing.path,
      },
      {
        title: STOCK_CHECKER_ROUTES.listing.title,
        permission_key: STOCK_CHECKER_ROUTES.listing.permissionKey,
        location: STOCK_CHECKER_ROUTES.listing.path,
      },
      {
        title: PRICE_CHECKER_ROUTES.listing.title,
        permission_key: PRICE_CHECKER_ROUTES.listing.permissionKey,
        location: PRICE_CHECKER_ROUTES.listing.path,
      },
    ],
  },
  {
    title: REPORTS_MODULE.name,
    icon: REPORTS_MODULE.icon,
    subMenu: [
      {
        title: MATERIALS_REPORT_ROUTES.listing.title,
        permission_key: MATERIALS_REPORT_ROUTES.listing.permissionKey,
        location: MATERIALS_REPORT_ROUTES.listing.path,
      },
    ],
  },
  {
    title: APPROVALS_MODULE.name,
    icon: APPROVALS_MODULE.icon,
    subMenu: [
      {
        title: INCENTIVE_APPROVALS_ROUTES.listing.title,
        permission_key: INCENTIVE_APPROVALS_ROUTES.listing.permissionKey,
        location: INCENTIVE_APPROVALS_ROUTES.listing.path,
      },
      {
        title: PAYROLL_APPROVALS_ROUTES.listing.title,
        permission_key: PAYROLL_APPROVALS_ROUTES.listing.permissionKey,
        location: PAYROLL_APPROVALS_ROUTES.listing.path,
      },
    ],
  },
  {
    title: INCENTIVE_MODULE.name,
    icon: INCENTIVE_MODULE.icon,
    subMenu: [
      {
        title: INCENTIVE_GENERATOR_ROUTES.listing.title,
        permission_key: INCENTIVE_GENERATOR_ROUTES.listing.permissionKey,
        location: INCENTIVE_GENERATOR_ROUTES.listing.path,
      },
      {
        title: STICKERING_INCENTIVE_ROUTES.listing.title,
        permission_key: STICKERING_INCENTIVE_ROUTES.listing.permissionKey,
        location: STICKERING_INCENTIVE_ROUTES.listing.path,
      },
      {
        title: SALES_INCENTIVE_ROUTES.listing.title,
        permission_key: SALES_INCENTIVE_ROUTES.listing.permissionKey,
        location: SALES_INCENTIVE_ROUTES.listing.path,
      },
      {
        title: GRN_INCENTIVE_ROUTES.listing.title,
        permission_key: GRN_INCENTIVE_ROUTES.listing.permissionKey,
        location: GRN_INCENTIVE_ROUTES.listing.path,
      },
      {
        title: PURCHASE_INCENTIVE_ROUTES.listing.title,
        permission_key: PURCHASE_INCENTIVE_ROUTES.listing.permissionKey,
        location: PURCHASE_INCENTIVE_ROUTES.listing.path,
      },
      {
        title: PICK_AND_PACK_INCENTIVE_ROUTES.listing.title,
        permission_key: PICK_AND_PACK_INCENTIVE_ROUTES.listing.permissionKey,
        location: PICK_AND_PACK_INCENTIVE_ROUTES.listing.path,
      },
      {
        title: PURCHASE_DATA_ENTRY_INCENTIVE_ROUTES.listing.title,
        permission_key:
          PURCHASE_DATA_ENTRY_INCENTIVE_ROUTES.listing.permissionKey,
        location: PURCHASE_DATA_ENTRY_INCENTIVE_ROUTES.listing.path,
      },
      {
        title: BILLING_OPERATOR_INCENTIVE_ROUTES.listing.title,
        permission_key: BILLING_OPERATOR_INCENTIVE_ROUTES.listing.permissionKey,
        location: BILLING_OPERATOR_INCENTIVE_ROUTES.listing.path,
      },
      {
        title: BILLING_CHECKER_INCENTIVE_ROUTES.listing.title,
        permission_key: BILLING_CHECKER_INCENTIVE_ROUTES.listing.permissionKey,
        location: BILLING_CHECKER_INCENTIVE_ROUTES.listing.path,
      },
    ],
  },
  {
    title: LOGS_MODULE.name,
    icon: LOGS_MODULE.icon,
    subMenu: [
      {
        title: LOGS_ROUTES.listing.title,
        permission_key: LOGS_ROUTES.listing.permissionKey,
        location: LOGS_ROUTES.listing.path,
      },
    ],
  },
  {
    title: PAYROLL_MODULE.name,
    icon: PAYROLL_MODULE.icon,
    subMenu: [
      {
        title: PAYROLL_ENTRY_ROUTES.listing.title,
        permission_key: PAYROLL_ENTRY_ROUTES.listing.permissionKey,
        location: PAYROLL_ENTRY_ROUTES.listing.path,
      },
      {
        title: BANK_SUBMISSION_ROUTES.listing.title,
        permission_key: BANK_SUBMISSION_ROUTES.listing.permissionKey,
        location: BANK_SUBMISSION_ROUTES.listing.path,
      },
      {
        title: PAYSLIPS_ROUTES.listing.title,
        permission_key: PAYSLIPS_ROUTES.listing.permissionKey,
        location: PAYSLIPS_ROUTES.listing.path,
      },
      {
        title: PAYSLIPS_ROUTES.mine.title,
        permission_key: PAYSLIPS_ROUTES.mine.permissionKey,
        location: PAYSLIPS_ROUTES.mine.path,
      },
      {
        title: EMPLOYEE_ALLOCATION_ROUTES.listing.title,
        permission_key: EMPLOYEE_ALLOCATION_ROUTES.listing.permissionKey,
        location: EMPLOYEE_ALLOCATION_ROUTES.listing.path,
      },
    ],
  },
  {
    title: ACCOUNTS_MODULE.name,
    icon: ACCOUNTS_MODULE.icon,
    subMenu: [
      {
        title: LEDGERS_ROUTES.listing.title,
        permission_key: LEDGERS_ROUTES.listing.permissionKey,
        location: LEDGERS_ROUTES.listing.path,
      },
      {
        title: ACCOUNT_ASSETS_ROUTES.listing.title,
        permission_key: ACCOUNT_ASSETS_ROUTES.listing.permissionKey,
        location: ACCOUNT_ASSETS_ROUTES.listing.path,
      },
      {
        title: PAYMENTS_ROUTES.listing.title,
        permission_key: PAYMENTS_ROUTES.listing.permissionKey,
        location: PAYMENTS_ROUTES.listing.path,
      },
      {
        title: RECEIPTS_ROUTES.listing.title,
        permission_key: RECEIPTS_ROUTES.listing.permissionKey,
        location: RECEIPTS_ROUTES.listing.path,
      },
      {
        title: CASHBOOK_ROUTES.listing.title,
        permission_key: CASHBOOK_ROUTES.listing.permissionKey,
        location: CASHBOOK_ROUTES.listing.path,
      },
      {
        title: MONEY_TRANSFER_ROUTES.listing.title,
        permission_key: MONEY_TRANSFER_ROUTES.listing.permissionKey,
        location: MONEY_TRANSFER_ROUTES.listing.path,
      },
    ],
  },
  {
    title: PURCHASE_RETURN_MODULE.name,
    icon: PURCHASE_RETURN_MODULE.icon,
    subMenu: [
      {
        title: PURCHASE_RETURN_ISSUE_ROUTES.listing.title,
        permission_key: PURCHASE_RETURN_ISSUE_ROUTES.listing.permissionKey,
        location: PURCHASE_RETURN_ISSUE_ROUTES.listing.path,
      },
      {
        title: PURCHASE_RETURN_RECEIPT_ROUTES.listing.title,
        permission_key: PURCHASE_RETURN_RECEIPT_ROUTES.listing.permissionKey,
        location: PURCHASE_RETURN_RECEIPT_ROUTES.listing.path,
      },
      {
        title: DISTRIBUTOR_ISSUE_ROUTES.listing.title,
        permission_key: DISTRIBUTOR_ISSUE_ROUTES.listing.permissionKey,
        location: DISTRIBUTOR_ISSUE_ROUTES.listing.path,
      },
      {
        title: PURCHASE_RETURN_STOCK_ROUTES.listing.title,
        permission_key: PURCHASE_RETURN_STOCK_ROUTES.listing.permissionKey,
        location: PURCHASE_RETURN_STOCK_ROUTES.listing.path,
      },
    ],
  },
  {
    title: TRANSPORTS_MODULE.name,
    icon: TRANSPORTS_MODULE.icon,
    subMenu: [
      {
        title: TRANSPORTS_ROUTES.listing.title,
        permission_key: TRANSPORTS_ROUTES.listing.permissionKey,
        location: TRANSPORTS_ROUTES.listing.path,
      },
    ],
  },
];

/** Sidebar sections shown under the "All" top-level module (legacy export). */
export const MENU = ALL_PAGES_MENU;

/**
 * Top-level app modules; each has its own sidebar menu tree.
 * Add more modules here later (e.g. gst: { title, icon, menu }).
 */
export const MENU_MODULES = {
  all: {
    title: "All",
    icon: "fa-layer-group",
    accent: "#ee7a30",
    menu: ALL_PAGES_MENU,
  },
  wms: {
    title: "WMS",
    icon: "fa-warehouse",
    accent: "#db2777",
    menu: WMS_MENU,
  },
};

export const DEFAULT_MODULE_ID = "all";
