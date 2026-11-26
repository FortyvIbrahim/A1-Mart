/**
 * Sample data runner for the backend.
 *
 * - Startup hook: server.js calls runOnStartup() after the HTTP server is
 *   listening. It only does anything when SEED_SAMPLE_DATA=true, and it is
 *   idempotent (skips when "[Sample]" data already exists), so every restart /
 *   deploy is safe.
 * - CLI: `npm run seed:sample` / `npm run seed:sample:clean`
 *   (needs the API to be running on PORT, default 8080).
 *
 * Records are created through this server's own REST API (full validation),
 * authenticated with a short-lived token signed by this server for an admin
 * user that has the `access_all_branches` permission (or SEED_ADMIN_USERNAME).
 * GoFrugal is never written to — products/stock are only read from the DB.
 */
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const jwt = require("../services/jwt");

const MANIFEST = path.join(__dirname, ".manifest.json");

function log(msg) {
  console.log(`[sample-data] ${msg}`);
}

function query(mysql, sql, params = []) {
  return new Promise((resolve, reject) => {
    mysql.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function findAdminUser(mysql) {
  const username = process.env.SEED_ADMIN_USERNAME;
  if (username) {
    const rows = await query(
      mysql,
      `SELECT u.user_id, u.employee_id, u.user_type, e.designation_id, e.branch_id
         FROM user u LEFT JOIN employees e ON e.employee_code = u.employee_id
        WHERE u.username = ? LIMIT 1`,
      [username]
    );
    if (rows[0]) return rows[0];
    throw new Error(`SEED_ADMIN_USERNAME "${username}" not found`);
  }
  const rows = await query(
    mysql,
    `SELECT u.user_id, u.employee_id, u.user_type, e.designation_id, e.branch_id
       FROM user u
       JOIN employees e ON e.employee_code = u.employee_id
       JOIN permissions p ON p.designation_id = e.designation_id
                         AND p.permission_key = 'access_all_branches'
      ORDER BY u.user_id LIMIT 1`
  );
  if (!rows[0]) {
    throw new Error(
      "No admin user with access_all_branches found — set SEED_ADMIN_USERNAME"
    );
  }
  return rows[0];
}

async function makeApi(mysql) {
  const admin = await findAdminUser(mysql);
  const token = await jwt.sign(
    {
      user_id: admin.user_id,
      employee_id: admin.employee_id,
      user_type: admin.user_type,
      designation_id: admin.designation_id,
      branch_id: admin.branch_id,
    },
    "15m"
  );
  const port = process.env.PORT || 8080;
  const api = axios.create({
    baseURL: process.env.SEED_API_URL || `http://127.0.0.1:${port}`,
    timeout: 180000,
    validateStatus: (s) => s >= 200 && s < 500,
    headers: { "x-access-token": token },
  });
  return { api, admin };
}

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  } catch {
    return {};
  }
}

function saveManifest(added) {
  const prev = readManifest();
  const merged = { ...prev };
  for (const [k, ids] of Object.entries(added || {})) {
    merged[k] = [...new Set([...(prev[k] || []), ...ids])];
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(merged, null, 2));
}

async function seed(mysql, { force = false, only = null } = {}) {
  const { seedSampleData } = await import("./seedSampleData.mjs");
  const { api, admin } = await makeApi(mysql);
  log(`Seeding as ${admin.employee_id} ...`);
  const result = await seedSampleData(api, { log, force, only });
  if (!result.skipped) saveManifest(result.manifest);
  result.failures.forEach((f) => log(`  ! ${f}`));
  return result;
}

async function clean(mysql) {
  const { cleanSampleData } = await import("./seedSampleData.mjs");
  const manifest = readManifest();
  if (!Object.keys(manifest).length) {
    log("No manifest — nothing to clean.");
    return { failures: [] };
  }
  const { api } = await makeApi(mysql);
  const res = await cleanSampleData(api, manifest, { log });
  if (!res.failures.length) fs.unlinkSync(MANIFEST);
  res.failures.forEach((f) => log(`  ! ${f}`));
  return res;
}

/** Called by server.js once the HTTP server is listening. Never throws. */
function runOnStartup(mysql) {
  if (process.env.SEED_SAMPLE_DATA !== "true") return;
  // Give routes/crons a moment to finish booting.
  setTimeout(() => {
    seed(mysql).catch((err) => log(`Startup seed failed: ${err.message}`));
  }, 5000);
}

module.exports = { seed, clean, runOnStartup };
