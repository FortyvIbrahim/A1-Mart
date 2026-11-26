#!/usr/bin/env node
/**
 * One-time import: CSV (SUPPLIER, BUYER) -> master_list_buyers
 *
 * Resolves SUPPLIER -> master_list.master_id (by name, case-insensitive; person_type = 1)
 * Creates missing suppliers in master_list (person_type = 1), then links buyers
 * Resolves BUYER -> employees.employee_code (by employee_name or employee_code, case-insensitive)
 *
 * Writes a SQL file and runs against the DB. Per supplier (master_id), existing
 * buyers are deleted before inserting the buyers from the CSV.
 *
 * Usage:
 *   node scripts/import-master-list-buyers-from-csv.js --csv ./buyers.csv
 *   node scripts/import-master-list-buyers-from-csv.js --csv ./buyers.csv --output ./out.sql --env development
 *   node scripts/import-master-list-buyers-from-csv.js --csv ./buyers.csv --sql-only
 *
 * When names cannot be resolved, writes an Excel workbook with two sheets:
 *   Suppliers — unmapped supplier names
 *   Buyers    — unmapped buyer names
 */

const fs = require("fs");
const path = require("path");
const mysql = require("mysql");
const XLSX = require("xlsx");
const config = require("../config.json");

const SUPPLIER_PERSON_TYPE = 1;
const CHUNK_SIZE = 500;

