// Dashboard Routes
export const DASHBOARD_ROUTES = {
  accounts: {
    path: "/",
    title: "Accounts Dashboard",
    permissionKey: "view_dashboard",
  },
  wms: {
    path: "/wms",
    title: "WMS Dashboard",
    permissionKey: "view_wms_dashboard",
  },
  employee: {
    path: "/dashboard/employee",
    title: "Employee Dashboard",
    permissionKey: "view_employee_dashboard",
  },
  payroll: {
    path: "/dashboard/payroll",
    title: "Payroll Dashboard",
    permissionKey: "view_payroll_dashboard",
  },
  attendance: {
    path: "/dashboard/attendance",
    title: "Attendance Dashboard",
    permissionKey: "view_attendance_dashboard",
  },
  stockCircle: {
    path: "/dashboard/stock-circle",
    title: "Stock Circle Dashboard",
    permissionKey: "view_circle_dashboard",
  },
  stock: {
    path: "/dashboard/stock",
    title: "Stock Dashboard",
    permissionKey: "view_stock_dashboard",
  },
  outstanding: {
    path: "/dashboard/outstanding",
    title: "Outstanding Dashboard",
    permissionKey: "view_outstanding_dashboard",
  },
  stockHolding: {
    path: "/dashboard/stock-holding",
    title: "Stock Holding Dashboard",
    permissionKey: "view_stock_holding_dashboard",
  },
  stockAvailability: {
    path: "/dashboard/stock-holding",
    title: "Stock Availability Dashboard",
    permissionKey: "view_stock_holding_dashboard",
  },
  checklist: {
    path: "/dashboard/checklist",
    title: "Checklist Dashboard",
    permissionKey: "view_checklist_dashboard",
  },
};

// Master Data Routes
export const EMPLOYEES_ROUTES = {
  listing: {
    path: "/employees",
    title: "Employees",
    permissionKey: "view_employees",
  },
  create: {
    path: "/employees/create",
    title: "Add Employee",
    permissionKey: "add_employees",
  },
  edit: {
    path: "/employees/edit/:id",
    title: "Edit Employee",
    permissionKey: "add_employees",
  },
  view: {
    path: "/employees/view/:id",
    title: "View Employee",
    permissionKey: "view_employees",
  },
};

export const DESIGNATIONS_ROUTES = {
  listing: {
    path: "/designations",
    title: "Designations",
    permissionKey: "view_designations",
  },
  create: {
    path: "/designations/create",
    title: "Add Designation",
    permissionKey: "add_designations",
  },
  edit: {
    path: "/designations/edit/:id",
    title: "Edit Designation",
    permissionKey: "add_designations",
  },
  view: {
    path: "/designations/view/:id",
    title: "View Designation",
    permissionKey: "view_designations",
  },
};

export const BRANCHES_ROUTES = {
  listing: {
    path: "/branches",
    title: "Branches",
    permissionKey: "view_branches",
  },
  create: {
    path: "/branches/create",
    title: "Add Branch",
    permissionKey: "add_branches",
  },
  edit: {
    path: "/branches/edit/:id",
    title: "Edit Branch",
    permissionKey: "add_branches",
  },
  view: {
    path: "/branches/view/:id",
    title: "View Branch",
    permissionKey: "view_branches",
  },
};

export const MASTER_LIST_ROUTES = {
  listing: {
    path: "/master",
    title: "Master List",
    permissionKey: "view_master_list",
  },
  create: {
    path: "/master/create",
    title: "Add Master List Item",
    permissionKey: "add_master_list",
  },
  edit: {
    path: "/master/edit/:id",
    title: "Edit Master List Item",
    permissionKey: "add_master_list",
  },
  view: {
    path: "/master/view/:id",
    title: "View Master List Item",
    permissionKey: "view_master_list",
  },
};

export const BILLING_COUNTER_ROUTES = {
  listing: {
    path: "/billing-counter",
    title: "Billing Counters",
    permissionKey: "view_billing_counter",
  },
  create: {
    path: "/billing-counter/create",
    title: "Add Billing Counter",
    permissionKey: "add_billing_counter",
  },
  edit: {
    path: "/billing-counter/edit/:id",
    title: "Edit Billing Counter",
    permissionKey: "add_billing_counter",
  },
};

