const axios = require("axios");
const cron = require("node-cron");
const moment = require("moment");
const { exec } = require("child_process");
const encryptAES = require("../utils/encrypt");

const logger = require("../utils/logger");
const { parseProductStockQty } = require("../utils/product_stock_qty");
const { createLoggedAxios, logCurlCall } = require("./api_logger");

const DELIUM_API_KEY = process.env.DELIUM_API_KEY || "";
const GOFRUGAL_API_KEY = process.env.GOFRUGAL_API_KEY || "";

const DIGISME_API_KEY = process.env.DIGISME_API_KEY || "";
const DIGISME_CUSTOM_KEY = process.env.DIGISME_CUSTOM_KEY || "";
const DIGISME_BASE_URL = "https://indhrmsgateway.azurewebsites.net";

/** Primary keys in `sync_config`; cron expressions are loaded from DB (see migration seed). */
const SYNC_KEY_CLEANING_PACKING = "cleaning_packing_sync";
const SYNC_KEY_DIGISME_EMPLOYEES = "digisme_employees_sync";
const SYNC_KEY_PRODUCT = "product_sync";
const SYNC_KEY_DIGISME_ATTENDANCE = "digisme_attendance_sync";
const SYNC_KEY_STOCK_HOLDING_REPORT = "stock_holding_report_sync";

const GOFRUGAL_OUTLET_MAP = {
  2: "2",
  3: "5",
  6: "4",
  5: "3",
  4: "6",
};

const GOFRUGAL_BASE_URL = "http://ayyappanhq.gofrugal.com/RayMedi_HQ/api/v1";
/** GoFrugal items / eanCode API: fetch this many rows per page request */
const GOFRUGAL_ITEMS_PAGE_SIZE = 10000;

class Synker {
  constructor(
    productUsecase,
    cleaningPackingUsecase,
    employeesUsecase,
    departmentsUsecase,
    designationsUsecase,
    employeeSectionsUsecase,
    branchesUsecase,
    masterListUsecase,
    productStockPriceUsecase,
    apiCallLogsUsecase,
    employeeAttendanceUsecase,
    syncConfigRepo,
    stockHoldingReportUsecase
  ) {
    this.productUsecase = productUsecase;
    this.cleaningPackingUsecase = cleaningPackingUsecase;
    this.employeesUsecase = employeesUsecase;
    this.departmentsUsecase = departmentsUsecase;
    this.designationsUsecase = designationsUsecase;
    this.employeeSectionsUsecase = employeeSectionsUsecase;
    this.branchesUsecase = branchesUsecase;
    this.masterListUsecase = masterListUsecase;
    this.productStockPriceUsecase = productStockPriceUsecase;
    this.apiCallLogsUsecase = apiCallLogsUsecase;
    this.employeeAttendanceUsecase = employeeAttendanceUsecase;
    this.syncConfigRepo = syncConfigRepo;
    this.stockHoldingReportUsecase = stockHoldingReportUsecase;

    this._scheduledCronTasks = [];
    this._initCronJobsPromise = null;

    // Create logged axios instances for each API
    this.gofrugalItemsClient = createLoggedAxios(
      {
        apiType: "GOFRUGAL",
        secondaryType: "ITEMS",
        callerFile: "services/synker.js",
      },
      this.apiCallLogsUsecase
    );
    this.gofrugalItemsCountClient = createLoggedAxios(
      {
        apiType: "GOFRUGAL",
        secondaryType: "ITEMS_COUNT",
        callerFile: "services/synker.js",
      },
      this.apiCallLogsUsecase
    );
    this.gofrugalEanCodeClient = createLoggedAxios(
      {
        apiType: "GOFRUGAL",
        secondaryType: "EAN_CODE",
        callerFile: "services/synker.js",
      },
      this.apiCallLogsUsecase
    );
    this.deliumArticlesClient = createLoggedAxios(
      {
        apiType: "DELIUM",
        secondaryType: "ARTICLES",
        callerFile: "services/synker.js",
      },
      this.apiCallLogsUsecase
    );
    this.deliumRepackagingClient = createLoggedAxios(
      {
        apiType: "DELIUM",
        secondaryType: "REPACKAGING",
        callerFile: "services/synker.js",
      },
      this.apiCallLogsUsecase
    );
    this.digismeEmployeesClient = createLoggedAxios(
      {
        apiType: "DIGISME",
        secondaryType: "EMPLOYEES",
        callerFile: "services/synker.js",
      },
      this.apiCallLogsUsecase
    );
    this.digismeAttendanceClient = createLoggedAxios(
      {
        apiType: "DIGISME",
        secondaryType: "ATTENDANCE",
        callerFile: "services/synker.js",
      },
      this.apiCallLogsUsecase
    );
  }

  _formatWindowLabel(window) {
    if (!window) return "";
    const pad = (n) => String(n).padStart(2, "0");
    const start = `${pad(window.startHour)}:${pad(window.startMinute)}`;
    const end = `${pad(window.endHour)}:${pad(window.endMinute)}`;
    return `${start}–${end}`;
  }

  _isWithinWindow(now, window) {
    if (!window) return true;
    const mins = now.getHours() * 60 + now.getMinutes();
    const start = window.startHour * 60 + window.startMinute;
    const end = window.endHour * 60 + window.endMinute;
    return mins >= start && mins <= end;
  }

  async _runScheduledJob(name, job) {
    try {
      await Promise.resolve(job());
    } catch (err) {
      console.error(`Error in ${name}:`, err);
    }
  }

  _syncConfigRowActive(row) {
    if (!row) return false;
    const v = row.is_active;
    return v === true || v === 1 || v === "1";
  }

