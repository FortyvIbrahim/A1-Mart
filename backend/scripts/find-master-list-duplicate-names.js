#!/usr/bin/env node
/**
 * Find duplicate master_list names for a given person_type (default: 1).
 * Names are compared case-insensitively (trimmed, collapsed whitespace).
 *
 * Usage:
 *   node scripts/find-master-list-duplicate-names.js
 *   node scripts/find-master-list-duplicate-names.js --delete --yes
 *   node scripts/find-master-list-duplicate-names.js --delete --dry-run
 *
 * With --delete: keeps the row with the earliest created_at (then lowest master_id),
 * reassigns references to that master_id, and deletes the duplicate master_list rows.
 */

const fs = require("fs");
const path = require("path");
const mysql = require("mysql");
const XLSX = require("xlsx");
const config = require("../config.json");

const DEFAULT_PERSON_TYPE = 1;

/** { table, column, uniqueConflict?: string[] } */
const MASTER_ID_REFERENCES = [
  { table: "purchase_acknowledgment", column: "supplier_id" },
  {
    table: "purchase_reorders",
    column: "supplier_id",
    uniqueConflict: ["product_id", "buyer_id"],
  },
  { table: "purchase_returns_items", column: "supplier_id" },
  { table: "purchase_returns_items_delivered", column: "supplier_id" },
  { table: "outstanding_invoices", column: "supplier_id" },
  { table: "po_header", column: "supplier_id" },
  { table: "po", column: "supplier_id" },
  { table: "stock_addition", column: "supplier_id" },
  { table: "materials", column: "supplier_id" },
  { table: "products", column: "distributor_id" },
];