export const PRODUCTS_ROUTES = {
  listing: {
    path: "/products",
    title: "Products",
    permissionKey: "view_products",
  },
  create: {
    path: "/products/create",
    title: "Add Product",
    permissionKey: "add_products",
  },
  edit: {
    path: "/products/edit/:id",
    title: "Edit Product",
    permissionKey: "add_products",
  },
  view: {
    path: "/products/view/:id",
    title: "View Product",
    permissionKey: "view_products",
  },
};

export const REPACK_ITEMS_ROUTES = {
  listing: {
    path: "/repack",
    title: "Repack Items Master",
    permissionKey: "view_items",
  },
};

// Task Management Routes
export const TASKS_ROUTES = {
  listing: {
    path: "/tasks",
    title: "View All Tasks",
    permissionKey: "view_tasks",
  },
  create: {
    path: "/tasks/create",
    title: "Add Task",
    permissionKey: "add_tasks",
  },
  edit: {
    path: "/tasks/edit/:id",
    title: "Edit Task",
    permissionKey: "add_tasks",
  },
  view: {
    path: "/tasks/view/:id",
    title: "View Task",
    permissionKey: "view_tasks",
  },
  mine: {
    path: "/tasks/mine",
    title: "View My Tasks",
    permissionKey: "view_my_tasks",
  },
};

// Performance Entry Routes
export const PERFORMANCE_ROUTES = {
  listing: {
    path: "/performance",
    title: "Performance Entry",
    permissionKey: "view_accounts_sheet",
  },
  create: {
    path: "/performance/create",
    title: "Add Performance Entry",
    permissionKey: "add_accounts_sheet",
  },
  edit: {
    path: "/performance/edit/:id",
    title: "Edit Performance Entry",
    permissionKey: "add_accounts_sheet",
  },
  loadData: {
    path: "/performance/load-data",
    title: "Load Performance Entry",
    permissionKey: "load_performance_entry",
  },
};

// Sales Target Routes
export const TARGET_BRANCH_ROUTES = {
  listing: {
    path: "/target/branch",
    title: "Target - Branch",
    permissionKey: "view_target_branch",
  },
  create: {
    path: "/target/branch/create",
    title: "Add Target - Branch",
    permissionKey: "add_target_branch",
  },
  edit: {
    path: "/target/branch/edit/:id",
    title: "Edit Target - Branch",
    permissionKey: "add_target_branch",
  },
};

export const TARGET_DEPARTMENT_ROUTES = {
  listing: {
    path: "/target/department",
    title: "Target - Department",
    permissionKey: "view_target_department",
  },
  create: {
    path: "/target/department/create",
    title: "Add Target - Department",
    permissionKey: "add_target_department",
  },
  edit: {
    path: "/target/department/edit/:id",
    title: "Edit Target - Department",
    permissionKey: "add_target_department",
  },
};

export const TARGET_SECTION_ROUTES = {
  listing: {
    path: "/target/section",
    title: "Target - Section",
    permissionKey: "view_target_section",
  },
  create: {
    path: "/target/section/create",
    title: "Add Target - Section",
    permissionKey: "add_target_section",
  },
  edit: {
    path: "/target/section/edit/:id",
    title: "Edit Target - Section",
    permissionKey: "add_target_section",
  },
};

export const TARGET_EMPLOYEE_ROUTES = {
  listing: {
    path: "/target/employee",
    title: "Target - Employee",
    permissionKey: "view_target_employee",
  },
  create: {
    path: "/target/employee/create",
    title: "Add Target - Employee",
    permissionKey: "add_target_employee",
  },
  edit: {
    path: "/target/employee/edit/:id",
    title: "Edit Target - Employee",
    permissionKey: "add_target_employee",
  },
};

export const TARGET_STATS_ROUTES = {
  listing: {
    path: "/target/stats",
    title: "Target Stats",
    permissionKey: "view_target_stats",
  },
};