  async _isSyncActive(syncKey) {
    if (!this.syncConfigRepo) return false;
    try {
      const row = await this.syncConfigRepo.getBySyncKey(syncKey);
      return this._syncConfigRowActive(row);
    } catch (e) {
      console.error(`sync_config lookup failed for ${syncKey}:`, e);
      return false;
    }
  }

  _stopAllScheduledCronTasks() {
    for (const task of this._scheduledCronTasks) {
      try {
        task.stop();
      } catch (e) {
        console.error("Error stopping cron task:", e);
      }
    }
    this._scheduledCronTasks = [];
  }

  _scheduleCronJob({
    name,
    cronSyntax,
    job,
    runOnStartup = false,
    window = null,
  }) {
    const windowLabel = this._formatWindowLabel(window);
    const scheduleLabel = windowLabel
      ? `${cronSyntax} (window ${windowLabel})`
      : cronSyntax;
    console.log(`Scheduled ${name} with CRON: ${scheduleLabel}`);

    if (runOnStartup) {
      console.log(`Running ${name} on startup at ${new Date().toISOString()}`);
      this._runScheduledJob(name, job);
    }

    const scheduledTask = cron.schedule(cronSyntax, () => {
      const now = new Date();
      if (!this._isWithinWindow(now, window)) return;
      console.log(`Running scheduled ${name} at ${now.toISOString()}`);
      this._runScheduledJob(name, job);
    });
    return scheduledTask;
  }

  async _doInitCronJobs(options = {}) {
    const { runStartupHooks = false } = options;
    this._stopAllScheduledCronTasks();

    if (!this.syncConfigRepo) {
      console.warn(
        "sync_config repository missing; synker crons not scheduled."
      );
      return;
    }

    let rows;
    try {
      rows = await this.syncConfigRepo.getAll();
    } catch (e) {
      console.error("sync_config load failed; synker crons not scheduled:", e);
      return;
    }

    const byKey = new Map((rows || []).map((r) => [r.sync_key, r]));

    const jobDefs = [
      {
        syncKey: SYNC_KEY_CLEANING_PACKING,
        name: "cleaning packing sync",
        job: () => this.syncCleaningPacking(),
        runOnStartup: false,
        window: null,
      },
      {
        syncKey: SYNC_KEY_DIGISME_EMPLOYEES,
        name: "digisme employees sync",
        job: () => this.syncDigismeEmployees(),
        runOnStartup: false,
        window: null,
      },
      {
        syncKey: SYNC_KEY_PRODUCT,
        name: "product sync",
        job: () => this.syncProducts(),
        runOnStartup: true,
        window: null,
      },
      {
        syncKey: SYNC_KEY_DIGISME_ATTENDANCE,
        name: "digisme attendance sync",
        job: () => this.syncDigismeAttendance(),
        runOnStartup: false,
        window: {
          startHour: 8,
          startMinute: 30,
          endHour: 23,
          endMinute: 0,
        },
      },
      {
        syncKey: SYNC_KEY_STOCK_HOLDING_REPORT,
        name: "stock holding report sync",
        job: () => this.syncStockHoldingReportWithLogging(),
        runOnStartup: false,
        window: null,
      },
    ];

    for (const def of jobDefs) {
      const row = byKey.get(def.syncKey);
      if (!row || !this._syncConfigRowActive(row)) {
        console.log(
          `Skipping ${def.name}: inactive or missing sync_config row (${def.syncKey})`
        );
        continue;
      }
      const cronSyntax = String(row.cron || "").trim();
      if (!cronSyntax || !cron.validate(cronSyntax)) {
        console.error(
          `Skipping ${def.name}: invalid or empty cron expression: "${cronSyntax}"`
        );
        continue;
      }
      const task = this._scheduleCronJob({
        name: def.name,
        cronSyntax,
        job: def.job,
        runOnStartup: runStartupHooks && def.runOnStartup,
        window: def.window,
      });
      if (task) this._scheduledCronTasks.push(task);
    }
  }

  /**
   * Loads `sync_config` and schedules crons for active rows (`is_active` read from DB).
   * @param {{ runStartupHooks?: boolean }} options — pass `runStartupHooks: true` only on app boot (Digisme employees one-shot).
   * Concurrent calls share one in-flight run (singleflight).
   */
  initCronJobs(options = {}) {
    if (this._initCronJobsPromise) return this._initCronJobsPromise;
    this._initCronJobsPromise = this._doInitCronJobs(options).finally(() => {
      this._initCronJobsPromise = null;
    });
    return this._initCronJobsPromise;
  }