function parseArgs(argv) {
  const args = {
    csv: null,
    output: null,
    unmappedOutput: null,
    env: process.env.NODE_ENV || "development",
    sqlOnly: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--sql-only") {
      args.sqlOnly = true;
    } else if (arg === "--csv" && argv[i + 1]) {
      args.csv = argv[++i];
    } else if (arg === "--output" && argv[i + 1]) {
      args.output = argv[++i];
    } else if (arg === "--unmapped-output" && argv[i + 1]) {
      args.unmappedOutput = argv[++i];
    } else if (arg === "--env" && argv[i + 1]) {
      args.env = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  if (!args.csv) {
    console.error("Missing required --csv <path>");
    printHelp();
    process.exit(1);
  }

  const csvDir = path.dirname(path.resolve(args.csv));
  const base = path.basename(args.csv, path.extname(args.csv));

  if (!args.output) {
    args.output = path.join(csvDir, `${base}-master-list-buyers-upsert.sql`);
  }
  if (!args.unmappedOutput) {
    args.unmappedOutput = path.join(csvDir, `${base}-unmapped.xlsx`);
  }

  return args;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/import-master-list-buyers-from-csv.js --csv <file.csv> [options]

Options:
  --csv <path>       Input CSV with columns SUPPLIER and BUYER (required)
  --output <path>    Output SQL file (default: <csv-dir>/<csv-base>-master-list-buyers-upsert.sql)
  --unmapped-output <path>  Excel file for unmapped names (default: <csv-dir>/<csv-base>-unmapped.xlsx)
  --env <name>       config.json db key: development | production (default: NODE_ENV or development)
  --sql-only         Write SQL file only; do not run inserts
  --help, -h         Show this help
`);
}

/** Trim, collapse spaces, strip trailing punctuation; compare case-insensitively in JS. */
function normalizeKey(value) {
  return String(value ?? "")
    .replace(/\u00A0/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[,.;]+$/g, "")
    .toLocaleLowerCase("en-US");
}

function trimName(value) {
  return String(value ?? "")
    .replace(/\u00A0/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[,.;]+$/g, "");
}

/** CSV buyer labels that are not employee names; map to employee_code. */
const BUYER_ALIAS_TO_EMPLOYEE_CODE = {
  ASSET: "A1-160",
  "BALU-SRIDHAR": "A1-513",
  FAHATH: "A1-420",
  RAMKUMAR: "A1-006",
  "VIJAY-K": "A1-254",
  "YUSUF-J": "A1-359",
  TRANSPORT: "A1-160",
  "PRAKASH-M": "A1-326",
  Unknown: "A1-003",
};

const buyerAliasByKey = new Map(
  Object.entries(BUYER_ALIAS_TO_EMPLOYEE_CODE).map(([name, code]) => [
    normalizeKey(name),
    code,
  ])
);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || (c === "\r" && next === "\n")) {
      row.push(field);
      field = "";
      if (row.some((cell) => String(cell).trim() !== "")) {
        rows.push(row);
      }
      row = [];
      if (c === "\r") i++;
    } else if (c !== "\r") {
      field += c;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => String(cell).trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function loadCsvRows(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8");
  const table = parseCsv(raw);
  if (table.length === 0) {
    throw new Error("CSV is empty");
  }

  const header = table[0].map((h) => normalizeKey(h));
  const supplierIdx = header.indexOf("supplier");
  const buyerIdx = header.indexOf("buyer");

  if (supplierIdx === -1 || buyerIdx === -1) {
    throw new Error(
      `CSV must include SUPPLIER and BUYER columns. Found: ${table[0].join(
        ", "
      )}`
    );
  }

  const pairs = [];
  for (let i = 1; i < table.length; i++) {
    const line = table[i];
    const supplier = String(line[supplierIdx] ?? "").trim();
    const buyer = String(line[buyerIdx] ?? "").trim();
    if (!supplier && !buyer) continue;
    pairs.push({ line: i + 1, supplier, buyer });
  }

  return pairs;
}

function sqlEscapeString(value) {
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function trackUnmapped(map, name, reason) {
  const key = normalizeKey(name);
  if (!key) return;
  const displayName = trimName(name) || String(name).trim();
  if (!map.has(key)) {
    map.set(key, { name: displayName, reason });
  }
}

function unmappedMapToRows(map) {
  return [...map.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))
    .map((entry) => [entry.name, entry.reason]);
}

function writeUnmappedWorkbook(filePath, unmappedSuppliers, unmappedBuyers) {
  const wb = XLSX.utils.book_new();

  const supplierSheet = XLSX.utils.aoa_to_sheet([
    ["supplier_name", "reason"],
    ...unmappedMapToRows(unmappedSuppliers),
  ]);
  const buyerSheet = XLSX.utils.aoa_to_sheet([
    ["buyer_name", "reason"],
    ...unmappedMapToRows(unmappedBuyers),
  ]);

  XLSX.utils.book_append_sheet(wb, supplierSheet, "Suppliers");
  XLSX.utils.book_append_sheet(wb, buyerSheet, "Buyers");
  XLSX.writeFile(wb, filePath);
}

function groupBuyersByMasterId(rows) {
  const byMaster = new Map();
  for (const row of rows) {
    const master_id = Number(row.master_id);
    if (Number.isNaN(master_id)) continue;
    if (!byMaster.has(master_id)) {
      byMaster.set(master_id, new Set());
    }
    byMaster.get(master_id).add(String(row.employee_id));
  }
  return byMaster;
}

function buildBuyerInsertSql(masterIdExpr, employeeIds) {
  const lines = [];
  const ids = [...employeeIds];
  if (ids.length === 0) return lines;

  lines.push(
    `DELETE FROM \`master_list_buyers\` WHERE \`master_id\` = ${masterIdExpr};`
  );
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const values = chunk
      .map((employee_id) => `(${masterIdExpr}, ${sqlEscapeString(employee_id)})`)
      .join(",\n  ");
    lines.push(
      "INSERT INTO `master_list_buyers` (`master_id`, `employee_id`) VALUES",
      `  ${values};`,
      ""
    );
  }
  return lines;
}

function buildUpsertSql(rows, pendingNewSuppliers) {
  if (rows.length === 0 && pendingNewSuppliers.size === 0) {
    return "-- No rows to upsert\n";
  }

  const byMaster = groupBuyersByMasterId(rows.filter((r) => r.master_id != null));
  const lines = [
    "-- Generated by scripts/import-master-list-buyers-from-csv.js",
    `-- Existing supplier count: ${byMaster.size}`,
    `-- New supplier count: ${pendingNewSuppliers.size}`,
    `-- Buyer link count: ${rows.length}`,
    "-- Replaces buyers per supplier: DELETE existing, then INSERT from CSV",
    "",
  ];

  for (const [, group] of pendingNewSuppliers) {
    const name = sqlEscapeString(group.name);
    lines.push(
      `INSERT INTO \`master_list\` (\`name\`, \`person_type\`, \`status\`) VALUES (${name}, ${SUPPLIER_PERSON_TYPE}, TRUE);`
    );
    lines.push(...buildBuyerInsertSql("LAST_INSERT_ID()", group.employeeIds));
  }

  for (const [master_id, employeeIds] of byMaster) {
    lines.push(...buildBuyerInsertSql(master_id, employeeIds));
  }

  return lines.join("\n");
}

