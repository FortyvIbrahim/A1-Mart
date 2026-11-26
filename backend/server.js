require("dotenv").config();

global.env =
  process.env.NODE_ENV === undefined ? "development" : process.env.NODE_ENV;
global.isDev = () => {
  return global.env === "development";
};

const PORT = process.env.PORT === undefined ? 8080 : process.env.PORT;

const express = require("express");
const app = express();
const compression = require("compression");
const bodyParser = require("body-parser");
const HttpServer = require("http").createServer(app);
const cors = require("cors");
const path = require("path");

const logger = require("./utils/logger");

class Server {
  constructor() {
    this.drivers = [];
    this.init();
  }

  async init() {
    try {
      await this.initDrivers();

      this.initRepositories();
      this.initUsecases();
      this.initExpress();
      await this.initServices();
      this.initRoutes();
      this.initServer();
    } catch (err) {
      console.log(err);
      process.exit(1);
    }
  }

  async initServices() {
    // Set API call logs usecase for S3 service
    const s3Service = require("./services/s3");
    s3Service.setApiCallLogsUsecase(this.apiCallLogsUsecase);

    this.synker = require("./services/synker")(
      this.productUsecase,
      this.cleaningPackingUsecase,
      this.employeesUsecase,
      this.departmentsUsecase,
      this.designationsUsecase,
      this.employeeSectionsUsecase,
      this.branchesUsecase,
      this.masterListUsecase,
      this.productStockPriceUsecase,
      this.apiCallLogsUsecase,
      this.employeeAttendanceUsecase,
      this.syncConfigRepo,
      this.stockHoldingReportUsecase
    );
    await this.synker.initCronJobs({ runStartupHooks: true });
    // Wire synker back into cleaningPackingUsecase after service creation
    if (this.cleaningPackingUsecase && this.cleaningPackingUsecase.setSynker) {
      this.cleaningPackingUsecase.setSynker(this.synker);
    }

    // Wire synker back into employeesUsecase after service creation
    if (this.employeesUsecase && this.employeesUsecase.setSynker) {
      this.employeesUsecase.setSynker(this.synker);
    }
    if (
      this.employeeAttendanceUsecase &&
      this.employeeAttendanceUsecase.setSynker
    ) {
      this.employeeAttendanceUsecase.setSynker(this.synker);
    }
    if (this.syncConfigUsecase && this.syncConfigUsecase.setSynker) {
      this.syncConfigUsecase.setSynker(this.synker);
    }

    // Wire PDF service into cleaningPackingUsecase
    const pdfService = require("./services/pdf");
    if (
      this.cleaningPackingUsecase &&
      this.cleaningPackingUsecase.setPdfService
    ) {
      this.cleaningPackingUsecase.setPdfService(pdfService);
    }

    // Wire PDF service into purchaseOrderUsecase
    if (this.purchaseOrderUsecase && this.purchaseOrderUsecase.setPdfService) {
      this.purchaseOrderUsecase.setPdfService(pdfService);
    }
    // Wire PDF service into payrollUsecase (for payslip generation)
    if (this.payrollUsecase && this.payrollUsecase.setPdfService) {
      this.payrollUsecase.setPdfService(pdfService);
    }

    // Wire ledgersUsecase into payments / receipts usecases for balance updates
    if (
      this.ledgersUsecase &&
      this.paymentsUsecase &&
      this.paymentsUsecase.setLedgersUsecase
    ) {
      this.paymentsUsecase.setLedgersUsecase(this.ledgersUsecase);
    }
    if (
      this.ledgersUsecase &&
      this.receiptsUsecase &&
      this.receiptsUsecase.setLedgersUsecase
    ) {
      this.receiptsUsecase.setLedgersUsecase(this.ledgersUsecase);
    }
    if (
      this.accountAssetsUsecase &&
      this.paymentsUsecase &&
      this.paymentsUsecase.setAccountAssetsUsecase
    ) {
      this.paymentsUsecase.setAccountAssetsUsecase(this.accountAssetsUsecase);
    }
    if (
      this.accountAssetsUsecase &&
      this.receiptsUsecase &&
      this.receiptsUsecase.setAccountAssetsUsecase
    ) {
      this.receiptsUsecase.setAccountAssetsUsecase(this.accountAssetsUsecase);
    }
    if (
      this.accountAssetsUsecase &&
      this.moneyTransferUsecase &&
      this.moneyTransferUsecase.setAccountAssetsUsecase
    ) {
      this.moneyTransferUsecase.setAccountAssetsUsecase(
        this.accountAssetsUsecase
      );
    }
  }

