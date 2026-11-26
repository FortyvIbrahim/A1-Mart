import {
  DASHBOARD_MODULE,
  MASTER_DATA_MODULE,
  TASK_MANAGEMENT_MODULE,
  PERFORMANCE_MODULE,
  SALES_TARGET_MODULE,
  CHECKLIST_MODULE,
  MATERIALS_MODULE,
  WAREHOUSE_MODULE,
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

export const PERMISSIONS = {
  dashboard: {
    title: DASHBOARD_MODULE.name,
    icon: DASHBOARD_MODULE.icon,
    items: {
      dashboard: {
        title: DASHBOARD_ROUTES.accounts.title,
        permissions: {
          view: DASHBOARD_ROUTES.accounts.permissionKey,
        },
      },
      wms_dashboard: {
        title: DASHBOARD_ROUTES.wms.title,
        permissions: {
          view: DASHBOARD_ROUTES.wms.permissionKey,
        },
      },
      employee_dashboard: {
        title: DASHBOARD_ROUTES.employee.title,
        permissions: {
          view: DASHBOARD_ROUTES.employee.permissionKey,
        },
      },
      payroll_dashboard: {
        title: DASHBOARD_ROUTES.payroll.title,
        permissions: {
          view: DASHBOARD_ROUTES.payroll.permissionKey,
        },
      },
      attendance_dashboard: {
        title: DASHBOARD_ROUTES.attendance.title,
        permissions: {
          view: DASHBOARD_ROUTES.attendance.permissionKey,
        },
      },
      stock_circle_dashboard: {
        title: DASHBOARD_ROUTES.stockCircle.title,
        permissions: {
          view: DASHBOARD_ROUTES.stockCircle.permissionKey,
        },
      },
      stock_dashboard: {
        title: DASHBOARD_ROUTES.stock.title,
        permissions: {
          view: DASHBOARD_ROUTES.stock.permissionKey,
        },
      },
      outstanding_dashboard: {
        title: DASHBOARD_ROUTES.outstanding.title,
        permissions: {
          view: DASHBOARD_ROUTES.outstanding.permissionKey,
        },
      },
      stock_holding_dashboard: {
        title: DASHBOARD_ROUTES.stockHolding.title,
        permissions: {
          view: DASHBOARD_ROUTES.stockHolding.permissionKey,
        },
      },
      checklist_dashboard: {
        title: DASHBOARD_ROUTES.checklist.title,
        permissions: {
          view: DASHBOARD_ROUTES.checklist.permissionKey,
        },
      },
    },
  },
  master_data: {
    title: MASTER_DATA_MODULE.name,
    icon: MASTER_DATA_MODULE.icon,
    items: {
      employee: {
        title: EMPLOYEES_ROUTES.listing.title,
        permissions: {
          view: EMPLOYEES_ROUTES.listing.permissionKey,
          add: EMPLOYEES_ROUTES.create.permissionKey,
        },
      },
      designation: {
        title: DESIGNATIONS_ROUTES.listing.title,
        permissions: {
          view: DESIGNATIONS_ROUTES.listing.permissionKey,
          add: DESIGNATIONS_ROUTES.create.permissionKey,
          delete: "delete_designations",
        },
      },
      branch: {
        title: BRANCHES_ROUTES.listing.title,
        permissions: {
          view: BRANCHES_ROUTES.listing.permissionKey,
          add: BRANCHES_ROUTES.create.permissionKey,
        },
      },
      master_list: {
        title: MASTER_LIST_ROUTES.listing.title,
        permissions: {
          view: MASTER_LIST_ROUTES.listing.permissionKey,
          add: MASTER_LIST_ROUTES.create.permissionKey,
        },
      },
      billing_counter: {
        title: BILLING_COUNTER_ROUTES.listing.title,
        permissions: {
          view: BILLING_COUNTER_ROUTES.listing.permissionKey,
          add: BILLING_COUNTER_ROUTES.create.permissionKey,
          delete: "delete_billing_counter",
        },
      },
      products: {
        title: PRODUCTS_ROUTES.listing.title,
        permissions: {
          view: PRODUCTS_ROUTES.listing.permissionKey,
          add: PRODUCTS_ROUTES.create.permissionKey,
        },
      },
      repack_items: {
        title: REPACK_ITEMS_ROUTES.listing.title,
        permissions: {
          view: REPACK_ITEMS_ROUTES.listing.permissionKey,
          add: "add_repack_items",
          delete: "delete_repack_items",
        },
      },
    },
  },
  performance_entry: {
    title: PERFORMANCE_MODULE.name,
    icon: PERFORMANCE_MODULE.icon,
    items: {
      account: {
        title: PERFORMANCE_ROUTES.listing.title,
        permissions: {
          view: PERFORMANCE_ROUTES.listing.permissionKey,
          add: PERFORMANCE_ROUTES.create.permissionKey,
          delete: "delete_accounts_sheet",
        },
      },
      load_performance_entry: {
        title: PERFORMANCE_ROUTES.loadData.title,
        permissions: {
          view: PERFORMANCE_ROUTES.loadData.permissionKey,
        },
      },
    },
  },
  sales_target: {
    title: SALES_TARGET_MODULE.name,
    icon: SALES_TARGET_MODULE.icon,
    items: {
      target_branch: {
        title: TARGET_BRANCH_ROUTES.listing.title,
        permissions: {
          view: TARGET_BRANCH_ROUTES.listing.permissionKey,
          add: TARGET_BRANCH_ROUTES.create.permissionKey,
          delete: "delete_target_branch",
        },
      },
      target_designation: {
        title: TARGET_DEPARTMENT_ROUTES.listing.title,
        permissions: {
          view: TARGET_DEPARTMENT_ROUTES.listing.permissionKey,
          add: TARGET_DEPARTMENT_ROUTES.create.permissionKey,
          delete: "delete_target_department",
        },
      },
      target_section: {
        title: TARGET_SECTION_ROUTES.listing.title,
        permissions: {
          view: TARGET_SECTION_ROUTES.listing.permissionKey,
          add: TARGET_SECTION_ROUTES.create.permissionKey,
          delete: "delete_target_section",
        },
      },
      target_employee: {
        title: TARGET_EMPLOYEE_ROUTES.listing.title,
        permissions: {
          view: TARGET_EMPLOYEE_ROUTES.listing.permissionKey,
          add: TARGET_EMPLOYEE_ROUTES.create.permissionKey,
          delete: "delete_target_employee",
        },
      },
      target_stats: {
        title: TARGET_STATS_ROUTES.listing.title,
        permissions: {
          view: TARGET_STATS_ROUTES.listing.permissionKey,
        },
      },
    },
  },
  checklist: {
    title: CHECKLIST_MODULE.name,
    icon: CHECKLIST_MODULE.icon,
    items: {
      eb_consumption: {
        title: EB_CONSUMPTION_ROUTES.listing.title,
        permissions: {
          view: EB_CONSUMPTION_ROUTES.listing.permissionKey,
          add: EB_CONSUMPTION_ROUTES.create.permissionKey,
          delete: "delete_eb_consumption",
        },
      },
      checklist_form: {
        title: CHECKLIST_FORM_ROUTES.listing.title,
        permissions: {
          view: CHECKLIST_FORM_ROUTES.listing.permissionKey,
          add: CHECKLIST_FORM_ROUTES.create.permissionKey,
          delete: "delete_checklist_form",
        },
      },
      fill_checklist: {
        title: CHECKLIST_FILL_ROUTES.listing.title,
        permissions: {
          view: CHECKLIST_FILL_ROUTES.listing.permissionKey,
        },
      },
      checklist_responses: {
        title: CHECKLIST_RESPONSE_ROUTES.listing.title,
        permissions: {
          view: CHECKLIST_RESPONSE_ROUTES.listing.permissionKey,
        },
      },
      target_entry: {
        title: TARGET_ENTRY_ROUTES.listing.title,
        permissions: {
          view: TARGET_ENTRY_ROUTES.listing.permissionKey,
          add: TARGET_ENTRY_ROUTES.create.permissionKey,
          delete: "delete_sales_target",
        },
      },
    },
  },
  materials: {
    title: MATERIALS_MODULE.name,
    icon: MATERIALS_MODULE.icon,
    items: {
      purchase_order: {
        title: PURCHASE_ORDER_ROUTES.listing.title,
        permissions: {
          view: PURCHASE_ORDER_ROUTES.listing.permissionKey,
          add: PURCHASE_ORDER_ROUTES.create.permissionKey,
        },
      },
      update_purchase_order: {
        title: "Update Purchase Order Status",
        permissions: {
          view: "update_purchase_order_status",
        },
      },
      purchase_entry: {
        title: PURCHASE_ENTRY_ROUTES.listing.title,
        permissions: {
          view: PURCHASE_ENTRY_ROUTES.listing.permissionKey,
          add: PURCHASE_ENTRY_ROUTES.create.permissionKey,
        },
      },
      materials_request: {
        title: MATERIALS_REQUEST_ROUTES.listing.title,
        permissions: {
          view: MATERIALS_REQUEST_ROUTES.listing.permissionKey,
          add: MATERIALS_REQUEST_ROUTES.create.permissionKey,
          delete: "delete_materials_request",
        },
      },
      stock_addition: {
        title: STOCK_ADDITION_ROUTES.listing.title,
        permissions: {
          view: STOCK_ADDITION_ROUTES.listing.permissionKey,
          add: STOCK_ADDITION_ROUTES.create.permissionKey,
        },
      },
      materials: {
        title: MATERIALS_ROUTES.listing.title,
        permissions: {
          view: MATERIALS_ROUTES.listing.permissionKey,
          add: MATERIALS_ROUTES.create.permissionKey,
          delete: "delete_materials",
        },
      },
      materials_category: {
        title: MATERIALS_CATEGORY_ROUTES.listing.title,
        permissions: {
          view: MATERIALS_CATEGORY_ROUTES.listing.permissionKey,
          add: MATERIALS_CATEGORY_ROUTES.create.permissionKey,
          delete: "delete_materials_category",
        },
      },
    },
  },
  stock: {
    title: STOCK_MODULE.name,
    icon: STOCK_MODULE.icon,
    items: {
      circle: {
        title: CIRCLE_ROUTES.listing.title,
        permissions: {
          view: CIRCLE_ROUTES.listing.permissionKey,
          add: "add_circle",
          delete: "delete_circle",
        },
      },
      stock_checker: {
        title: STOCK_CHECKER_ROUTES.listing.title,
        permissions: {
          view: STOCK_CHECKER_ROUTES.listing.permissionKey,
          add: "add_stock_checker",
          delete: "delete_stock_checker",
        },
      },
      price_checker: {
        title: PRICE_CHECKER_ROUTES.listing.title,
        permissions: {
          view: PRICE_CHECKER_ROUTES.listing.permissionKey,
        },
      },
      dead_stock_report: {
        title: DEAD_STOCK_REPORT_ROUTES.listing.title,
        permissions: {
          view: DEAD_STOCK_REPORT_ROUTES.listing.permissionKey,
          add: DEAD_STOCK_REPORT_ROUTES.create.permissionKey,
          delete: "delete_dead_stock_report",
        },
      },
    },
  },
  tasks: {
    title: TASK_MANAGEMENT_MODULE.name,
    icon: TASK_MANAGEMENT_MODULE.icon,
    items: {
      tasks: {
        title: TASKS_ROUTES.listing.title,
        permissions: {
          view: TASKS_ROUTES.listing.permissionKey,
          add: TASKS_ROUTES.create.permissionKey,
        },
      },
      my_tasks: {
        title: TASKS_ROUTES.mine.title,
        permissions: {
          view: TASKS_ROUTES.mine.permissionKey,
        },
      },
    },
  },
  reports: {
    title: REPORTS_MODULE.name,
    icon: REPORTS_MODULE.icon,
    items: {
      materials_report: {
        title: MATERIALS_REPORT_ROUTES.listing.title,
        permissions: {
          view: MATERIALS_REPORT_ROUTES.listing.permissionKey,
        },
      },
    },
  },
  wms: {
    title: WAREHOUSE_MODULE.name,
    icon: WAREHOUSE_MODULE.icon,
    items: {
      stickering: {
        title: STICKERING_ROUTES.listing.title,
        permissions: {
          view: STICKERING_ROUTES.listing.permissionKey,
          add: STICKERING_ROUTES.create.permissionKey,
        },
      },
      my_stickering: {
        title: STICKERING_ROUTES.mine.title,
        permissions: {
          view: STICKERING_ROUTES.mine.permissionKey,
        },
      },
      purchase_acknowledgment: {
        title: PURCHASE_ACKNOWLEDGMENT_ROUTES.listing.title,
        permissions: {
          view: PURCHASE_ACKNOWLEDGMENT_ROUTES.listing.permissionKey,
          add: PURCHASE_ACKNOWLEDGMENT_ROUTES.create.permissionKey,
        },
      },
      grn: {
        title: GRN_ROUTES.listing.title,
        permissions: {
          view: GRN_ROUTES.listing.permissionKey,
          add: GRN_ROUTES.create.permissionKey,
        },
      },
      wms_purchase_entry: {
        title: WMS_PURCHASE_ENTRY_ROUTES.listing.title,
        permissions: {
          view: WMS_PURCHASE_ENTRY_ROUTES.listing.permissionKey,
          add: WMS_PURCHASE_ENTRY_ROUTES.create.permissionKey,
          delete: "delete_wms_purchase_entry",
        },
      },
      purchase_reorders: {
        title: PURCHASE_REORDER_ROUTES.listing.title,
        permissions: {
          view: PURCHASE_REORDER_ROUTES.listing.permissionKey,
          add: "add_purchase_reorders",
        },
      },
      po: {
        title: PO_ROUTES.listing.title,
        permissions: {
          view: PO_ROUTES.listing.permissionKey,
          add: "add_po",
          delete: "delete_po",
        },
      },
      repack_entry_sheet: {
        title: REPACK_ENTRY_SHEET_ROUTES.listing.title,
        permissions: {
          view: REPACK_ENTRY_SHEET_ROUTES.listing.permissionKey,
          add: REPACK_ENTRY_SHEET_ROUTES.create.permissionKey,
        },
      },
      my_repack_entry_sheet: {
        title: REPACK_ENTRY_SHEET_ROUTES.mine.title,
        permissions: {
          view: REPACK_ENTRY_SHEET_ROUTES.mine.permissionKey,
        },
      },
      cleaning_packing: {
        title: CLEANING_PACKING_ROUTES.listing.title,
        permissions: {
          view: CLEANING_PACKING_ROUTES.listing.permissionKey,
        },
      },
      picking: {
        title: PICKING_ROUTES.listing.title,
        permissions: {
          view: PICKING_ROUTES.listing.permissionKey,
        },
      },
      outstanding_report: {
        title: OUTSTANDING_REPORT_ROUTES.listing.title,
        permissions: {
          view: OUTSTANDING_REPORT_ROUTES.listing.permissionKey,
          add: OUTSTANDING_REPORT_ROUTES.create.permissionKey,
          delete: "delete_outstanding_report",
        },
      },
      stock_holding_report: {
        title: STOCK_HOLDING_REPORT_ROUTES.listing.title,
        permissions: {
          view: STOCK_HOLDING_REPORT_ROUTES.listing.permissionKey,
          add: STOCK_HOLDING_REPORT_ROUTES.create.permissionKey,
          delete: "delete_stock_holding_report",
        },
      },
      sales_report: {
        title: SALES_REPORT_ROUTES.listing.title,
        permissions: {
          view: SALES_REPORT_ROUTES.listing.permissionKey,
          add: SALES_REPORT_ROUTES.create.permissionKey,
          delete: "delete_sales_report",
        },
      },
    },
  },
  approvals: {
    title: APPROVALS_MODULE.name,
    icon: APPROVALS_MODULE.icon,
    items: {
      incentive_approvals: {
        title: INCENTIVE_APPROVALS_ROUTES.listing.title,
        permissions: {
          view: INCENTIVE_APPROVALS_ROUTES.listing.permissionKey,
        },
      },
      payroll_approvals: {
        title: PAYROLL_APPROVALS_ROUTES.listing.title,
        permissions: {
          view: PAYROLL_APPROVALS_ROUTES.listing.permissionKey,
        },
      },
    },
  },
  incentive: {
    title: INCENTIVE_MODULE.name,
    icon: INCENTIVE_MODULE.icon,
    items: {
      stickering_incentive: {
        title: STICKERING_INCENTIVE_ROUTES.listing.title,
        permissions: {
          view: STICKERING_INCENTIVE_ROUTES.listing.permissionKey,
          add: STICKERING_INCENTIVE_ROUTES.create.permissionKey,
        },
      },
      sales_incentive: {
        title: SALES_INCENTIVE_ROUTES.listing.title,
        permissions: {
          view: SALES_INCENTIVE_ROUTES.listing.permissionKey,
          add: SALES_INCENTIVE_ROUTES.create.permissionKey,
        },
      },
      grn_incentive: {
        title: GRN_INCENTIVE_ROUTES.listing.title,
        permissions: {
          view: GRN_INCENTIVE_ROUTES.listing.permissionKey,
          add: GRN_INCENTIVE_ROUTES.create.permissionKey,
        },
      },
      purchase_incentive: {
        title: PURCHASE_INCENTIVE_ROUTES.listing.title,
        permissions: {
          view: PURCHASE_INCENTIVE_ROUTES.listing.permissionKey,
          add: PURCHASE_INCENTIVE_ROUTES.create.permissionKey,
        },
      },
      pick_and_pack_incentive: {
        title: PICK_AND_PACK_INCENTIVE_ROUTES.listing.title,
        permissions: {
          view: PICK_AND_PACK_INCENTIVE_ROUTES.listing.permissionKey,
          add: PICK_AND_PACK_INCENTIVE_ROUTES.create.permissionKey,
        },
      },
      purchase_data_entry_incentive: {
        title: PURCHASE_DATA_ENTRY_INCENTIVE_ROUTES.listing.title,
        permissions: {
          view: PURCHASE_DATA_ENTRY_INCENTIVE_ROUTES.listing.permissionKey,
          add: PURCHASE_DATA_ENTRY_INCENTIVE_ROUTES.create.permissionKey,
        },
      },
      billing_operator_incentive: {
        title: BILLING_OPERATOR_INCENTIVE_ROUTES.listing.title,
        permissions: {
          view: BILLING_OPERATOR_INCENTIVE_ROUTES.listing.permissionKey,
          add: BILLING_OPERATOR_INCENTIVE_ROUTES.create.permissionKey,
        },
      },
      billing_checker_incentive: {
        title: BILLING_CHECKER_INCENTIVE_ROUTES.listing.title,
        permissions: {
          view: BILLING_CHECKER_INCENTIVE_ROUTES.listing.permissionKey,
          add: BILLING_CHECKER_INCENTIVE_ROUTES.create.permissionKey,
        },
      },
      incentive_generator: {
        title: INCENTIVE_GENERATOR_ROUTES.listing.title,
        permissions: {
          view: INCENTIVE_GENERATOR_ROUTES.listing.permissionKey,
          add: INCENTIVE_GENERATOR_ROUTES.create.permissionKey,
          delete: "delete_incentive_generator",
        },
      },
    },
  },
  logs: {
    title: LOGS_MODULE.name,
    icon: LOGS_MODULE.icon,
    items: {
      logs_list: {
        title: LOGS_ROUTES.listing.title,
        permissions: {
          view: LOGS_ROUTES.listing.permissionKey,
        },
      },
    },
  },
  payroll: {
    title: PAYROLL_MODULE.name,
    icon: PAYROLL_MODULE.icon,
    items: {
      payroll_entry: {
        title: PAYROLL_ENTRY_ROUTES.listing.title,
        permissions: {
          view: PAYROLL_ENTRY_ROUTES.listing.permissionKey,
          add: PAYROLL_ENTRY_ROUTES.create.permissionKey,
        },
      },
      payroll_bank_submission: {
        title: BANK_SUBMISSION_ROUTES.listing.title,
        permissions: {
          view: BANK_SUBMISSION_ROUTES.listing.permissionKey,
        },
      },
      payslips: {
        title: PAYSLIPS_ROUTES.listing.title,
        permissions: {
          view: PAYSLIPS_ROUTES.listing.permissionKey,
        },
      },
      my_payslips: {
        title: PAYSLIPS_ROUTES.mine.title,
        permissions: {
          view: PAYSLIPS_ROUTES.mine.permissionKey,
        },
      },
      employee_allocation: {
        title: EMPLOYEE_ALLOCATION_ROUTES.listing.title,
        permissions: {
          view: EMPLOYEE_ALLOCATION_ROUTES.listing.permissionKey,
          add: EMPLOYEE_ALLOCATION_ROUTES.create.permissionKey,
        },
      },
    },
  },
  accounts: {
    title: ACCOUNTS_MODULE.name,
    icon: ACCOUNTS_MODULE.icon,
    items: {
      ledgers: {
        title: LEDGERS_ROUTES.listing.title,
        permissions: {
          view: LEDGERS_ROUTES.listing.permissionKey,
          add: LEDGERS_ROUTES.create.permissionKey,
        },
      },
      account_assets: {
        title: ACCOUNT_ASSETS_ROUTES.listing.title,
        permissions: {
          view: ACCOUNT_ASSETS_ROUTES.listing.permissionKey,
          add: ACCOUNT_ASSETS_ROUTES.create.permissionKey,
        },
      },
      payments: {
        title: PAYMENTS_ROUTES.listing.title,
        permissions: {
          view: PAYMENTS_ROUTES.listing.permissionKey,
          add: PAYMENTS_ROUTES.create.permissionKey,
        },
      },
      receipts: {
        title: RECEIPTS_ROUTES.listing.title,
        permissions: {
          view: RECEIPTS_ROUTES.listing.permissionKey,
          add: RECEIPTS_ROUTES.create.permissionKey,
        },
      },
      cashbook: {
        title: CASHBOOK_ROUTES.listing.title,
        permissions: {
          view: CASHBOOK_ROUTES.listing.permissionKey,
        },
      },
      money_transfer: {
        title: MONEY_TRANSFER_ROUTES.listing.title,
        permissions: {
          view: MONEY_TRANSFER_ROUTES.listing.permissionKey,
          add: MONEY_TRANSFER_ROUTES.create.permissionKey,
          delete: "delete_money_transfer",
        },
      },
    },
  },
  purchase_return: {
    title: PURCHASE_RETURN_MODULE.name,
    icon: PURCHASE_RETURN_MODULE.icon,
    items: {
      issue_entry: {
        title: PURCHASE_RETURN_ISSUE_ROUTES.listing.title,
        permissions: {
          view: PURCHASE_RETURN_ISSUE_ROUTES.listing.permissionKey,
          add: PURCHASE_RETURN_ISSUE_ROUTES.create.permissionKey,
        },
      },
      receipt_entry: {
        title: PURCHASE_RETURN_RECEIPT_ROUTES.listing.title,
        permissions: {
          view: PURCHASE_RETURN_RECEIPT_ROUTES.listing.permissionKey,
          add: PURCHASE_RETURN_RECEIPT_ROUTES.create.permissionKey,
        },
      },
      distibutor_issue: {
        title: DISTRIBUTOR_ISSUE_ROUTES.listing.title,
        permissions: {
          view: DISTRIBUTOR_ISSUE_ROUTES.listing.permissionKey,
          add: DISTRIBUTOR_ISSUE_ROUTES.create.permissionKey,
        },
      },
      stock_details: {
        title: PURCHASE_RETURN_STOCK_ROUTES.listing.title,
        permissions: {
          view: PURCHASE_RETURN_STOCK_ROUTES.listing.permissionKey,
        },
      },
    },
  },
  transport: {
    title: TRANSPORTS_MODULE.name,
    icon: TRANSPORTS_MODULE.icon,
    items: {
      transports: {
        title: TRANSPORTS_ROUTES.listing.title,
        permissions: {
          view: TRANSPORTS_ROUTES.listing.permissionKey,
          add: TRANSPORTS_ROUTES.create.permissionKey,
          delete: "delete_transport",
        },
      },
    },
  },
  misc: {
    title: "Misc",
    icon: "fa-cog",
    items: {
      mfa_toggle: {
        title: "MFA Toggle",
        permissions: {
          view: "allow_mfa_toggle",
        },
      },
      access_all_branches: {
        title: "Access All Branches",
        permissions: {
          view: "access_all_branches",
        },
      },
      payroll_on_hold: {
        title: "Mark Payroll On Hold",
        permissions: {
          view: "mark_payroll_on_hold",
        },
      },
      sync_attendance: {
        title: "Sync Attendance",
        permissions: {
          view: "sync_attendance",
        },
      },
      import_product_images: {
        title: "Import Images",
        permissions: {
          view: "import_product_images",
        },
      },
      sync_products: {
        title: "Sync Products",
        permissions: {
          view: "sync_products",
        },
      },
      import_transports: {
        title: "Import Transports",
        permissions: {
          view: "import_transports",
        },
      },
      allow_product_sync_config: {
        title: "Allow Product Sync Configuration",
        permissions: {
          view: "allow_product_sync_config",
        },
      },
    },
  },
};