  async getDigismeToken() {
    try {
      const response = await this._authenticateDigisme();
      return response.access_token;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async syncStockHoldingReportWithLogging() {
    logger.Log({
      level: logger.LEVEL.INFO,
      component: "SERVICE.SYNKER",
      code: "SERVICE.SYNKER.STOCK-HOLDING-SYNC",
      description: "Syncing stock holding report",
      category: "",
      ref: {},
    });

    if (!this.stockHoldingReportUsecase) {
      logger.Log({
        level: logger.LEVEL.ERROR,
        component: "SERVICE.SYNKER",
        code: "SERVICE.SYNKER.STOCK-HOLDING-SYNC",
        description: "stockHoldingReportUsecase not configured",
        category: "",
        ref: {},
      });
      return;
    }

    try {
      const result = await this.stockHoldingReportUsecase.syncFromDeliumApi({
        systemSync: true,
      });
      logger.Log({
        level: logger.LEVEL.INFO,
        component: "SERVICE.SYNKER",
        code: "SERVICE.SYNKER.STOCK-HOLDING-SYNC",
        description: JSON.stringify(result),
        category: "",
        ref: {},
      });
      return result;
    } catch (err) {
      logger.Log({
        level: logger.LEVEL.ERROR,
        component: "SERVICE.SYNKER",
        code: "SERVICE.SYNKER.STOCK-HOLDING-SYNC",
        description: err.toString(),
        category: "",
        ref: {},
      });
      throw err;
    }
  }

  async syncDigismeAttendance() {
    try {
      if (!(await this._isSyncActive(SYNC_KEY_DIGISME_ATTENDANCE))) {
        console.log("digisme attendance sync skipped: sync_config inactive");
        return;
      }
      const [attendances, processedAttendances] = await Promise.all([
        this._fetchDigismeAttendance(),
        this._fetchDigismeProcessedAttendance(),
      ]);
      const formattedAttendance = attendances.map((attendance) => {
        let clockMoment = moment(
          `${attendance.ClockDate} ${attendance.ClockTime}`,
          "DD/MM/YYYY HH:mm:ss"
        );

        // In production, store clock time in UTC (IST - 5h30m)
        if (String(process.env.IS_PROD).toLowerCase() === "true") {
          clockMoment = clockMoment.subtract(330, "minutes");
        }

        return {
          employee_code: attendance.Code,
          clock_date_time: clockMoment.format("YYYY-MM-DD HH:mm:ss"),
          punch_action: attendance.PunchAction,
        };
      });

      const formattedProcessedAttendance = processedAttendances
        .map((attendance) => {
          const attendanceDate = moment(
            attendance.ClockDateD,
            "DD/MM/YYYY",
            true
          );
          if (!attendanceDate.isValid()) return null;

          const isLate = Number(attendance.LatenessN) > 0;
          const isEarly = !isLate && Number(attendance.UnderN) > 0;

          return {
            employee_code: attendance.EmpCodeC,
            date: attendanceDate.format("YYYY-MM-DD"),
            is_late: isLate,
            is_early: isEarly,
          };
        })
        .filter(Boolean);

      await this.employeeAttendanceUsecase.bulkInsert(formattedAttendance);
      await this.employeeAttendanceUsecase.bulkUpsertProcessed(
        formattedProcessedAttendance
      );
      console.log("Attendance synced successfully");
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async syncDigismeEmployees() {
    try {
      if (!(await this._isSyncActive(SYNC_KEY_DIGISME_EMPLOYEES))) {
        console.log("digisme employees sync skipped: sync_config inactive");
        return;
      }
      const GENDER_MAP = {
        FEMALE: "F",
        MALE: "M",
      };

      const MARITAL_STATUS_MAP = {
        MARRIED: "M",
        SINGLE: "S",
      };

      const employees = await this._fetchDigismeEmployees();
      const parsedDesignations = {};
      const parsedDepartments = {};
      const parsedEmployeeSections = {};
      const parsedBranches = {};

      let formattedEmployees = employees.map((employee) => {
        if (!parsedDesignations[employee.DesignationCode]) {
          parsedDesignations[employee.DesignationCode] = {
            designation_code: employee.DesignationCode,
            designation_name: employee.DesignationName,
          };
        }

        if (!parsedBranches[employee.DesignationGroupName]) {
          parsedBranches[employee.DesignationGroupName] = {
            branch_name: employee.DesignationGroupName,
          };
        }

        if (
          employee.DepartmentCode !== "NONE" &&
          !parsedDepartments[employee.DepartmentCode]
        ) {
          parsedDepartments[employee.DepartmentCode] = {
            department_code: employee.DepartmentCode,
            department_name: employee.DepartmentName,
          };
        }

        if (
          employee.SectionCode !== "NONE" &&
          !parsedEmployeeSections[employee.SectionCode]
        ) {
          parsedEmployeeSections[employee.SectionCode] = {
            section_code: employee.SectionCode,
            section_name: employee.SectionName,
          };
        }

        return {
          employee_code: employee.EmployeeCode,
          employee_name: employee.EmployeeName,
          // designation_code: employee.DesignationCode,
          // department_code: employee.DepartmentCode,
          // DesignationGroupName: employee.DesignationGroupName,
          // section_code: employee.SectionCode,
          gender: GENDER_MAP[employee.Gender] ?? null,
          marital_status: MARITAL_STATUS_MAP[employee.MartialStatus] ?? null,
          birthdate: employee.BirthDate ? new Date(employee.BirthDate) : null,
          probation: null, // Source not present in input
          confirmation_date: employee.DateOfJoining
            ? new Date(employee.DateOfJoining)
            : null,
          termination_date: employee.TerminateDate
            ? new Date(employee.TerminateDate)
            : null,
          email_id: employee.EmailId || null,
          hours_worked_per_year: null, // No direct input
          hours_worked_per_week: employee.DaysWorkPerWeek
            ? parseFloat(employee.DaysWorkPerWeek) *
              (employee.HoursWorkPerDay
                ? parseFloat(employee.HoursWorkPerDay)
                : 0)
            : null,
          mobile_number: employee.MobileNo
            ? employee.MobileNo.replace("91-", "")
            : null,
          // rest_day: employee.RestDay ? parseInt(employee.RestDay) : null,
          is_face_registered: false, // No input present
          termination_reason: null, // No input present
          terminated:
            employee.IsTerminated &&
            employee.IsTerminated.toLowerCase() === "yes"
              ? true
              : false,
          account_no: employee.AccNumber || null,
          ifsc_code: employee.IFSCCode?.toUpperCase() || null,
          employee_category:
            employee.CategoryName && employee.CategoryName !== "NONE"
              ? employee.CategoryName
              : null,
        };
      });

      // const designationsRes = await this.designationsUsecase.bulkCreate(
      //   Object.values(parsedDesignations)
      // );
      // const departmentsRes = await this.departmentsUsecase.bulkCreate(
      //   Object.values(parsedDepartments)
      // );
      // const branchesRes = await this.branchesUsecase.bulkCreate(
      //   Object.values(parsedBranches)
      // );
      // const employeeSectionsRes = await this.employeeSectionsUsecase.bulkCreate(
      //   Object.values(parsedEmployeeSections)
      // );
      // const designations = Object.fromEntries(
      //   (designationsRes.designations || []).map((d) => [d.designation_code, d])
      // );
      // const departments = Object.fromEntries(
      //   (departmentsRes.departments || []).map((d) => [d.department_code, d])
      // );
      // const branches = Object.fromEntries(
      //   (branchesRes.branches || []).map((d) => [d.branch_name, d])
      // );
      // const employeeSections = Object.fromEntries(
      //   (employeeSectionsRes.employeeSections || []).map((d) => [
      //     d.section_code,
      //     d,
      //   ])
      // );

      await this.designationsUsecase.bulkCreate(
        Object.values(parsedDesignations)
      );
      await this.departmentsUsecase.bulkCreate(
        Object.values(parsedDepartments)
      );
      await this.branchesUsecase.bulkCreate(Object.values(parsedBranches));
      await this.employeeSectionsUsecase.bulkCreate(
        Object.values(parsedEmployeeSections)
      );

      formattedEmployees = formattedEmployees.map((employee) => {
        const data = {
          ...employee,
        };

        delete data.designation_code;
        delete data.department_code;
        delete data.section_code;
        delete data.DesignationGroupName;

        return data;
      });

      await this.employeesUsecase.bulkCreate(formattedEmployees);
    } catch (err) {
      console.error(err);
    }
  }

  async syncCleaningPacking() {
    try {
      if (!(await this._isSyncActive(SYNC_KEY_CLEANING_PACKING))) {
        console.log("cleaning packing sync skipped: sync_config inactive");
        return;
      }
      await this.cleaningPackingUsecase.deleteAll();
      const deliumCleaningPacking = await this._fetchDeliumCleaningPacking();
      for (const item of deliumCleaningPacking) {
        await this.cleaningPackingUsecase.create({
          purchase_item: item.purchase_item,
          purchase_item_name: item.purchase_item_name,
          article_id: item.article_id,
          article_name: item.article_name,
          priority_score: item.priority_score,
          repackage_conversion: item.repackage_conversion,
          planner: item.planner,
          repack_quantity: item.repack_quantity,
          forecast_quantity: item.forecast_quantity,
          order_date: moment(item.order_date).format("YYYY-MM-DD"),
          child_stock_in_hand: item.child_stock_in_hand,
          parent_stock: item.parent_stock,
          store_uom: item.store_uom,
          num_stores_oos: item.num_stores_oos,
          chain_bill_count_level: item.chain_bill_count_level,
        });
      }
      console.log("INSERTING CLEANING PACKING Done");
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async syncProducts() {
    try {
      if (!(await this._isSyncActive(SYNC_KEY_PRODUCT))) {
        console.log("product sync skipped: sync_config inactive");
        return;
      }
      console.log("Fetching Products!");

      const goFrugalItemsCount = await this._fetchGoFrugalItemsCount();
      console.log("GoFrugal Items Count Fetched!");
      const [goFrugalItems, deliumItems, eanByItemId] = await Promise.all([
        this._fetchAllGoFrugalItems(goFrugalItemsCount),
        this._fetchDeliumItems(),
        this._fetchAllGoFrugalEanCodes(),
      ]);
      console.log("GoFrugal Items Fetched!");
      console.log("Delium Items Fetched!");
      console.log(
        `GoFrugal EAN rows (distinct itemId): ${
          Object.keys(eanByItemId).length
        }`
      );

      console.log("Products Fetched!");

      const { itemPrices, outlets, products } =
        this._transformGofrugalItems(goFrugalItems);

      console.log(`Total Price Rows: ${itemPrices.length}`);

      const transformedItemPrices = itemPrices.map((item) => [
        item.product_id,
        Number(item.outlet_id),
        parseProductStockQty(item.stock),
        Number(item.cost_price),
        Number(item.selling_price),
        Number(item.purchase_price),
      ]);

      // Bulk insert in batches of 1000 rows to avoid overly large queries
      const BATCH_SIZE = 1000;
      for (let i = 0; i < transformedItemPrices.length; i += BATCH_SIZE) {
        const batch = transformedItemPrices.slice(i, i + BATCH_SIZE);
        await this.productStockPriceUsecase.bulkUpsert(batch);
      }
      console.log("Product Stock Prices Upserted in batches!");

      const {
        brands,
        categories,
        subcategories,
        departments,
        packageTypes,
        formattedProduct,
        manufacturers,
        distributors,
      } = this.formatProducts(deliumItems);

      let productsProcessed = 0;
      let categoriesProcessed = 0;
      let subcategoriesProcessed = 0;
      let brandsProcessed = 0;
      let departmentsProcessed = 0;

      // Prepare products with GoFrugal data
      const productsToInsert = formattedProduct.map((product) => ({
        ...product,
        ...products[product.product_id],
      }));

      // Bulk insert products in batches
      const PRODUCT_BATCH_SIZE = 1000;
      for (let i = 0; i < productsToInsert.length; i += PRODUCT_BATCH_SIZE) {
        const batch = productsToInsert.slice(i, i + PRODUCT_BATCH_SIZE);
        await this.productUsecase.bulkCreate(batch);
        productsProcessed += batch.length;
      }
      console.log("INSERTING PRODUCTS Done");

      const eanPairs = Object.entries(eanByItemId).map(([itemId, ean]) => [
        Number(itemId),
        ean,
      ]);

      console.log(eanPairs);

      let eanNumbersUpdated = 0;
      if (eanPairs.length > 0) {
        await this.productUsecase.bulkUpdateEanNumbers(eanPairs);
        eanNumbersUpdated = eanPairs.length;
        console.log("PRODUCT EAN NUMBERS Updated");
      }

      // Bulk insert categories in batches
      const categoriesArray = Object.values(categories);
      const CATEGORY_BATCH_SIZE = 1000;
      for (let i = 0; i < categoriesArray.length; i += CATEGORY_BATCH_SIZE) {
        const batch = categoriesArray.slice(i, i + CATEGORY_BATCH_SIZE);
        await this.productUsecase.bulkUpsertCategory(batch);
        categoriesProcessed += batch.length;
      }
      console.log("INSERTING CATEGORIES Done");

      // Bulk insert subcategories in batches
      const subcategoriesArray = Object.values(subcategories);
      const SUBCATEGORY_BATCH_SIZE = 1000;
      for (
        let i = 0;
        i < subcategoriesArray.length;
        i += SUBCATEGORY_BATCH_SIZE
      ) {
        const batch = subcategoriesArray.slice(i, i + SUBCATEGORY_BATCH_SIZE);
        await this.productUsecase.bulkUpsertSubCategory(batch);
        subcategoriesProcessed += batch.length;
      }
      console.log("INSERTING SUBCATEGORIES Done");

      // Bulk insert brands in batches
      const brandsArray = Object.values(brands);
      const BRAND_BATCH_SIZE = 1000;
      for (let i = 0; i < brandsArray.length; i += BRAND_BATCH_SIZE) {
        const batch = brandsArray.slice(i, i + BRAND_BATCH_SIZE);
        await this.productUsecase.bulkUpsertBrand(batch);
        brandsProcessed += batch.length;
      }
      console.log("INSERTING BRANDS Done");

      // Bulk insert departments in batches
      const departmentsArray = Object.values(departments);
      const DEPARTMENT_BATCH_SIZE = 1000;
      for (let i = 0; i < departmentsArray.length; i += DEPARTMENT_BATCH_SIZE) {
        const batch = departmentsArray.slice(i, i + DEPARTMENT_BATCH_SIZE);
        await this.productUsecase.bulkUpsertDepartment(batch);
        departmentsProcessed += batch.length;
      }
      console.log("INSERTING DEPARTMENTS Done");

      await this.masterListUsecase.bulkUpsertByName(
        Object.values(manufacturers),
        1
      );
      console.log("INSERTING MANUFACTURERS (master_list) Done");
      await this.masterListUsecase.bulkCreate(Object.values(distributors));
      console.log("INSERTING DISTRIBUTORS (master_list) Done");

      return {
        productsProcessed,
        categoriesProcessed,
        subcategoriesProcessed,
        brandsProcessed,
        departmentsProcessed,
        eanNumbersUpdated,
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  _fetchGoFrugalItemsPage(page, limit) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await this.gofrugalItemsClient({
          method: "GET",
          url: `${GOFRUGAL_BASE_URL}/items?limit=${limit}&page=${page}`,
          headers: {
            "X-Auth-Token": GOFRUGAL_API_KEY,
          },
          callerFunction: "_fetchGoFrugalItemsPage",
        });
        if (response.status !== 200) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "SERVICE.SYNKER",
            code: "SERVICE.SYNKER.GOFRUGAL-FETCH",
            description: "Non-200 status received",
            category: "",
            ref: {},
          });
          reject();
          return;
        }
        const items = response.data.items;
        resolve(items);
      } catch (err) {
        logger.Log({
          level: logger.LEVEL.ERROR,
          component: "SERVICE.SYNKER",
          code: "SERVICE.SYNKER.GOFRUGAL-FETCH",
          description: err.toString(),
          category: "",
          ref: {},
        });
        reject(err);
      }
    });
  }

  /**
   * Loads all GoFrugal items using fixed page size (see GOFRUGAL_ITEMS_PAGE_SIZE).
   * @param {number} totalRecords - from items API total_records (via _fetchGoFrugalItemsCount)
   */
  _fetchAllGoFrugalItems(totalRecords) {
    return new Promise(async (resolve, reject) => {
      try {
        const total = Number(totalRecords) || 0;
        if (total < 1) {
          resolve([]);
          return;
        }
        const limit = GOFRUGAL_ITEMS_PAGE_SIZE;
        const totalPages = Math.ceil(total / limit);
        const allItems = [];
        for (let page = 1; page <= totalPages; page++) {
          const batch = await this._fetchGoFrugalItemsPage(page, limit);
          const items = Array.isArray(batch) ? batch : [];
          allItems.push(...items);
        }
        resolve(allItems);
      } catch (err) {
        reject(err);
      }
    });
  }

  _fetchGoFrugalItemsCount() {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await this.gofrugalItemsCountClient({
          method: "GET",
          url: `${GOFRUGAL_BASE_URL}/items?limit=1`,
          headers: {
            "X-Auth-Token": GOFRUGAL_API_KEY,
          },
          callerFunction: "_fetchGoFrugalItemsCount",
        });
        if (response.status !== 200) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "SERVICE.SYNKER",
            code: "SERVICE.SYNKER.GOFRUGAL-FETCH",
            description: "Non-200 status received",
            category: "",
            ref: {},
          });
          reject();
          return;
        }
        const totalItems = Number(response.data.total_records);
        resolve(totalItems);
      } catch (err) {
        logger.Log({
          level: logger.LEVEL.ERROR,
          component: "SERVICE.SYNKER",
          code: "SERVICE.SYNKER.GOFRUGAL-FETCH",
          description: err.toString(),
          category: "",
          ref: {},
        });
        reject(err);
      }
    });
  }

  _fetchGoFrugalEanCodePage(page, limit) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await this.gofrugalEanCodeClient({
          method: "GET",
          url: `${GOFRUGAL_BASE_URL}/eanCode?limit=${limit}&page=${page}`,
          headers: {
            "X-Auth-Token": GOFRUGAL_API_KEY,
          },
          callerFunction: "_fetchGoFrugalEanCodePage",
        });
        if (response.status !== 200) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "SERVICE.SYNKER",
            code: "SERVICE.SYNKER.GOFRUGAL-EAN-FETCH",
            description: "Non-200 status received",
            category: "",
            ref: {},
          });
          reject(new Error("GoFrugal eanCode API returned non-200"));
          return;
        }
        resolve(response.data);
      } catch (err) {
        logger.Log({
          level: logger.LEVEL.ERROR,
          component: "SERVICE.SYNKER",
          code: "SERVICE.SYNKER.GOFRUGAL-EAN-FETCH",
          description: err.toString(),
          category: "",
          ref: {},
        });
        reject(err);
      }
    });
  }

  /**
   * Fetches all paginated eanCode rows and maps itemId -> ean string (products.ean_number).
   * Uses the same page size as item sync (GOFRUGAL_ITEMS_PAGE_SIZE).
   */
  _fetchAllGoFrugalEanCodes() {
    return new Promise(async (resolve, reject) => {
      try {
        const limit = GOFRUGAL_ITEMS_PAGE_SIZE;
        const byItemId = {};
        let page = 1;
        let totalPages = 1;

        do {
          const data = await this._fetchGoFrugalEanCodePage(page, limit);
          const rows = Array.isArray(data.eanCode) ? data.eanCode : [];
          for (const row of rows) {
            const itemId = row.itemId;
            const raw = row.eanCode;
            if (itemId == null || raw == null) continue;
            const ean = String(raw).trim();
            if (ean === "") continue;
            byItemId[itemId] = ean;
          }
          totalPages = Math.max(1, Number(data.total_pages) || 1);
          page += 1;
        } while (page <= totalPages);

        resolve(byItemId);
      } catch (err) {
        reject(err);
      }
    });
  }

  _transformGofrugalItems(goFrugalItems) {
    try {
      const itemPrices = [];
      const outlets = {};
      const products = {};

      for (const item of goFrugalItems) {
        products[item.itemId] = {
          gf_item_name: item.itemName,
          gf_description: item.description,
          gf_detailed_description: item.detailedDescription,
          gf_weight_grams: item.weightGrams,
          gf_applies_online: item.appliesOnline,
          gf_item_product_type: item.itemProductType,
          gf_manufacturer: item.manufacturer,
          gf_food_type: item.foodType,
          gf_tax_id: item.taxId,
          gf_status: item.status,
        };

        for (const stock of item.stock) {
          itemPrices.push({
            product_id: item.itemId,
            outlet_id: GOFRUGAL_OUTLET_MAP[stock.outletId],
            stock: parseProductStockQty(stock.stock),
            cost_price: stock.mrp,
            selling_price: stock.salePrice,
            purchase_price: stock.purchasePrice,
          });
          outlets[stock.outletId] = true;
        }
      }
      return { itemPrices, outlets, products };
    } catch (err) {}
  }

  _fetchDeliumItems() {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await this.deliumArticlesClient({
          method: "GET",
          url: "https://ayyappanplasticmarket.delium.io/api/api/articles",
          headers: {
            "X-DELIUM-KEY": DELIUM_API_KEY,
          },
          callerFunction: "_fetchDeliumItems",
        });
        if (response.status !== 200) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "SERVICE.SYNKER",
            code: "SERVICE.SYNKER.DELIUM-FETCH",
            description: "Non-200 status received",
            category: "",
            ref: {},
          });
          reject();
          return;
        }
        resolve(response.data);
      } catch (err) {
        logger.Log({
          level: logger.LEVEL.ERROR,
          component: "SERVICE.SYNKER",
          code: "SERVICE.SYNKER.DELIUM-FETCH",
          description: err.toString(),
          category: "",
          ref: {},
        });
        reject(err);
      }
    });
  }

  _fetchDeliumCleaningPacking(forDate = moment().format("YYYY-MM-DD")) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await this.deliumRepackagingClient({
          method: "GET",
          url: `https://ayyappanplasticmarket.delium.io/api/api/repackaging`,
          headers: {
            "X-DELIUM-KEY": DELIUM_API_KEY,
          },
          callerFunction: "_fetchDeliumCleaningPacking",
        });
        if (response.status !== 200) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "SERVICE.SYNKER",
            code: "SERVICE.SYNKER.DELIUM-CLEANING-PACKING-FETCH",
            description: "Non-200 status received",
            category: "",
            ref: {},
          });
          reject();
          return;
        }
        resolve(response.data);
      } catch (err) {
        logger.Log({
          level: logger.LEVEL.ERROR,
          component: "SERVICE.SYNKER",
          code: "SERVICE.SYNKER.DELIUM-CLEANING-PACKING-FETCH",
          description: err.toString(),
          category: "",
          ref: {},
        });
        reject(err);
      }
    });
  }

  formatProducts(products) {
    const brands = {};
    const categories = {};
    const subcategories = {};
    const departments = {};
    const packageTypes = {};
    const manufacturers = {};
    const distributors = {};

    const formattedProduct = [];

    for (const product of products) {
      const transformed = this._transformProduct(product);

      if (brands[transformed.brand_id] == undefined)
        brands[transformed.brand_id] = {
          brand_id: transformed.brand_id,
          brand_name: transformed.brand_name,
          category_id: transformed.category_id,
        };

      if (categories[transformed.category_id] == undefined)
        categories[transformed.category_id] = {
          category_id: transformed.category_id,
          category_name: transformed.maincategory_name,
          department_id: transformed.department_id,
        };

      if (subcategories[transformed.subcategory_id] == undefined)
        subcategories[transformed.subcategory_id] = {
          category_id: transformed.category_id,
          subcategory_id: transformed.subcategory_id,
          subcategory_name: transformed.subcategory_name,
        };

      if (departments[transformed.department_id] == undefined)
        departments[transformed.department_id] = {
          department_id: transformed.department_id,
          department_name: transformed.department_name,
        };

      const manufacturer = transformed.manufacturer.replace("n", "");
      if (manufacturers[manufacturer] == undefined)
        manufacturers[manufacturer] = {
          name: product.manufacturer_name,
          person_type: 1,
        };

      const distributor = transformed.distributor.replace("n", "");
      if (
        distributors[distributor] == undefined &&
        product.distributor_name &&
        String(product.distributor_name).trim() !== ""
      )
        distributors[distributor] = {
          master_id: distributor + "846",
          name: String(product.distributor_name).trim(),
          person_type: 3,
        };

      const distributorMasterNumeric = Number(distributor + "846");
      const distributorId = Number.isFinite(distributorMasterNumeric)
        ? distributorMasterNumeric
        : null;

      if (
        transformed.packaging_type &&
        transformed.packaging_type.trim() != ""
      ) {
        packageTypes[transformed.packaging_type] = true;
      }

      formattedProduct.push({
        product_id: transformed.product_id,
        de_distributor: product.distributor_name,
        distributor_id: distributorId,
        brand_id: transformed.brand_id,
        category_id: transformed.category_id,
        subcategory_id: transformed.subcategory_id,
        department_id: transformed.department_id,
        measure: product.measure,
        measure_in: product.measure_in,
        packaging_type: product.packaging_type,
        de_display_name: product.display_name,
        de_name: product.name,
        de_packaging_type: product.packaging_type,
        de_preparation_type: product.preparation_type,
        de_combo_name: product.combo_name,
        de_buyer_name: product.buyer_name,
        repln_mode: product.repln_mode,
        store_uom: product.store_uom,
      });
    }

    return {
      brands,
      categories,
      subcategories,
      departments,
      packageTypes,
      formattedProduct,
      manufacturers,
      distributors,
    };
  }

  _transformProduct(product) {
    const productId = product.article_id;
    const brandId = product.brand;
    const categoryId = product.maincategory;
    const departmentId = product.department;
    const subcategoryId = product.subcategory;

    delete product.article_id;
    delete product.brand;
    delete product.maincategory;
    delete product.department;
    delete product.subcategory;

    product.product_id = productId;
    product.brand_id = brandId;
    product.category_id = categoryId;
    product.department_id = departmentId;
    product.subcategory_id = subcategoryId;
    product.variant_count = 0;

    return product;
  }

  isJSONObject(val) {
    return (
      (typeof val === "object" || typeof JSON.parse(val) === "object") &&
      val !== null &&
      !Array.isArray(val)
    );
  }

  _authenticateDigisme() {
    return new Promise(async (resolve, reject) => {
      const startTime = Date.now();
      const url = `${DIGISME_BASE_URL}/Authenticate`;
      const requestHeaders = {
        Authorization: DIGISME_API_KEY,
        customKey: DIGISME_CUSTOM_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      };

      try {
        const curlCommand = `curl -s --location --request GET '${url}' \
--header 'Authorization: ${DIGISME_API_KEY}' \
--header 'customKey: ${DIGISME_CUSTOM_KEY}' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'Cookie: ARRAffinity=9a42df7877699a1820bb3aff0e46053675d3b7c9cb3150938bf21e214337c56e; ARRAffinitySameSite=9a42df7877699a1820bb3aff0e46053675d3b7c9cb3150938bf21e214337c56e' \
--data-urlencode 'Grant_type=password'`;

        exec(curlCommand, async (error, stdout, stderr) => {
          if (error) {
            console.error(`Error executing curl: ${error.message}`);
            // Log the failed API call
            await logCurlCall(
              {
                apiType: "DIGISME",
                secondaryType: "AUTHENTICATE",
                url,
                method: "GET",
                startTime,
                statusCode: null,
                error: error,
                callerFunction: "_authenticateDigisme",
                callerFile: "services/synker.js",
                requestHeaders,
              },
              this.apiCallLogsUsecase
            );
            reject(error);
            return;
          }
          if (stderr) {
            console.error(`Curl stderr: ${stderr}`);
            // Log the failed API call
            await logCurlCall(
              {
                apiType: "DIGISME",
                secondaryType: "AUTHENTICATE",
                url,
                method: "GET",
                startTime,
                statusCode: null,
                error: new Error(stderr),
                callerFunction: "_authenticateDigisme",
                callerFile: "services/synker.js",
                requestHeaders,
              },
              this.apiCallLogsUsecase
            );
            reject(stderr);
            return;
          }

          console.log(`Curl stdout: ${stdout}`);

          if (!this.isJSONObject(stdout)) {
            await logCurlCall(
              {
                apiType: "DIGISME",
                secondaryType: "AUTHENTICATE",
                url,
                method: "GET",
                startTime,
                statusCode: null,
                error: new Error("Invalid response format"),
                callerFunction: "_authenticateDigisme",
                callerFile: "services/synker.js",
                requestHeaders,
              },
              this.apiCallLogsUsecase
            );

            reject(new Error("Invalid response format"));
            return;
          }

          // Log the successful API call
          await logCurlCall(
            {
              apiType: "DIGISME",
              secondaryType: "AUTHENTICATE",
              url,
              method: "GET",
              startTime,
              statusCode: 200,
              error: null,
              callerFunction: "_authenticateDigisme",
              callerFile: "services/synker.js",
              requestHeaders,
            },
            this.apiCallLogsUsecase
          );

          console.log(`Curl stdout: ${stdout}`);
          // Process the 'stdout' which contains the response from the curl command
          resolve(JSON.parse(stdout));
        });
      } catch (err) {
        // Log the failed API call
        await logCurlCall(
          {
            apiType: "DIGISME",
            secondaryType: "AUTHENTICATE",
            url,
            method: "GET",
            startTime,
            statusCode: null,
            error: err,
            callerFunction: "_authenticateDigisme",
            callerFile: "services/synker.js",
            requestHeaders,
          },
          this.apiCallLogsUsecase
        );
        logger.Log({
          level: logger.LEVEL.ERROR,
          component: "SERVICE.SYNKER",
          code: "SERVICE.SYNKER.DIGISME-AUTHENTICATE",
          description: err.toString(),
          category: "",
          ref: {},
        });
        reject(err);
      }
    });
  }

  _fetchDigismeEmployees() {
    return new Promise(async (resolve, reject) => {
      try {
        const str = encryptAES({
          CompanyId: "6",
          IsActive: "2",
        });
        const token = await this.getDigismeToken();

        const response = await this.digismeEmployeesClient({
          method: "GET",
          url: `${DIGISME_BASE_URL}/api/GetEmployeeDetails`,
          headers: {
            Authorization: `bearer ${token}`,
          },
          data: {
            str,
          },
          callerFunction: "_fetchDigismeEmployees",
        });
        if (response.status !== 200) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "SERVICE.SYNKER",
            code: "SERVICE.SYNKER.DIGISME-EMPLOYEES-FETCH",
            description: "Non-200 status received",
            category: "",
            ref: {},
          });
          reject();
          return;
        }
        resolve(response.data);
      } catch (err) {
        logger.Log({
          level: logger.LEVEL.ERROR,
          component: "SERVICE.SYNKER",
          code: "SERVICE.SYNKER.DIGISME-EMPLOYEES-FETCH",
          description: err.toString(),
          category: "",
          ref: {},
        });
        reject(err);
      }
    });
  }

  _fetchDigismeAttendance() {
    return new Promise(async (resolve, reject) => {
      try {
        const fromDate = moment().subtract(1, "day").format("DD/MM/YYYY");
        const toDate = moment().format("DD/MM/YYYY");

        const str = encryptAES({
          CompanyId: "6",
          fromDate,
          toDate,
        });

        const token = await this.getDigismeToken();

        const response = await this.digismeAttendanceClient({
          method: "GET",
          url: `${DIGISME_BASE_URL}/api/GetRawAttendance`,
          headers: {
            Authorization: `bearer ${token}`,
          },
          data: {
            str,
          },
          callerFunction: "_fetchDigismeAttendance",
        });
        if (response.status !== 200) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "SERVICE.SYNKER",
            code: "SERVICE.SYNKER.DIGISME-ATTENDANCE-FETCH",
            description: "Non-200 status received",
            category: "",
            ref: {},
          });
          reject();
          return;
        }
        resolve(response.data);
      } catch (err) {
        logger.Log({
          level: logger.LEVEL.ERROR,
          component: "SERVICE.SYNKER",
          code: "SERVICE.SYNKER.DIGISME-ATTENDANCE-FETCH",
          description: err.toString(),
          category: "",
          ref: {},
        });
        reject(err);
      }
    });
  }

  _fetchDigismeProcessedAttendance() {
    return new Promise(async (resolve, reject) => {
      try {
        const fromDate = moment().subtract(1, "day").format("DD/MM/YYYY");
        const toDate = moment().format("DD/MM/YYYY");

        const str = encryptAES({
          CompanyId: "6",
          fromDate,
          toDate,
        });

        const token = await this.getDigismeToken();

        const response = await this.digismeAttendanceClient({
          method: "GET",
          url: `${DIGISME_BASE_URL}/api/GetProcessedAttendance`,
          headers: {
            Authorization: `bearer ${token}`,
          },
          data: {
            str,
          },
          callerFunction: "_fetchDigismeProcessedAttendance",
        });
        if (response.status !== 200) {
          logger.Log({
            level: logger.LEVEL.ERROR,
            component: "SERVICE.SYNKER",
            code: "SERVICE.SYNKER.DIGISME-PROCESSED-ATTENDANCE-FETCH",
            description: "Non-200 status received",
            category: "",
            ref: {},
          });
          reject();
          return;
        }
        resolve(response.data);
      } catch (err) {
        logger.Log({
          level: logger.LEVEL.ERROR,
          component: "SERVICE.SYNKER",
          code: "SERVICE.SYNKER.DIGISME-PROCESSED-ATTENDANCE-FETCH",
          description: err.toString(),
          category: "",
          ref: {},
        });
        reject(err);
      }
    });
  }
}

module.exports = (
  productUsecase,
  cleaningPackingUsecase,
  employeesUsecase,
  departmentsUsecase,
  designationsUsecase,
  employeeSectionsUsecase,
  branchesUsecase,
  masterListUsecase,
  productStockPriceUsecase,
  apiCallLogsUsecase,
  employeeAttendanceUsecase,
  syncConfigRepo,
  stockHoldingReportUsecase
) => {
  return new Synker(
    productUsecase,
    cleaningPackingUsecase,
    employeesUsecase,
    departmentsUsecase,
    designationsUsecase,
    employeeSectionsUsecase,
    branchesUsecase,
    masterListUsecase,
    productStockPriceUsecase,
    apiCallLogsUsecase,
    employeeAttendanceUsecase,
    syncConfigRepo,
    stockHoldingReportUsecase
  );
};