// Checklist Routes
export const EB_CONSUMPTION_ROUTES = {
  listing: {
    path: "/eb-consumption",
    title: "EB Consumption",
    permissionKey: "view_eb_consumption",
  },
  create: {
    path: "/eb-consumption/create",
    title: "Add EB Consumption",
    permissionKey: "add_eb_consumption",
  },
  edit: {
    path: "/eb-consumption/edit/:id",
    title: "Edit EB Consumption",
    permissionKey: "add_eb_consumption",
  },
};

export const TARGET_ENTRY_ROUTES = {
  listing: {
    path: "/target",
    title: "Target Entry",
    permissionKey: "view_sales_target",
  },
  create: {
    path: "/target/create",
    title: "Add Target Entry",
    permissionKey: "add_sales_target",
  },
  edit: {
    path: "/target/edit/:id",
    title: "Edit Target Entry",
    permissionKey: "add_sales_target",
  },
};

export const CHECKLIST_FORM_ROUTES = {
  listing: {
    path: "/checklist/forms",
    title: "Checklist Forms",
    permissionKey: "view_checklist_form",
  },
  create: {
    path: "/checklist/forms/create",
    title: "Create Form",
    permissionKey: "add_checklist_form",
  },
  edit: {
    path: "/checklist/forms/edit/:id",
    title: "Edit Form",
    permissionKey: "add_checklist_form",
  },
  view: {
    path: "/checklist/forms/view/:id",
    title: "View Form",
    permissionKey: "view_checklist_form",
  },
};

/** Daily checklist completion (per designation); answers shared for form + calendar day. */
export const CHECKLIST_FILL_ROUTES = {
  listing: {
    path: "/checklist/fill",
    title: "Fill Checklist",
    permissionKey: "fill_checklist",
  },
  fill: {
    path: "/checklist/fill/:id",
    title: "Fill Checklist",
    permissionKey: "fill_checklist",
  },
};

/** Read-only listing (with calendar) and per-day response viewer (management). */
export const CHECKLIST_RESPONSE_ROUTES = {
  listing: {
    path: "/checklist/responses",
    title: "Checklist Responses",
    permissionKey: "view_checklist_response",
  },
  view: {
    path: "/checklist/responses/:formId/view",
    title: "View Checklist Response",
    permissionKey: "view_checklist_response",
  },
};

// Materials Routes
export const PURCHASE_ORDER_ROUTES = {
  listing: {
    path: "/purchase-order",
    title: "Purchase Order",
    permissionKey: "view_purchase_order",
  },
  create: {
    path: "/purchase-order/create",
    title: "Add Purchase Order",
    permissionKey: "add_purchase_order",
  },
  edit: {
    path: "/purchase-order/edit/:id",
    title: "Edit Purchase Order",
    permissionKey: "add_purchase_order",
  },
  view: {
    path: "/purchase-order/view/:id",
    title: "View Purchase Order",
    permissionKey: "view_purchase_order",
  },
};

export const PURCHASE_ENTRY_ROUTES = {
  listing: {
    path: "/purchase-entry",
    title: "Purchase Entry",
    permissionKey: "view_purchase_entry",
  },
  create: {
    path: "/purchase-entry/create",
    title: "Add Purchase Entry",
    permissionKey: "add_purchase_entry",
  },
  edit: {
    path: "/purchase-entry/edit/:id",
    title: "Edit Purchase Entry",
    permissionKey: "add_purchase_entry",
  },
  view: {
    path: "/purchase-entry/view/:id",
    title: "View Purchase Entry",
    permissionKey: "view_purchase_entry",
  },
};

export const MATERIALS_REQUEST_ROUTES = {
  listing: {
    path: "/materials/request",
    title: "Materials Request",
    permissionKey: "view_materials_request",
  },
  create: {
    path: "/materials/request/create",
    title: "Add Materials Request",
    permissionKey: "add_materials_request",
  },
  edit: {
    path: "/materials/request/edit/:id",
    title: "Edit Materials Request",
    permissionKey: "add_materials_request",
  },
};