function parseArgs(argv) {
  const args = {
    output: path.join(
      process.cwd(),
      `master-list-person-type-${DEFAULT_PERSON_TYPE}-duplicates.xlsx`
    ),
    env: process.env.NODE_ENV || "development",
    personType: DEFAULT_PERSON_TYPE,
    delete: false,
    dryRun: false,
    confirm: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--output" && argv[i + 1]) {
      args.output = path.resolve(argv[++i]);
    } else if (arg === "--env" && argv[i + 1]) {
      args.env = argv[++i];
    } else if (arg === "--person-type" && argv[i + 1]) {
      args.personType = parseInt(argv[++i], 10);
      if (Number.isNaN(args.personType)) {
        console.error("Invalid --person-type value");
        process.exit(1);
      }
    } else if (arg === "--delete") {
      args.delete = true;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--yes") {
      args.confirm = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  if (args.delete && !args.dryRun && !args.confirm) {
    console.error("Pass --yes to apply deletions, or --dry-run to preview only.");
    process.exit(1);
  }

  return args;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/find-master-list-duplicate-names.js [options]

Options:
  --output <path>       Excel report path (default: ./master-list-person-type-1-duplicates.xlsx)
  --env <name>          config.json db key: development | production
  --person-type <n>     master_list.person_type to scan (default: 1)
  --delete              Merge refs to oldest row per name, then delete duplicate master_list rows
  --dry-run             With --delete: show planned actions without writing to DB
  --yes                 With --delete: required to apply changes (not needed for --dry-run)
  --help, -h            Show this help
`);
}

function normalizeNameKey(value) {
  return String(value ?? "")
    .replace(/\u00A0/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[,.;]+$/g, "")
    .toLocaleLowerCase("en-US");
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

function findDuplicateGroups(rows) {
  const byKey = new Map();

  for (const row of rows) {
    const key = normalizeNameKey(row.name);
    if (!key) continue;
    if (!byKey.has(key)) {
      byKey.set(key, []);
    }
    byKey.get(key).push(row);
  }

  const duplicates = [];
  for (const [normalized_name, entries] of byKey) {
    if (entries.length <= 1) continue;
    duplicates.push({
      normalized_name,
      count: entries.length,
      entries,
    });
  }

  duplicates.sort(
    (a, b) => b.count - a.count || a.normalized_name.localeCompare(b.normalized_name)
  );
  return duplicates;
}

function planMerges(duplicates) {
  return duplicates.map((group) => {
    const sorted = [...group.entries].sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (ta !== tb) return ta - tb;
      return Number(a.master_id) - Number(b.master_id);
    });
    return {
      normalized_name: group.normalized_name,
      keep: sorted[0],
      remove: sorted.slice(1),
    };
  });
}

async function tableExists(connection, table) {
  const rows = await queryAsync(
    connection,
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?
     LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function mergeMasterListBuyers(connection, keepId, deleteIds, dryRun) {
  if (deleteIds.length === 0) return { merged: 0, deleted: 0 };

  if (dryRun) {
    const rows = await queryAsync(
      connection,
      `SELECT COUNT(*) AS cnt FROM master_list_buyers WHERE master_id IN (?)`,
      [deleteIds]
    );
    return { merged: rows[0]?.cnt || 0, deleted: deleteIds.length };
  }

  const insertResult = await queryAsync(
    connection,
    `INSERT IGNORE INTO master_list_buyers (master_id, employee_id)
     SELECT ?, employee_id FROM master_list_buyers WHERE master_id IN (?)`,
    [keepId, deleteIds]
  );
  const deleteResult = await queryAsync(
    connection,
    `DELETE FROM master_list_buyers WHERE master_id IN (?)`,
    [deleteIds]
  );
  return {
    merged: insertResult.affectedRows || 0,
    deleted: deleteResult.affectedRows || 0,
  };
}

async function resolveUniqueConflicts(connection, ref, keepId, deleteIds, dryRun) {
  if (!ref.uniqueConflict?.length || deleteIds.length === 0) return 0;

  const joinCols = ref.uniqueConflict
    .map((c) => `dup.${c} = keep_row.${c}`)
    .join(" AND ");
  const sql = `DELETE dup FROM \`${ref.table}\` dup
    INNER JOIN \`${ref.table}\` keep_row
      ON keep_row.\`${ref.column}\` = ?
      AND dup.\`${ref.column}\` IN (?)
      AND ${joinCols}`;

  if (dryRun) {
    const countSql = `SELECT COUNT(*) AS cnt FROM \`${ref.table}\` dup
      INNER JOIN \`${ref.table}\` keep_row
        ON keep_row.\`${ref.column}\` = ?
        AND dup.\`${ref.column}\` IN (?)
        AND ${joinCols}`;
    const countRows = await queryAsync(connection, countSql, [keepId, deleteIds]);
    return countRows[0]?.cnt || 0;
  }

  const result = await queryAsync(connection, sql, [keepId, deleteIds]);
  return result.affectedRows || 0;
}

async function updateReferences(connection, keepId, deleteIds, dryRun) {
  const stats = [];

  for (const ref of MASTER_ID_REFERENCES) {
    if (!(await tableExists(connection, ref.table))) continue;

    const conflicts = await resolveUniqueConflicts(
      connection,
      ref,
      keepId,
      deleteIds,
      dryRun
    );

    const sql = `UPDATE \`${ref.table}\` SET \`${ref.column}\` = ? WHERE \`${ref.column}\` IN (?)`;
    if (dryRun) {
      const countRows = await queryAsync(
        connection,
        `SELECT COUNT(*) AS cnt FROM \`${ref.table}\` WHERE \`${ref.column}\` IN (?)`,
        [deleteIds]
      );
      stats.push({
        table: ref.table,
        column: ref.column,
        rows: countRows[0]?.cnt || 0,
        conflictsRemoved: conflicts,
      });
      continue;
    }

    const result = await queryAsync(connection, sql, [keepId, deleteIds]);
    stats.push({
      table: ref.table,
      column: ref.column,
      rows: result.affectedRows || 0,
      conflictsRemoved: conflicts,
    });
  }

  return stats;
}

async function applyMergePlan(connection, merges, dryRun) {
  const log = [];

  for (const plan of merges) {
    const keepId = Number(plan.keep.master_id);
    const deleteIds = plan.remove.map((r) => Number(r.master_id));

    console.log(
      `${dryRun ? "[dry-run] " : ""}"${plan.normalized_name}": keep ${keepId} (${plan.keep.name}, created ${plan.keep.created_at}), remove [${deleteIds.join(", ")}]`
    );

    const buyerStats = await mergeMasterListBuyers(
      connection,
      keepId,
      deleteIds,
      dryRun
    );
    const refStats = await updateReferences(connection, keepId, deleteIds, dryRun);

    let deletedMaster = 0;
    if (deleteIds.length > 0) {
      if (dryRun) {
        deletedMaster = deleteIds.length;
      } else {
        const delResult = await queryAsync(
          connection,
          `DELETE FROM master_list WHERE master_id IN (?)`,
          [deleteIds]
        );
        deletedMaster = delResult.affectedRows || 0;
      }
    }

    log.push({
      normalized_name: plan.normalized_name,
      keep_master_id: keepId,
      keep_name: plan.keep.name,
      keep_created_at: plan.keep.created_at,
      removed_master_ids: deleteIds.join(", "),
      removed_names: plan.remove.map((r) => r.name).join(" | "),
      buyers_merged: buyerStats.merged,
      buyers_deleted_rows: buyerStats.deleted,
      master_list_deleted: deletedMaster,
      reference_updates: refStats
        .map((s) => `${s.table}.${s.column}=${s.rows}`)
        .join("; "),
    });
  }

  return log;
}

function writeReport(filePath, duplicates, personType, totalRows, mergeLog) {
  const summaryRows = duplicates.map((group) => ({
    normalized_name: group.normalized_name,
    duplicate_count: group.count,
    master_ids: group.entries.map((e) => e.master_id).join(", "),
    names_in_db: group.entries.map((e) => e.name).join(" | "),
  }));

  const detailRows = [];
  for (const group of duplicates) {
    const sorted = [...group.entries].sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (ta !== tb) return ta - tb;
      return Number(a.master_id) - Number(b.master_id);
    });
    sorted.forEach((entry, idx) => {
      detailRows.push({
        normalized_name: group.normalized_name,
        action: idx === 0 ? "KEEP" : "DELETE",
        master_id: entry.master_id,
        name: entry.name,
        person_type: entry.person_type,
        status: entry.status,
        phone: entry.phone ?? "",
        created_at: entry.created_at,
        updated_at: entry.updated_at,
      });
    });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      {
        person_type: personType,
        total_rows: totalRows,
        duplicate_name_groups: duplicates.length,
        duplicate_row_count: detailRows.length,
      },
    ]),
    "Summary"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(summaryRows),
    "DuplicateNames"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(detailRows),
    "AllDuplicateRows"
  );
  if (mergeLog?.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(mergeLog),
      "MergeActions"
    );
  }
  XLSX.writeFile(wb, filePath);
}