function createDb(env) {
  const dbConfig = config.db?.mysql?.[env];
  if (!dbConfig) {
    throw new Error(`No MySQL config for env "${env}" in config.json`);
  }

  return mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    supportBigNumbers: true,
    bigNumberStrings: true,
  });
}

function queryAsync(connection, sql, params) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function beginTransaction(connection) {
  return new Promise((resolve, reject) => {
    connection.beginTransaction((err) => (err ? reject(err) : resolve()));
  });
}

function commitTransaction(connection) {
  return new Promise((resolve, reject) => {
    connection.commit((err) => (err ? reject(err) : resolve()));
  });
}

function rollbackTransaction(connection) {
  return new Promise((resolve, reject) => {
    connection.rollback((err) => (err ? reject(err) : resolve()));
  });
}

function buildSupplierByNameIndex(rows) {
  return indexByNormalizedName(rows, (r) => r.name, (r) => r.master_id);
}

function findSupplierIdByNormalizedName(key, supplierRows, supplierByName) {
  for (const row of supplierRows) {
    if (normalizeKey(row.name) !== key) continue;
    supplierByName.set(key, row.master_id);
    return row.master_id;
  }
  return null;
}

async function lookupSupplierIdInDb(
  connection,
  trimmed,
  key,
  supplierByName,
  supplierRows
) {
  const rows = await queryAsync(
    connection,
    `SELECT master_id
     FROM master_list
     WHERE person_type = ?
       AND TRIM(name) COLLATE utf8mb4_unicode_ci = ?
     LIMIT 1`,
    [SUPPLIER_PERSON_TYPE, trimmed]
  );
  let master_id = rows[0]?.master_id ?? null;
  if (master_id == null) {
    master_id = findSupplierIdByNormalizedName(key, supplierRows, supplierByName);
  } else {
    supplierByName.set(key, master_id);
  }
  return master_id;
}

async function createSupplier(connection, trimmed, key, supplierByName, sqlCache) {
  const result = await queryAsync(
    connection,
    `INSERT INTO master_list (name, person_type, status) VALUES (?, ?, TRUE)`,
    [trimmed, SUPPLIER_PERSON_TYPE]
  );
  const master_id = result.insertId;
  supplierByName.set(key, master_id);
  sqlCache.set(key, master_id);
  return master_id;
}

async function ensureSupplierId(
  connection,
  name,
  supplierByName,
  supplierRows,
  sqlCache,
  { persistToDb }
) {
  const trimmed = trimName(name);
  const key = normalizeKey(trimmed);
  if (!key) return { master_id: null, created: false, key: null, trimmed };

  if (supplierByName.has(key)) {
    return {
      master_id: supplierByName.get(key),
      created: false,
      key,
      trimmed,
    };
  }
  if (sqlCache.has(key)) {
    const cached = sqlCache.get(key);
    if (cached != null) {
      return { master_id: cached, created: false, key, trimmed };
    }
    if (!persistToDb) {
      return { master_id: null, created: false, pending: true, key, trimmed };
    }
  }

  let master_id = await lookupSupplierIdInDb(
    connection,
    trimmed,
    key,
    supplierByName,
    supplierRows
  );
  if (master_id != null) {
    sqlCache.set(key, master_id);
    return { master_id, created: false, key, trimmed };
  }

  if (persistToDb) {
    master_id = await createSupplier(
      connection,
      trimmed,
      key,
      supplierByName,
      sqlCache
    );
    return { master_id, created: true, key, trimmed };
  }

  sqlCache.set(key, null);
  return { master_id: null, created: false, pending: true, key, trimmed };
}