export const STOCK_ADDITION_ROUTES = {
  listing: {
    path: "/materials/stock-addition",
    title: "Stock Addition",
    permissionKey: "view_stock_addition",
  },
  create: {
    path: "/materials/stock-addition/create",
    title: "Add Stock Addition",
    permissionKey: "add_stock_addition",
  },
  edit: {
    path: "/materials/stock-addition/edit/:id",
    title: "Edit Stock Addition",
    permissionKey: "add_stock_addition",
  },
};

export const MATERIALS_ROUTES = {
  listing: {
    path: "/materials",
    title: "All Materials",
    permissionKey: "view_materials",
  },
  create: {
    path: "/materials/create",
    title: "Add Material",
    permissionKey: "add_materials",
  },
  edit: {
    path: "/materials/edit/:id",
    title: "Edit Material",
    permissionKey: "add_materials",
  },
  view: {
    path: "/materials/view/:id",
    title: "View Material",
    permissionKey: "view_materials",
  },
};

export const MATERIALS_CATEGORY_ROUTES = {
  listing: {
    path: "/materials/category",
    title: "Materials Category",
    permissionKey: "view_materials_category",
  },
  create: {
    path: "/materials/category/create",
    title: "Add Materials Category",
    permissionKey: "add_materials_category",
  },
  edit: {
    path: "/materials/category/edit/:id",
    title: "Edit Materials Category",
    permissionKey: "add_materials_category",
  },
};

// Warehouse Routes
export const PURCHASE_ACKNOWLEDGMENT_ROUTES = {
  listing: {
    path: "/purchase-acknowledgment",
    title: "Purchase Acknowledgment",
    permissionKey: "view_purchase_acknowledgment",
  },
  create: {
    path: "/purchase-acknowledgment/create",
    title: "Add Purchase Acknowledgment",
    permissionKey: "add_purchase_acknowledgment",
  },
  edit: {
    path: "/purchase-acknowledgment/edit/:id",
    title: "Edit Purchase Acknowledgment",
    permissionKey: "add_purchase_acknowledgment",
  },
};

export const GRN_ROUTES = {
  listing: {
    path: "/wms/grn",
    title: "GRN Entry",
    permissionKey: "view_grn",
  },
  create: {
    path: "/wms/grn/create",
    title: "Add GRN Entry",
    permissionKey: "add_grn",
  },
  edit: {
    path: "/wms/grn/edit/:id",
    title: "Edit GRN Entry",
    permissionKey: "add_grn",
  },
  view: {
    path: "/wms/grn/view/:id",
    title: "View GRN Entry",
    permissionKey: "view_grn",
  },
};

export const WMS_PURCHASE_ENTRY_ROUTES = {
  listing: {
    path: "/wms/purchase-entry",
    title: "Purchase Entry (WMS)",
    permissionKey: "view_wms_purchase_entry",
  },
  create: {
    path: "/wms/purchase-entry/create",
    title: "Add Purchase Entry (WMS)",
    permissionKey: "add_wms_purchase_entry",
  },
  edit: {
    path: "/wms/purchase-entry/edit/:id",
    title: "Edit Purchase Entry (WMS)",
    permissionKey: "add_wms_purchase_entry",
  },
};

export const STICKERING_ROUTES = {
  listing: {
    path: "/stickering",
    title: "Job Worksheet",
    permissionKey: "view_stickering",
  },
  create: {
    path: "/stickering/create",
    title: "Add Job Worksheet",
    permissionKey: "add_stickering",
  },
  edit: {
    path: "/stickering/edit/:id",
    title: "Edit Job Worksheet",
    permissionKey: "add_stickering",
  },
  mine: {
    path: "/stickering/mine",
    title: "My Job Worksheet",
    permissionKey: "view_my_stickering",
  },
};

export const REPACK_ENTRY_SHEET_ROUTES = {
  listing: {
    path: "/wms/repack-entry-sheet",
    title: "Repack Entry Sheet",
    permissionKey: "view_repack_entry_sheet",
  },
  create: {
    path: "/wms/repack-entry-sheet/create",
    title: "Add Repack Entry Sheet",
    permissionKey: "add_repack_entry_sheet",
  },
  edit: {
    path: "/wms/repack-entry-sheet/edit/:id",
    title: "Edit Repack Entry Sheet",
    permissionKey: "add_repack_entry_sheet",
  },
  mine: {
    path: "/wms/repack-entry-sheet/mine",
    title: "My Repack Entry Sheet",
    permissionKey: "view_my_repack_entry_sheet",
  },
};