async function main() {
  const args = parseArgs(process.argv);
  const connection = createDb(args.env);

  try {
    await queryAsync(connection, "SELECT 1");

    const rows = await queryAsync(
      connection,
      `SELECT master_id, name, person_type, status, phone, created_at, updated_at
       FROM master_list
       WHERE person_type = ?
       ORDER BY created_at ASC, master_id ASC`,
      [args.personType]
    );

    const duplicates = findDuplicateGroups(rows || []);

    console.log(
      `Scanned ${rows.length} master_list row(s) with person_type=${args.personType}`
    );

    if (duplicates.length === 0) {
      console.log("No duplicate names found (case-insensitive).");
      process.exit(0);
    }

    const merges = planMerges(duplicates);
    let mergeLog = [];

    if (args.delete) {
      console.log(
        `\n${args.dryRun ? "Dry-run" : "Applying"} merge for ${merges.length} duplicate group(s)...\n`
      );
      if (!args.dryRun) {
        await beginTransaction(connection);
      }
      try {
        mergeLog = await applyMergePlan(connection, merges, args.dryRun);
        if (!args.dryRun) {
          await commitTransaction(connection);
          console.log("\nMerge and delete completed successfully.");
        } else {
          console.log("\nDry-run complete. No changes written to the database.");
        }
      } catch (err) {
        if (!args.dryRun) {
          await rollbackTransaction(connection);
        }
        throw err;
      }
    }

    writeReport(args.output, duplicates, args.personType, rows.length, mergeLog);
    console.log(
      `Found ${duplicates.length} duplicate name group(s) — report: ${args.output}`
    );

    if (!args.delete) {
      console.error("\nDuplicate groups (run with --delete --dry-run or --delete --yes to fix):");
      for (const plan of merges) {
        console.error(
          `  "${plan.normalized_name}" (${plan.remove.length + 1}): ` +
            `keep ${plan.keep.master_id} (created ${plan.keep.created_at}), ` +
            `remove [${plan.remove.map((r) => r.master_id).join(", ")}]`
        );
      }
      process.exit(2);
    }

    process.exit(0);
  } finally {
    connection.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