async function lookupEmployeeCode(
  connection,
  buyer,
  employeeByCode,
  employeeByName,
  sqlCache
) {
  const trimmed = trimName(buyer);
  const key = normalizeKey(trimmed);
  if (!key) return null;

  const aliasCode = buyerAliasByKey.get(key);
  if (aliasCode) {
    sqlCache.set(key, aliasCode);
    return aliasCode;
  }

  const fromMap = employeeByCode.get(key) || employeeByName.get(key);
  if (fromMap) return fromMap;

  if (sqlCache.has(key)) {
    return sqlCache.get(key);
  }

  const rows = await queryAsync(
    connection,
    `SELECT employee_code
     FROM employees
     WHERE TRIM(employee_code) COLLATE utf8mb4_unicode_ci = ?
        OR TRIM(employee_name) COLLATE utf8mb4_unicode_ci = ?
     LIMIT 1`,
    [trimmed, trimmed]
  );
  const employee_id = rows[0]?.employee_code
    ? String(rows[0].employee_code).trim()
    : null;
  sqlCache.set(key, employee_id);
  if (employee_id) {
    employeeByCode.set(key, employee_id);
    employeeByName.set(key, employee_id);
  }
  return employee_id;
}

function indexByNormalizedName(rows, getName, getId) {
  const map = new Map();
  for (const row of rows) {
    const key = normalizeKey(getName(row));
    if (!key || map.has(key)) continue;
    map.set(key, getId(row));
  }
  return map;
}

async function loadLookups(connection) {
  const suppliers = await queryAsync(
    connection,
    `SELECT master_id, name
     FROM master_list
     WHERE person_type = ?`,
    [SUPPLIER_PERSON_TYPE]
  );

  const supplierByName = buildSupplierByNameIndex(suppliers);

  const employees = await queryAsync(
    connection,
    `SELECT employee_code, employee_name FROM employees`
  );

  const employeeByCode = indexByNormalizedName(
    employees,
    (r) => r.employee_code,
    (r) => String(r.employee_code ?? "").trim()
  );

  const employeeByName = indexByNormalizedName(
    employees,
    (r) => r.employee_name,
    (r) => String(r.employee_code ?? "").trim()
  );

  return { supplierByName, supplierRows: suppliers, employeeByName, employeeByCode };
}