export const PURCHASE_REORDER_ROUTES = {
  listing: {
    path: "/wms/reorder",
    title: "Purchase Reorders",
    permissionKey: "view_purchase_reorders",
  },
};

export const PO_ROUTES = {
  listing: {
    path: "/wms/purchase-order",
    title: "Purchase Order",
    permissionKey: "view_po",
  },
  view: {
    path: "/wms/purchase-order/view/:id",
    title: "View Purchase Order",
    permissionKey: "view_po",
  },
};

export const CLEANING_PACKING_ROUTES = {
  listing: {
    path: "/cleaning-packing",
    title: "Cleaning and Packing List",
    permissionKey: "view_cleaning_packing",
  },
};

export const PICKING_ROUTES = {
  listing: {
    path: "/picking",
    title: "Picking List",
    permissionKey: "view_picking_list",
  },
};

// Stock Routes
export const CIRCLE_ROUTES = {
  listing: {
    path: "/stock/circle",
    title: "Circle",
    permissionKey: "view_circle",
  },
};

export const STOCK_CHECKER_ROUTES = {
  listing: {
    path: "/stock/checker",
    title: "Stock Checker",
    permissionKey: "view_stock_checker",
  },
};

export const PRICE_CHECKER_ROUTES = {
  listing: {
    path: "/products/price-checker",
    title: "Price Checker",
    permissionKey: "view_price_checker",
  },
};

export const DEAD_STOCK_REPORT_ROUTES = {
  listing: {
    path: "/stock/dead-stock-report",
    title: "Dead Stock Report",
    permissionKey: "view_dead_stock_report",
  },
  create: {
    path: "/stock/dead-stock-report/create",
    title: "Add Dead Stock Report",
    permissionKey: "add_dead_stock_report",
  },
};

export const OUTSTANDING_REPORT_ROUTES = {
  listing: {
    path: "/wms/outstanding-report",
    title: "Outstanding Report",
    permissionKey: "view_outstanding_report",
  },
  create: {
    path: "/wms/outstanding-report/create",
    title: "Add Outstanding Report",
    permissionKey: "add_outstanding_report",
  },
};

export const STOCK_HOLDING_REPORT_ROUTES = {
  listing: {
    path: "/wms/stock-holding-report",
    title: "Stock Holding Report",
    permissionKey: "view_stock_holding_report",
  },
  create: {
    path: "/wms/stock-holding-report/create",
    title: "Add Stock Holding Report",
    permissionKey: "add_stock_holding_report",
  },
};

export const SALES_REPORT_ROUTES = {
  listing: {
    path: "/wms/sales-report",
    title: "Sales Report",
    permissionKey: "view_sales_report",
  },
  create: {
    path: "/wms/sales-report/create",
    title: "Add Sales Report",
    permissionKey: "add_sales_report",
  },
};

// Reports Routes
export const MATERIALS_REPORT_ROUTES = {
  listing: {
    path: "/materials/report",
    title: "Materials Report",
    permissionKey: "view_materials_report",
  },
};

// Approvals Routes
export const INCENTIVE_APPROVALS_ROUTES = {
  listing: {
    path: "/approvals/incentive",
    title: "Incentive Approvals",
    permissionKey: "view_incentive_approvals",
  },
};

export const PAYROLL_APPROVALS_ROUTES = {
  listing: {
    path: "/approvals/payroll",
    title: "Payroll Approval",
    permissionKey: "view_payroll_approvals",
  },
};

// Incentive Routes
export const INCENTIVE_GENERATOR_ROUTES = {
  listing: {
    path: "/incentive/generator",
    title: "Incentive Generator",
    permissionKey: "view_incentive_generator",
  },
  create: {
    path: "/incentive/generator/create",
    title: "Add Incentive Generator",
    permissionKey: "add_incentive_generator",
  },
  edit: {
    path: "/incentive/generator/edit/:id",
    title: "Edit Incentive Generator",
    permissionKey: "add_incentive_generator",
  },
  view: {
    path: "/incentive/generator/view/:id",
    title: "View Incentive Generator",
    permissionKey: "view_incentive_generator",
  },
};

