#!/usr/bin/env node
/**
 * Seed (or remove) A1 MART sample data through the backend REST API.
 *
 *   npm run seed:sample            # add sample data (skips if already added)
 *   npm run seed:sample -- --force # add another set even if present
 *   npm run seed:sample:clean      # remove what the last seed added
 *   npm run seed:sample -- --only=task,stockCircle   # add only some parts
 *
 * Environment:
 *   SEED_API_URL      backend URL (default: NEXT_PUBLIC_API_URL from .env.local, else http://localhost:8080)
 *   SEED_USERNAME     login phone number of an admin with access to all modules
 *   SEED_PASSWORD     that user's password
 *   SEED_TOKEN        alternatively, an existing x-access-token (skips login)
 *   SEED_SAMPLE_DATA  with --if-enabled, the script only runs when this is "true"
 *                     (use this in deploy pipelines so production never gets
 *                     sample rows unless you opt in explicitly)
 *
 * Created ids are stored in scripts/.sample-data-manifest.json so --clean can
 * delete exactly those records.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axios from "axios";
import {
  seedSampleData,
  cleanSampleData,
} from "../src/sampleData/seedSampleData.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(__dirname, ".sample-data-manifest.json");

const argv = process.argv.slice(2);
const args = new Set(argv);
const onlyArg = argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.slice(7).split(",").map((s) => s.trim()).filter(Boolean) : null;
const log = (msg) => console.log(msg);

function readEnvLocal() {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
      }
    }
  }
}

async function main() {
  readEnvLocal();

  if (args.has("--if-enabled") && process.env.SEED_SAMPLE_DATA !== "true") {
    log("SEED_SAMPLE_DATA is not 'true' — skipping sample data.");
    return;
  }

  const baseURL = (
    process.env.SEED_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080"
  ).replace(/\/+$/, "");

  const api = axios.create({
    baseURL,
    timeout: 120000,
    validateStatus: (s) => s >= 200 && s < 500,
  });

  let token = process.env.SEED_TOKEN;
  if (!token) {
    const { SEED_USERNAME, SEED_PASSWORD } = process.env;
    if (!SEED_USERNAME || !SEED_PASSWORD) {
      throw new Error(
        "Set SEED_USERNAME and SEED_PASSWORD (or SEED_TOKEN) for an admin account."
      );
    }
    const res = await api.post("/user/login", {
      username: SEED_USERNAME,
      password: SEED_PASSWORD,
    });
    const body = res.data || {};
    if (body.requires_2fa) {
      throw new Error("This account uses 2FA — use SEED_TOKEN or an account without 2FA.");
    }
    if (body.code !== 200 || !body.token) {
      throw new Error(`Login failed: ${body.msg || res.status}`);
    }
    token = body.token;
  }
  api.defaults.headers.common["x-access-token"] = token;
  log(`Backend: ${baseURL}`);

  if (args.has("--clean")) {
    if (!fs.existsSync(MANIFEST)) {
      log("No manifest found — nothing to clean.");
      return;
    }
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    const { failures } = await cleanSampleData(api, manifest, { log });
    if (!failures.length) fs.unlinkSync(MANIFEST);
    else {
      failures.forEach((f) => log(`  ! ${f}`));
      process.exitCode = 1;
    }
    return;
  }

  const result = await seedSampleData(api, { log, force: args.has("--force"), only });
  if (!result.skipped) {
    let merged = result.manifest;
    if (fs.existsSync(MANIFEST)) {
      const prev = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
      merged = { ...prev };
      for (const [k, ids] of Object.entries(result.manifest)) {
        merged[k] = [...new Set([...(prev[k] || []), ...ids])];
      }
    }
    fs.writeFileSync(MANIFEST, JSON.stringify(merged, null, 2));
    log(`Manifest saved: ${path.relative(ROOT, MANIFEST)}`);
  }
  if (result.failures.length) {
    result.failures.forEach((f) => log(`  ! ${f}`));
  }
}

main().catch((err) => {
  console.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