async function resolveRows(connection, pairs, lookups, options = {}) {
  const { persistToDb = true } = options;
  const { supplierByName, supplierRows, employeeByName, employeeByCode } = lookups;
  const supplierSqlCache = new Map();
  const employeeSqlCache = new Map();
  const pendingNewSuppliers = new Map();
  const resolved = [];
  const errors = [];
  const unmappedSuppliers = new Map();
  const unmappedBuyers = new Map();
  const seen = new Set();
  let suppliersCreated = 0;

  for (const { line, supplier, buyer } of pairs) {
    if (!supplier) {
      const reason = "Missing SUPPLIER";
      errors.push({ line, supplier, buyer, reason });
      trackUnmapped(unmappedSuppliers, supplier || "(empty)", reason);
      continue;
    }
    if (!buyer) {
      const reason = "Missing BUYER";
      errors.push({ line, supplier, buyer, reason });
      trackUnmapped(unmappedBuyers, buyer || "(empty)", reason);
      continue;
    }

    const supplierResult = await ensureSupplierId(
      connection,
      supplier,
      supplierByName,
      supplierRows,
      supplierSqlCache,
      { persistToDb }
    );
    if (supplierResult.created) {
      suppliersCreated += 1;
    }

    const employee_id = await lookupEmployeeCode(
      connection,
      buyer,
      employeeByCode,
      employeeByName,
      employeeSqlCache
    );
    const buyerReason = "Buyer not found in employees (by code or name)";
    if (!employee_id) {
      errors.push({ line, supplier, buyer, reason: buyerReason });
      trackUnmapped(unmappedBuyers, buyer, buyerReason);
      continue;
    }

    let master_id = supplierResult.master_id;

    if (master_id == null && supplierResult.pending) {
      if (!pendingNewSuppliers.has(supplierResult.key)) {
        pendingNewSuppliers.set(supplierResult.key, {
          name: supplierResult.trimmed,
          employeeIds: new Set(),
        });
      }
      pendingNewSuppliers.get(supplierResult.key).employeeIds.add(employee_id);
      resolved.push({
        line,
        supplier,
        buyer,
        master_id: null,
        employee_id: String(employee_id),
        supplierKey: supplierResult.key,
      });
      continue;
    }

    if (master_id == null) {
      const reason = "Could not resolve or create supplier";
      errors.push({ line, supplier, buyer, reason });
      trackUnmapped(unmappedSuppliers, supplier, reason);
      continue;
    }

    const dedupeKey = `${master_id}\0${employee_id}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    resolved.push({
      line,
      supplier,
      buyer,
      master_id: Number(master_id),
      employee_id: String(employee_id),
    });
  }

  return {
    resolved,
    errors,
    unmappedSuppliers,
    unmappedBuyers,
    pendingNewSuppliers,
    suppliersCreated,
  };
}

async function runInserts(connection, rows) {
  const byMaster = groupBuyersByMasterId(rows);
  let suppliersSynced = 0;
  let buyersInserted = 0;

  await beginTransaction(connection);
  try {
    for (const [master_id, employeeIds] of byMaster) {
      await queryAsync(
        connection,
        `DELETE FROM master_list_buyers WHERE master_id = ?`,
        [master_id]
      );

      const ids = [...employeeIds];
      if (ids.length > 0) {
        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
          const chunk = ids.slice(i, i + CHUNK_SIZE);
          const valueRows = chunk.map((employee_id) => [
            master_id,
            employee_id,
          ]);
          const result = await queryAsync(
            connection,
            `INSERT INTO master_list_buyers (master_id, employee_id) VALUES ?`,
            [valueRows]
          );
          buyersInserted += result.affectedRows || 0;
        }
      }
      suppliersSynced += 1;
    }
    await commitTransaction(connection);
  } catch (err) {
    await rollbackTransaction(connection);
    throw err;
  }

  return { suppliersSynced, buyersInserted };
}

async function main() {
  const args = parseArgs(process.argv);
  const csvPath = path.resolve(args.csv);

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  const pairs = loadCsvRows(csvPath);
  console.log(`Read ${pairs.length} CSV row(s) from ${csvPath}`);

  const connection = createDb(args.env);
  await queryAsync(connection, "SELECT 1");

  try {
    const lookups = await loadLookups(connection);
    const persistToDb = !args.sqlOnly;
    const {
      resolved,
      errors,
      unmappedSuppliers,
      unmappedBuyers,
      pendingNewSuppliers,
      suppliersCreated,
    } = await resolveRows(connection, pairs, lookups, { persistToDb });

    if (suppliersCreated > 0) {
      console.log(
        `Created ${suppliersCreated} new supplier(s) in master_list (person_type=${SUPPLIER_PERSON_TYPE})`
      );
    }

    if (unmappedSuppliers.size > 0 || unmappedBuyers.size > 0) {
      writeUnmappedWorkbook(
        args.unmappedOutput,
        unmappedSuppliers,
        unmappedBuyers
      );
      console.log(
        `Wrote unmapped names to ${args.unmappedOutput} ` +
          `(Suppliers: ${unmappedSuppliers.size}, Buyers: ${unmappedBuyers.size})`
      );
    }

    if (errors.length > 0) {
      console.error(`\n${errors.length} row(s) could not be resolved:`);
      for (const e of errors) {
        console.error(
          `  line ${e.line}: SUPPLIER="${e.supplier}" BUYER="${e.buyer}" — ${e.reason}`
        );
      }
    }

    if (resolved.length === 0 && pendingNewSuppliers.size === 0) {
      console.error("\nNo rows resolved. SQL file not written.");
      process.exit(1);
    }

    const sql = buildUpsertSql(resolved, pendingNewSuppliers);
    fs.writeFileSync(args.output, sql, "utf8");
    const supplierCount =
      groupBuyersByMasterId(resolved.filter((r) => r.master_id != null)).size +
      pendingNewSuppliers.size;
    console.log(
      `Wrote SQL for ${supplierCount} supplier(s), ${resolved.length} buyer link(s) to ${args.output}`
    );

    if (args.sqlOnly) {
      console.log("--sql-only: skipped database insert");
    } else {
      const { suppliersSynced, buyersInserted } = await runInserts(
        connection,
        resolved
      );
      console.log(
        `Synced master_list_buyers: ${suppliersSynced} supplier(s) cleared and re-inserted, ${buyersInserted} buyer row(s) inserted`
      );
    }

    if (errors.length > 0) {
      console.error(
        `\nCompleted with ${errors.length} unresolved row(s). Review errors above.`
      );
      process.exit(2);
    }
  } finally {
    connection.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