export const STICKERING_INCENTIVE_ROUTES = {
  listing: {
    path: "/incentive/stickering",
    title: "Stickering Incentive",
    permissionKey: "view_stickering_incentive",
  },
  create: {
    path: "/incentive/stickering/create",
    title: "Add Stickering Incentive",
    permissionKey: "add_stickering_incentive",
  },
  edit: {
    path: "/incentive/stickering/edit/:id",
    title: "Edit Stickering Incentive",
    permissionKey: "add_stickering_incentive",
  },
};

export const SALES_INCENTIVE_ROUTES = {
  listing: {
    path: "/incentive/sales",
    title: "Sales Incentive",
    permissionKey: "view_sales_incentive",
  },
  create: {
    path: "/incentive/sales/create",
    title: "Add Sales Incentive",
    permissionKey: "add_sales_incentive",
  },
  edit: {
    path: "/incentive/sales/edit/:id",
    title: "Edit Sales Incentive",
    permissionKey: "add_sales_incentive",
  },
};

export const GRN_INCENTIVE_ROUTES = {
  listing: {
    path: "/incentive/grn",
    title: "GRN Incentive",
    permissionKey: "view_grn_incentive",
  },
  create: {
    path: "/incentive/grn/create",
    title: "Add GRN Incentive",
    permissionKey: "add_grn_incentive",
  },
  edit: {
    path: "/incentive/grn/edit/:id",
    title: "Edit GRN Incentive",
    permissionKey: "add_grn_incentive",
  },
};

export const PURCHASE_INCENTIVE_ROUTES = {
  listing: {
    path: "/incentive/purchase",
    title: "Purchase Incentive",
    permissionKey: "view_purchase_incentive",
  },
  create: {
    path: "/incentive/purchase/create",
    title: "Add Purchase Incentive",
    permissionKey: "add_purchase_incentive",
  },
  edit: {
    path: "/incentive/purchase/edit/:id",
    title: "Edit Purchase Incentive",
    permissionKey: "add_purchase_incentive",
  },
};

export const PICK_AND_PACK_INCENTIVE_ROUTES = {
  listing: {
    path: "/incentive/pick-and-pack",
    title: "Pick and Pack Incentive",
    permissionKey: "view_pick_and_pack_incentive",
  },
  create: {
    path: "/incentive/pick-and-pack/create",
    title: "Add Pick and Pack Incentive",
    permissionKey: "add_pick_and_pack_incentive",
  },
  edit: {
    path: "/incentive/pick-and-pack/edit/:id",
    title: "Edit Pick and Pack Incentive",
    permissionKey: "add_pick_and_pack_incentive",
  },
};

export const PURCHASE_DATA_ENTRY_INCENTIVE_ROUTES = {
  listing: {
    path: "/incentive/purchase-data-entry",
    title: "Purchase Data Entry Incentive",
    permissionKey: "view_purchase_data_entry_incentive",
  },
  create: {
    path: "/incentive/purchase-data-entry/create",
    title: "Add Purchase Data Entry Incentive",
    permissionKey: "add_purchase_data_entry_incentive",
  },
  edit: {
    path: "/incentive/purchase-data-entry/edit/:id",
    title: "Edit Purchase Data Entry Incentive",
    permissionKey: "add_purchase_data_entry_incentive",
  },
};

export const BILLING_OPERATOR_INCENTIVE_ROUTES = {
  listing: {
    path: "/incentive/billing-operator",
    title: "Billing Operator Incentive",
    permissionKey: "view_billing_operator_incentive",
  },
  create: {
    path: "/incentive/billing-operator/create",
    title: "Add Billing Operator Incentive",
    permissionKey: "add_billing_operator_incentive",
  },
  edit: {
    path: "/incentive/billing-operator/edit/:id",
    title: "Edit Billing Operator Incentive",
    permissionKey: "add_billing_operator_incentive",
  },
};

