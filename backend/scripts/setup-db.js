#!/usr/bin/env node
/**
 * Automated Database Setup & Seeder Script
 *
 * Usage:
 *   npm run db:setup
 *   ADMIN_USERNAME=myadmin ADMIN_PASSWORD=mypass npm run db:setup
 *   npm run db:setup -- --sample    (also runs sample data seeder)
 *
 * What it does:
 *   1. Reads config.json for the active environment (NODE_ENV or "development").
 *   2. Creates database if not exists.
 *   3. Synchronizes migrations/mysql/database.json.
 *   4. Pre-creates designation 16 (Admin) so migrations with foreign keys succeed.
 *   5. Runs all db-migrate migrations up to date.
 *   6. Seeds / updates the Super Admin user, employee, designation, and all 170+ permissions.
 *   7. Seeds essential base materials (stickers).
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const mysql = require("mysql");

const env = process.env.NODE_ENV || "development";
const rootDir = path.resolve(__dirname, "..");
const configPath = path.join(rootDir, "config.json");

// DB settings: DB_* env vars (e.g. from .env) win over config.json, so a fresh
// server needs only .env.
const config = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, "utf8"))
  : { db: { mysql: {} } };
config.db = config.db || {};
config.db.mysql = config.db.mysql || {};
const fileDb = config.db.mysql[env] || {};
const dbConfig = {
  host: process.env.DB_HOST || fileDb.host || "localhost",
  port: Number(process.env.DB_PORT || fileDb.port || 3306),
  username: process.env.DB_USER || fileDb.username,
  password: process.env.DB_PASSWORD ?? fileDb.password ?? "",
  database: process.env.DB_NAME || fileDb.database,
};
config.db.mysql[env] = dbConfig;

if (!dbConfig.username || !dbConfig.database) {
  console.error(
    `[setup-db] Error: set DB_USER and DB_NAME (backend .env) or provide config.json for "${env}".`
  );
  process.exit(1);
}

const adminUsername = process.env.ADMIN_USERNAME || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "admin@123";

// All core system permissions
const ALL_PERMISSIONS = [
  "access_all_branches",
  "add_accounts_sheet",
  "add_account_assets",
  "add_billing_checker_incentive",
  "add_billing_counter",
  "add_billing_operator_incentive",
  "add_branches",
  "add_checklist_form",
  "add_circle",
  "add_dead_stock_report",
  "add_designations",
  "add_eb_consumption",
  "add_employees",
  "add_employee_allocation",
  "add_grn",
  "add_grn_incentive",
  "add_incentive_generator",
  "add_ledgers",
  "add_master_list",
  "add_materials",
  "add_materials_category",
  "add_materials_request",
  "add_money_transfer",
  "add_outstanding_report",
  "add_payments",
  "add_payroll_entry",
  "add_pick_and_pack_incentive",
  "add_po",
  "add_products",
  "add_purchase_acknowledgment",
  "add_purchase_data_entry_incentive",
  "add_purchase_entry",
  "add_purchase_incentive",
  "add_purchase_order",
  "add_purchase_reorders",
  "add_purchase_return_distibutor_issue",
  "add_purchase_return_issue_entry",
  "add_purchase_return_receipt_entry",
  "add_receipts",
  "add_repack_entry_sheet",
  "add_repack_items",
  "add_sales_incentive",
  "add_sales_report",
  "add_sales_target",
  "add_stickering",
  "add_stickering_incentive",
  "add_stock_addition",
  "add_stock_checker",
  "add_stock_holding_report",
  "add_target_branch",
  "add_target_department",
  "add_target_employee",
  "add_target_section",
  "add_tasks",
  "add_transport",
  "add_wms_purchase_entry",
  "allow_mfa_toggle",
  "allow_product_sync_config",
  "delete_accounts_sheet",
  "delete_billing_counter",
  "delete_checklist_form",
  "delete_circle",
  "delete_dead_stock_report",
  "delete_designations",
  "delete_eb_consumption",
  "delete_incentive_generator",
  "delete_materials",
  "delete_materials_category",
  "delete_materials_request",
  "delete_money_transfer",
  "delete_outstanding_report",
  "delete_po",
  "delete_repack_items",
  "delete_sales_report",
  "delete_sales_target",
  "delete_stock_checker",
  "delete_stock_holding_report",
  "delete_target_branch",
  "delete_target_department",
  "delete_target_employee",
  "delete_target_section",
  "delete_transport",
  "delete_wms_purchase_entry",
  "fill_checklist",
  "import_product_images",
  "import_transports",
  "load_performance_entry",
  "mark_payroll_on_hold",
  "sync_attendance",
  "sync_products",
  "update_purchase_order_status",
  "view_accounts_sheet",
  "view_account_assets",
  "view_attendance_dashboard",
  "view_billing_checker_incentive",
  "view_billing_counter",
  "view_billing_operator_incentive",
  "view_branches",
  "view_cashbook",
  "view_checklist_dashboard",
  "view_checklist_form",
  "view_checklist_response",
  "view_circle",
  "view_circle_dashboard",
  "view_cleaning_packing",
  "view_dashboard",
  "view_dead_stock_report",
  "view_designations",
  "view_eb_consumption",
  "view_employees",
  "view_employee_allocation",
  "view_employee_dashboard",
  "view_grn",
  "view_grn_incentive",
  "view_incentive_approvals",
  "view_incentive_generator",
  "view_items",
  "view_ledgers",
  "view_logs_list",
  "view_master_list",
  "view_materials",
  "view_materials_category",
  "view_materials_report",
  "view_materials_request",
  "view_money_transfer",
  "view_my_payslips",
  "view_my_repack_entry_sheet",
  "view_my_stickering",
  "view_my_tasks",
  "view_outstanding_dashboard",
  "view_outstanding_report",
  "view_payments",
  "view_payroll_approvals",
  "view_payroll_bank_submission",
  "view_payroll_dashboard",
  "view_payroll_entry",
  "view_payslips",
  "view_picking_list",
  "view_pick_and_pack_incentive",
  "view_po",
  "view_price_checker",
  "view_products",
  "view_purchase_acknowledgment",
  "view_purchase_data_entry_incentive",
  "view_purchase_entry",
  "view_purchase_incentive",
  "view_purchase_order",
  "view_purchase_reorders",
  "view_purchase_return_distibutor_issue",
  "view_purchase_return_issue_entry",
  "view_purchase_return_receipt_entry",
  "view_purchase_return_stock_details",
  "view_receipts",
  "view_repack_entry_sheet",
  "view_sales_incentive",
  "view_sales_report",
  "view_sales_target",
  "view_stickering",
  "view_stickering_incentive",
  "view_stock_addition",
  "view_stock_checker",
  "view_stock_dashboard",
  "view_stock_holding_dashboard",
  "view_stock_holding_report",
  "view_target_branch",
  "view_target_department",
  "view_target_employee",
  "view_target_section",
  "view_target_stats",
  "view_tasks",
  "view_transports",
  "view_wms_dashboard",
  "view_wms_purchase_entry",
];

function query(conn, sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.query(sql, params, (err, res) => (err ? reject(err) : resolve(res)));
  });
}

async function main() {
  console.log(`[setup-db] Initializing database for environment: ${env}...`);

  // 1. Ensure database exists
  const serverConn = mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.username,
    password: dbConfig.password,
  });

  await new Promise((resolve, reject) => {
    serverConn.connect((err) => (err ? reject(err) : resolve()));
  });

  await query(serverConn, `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
  serverConn.end();
  console.log(`[setup-db] Database "${dbConfig.database}" verified.`);

  // 2. Synchronize migrations/mysql/database.json
  const migrationDbJsonPath = path.join(rootDir, "migrations", "mysql", "database.json");
  const migrationConfig = {
    development: {
      host: config.db.mysql.development?.host || "localhost",
      port: config.db.mysql.development?.port || 3306,
      user: config.db.mysql.development?.username || "root",
      password: config.db.mysql.development?.password || "",
      database: config.db.mysql.development?.database || "Bus",
      driver: "mysql",
      multipleStatements: true,
    },
    production: {
      host: config.db.mysql.production?.host || "localhost",
      port: config.db.mysql.production?.port || 3306,
      user: config.db.mysql.production?.username || "root",
      password: config.db.mysql.production?.password || "",
      database: config.db.mysql.production?.database || "Bus",
      driver: "mysql",
      multipleStatements: true,
    },
  };
  fs.writeFileSync(migrationDbJsonPath, JSON.stringify(migrationConfig, null, 2));

  // 3. Connect to target DB and check if designations table exists
  const db = mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
  });

  await new Promise((resolve, reject) => {
    db.connect((err) => (err ? reject(err) : resolve()));
  });

  // If designations exists, ensure designation 16 is present before running migrations
  const tables = await query(db, "SHOW TABLES LIKE 'designations'");
  if (tables.length > 0) {
    await query(
      db,
      `INSERT INTO designations (designation_id, designation_code, designation_name, is_active, requires_2fa)
       VALUES (16, 'ADMIN', 'Admin', 1, 0)
       ON DUPLICATE KEY UPDATE designation_name = 'Admin', requires_2fa = 0`
    );
  }

  // 4. Run migrations
  console.log("[setup-db] Running pending database migrations...");
  const nestedMysql = path.join(rootDir, "node_modules", "db-migrate-mysql", "node_modules", "mysql");
  if (fs.existsSync(nestedMysql)) {
    fs.rmSync(nestedMysql, { recursive: true, force: true });
  }
  try {
    execSync("npx db-migrate up -e " + env, {
      cwd: path.join(rootDir, "migrations", "mysql"),
      stdio: "inherit",
    });
  } catch (migErr) {
    console.error("[setup-db] Migration command returned an error:", migErr.message);
  }

  // 5. Seed / Ensure Admin Designation (ID: 16)
  await query(
    db,
    `INSERT INTO designations (designation_id, designation_code, designation_name, is_active, requires_2fa)
     VALUES (16, 'ADMIN', 'Admin', 1, 0)
     ON DUPLICATE KEY UPDATE designation_name = 'Admin', requires_2fa = 0`
  );

  // 6. Seed all permissions for designation 16
  const permissionValues = ALL_PERMISSIONS.map((perm) => [perm, 16]);
  await query(
    db,
    `INSERT IGNORE INTO permissions (permission_key, designation_id) VALUES ?`,
    [permissionValues]
  );
  console.log(`[setup-db] Verified ${ALL_PERMISSIONS.length} permissions for Admin designation.`);

  // 7. Seed Admin Employee
  await query(
    db,
    `INSERT INTO employees (employee_code, employee_name, designation_id, gender, mobile_number, \`terminated\`)
     VALUES ('ADMIN-001', 'Super Admin', 16, 'M', 9999999999, 0)
     ON DUPLICATE KEY UPDATE designation_id = 16, employee_name = 'Super Admin'`
  );

  // 8. Seed Super Admin User (idempotent, avoids duplicates)
  const existingUsers = await query(db, "SELECT user_id FROM user WHERE username = ?", [adminUsername]);
  if (existingUsers.length > 0) {
    const keepId = existingUsers[0].user_id;
    await query(
      db,
      `UPDATE user 
       SET password = SHA1(?), employee_id = 'ADMIN-001', user_type = 1, status = 1 
       WHERE user_id = ?`,
      [adminPassword, keepId]
    );
    if (existingUsers.length > 1) {
      await query(db, "DELETE FROM user WHERE username = ? AND user_id != ?", [adminUsername, keepId]);
    }
  } else {
    await query(
      db,
      `INSERT INTO user (username, password, employee_id, user_type, totp_enabled, status)
       VALUES (?, SHA1(?), 'ADMIN-001', 1, 0, 1)`,
      [adminUsername, adminPassword]
    );
  }
  console.log(`[setup-db] Super Admin user ready: username="${adminUsername}", password="${adminPassword}".`);

  // 9. Seed Base Materials (Stickers) if not already present
  await query(
    db,
    `INSERT INTO materials (material_id, name, description, is_active)
     VALUES 
       (1, 'Barcode Sticker', 'Standard Barcode Sticker 50x25mm', 1),
       (2, 'MRP Price Sticker', 'Price Tag Sticker 38x25mm', 1)
     ON DUPLICATE KEY UPDATE name = VALUES(name)`
  );
  console.log("[setup-db] Base sticker materials verified.");

  db.end();

  // 10. Optional: Seed sample demo data if requested (--sample)
  if (process.argv.includes("--sample") || process.env.SEED_SAMPLE_DATA === "true") {
    console.log("[setup-db] Seeding sample data...");
    try {
      execSync("node scripts/seed-sample-data.js", {
        cwd: rootDir,
        stdio: "inherit",
      });
    } catch (sampleErr) {
      console.warn("[setup-db] Note: sample data seeder requires running server on PORT 8080.");
    }
  }

  console.log("\n=======================================================");
  console.log(" [setup-db] SUCCESS: Database is fully initialized!    ");
  console.log(" Admin Login:                                          ");
  console.log(`   Username: ${adminUsername}                          `);
  console.log(`   Password: ${adminPassword}                          `);
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("[setup-db] Fatal error:", err);
  process.exit(1);
});