  initExpress() {
    // FRONTEND_URL (comma-separated) restricts which sites may call the API;
    // unset = allow any origin (previous behaviour).
    const allowedOrigins = (process.env.FRONTEND_URL || "")
      .split(",")
      .map((o) => o.trim().replace(/\/+$/, ""))
      .filter(Boolean);
    this.allowedOrigins = allowedOrigins;
    app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));

    const colours = {
      GET: "\x1b[32m",
      POST: "\x1b[34m",
      DELETE: "\x1b[31m",
      PUT: "\x1b[33m",
    };
    app.use("*", (req, _, next) => {
      if (global.isDev()) {
        console.log(colours[req.method] + req.method, "\x1b[0m" + req.baseUrl);
      }
      next();
    });

    //Enable request compression
    app.use(compression());
    app.use(bodyParser.json({ limit: "100mb" }));
    app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));
    app.use(express.static(__dirname + "/views", { maxAge: "30 days" }));

    // Additional route to serve PDF files explicitly
    app.get("/views/*", (req, res) => {
      const filePath = path.join(__dirname, "views", req.params[0]);
      console.log("Serving PDF file:", filePath);
      res.sendFile(filePath);
    });

    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (!this.allowedOrigins.length) {
        res.header("Access-Control-Allow-Origin", "*");
      } else if (origin && this.allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Vary", "Origin");
      }
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS, PUT, DELETE"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      if (req.method === "OPTIONS") {
        return res.sendStatus(204);
      }
      next();
    });
  }

  initServer() {
    HttpServer.listen(PORT, () => {
      console.log(`Server Running ${PORT}`);
      // Optional demo data (SEED_SAMPLE_DATA=true); idempotent, never blocks boot.
      try {
        require("./sample-data").runOnStartup(this.mysql && this.mysql.connection);
      } catch (err) {
        console.error("[sample-data] startup hook error:", err.message);
      }
    });
  }

  initDrivers() {
    return new Promise(async (resolve, reject) => {
      try {
        this.mysql = await require("./drivers/mysql")().connect();
        //this.mongo = require('./models/mongo')().connect();

        this.drivers.push(this.mysql);
        //this.models.push(this.mongo);

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  initRepositories() {
    this.userRepo = require("./repository/user")(this.mysql.connection);
    this.designationsRepo = require("./repository/designations")(
      this.mysql.connection
    );
    this.departmentsRepo = require("./repository/departments")(
      this.mysql.connection
    );
    this.employeeSectionsRepo = require("./repository/employee_sections")(
      this.mysql.connection
    );
    this.employeesRepo = require("./repository/employees")(
      this.mysql.connection
    );
    this.accountsSheetRepo = require("./repository/accounts_sheet")(
      this.mysql.connection
    );
    this.accountsPreloadDataRepo =
      require("./repository/accounts_preload_data")(this.mysql.connection);
    this.branchesRepo = require("./repository/branches")(this.mysql.connection);
    this.ebConsumptionRepo = require("./repository/eb_consumption")(
      this.mysql.connection
    );
    this.productRepo = require("./repository/product")(this.mysql.connection);
    this.cleaningPackingRepo = require("./repository/cleaning_packing")(
      this.mysql.connection
    );
    this.repackItemRepo = require("./repository/repack_item")(
      this.mysql.connection
    );
    this.materialsRepo = require("./repository/materials")(
      this.mysql.connection
    );
    this.materialsRequestRepo = require("./repository/material_request")(
      this.mysql.connection
    );
    this.stockAdditionRepo = require("./repository/stock_addition")(
      this.mysql.connection
    );
    this.targetBranchRepo = require("./repository/target_branch")(
      this.mysql.connection
    );
    this.targetDepartmentRepo = require("./repository/target_department")(
      this.mysql.connection
    );
    this.targetSectionRepo = require("./repository/target_section")(
      this.mysql.connection
    );
    this.targetEmployeeRepo = require("./repository/target_employee")(
      this.mysql.connection
    );
    this.employeeSalesRepo = require("./repository/employee_sales")(
      this.mysql.connection
    );
    this.masterListRepo = require("./repository/master_list")(
      this.mysql.connection
    );
    this.productStockPriceRepo = require("./repository/product_stock_price")(
      this.mysql.connection
    );
    this.stockCirclesRepo = require("./repository/stock_circles")(
      this.mysql.connection
    );
    this.tasksRepo = require("./repository/tasks")(this.mysql.connection);
    this.stockCircleCheckedRepo = require("./repository/stock_circle_checked")(
      this.mysql.connection
    );
    this.purchaseOrderRepo = require("./repository/purchase_order")(
      this.mysql.connection
    );
    this.purchaseEntryRepo = require("./repository/purchase_entry")(
      this.mysql.connection
    );
    this.taskCommentsRepo = require("./repository/task_comments")(
      this.mysql.connection
    );
    this.billingCounterRepo = require("./repository/billing_counter")(
      this.mysql.connection
    );
    this.stickeringRepo = require("./repository/stickering")(
      this.mysql.connection
    );
    this.purchaseAcknowledgmentRepo =
      require("./repository/purchase_acknowledgment")(this.mysql.connection);
    this.wmsPurchaseEntryRepo = require("./repository/wms_purchase_entry")(
      this.mysql.connection
    );
    this.grnRepo = require("./repository/grn")(this.mysql.connection);
    this.incentiveStickeringRepo = require("./repository/incentive_stickering")(
      this.mysql.connection
    );
    this.incentiveSalesRepo = require("./repository/incentive_sales")(
      this.mysql.connection
    );
    this.incentiveCommonRepo = require("./repository/incentive_common")(
      this.mysql.connection
    );
    this.incentiveGeneratedRepo = require("./repository/incentive_generated")(
      this.mysql.connection
    );
    this.payrollRepo = require("./repository/payroll")(this.mysql.connection);
    this.ledgersRepo = require("./repository/ledgers")(this.mysql.connection);
    this.paymentsRepo = require("./repository/payments")(this.mysql.connection);
    this.receiptsRepo = require("./repository/receipts")(this.mysql.connection);
    this.apiCallLogsRepo = require("./repository/api_call_logs")(
      this.mysql.connection
    );
    this.purchaseReturnsRepo = require("./repository/purchase_returns")(
      this.mysql.connection
    );
    this.employeeAllocationRepo = require("./repository/employee_allocation")(
      this.mysql.connection
    );
    this.accountAssetsRepo = require("./repository/account_assets")(
      this.mysql.connection
    );
    this.employeeAttendanceRepo = require("./repository/employee_attendance")(
      this.mysql.connection
    );
    this.moneyTransferRepo = require("./repository/money_transfer")(
      this.mysql.connection
    );
    this.transportsRepo = require("./repository/transports")(
      this.mysql.connection
    );
    this.purchaseReordersRepo = require("./repository/purchase_reorders")(
      this.mysql.connection
    );
    this.poRepo = require("./repository/po")(
      this.mysql.connection,
      this.purchaseReordersRepo
    );
    this.checklistFormsRepo = require("./repository/checklist_forms")(
      this.mysql.connection
    );
    this.checklistSubmissionsRepo =
      require("./repository/checklist_submissions")(this.mysql.connection);
    this.syncConfigRepo = require("./repository/sync_config")(
      this.mysql.connection
    );
    this.deadStockReportRepo = require("./repository/dead_stock_report")(
      this.mysql.connection
    );
    this.outstandingReportRepo = require("./repository/outstanding_report")(
      this.mysql.connection
    );
    this.stockHoldingReportRepo = require("./repository/stock_holding_report")(
      this.mysql.connection
    );
    this.salesReportRepo = require("./repository/sales_report")(
      this.mysql.connection
    );
  }

  initUsecases() {
    this.designationsUsecase = require("./usecase/designations")(
      this.designationsRepo
    );
    this.employeesUsecase = require("./usecase/employees")(this.employeesRepo);
    this.userUsecase = require("./usecase/user")(
      this.userRepo,
      this.employeesUsecase
    );
    this.departmentsUsecase = require("./usecase/departments")(
      this.departmentsRepo
    );
    this.employeeSectionsUsecase = require("./usecase/employee_sections")(
      this.employeeSectionsRepo
    );
    this.accountsSheetUsecase = require("./usecase/accounts_sheet")(
      this.accountsSheetRepo
    );
    this.accountsPreloadDataUsecase =
      require("./usecase/accounts_preload_data")(this.accountsPreloadDataRepo);
    this.branchesUsecase = require("./usecase/branches")(this.branchesRepo);
    this.ebConsumptionUsecase = require("./usecase/eb_consumption")(
      this.ebConsumptionRepo
    );
    this.productStockPriceUsecase = require("./usecase/product_stock_price")(
      this.productStockPriceRepo
    );
    this.productUsecase = require("./usecase/product")(
      this.productRepo,
      this.productStockPriceUsecase
    );
    this.cleaningPackingUsecase = require("./usecase/cleaning_packing")(
      this.cleaningPackingRepo
    );
    this.repackItemUsecase = require("./usecase/repack_item")(
      this.repackItemRepo
    );
    this.materialsUsecase = require("./usecase/materials")(this.materialsRepo);
    this.materialsRequestUsecase = require("./usecase/material_request")(
      this.materialsRequestRepo,
      this.branchesUsecase,
      this.materialsUsecase
    );
    this.stockAdditionUsecase = require("./usecase/stock_addition")(
      this.stockAdditionRepo,
      this.materialsUsecase
    );
    this.assetUsecase = require("./usecase/asset");
    this.targetBranchUsecase = require("./usecase/target_branch")(
      this.targetBranchRepo
    );
    this.targetDepartmentUsecase = require("./usecase/target_department")(
      this.targetDepartmentRepo
    );
    this.targetSectionUsecase = require("./usecase/target_section")(
      this.targetSectionRepo
    );
    this.targetEmployeeUsecase = require("./usecase/target_employee")(
      this.targetEmployeeRepo
    );
    this.employeeSalesUsecase = require("./usecase/employee_sales")(
      this.employeeSalesRepo
    );
    this.masterListUsecase = require("./usecase/master_list")(
      this.masterListRepo
    );
    this.stockCirclesUsecase = require("./usecase/stock_circles")(
      this.stockCirclesRepo
    );
    this.tasksUsecase = require("./usecase/tasks")(this.tasksRepo);
    this.taskCommentsUsecase = require("./usecase/task_comments")(
      this.taskCommentsRepo
    );
    this.stockCircleCheckedUsecase = require("./usecase/stock_circle_checked")(
      this.stockCircleCheckedRepo
    );
    this.purchaseOrderUsecase = require("./usecase/purchase_order")(
      this.purchaseOrderRepo,
      this.materialsUsecase
    );
    this.purchaseEntryUsecase = require("./usecase/purchase_entry")(
      this.purchaseEntryRepo,
      this.materialsUsecase
    );
    this.billingCounterUsecase = require("./usecase/billing_counter")(
      this.billingCounterRepo
    );
    this.stickeringUsecase = require("./usecase/stickering")(
      this.stickeringRepo,
      this.productUsecase
    );
    this.purchaseAcknowledgmentUsecase =
      require("./usecase/purchase_acknowledgment")(
        this.purchaseAcknowledgmentRepo
      );
    this.wmsPurchaseEntryUsecase = require("./usecase/wms_purchase_entry")(
      this.wmsPurchaseEntryRepo,
      this.productUsecase
    );
    this.grnUsecase = require("./usecase/grn")(this.grnRepo);
    this.incentiveStickeringUsecase = require("./usecase/incentive_stickering")(
      this.incentiveStickeringRepo
    );
    this.incentiveSalesUsecase = require("./usecase/incentive_sales")(
      this.incentiveSalesRepo
    );
    this.incentiveCommonUsecase = require("./usecase/incentive_common")(
      this.incentiveCommonRepo
    );
    this.incentiveGeneratedUsecase = require("./usecase/incentive_generated")(
      this.incentiveGeneratedRepo
    );
    this.payrollUsecase = require("./usecase/payroll")(this.payrollRepo);
    this.ledgersUsecase = require("./usecase/ledgers")(this.ledgersRepo);
    this.paymentsUsecase = require("./usecase/payments")(this.paymentsRepo);
    this.receiptsUsecase = require("./usecase/receipts")(this.receiptsRepo);
    this.apiCallLogsUsecase = require("./usecase/api_call_logs")(
      this.apiCallLogsRepo
    );
    this.employeeAllocationUsecase = require("./usecase/employee_allocation")(
      this.employeeAllocationRepo
    );
    this.accountAssetsUsecase = require("./usecase/account_assets")(
      this.accountAssetsRepo
    );
    this.employeeAttendanceUsecase = require("./usecase/employee_attendance")(
      this.employeeAttendanceRepo
    );
    this.purchaseReturnsUsecase = require("./usecase/purchase_returns")(
      this.purchaseReturnsRepo
    );
    this.moneyTransferUsecase = require("./usecase/money_transfer")(
      this.moneyTransferRepo
    );
    this.transportsUsecase = require("./usecase/transports")(
      this.transportsRepo
    );
    this.purchaseReordersUsecase = require("./usecase/purchase_reorders")(
      this.purchaseReordersRepo
    );
    this.poUsecase = require("./usecase/po")(this.poRepo);
    this.checklistFormsUsecase = require("./usecase/checklist_forms")(
      this.checklistFormsRepo,
      this.checklistSubmissionsRepo,
      this.branchesRepo
    );
    this.checklistSubmissionsUsecase =
      require("./usecase/checklist_submissions")(this.checklistSubmissionsRepo);
    this.syncConfigUsecase = require("./usecase/sync_config")(
      this.syncConfigRepo
    );
    this.deadStockReportUsecase = require("./usecase/dead_stock_report")(
      this.deadStockReportRepo
    );
    this.outstandingReportUsecase = require("./usecase/outstanding_report")(
      this.outstandingReportRepo
    );
    this.stockHoldingReportUsecase = require("./usecase/stock_holding_report")(
      this.stockHoldingReportRepo,
      this.branchesRepo,
      this.masterListRepo,
      this.employeesRepo,
      this.productRepo
    );
    this.salesReportUsecase = require("./usecase/sales_report")(
      this.salesReportRepo
    );
  }

  initRoutes() {
    const authMiddleWare = require("./middlewares/auth");
    app.use(authMiddleWare);

    const userRouter = require("./routes/user")(this.userUsecase);
    const designationsRouter = require("./routes/designations")(
      this.designationsUsecase
    );
    const departmentsRouter = require("./routes/departments")(
      this.departmentsUsecase
    );
    const employeeSectionsRouter = require("./routes/employee_sections")(
      this.employeeSectionsUsecase
    );
    const employeesRouter = require("./routes/employees")(
      this.employeesUsecase,
      this.designationsUsecase
    );
    const accountsSheetRouter = require("./routes/accounts_sheet")(
      this.accountsSheetUsecase,
      this.designationsUsecase
    );
    const accountsPreloadDataRouter = require("./routes/accounts_preload_data")(
      this.accountsPreloadDataUsecase,
      this.designationsUsecase
    );
    const branchesRouter = require("./routes/branches")(this.branchesUsecase);
    const ebConsumptionRouter = require("./routes/eb_consumption")(
      this.ebConsumptionUsecase,
      this.designationsUsecase
    );
    const productRouter = require("./routes/product")(
      this.productUsecase,
      this.designationsUsecase,
      this.synker
    );
    const cleaningPackingRouter = require("./routes/cleaning_packing")(
      this.cleaningPackingUsecase
    );
    const repackItemRouter = require("./routes/repack_item")(
      this.repackItemUsecase
    );
    const materialsRouter = require("./routes/materials")(
      this.materialsUsecase
    );
    const materialsRequestRouter = require("./routes/material_request")(
      this.materialsRequestUsecase,
      this.designationsUsecase
    );
    const stockAdditionRouter = require("./routes/stock_addition")(
      this.stockAdditionUsecase,
      this.designationsUsecase
    );
    const assetRouter = require("./routes/asset")(this.assetUsecase);
    const targetBranchRouter = require("./routes/target_branch")(
      this.targetBranchUsecase,
      this.designationsUsecase
    );
    const targetDepartmentRouter = require("./routes/target_department")(
      this.targetDepartmentUsecase,
      this.designationsUsecase
    );
    const targetSectionRouter = require("./routes/target_section")(
      this.targetSectionUsecase,
      this.designationsUsecase
    );
    const targetEmployeeRouter = require("./routes/target_employee")(
      this.targetEmployeeUsecase,
      this.designationsUsecase
    );
    const employeeSalesRouter = require("./routes/employee_sales")(
      this.employeeSalesUsecase,
      this.designationsUsecase
    );
    const masterListRouter = require("./routes/master_list")(
      this.masterListUsecase
    );
    const productStockPriceRouter = require("./routes/product_stock_price")(
      this.productStockPriceUsecase
    );
    const stockCirclesRouter = require("./routes/stock_circles")(
      this.stockCirclesUsecase,
      this.designationsUsecase
    );
    const tasksRouter = require("./routes/tasks")(
      this.tasksUsecase,
      this.taskCommentsUsecase
    );
    const stockCircleCheckedRouter = require("./routes/stock_circle_checked")(
      this.stockCircleCheckedUsecase
    );
    const purchaseOrderRouter = require("./routes/purchase_order")(
      this.purchaseOrderUsecase
    );
    const purchaseEntryRouter = require("./routes/purchase_entry")(
      this.purchaseEntryUsecase
    );
    const billingCounterRouter = require("./routes/billing_counter")(
      this.billingCounterUsecase
    );
    const stickeringRouter = require("./routes/stickering")(
      this.stickeringUsecase
    );
    const purchaseAcknowledgmentRouter =
      require("./routes/purchase_acknowledgment")(
        this.purchaseAcknowledgmentUsecase
      );
    const wmsPurchaseEntryRouter = require("./routes/wms_purchase_entry")(
      this.wmsPurchaseEntryUsecase
    );
    const grnRouter = require("./routes/grn")(this.grnUsecase);
    const incentiveStickeringRouter = require("./routes/incentive_stickering")(
      this.incentiveStickeringUsecase
    );
    const incentiveSalesRouter = require("./routes/incentive_sales")(
      this.incentiveSalesUsecase
    );
    const incentiveCommonRouter = require("./routes/incentive_common")(
      this.incentiveCommonUsecase
    );
    const incentiveGeneratedRouter = require("./routes/incentive_generated")(
      this.incentiveGeneratedUsecase
    );
    const payrollRouter = require("./routes/payroll")(this.payrollUsecase);
    const ledgersRouter = require("./routes/ledgers")(this.ledgersUsecase);
    const paymentsRouter = require("./routes/payments")(
      this.paymentsUsecase,
      this.designationsUsecase
    );
    const receiptsRouter = require("./routes/receipts")(
      this.receiptsUsecase,
      this.designationsUsecase
    );
    const apiCallLogsRouter = require("./routes/api_call_logs")(
      this.apiCallLogsUsecase
    );
    const purchaseReturnsRouter = require("./routes/purchase_returns")(
      this.purchaseReturnsUsecase,
      this.designationsUsecase
    );
    const employeeAllocationRouter = require("./routes/employee_allocation")(
      this.employeeAllocationUsecase,
      this.designationsUsecase
    );
    const pdfGeneratorRouter = require("./routes/pdf_generator")();
    const syncConfigRouter = require("./routes/sync_config")(
      this.syncConfigUsecase
    );
    const deadStockReportRouter = require("./routes/dead_stock_report")(
      this.deadStockReportUsecase
    );
    const outstandingReportRouter = require("./routes/outstanding_report")(
      this.outstandingReportUsecase
    );
    const stockHoldingReportRouter = require("./routes/stock_holding_report")(
      this.stockHoldingReportUsecase
    );
    const salesReportRouter = require("./routes/sales_report")(
      this.salesReportUsecase
    );

    app.use("/pdf-generator", pdfGeneratorRouter.getRouter());
    app.use("/cleaning-packing", cleaningPackingRouter.getRouter());
    app.use("/designations", designationsRouter.getRouter());
    app.use("/departments", departmentsRouter.getRouter());
    app.use("/employee-sections", employeeSectionsRouter.getRouter());
    app.use("/user", userRouter.getRouter());
    app.use("/employees", employeesRouter.getRouter());
    app.use("/accounts-sheet", accountsSheetRouter.getRouter());
    app.use("/accounts-preload-data", accountsPreloadDataRouter.getRouter());
    app.use("/branches", branchesRouter.getRouter());
    app.use("/eb-consumption", ebConsumptionRouter.getRouter());
    app.use("/product", productRouter.getRouter());
    app.use("/cleaning-packing", cleaningPackingRouter.getRouter());
    app.use("/repack-item", repackItemRouter.getRouter());
    app.use("/materials", materialsRouter.getRouter());
    app.use("/material-request", materialsRequestRouter.getRouter());
    app.use("/stock-addition", stockAdditionRouter.getRouter());
    app.use("/asset", assetRouter.getRouter());
    app.use("/target-branch", targetBranchRouter.getRouter());
    app.use("/target-department", targetDepartmentRouter.getRouter());
    app.use("/target-section", targetSectionRouter.getRouter());
    app.use("/target-employee", targetEmployeeRouter.getRouter());
    app.use("/employee-sales", employeeSalesRouter.getRouter());
    app.use("/master-list", masterListRouter.getRouter());
    app.use("/product-stock-price", productStockPriceRouter.getRouter());
    app.use("/stock-circles", stockCirclesRouter.getRouter());
    app.use("/tasks", tasksRouter.getRouter());
    app.use("/stock-circle-checked", stockCircleCheckedRouter.getRouter());
    app.use("/purchase-order", purchaseOrderRouter.getRouter());
    app.use("/purchase-entry", purchaseEntryRouter.getRouter());
    app.use("/billing-counter", billingCounterRouter.getRouter());
    app.use("/stickering", stickeringRouter.getRouter());
    app.use(
      "/purchase-acknowledgment",
      purchaseAcknowledgmentRouter.getRouter()
    );
    app.use("/wms-purchase-entry", wmsPurchaseEntryRouter.getRouter());
    app.use("/grn", grnRouter.getRouter());
    app.use("/incentive-stickering", incentiveStickeringRouter.getRouter());
    app.use("/incentive-sales", incentiveSalesRouter.getRouter());
    app.use("/incentive-common", incentiveCommonRouter.getRouter());
    app.use("/incentive-generated", incentiveGeneratedRouter.getRouter());
    app.use("/payroll", payrollRouter.getRouter());
    app.use("/api-call-logs", apiCallLogsRouter.getRouter());
    app.use("/sync-config", syncConfigRouter.getRouter());
    app.use("/dead-stock-report", deadStockReportRouter.getRouter());
    app.use("/outstanding-report", outstandingReportRouter.getRouter());
    app.use("/stock-holding-report", stockHoldingReportRouter.getRouter());
    app.use("/sales-report", salesReportRouter.getRouter());
    app.use("/purchase-returns", purchaseReturnsRouter.getRouter());
    app.use("/ledgers", ledgersRouter.getRouter());
    app.use(
      "/account-assets",
      require("./routes/account_assets")(this.accountAssetsUsecase).getRouter()
    );
    app.use(
      "/employee-attendance",
      require("./routes/employee_attendance")(
        this.employeeAttendanceUsecase
      ).getRouter()
    );
    app.use("/payments", paymentsRouter.getRouter());
    app.use("/receipts", receiptsRouter.getRouter());
    app.use("/employee-allocation", employeeAllocationRouter.getRouter());
    app.use(
      "/money-transfers",
      require("./routes/money_transfer")(this.moneyTransferUsecase).getRouter()
    );
    app.use(
      "/transports",
      require("./routes/transports")(this.transportsUsecase).getRouter()
    );
    app.use(
      "/purchase-reorders",
      require("./routes/purchase_reorders")(
        this.purchaseReordersUsecase
      ).getRouter()
    );
    app.use("/po", require("./routes/po")(this.poUsecase).getRouter());
    app.use(
      "/checklist-forms",
      require("./routes/checklist_forms")(
        this.checklistFormsUsecase,
        this.designationsUsecase
      ).getRouter()
    );
    app.use(
      "/checklist-submissions",
      require("./routes/checklist_submissions")(
        this.checklistSubmissionsUsecase,
        this.designationsUsecase
      ).getRouter()
    );
  }

  onClose(code = 0) {
    // Close all DB Connections
    this.drivers.map((m) => {
      m.close();
    });

    HttpServer.close(() => {
      process.exit(code);
    });

    // Fallback: force exit after 1 second if handles or cron timers remain open
    setTimeout(() => {
      process.exit(code);
    }, 1000).unref();
  }
}

const server = new Server();

[
  "SIGINT",
  "SIGTERM",
  "SIGQUIT",
  "uncaughtException",
  "SIGUSR1",
  "SIGUSR2",
].forEach((eventType) => {
  process.on(eventType, (err = "") => {
    let error = err ? err.toString() : "";

    if (err && err.stack) {
      error = err.stack;
    }

    logger.Log({
      level: logger.LEVEL.ERROR,
      component: "SERVER",
      code: "SERVER.EXIT",
      description: error || eventType,
      category: "",
      ref: {},
    });

    const exitCode = eventType === "SIGINT" || eventType === "SIGTERM" ? 0 : 1;
    server.onClose(exitCode);
  });
});