export const BILLING_CHECKER_INCENTIVE_ROUTES = {
  listing: {
    path: "/incentive/billing-checker",
    title: "Billing Checker Incentive",
    permissionKey: "view_billing_checker_incentive",
  },
  create: {
    path: "/incentive/billing-checker/create",
    title: "Add Billing Checker Incentive",
    permissionKey: "add_billing_checker_incentive",
  },
  edit: {
    path: "/incentive/billing-checker/edit/:id",
    title: "Edit Billing Checker Incentive",
    permissionKey: "add_billing_checker_incentive",
  },
};

// Logs Routes
export const LOGS_ROUTES = {
  listing: {
    path: "/logs",
    title: "API Logs",
    permissionKey: "view_logs_list",
  },
};

// Payroll Routes
export const PAYROLL_ENTRY_ROUTES = {
  listing: {
    path: "/payroll/entry",
    title: "Payroll Entry",
    permissionKey: "view_payroll_entry",
  },
  create: {
    path: "/payroll/entry/create",
    title: "Add Payroll Entry",
    permissionKey: "add_payroll_entry",
  },
  edit: {
    path: "/payroll/entry/edit/:id",
    title: "Edit Payroll Entry",
    permissionKey: "add_payroll_entry",
  },
  view: {
    path: "/payroll/entry/view/:id",
    title: "View Payroll Entry",
    permissionKey: "view_payroll_entry",
  },
};

export const BANK_SUBMISSION_ROUTES = {
  listing: {
    path: "/payroll/bank-submission",
    title: "Bank Submission",
    permissionKey: "view_payroll_bank_submission",
  },
};

export const PAYSLIPS_ROUTES = {
  listing: {
    path: "/payroll/payslips",
    title: "Payslips",
    permissionKey: "view_payslips",
  },
  mine: {
    path: "/payroll/payslips/mine",
    title: "My Payslips",
    permissionKey: "view_my_payslips",
  },
};

export const EMPLOYEE_ALLOCATION_ROUTES = {
  listing: {
    path: "/employee-allocation",
    title: "Employee Allocation",
    permissionKey: "view_employee_allocation",
  },
  create: {
    path: "/employee-allocation/create",
    title: "Add Employee Allocation",
    permissionKey: "add_employee_allocation",
  },
  edit: {
    path: "/employee-allocation/edit/:id",
    title: "Edit Employee Allocation",
    permissionKey: "add_employee_allocation",
  },
};

// Accounts Routes
export const LEDGERS_ROUTES = {
  listing: {
    path: "/accounts/ledgers",
    title: "Master",
    permissionKey: "view_ledgers",
  },
  create: {
    path: "/accounts/ledgers/create",
    title: "Add Ledger",
    permissionKey: "add_ledgers",
  },
  edit: {
    path: "/accounts/ledgers/edit/:id",
    title: "Edit Ledger",
    permissionKey: "add_ledgers",
  },
  view: {
    path: "/accounts/ledgers/view/:id",
    title: "View Ledger",
    permissionKey: "view_ledgers",
  },
};

export const ACCOUNT_ASSETS_ROUTES = {
  listing: {
    path: "/accounts/assets",
    title: "Current Assets",
    permissionKey: "view_account_assets",
  },
  create: {
    path: "/accounts/assets/create",
    title: "Add Current Asset",
    permissionKey: "add_account_assets",
  },
  edit: {
    path: "/accounts/assets/edit/:id",
    title: "Edit Current Asset",
    permissionKey: "add_account_assets",
  },
  view: {
    path: "/accounts/assets/view/:id",
    title: "View Current Asset",
    permissionKey: "view_account_assets",
  },
};

export const PAYMENTS_ROUTES = {
  listing: {
    path: "/accounts/payments",
    title: "Payment Entry",
    permissionKey: "view_payments",
  },
  create: {
    path: "/accounts/payments/create",
    title: "Add Payment Entry",
    permissionKey: "add_payments",
  },
  edit: {
    path: "/accounts/payments/edit/:id",
    title: "Edit Payment Entry",
    permissionKey: "add_payments",
  },
  view: {
    path: "/accounts/payments/view/:id",
    title: "View Payment Entry",
    permissionKey: "view_payments",
  },
};

export const RECEIPTS_ROUTES = {
  listing: {
    path: "/accounts/receipts",
    title: "Receipt Entry",
    permissionKey: "view_receipts",
  },
  create: {
    path: "/accounts/receipts/create",
    title: "Add Receipt Entry",
    permissionKey: "add_receipts",
  },
  edit: {
    path: "/accounts/receipts/edit/:id",
    title: "Edit Receipt Entry",
    permissionKey: "add_receipts",
  },
  view: {
    path: "/accounts/receipts/view/:id",
    title: "View Receipt Entry",
    permissionKey: "view_receipts",
  },
};

export const CASHBOOK_ROUTES = {
  listing: {
    path: "/accounts/cashbook",
    title: "Ledger",
    permissionKey: "view_cashbook",
  },
};

export const MONEY_TRANSFER_ROUTES = {
  listing: {
    path: "/accounts/money-transfer",
    title: "Money Transfer",
    permissionKey: "view_money_transfer",
  },
  create: {
    path: "/accounts/money-transfer/create",
    title: "Add Money Transfer",
    permissionKey: "add_money_transfer",
  },
  edit: {
    path: "/accounts/money-transfer/edit/:id",
    title: "Edit Money Transfer",
    permissionKey: "add_money_transfer",
  },
  view: {
    path: "/accounts/money-transfer/view/:id",
    title: "View Money Transfer",
    permissionKey: "view_money_transfer",
  },
};

// Purchase Return Routes
export const PURCHASE_RETURN_ISSUE_ROUTES = {
  listing: {
    path: "/purchase-return/issue-entry",
    title: "Issue Entry",
    permissionKey: "view_purchase_return_issue_entry",
  },
  create: {
    path: "/purchase-return/issue-entry/create",
    title: "Add Issue Entry",
    permissionKey: "add_purchase_return_issue_entry",
  },
  edit: {
    path: "/purchase-return/issue-entry/edit/:id",
    title: "Edit Issue Entry",
    permissionKey: "add_purchase_return_issue_entry",
  },
};

export const PURCHASE_RETURN_RECEIPT_ROUTES = {
  listing: {
    path: "/purchase-return/receipt-entry",
    title: "Receipt Entry",
    permissionKey: "view_purchase_return_receipt_entry",
  },
  create: {
    path: "/purchase-return/receipt-entry/create",
    title: "Add Receipt Entry",
    permissionKey: "add_purchase_return_receipt_entry",
  },
  edit: {
    path: "/purchase-return/receipt-entry/edit/:id",
    title: "Edit Receipt Entry",
    permissionKey: "add_purchase_return_receipt_entry",
  },
};

export const DISTRIBUTOR_ISSUE_ROUTES = {
  listing: {
    path: "/purchase-return/distibutor-issue",
    title: "Distributor Issue",
    permissionKey: "view_purchase_return_distibutor_issue",
  },
  create: {
    path: "/purchase-return/distibutor-issue/create",
    title: "Add Distributor Issue",
    permissionKey: "add_purchase_return_distibutor_issue",
  },
  edit: {
    path: "/purchase-return/distibutor-issue/edit/:id",
    title: "Edit Distributor Issue",
    permissionKey: "add_purchase_return_distibutor_issue",
  },
};

export const PURCHASE_RETURN_STOCK_ROUTES = {
  listing: {
    path: "/purchase-return/stock-details",
    title: "Stock Details",
    permissionKey: "view_purchase_return_stock_details",
  },
};

// Transport Routes
export const TRANSPORTS_ROUTES = {
  listing: {
    path: "/tms/transports",
    title: "All Transports",
    permissionKey: "view_transports",
  },
  create: {
    path: "/tms/transports/create",
    title: "Add Transport",
    permissionKey: "add_transport",
  },
  edit: {
    path: "/tms/transports/edit/:id",
    title: "Edit Transport",
    permissionKey: "add_transport",
  },
  view: {
    path: "/tms/transports/view/:id",
    title: "View Transport",
    permissionKey: "view_transports",
  },
};

// Settings Routes
export const SETTINGS_ROUTES = {
  listing: {
    path: "/settings",
    title: "Settings",
    permissionKey: "view_dashboard",
  },
};
