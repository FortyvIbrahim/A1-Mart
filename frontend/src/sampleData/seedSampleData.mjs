/**
 * A1 MART sample data seeder.
 *
 * Creates demo records through the backend's own REST APIs (same endpoints the
 * app uses), so every row passes the backend's validation and nothing in the
 * backend code changes. Real master data (branches, employees, GoFrugal
 * products/stock, departments) is read from the API and referenced — it is
 * never modified.
 *
 * Works in two places:
 *  - Node CLI:  scripts/seed-sample-data.mjs  (deploy / terminal)
 *  - Browser:   /dev/sample-data page (uses the signed-in session)
 *
 * Every created record id is returned in a manifest so `cleanSampleData` can
 * delete exactly what was added. Text fields carry the "[Sample]" tag.
 *
 * `api` must look like axios: get(path), post(path, body), delete(path),
 * each resolving to { data: <backend JSON body> }.
 */

export const SAMPLE_TAG = "[Sample]";

/** Section keys accepted by the `only` option / --only= flag. */
export const SEED_SECTIONS = [
  "masterList", "billingCounter", "employeeAllocation", "ledger", "accountAsset",
  "receipt", "payment", "moneyTransfer", "accountsSheet", "targetBranch", "targets",
  "ebConsumption", "materialCategory", "material", "stockAddition", "materialRequest",
  "task", "transport", "stockCircle",
];

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
const firstOfMonth = (offset = 0) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
};
const lastOfMonth = (offset = 0) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset + 1, 0);
};

function unwrap(res) {
  const body = res?.data;
  if (body && typeof body === "object" && "code" in body) {
    if (body.code !== 200) {
      const err = new Error(body.msg || body.message || `API error ${body.code}`);
      err.code = body.code;
      throw err;
    }
    return body.data;
  }
  return body;
}

function asList(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const key of ["rows", "items", "list", "data", "results"]) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  return [];
}

/** Each resource we create, with how to list it and the id field for cleanup. */
const RESOURCES = {
  masterList: { list: "/master-list", id: "master_id", del: null },
  billingCounter: { list: "/billing-counter", id: "counter_id", del: "/billing-counter" },
  ledger: { list: "/ledgers", id: "ledger_id", del: "/ledgers" },
  accountAsset: { list: "/account-assets", id: "account_asset_id", del: "/account-assets" },
  payment: { list: "/payments", id: "payment_id", del: "/payments" },
  receipt: { list: "/receipts", id: "receipt_id", del: "/receipts" },
  moneyTransfer: { list: "/money-transfers", id: "money_transfer_id", del: "/money-transfers" },
  materialCategory: { list: "/materials/categories?offset=0&limit=1000", id: "material_category_id", del: "/materials/categories" },
  material: { list: "/materials?offset=0&limit=1000", id: "material_id", del: "/materials" },
  stockAddition: { list: "/stock-addition?offset=0&limit=1000", id: "stock_addition_id", del: "/stock-addition" },
  materialRequest: { list: "/material-request", id: "material_request_id", del: "/material-request" },
  ebConsumption: { list: "/eb-consumption", id: "consumption_id", del: "/eb-consumption" },
  employeeAllocation: { list: "/employee-allocation", id: "employee_allocation_id", del: "/employee-allocation" },
  targetBranch: { list: "/target-branch", id: "target_branch_id", del: "/target-branch" },
  task: { list: "/tasks", id: "task_id", del: "/tasks" },
  transport: { list: "/transports", id: "transport_id", del: "/transports" },
  stockCircle: { list: "/stock-circles", id: "id", del: "/stock-circles" },
  accountsSheet: { list: "/accounts-sheet", id: "id", del: "/accounts-sheet" },
};

async function listIds(api, key, query = "") {
  const r = RESOURCES[key];
  try {
    const sep = r.list.includes("?") ? "&" : "?";
    const path = query ? r.list + sep + query.replace(/^\?/, "") : r.list;
    const rows = asList(unwrap(await api.get(path)));
    return new Set(rows.map((row) => row?.[r.id]).filter((v) => v != null));
  } catch {
    return new Set();
  }
}

/**
 * Runs `create`, then diffs the resource list to learn the new ids
 * (create endpoints don't all return ids consistently).
 */
async function createTracked(ctx, key, label, create, query = "") {
  if (ctx.only && !ctx.only.has(key)) return null;
  const before = await listIds(ctx.api, key, query);
  try {
    const result = await create();
    const after = await listIds(ctx.api, key, query);
    const added = [...after].filter((id) => !before.has(id));
    ctx.manifest[key] = [...(ctx.manifest[key] || []), ...added];
    ctx.log(`✓ ${label}${added.length ? ` (${added.length} new)` : ""}`);
    return result;
  } catch (err) {
    ctx.failures.push(`${label}: ${err?.message || err}`);
    ctx.log(`✗ ${label} — ${err?.message || err}`);
    return null;
  }
}

async function getList(api, path) {
  try {
    return asList(unwrap(await api.get(path)));
  } catch {
    return [];
  }
}

/** True when sample data from a previous run is already present. */
export async function isAlreadySeeded(api) {
  const tasks = await getList(api, "/tasks");
  return tasks.some((t) => String(t?.title || "").startsWith(SAMPLE_TAG));
}

export async function seedSampleData(
  api,
  { log = () => {}, force = false, only = null } = {}
) {
  const onlySet = only && only.length ? new Set(only) : null;
  const ctx = { api, log, manifest: {}, failures: [], only: onlySet };
  const want = (key) => !onlySet || onlySet.has(key);

  if (!force && !onlySet && (await isAlreadySeeded(api))) {
    log("Sample data already present — skipping (use force to add another set).");
    return { skipped: true, manifest: {}, failures: [] };
  }

  /* ── Real reference data (read only) ─────────────────────────────── */
  const branches = (await getList(api, "/branches")).filter(
    (b) => b.branch_id && !/none/i.test(b.branch_name || "")
  );
  const stores = branches.filter((b) => !/warehouse|corporate/i.test(b.branch_name || ""));
  const storeIds = (stores.length ? stores : branches).map((b) => b.branch_id);
  const allBranchIds = branches.map((b) => b.branch_id);
  const employees = (await getList(api, "/employees")).filter((e) => e.employee_code);
  const designations = await getList(api, "/designations");
  const departments = await getList(api, "/departments");
  const sections = await getList(api, "/employee-sections");
  const productDepartments = await getList(api, "/product/departments");

  if (!allBranchIds.length) throw new Error("No branches found — cannot seed.");
  log(
    `Reference data: ${branches.length} branches, ${employees.length} employees, ` +
      `${productDepartments.length} product departments.`
  );

  const pick = (arr, i) => arr[i % arr.length];
  const emp = (i) => (employees.length ? pick(employees, i).employee_code : null);
  const store = (i) => pick(storeIds, i);

  /* ── Master data ─────────────────────────────────────────────────── */
  await createTracked(ctx, "masterList", "Suppliers (master list)", async () => {
    for (const name of ["Sample Fresh Supplies", "Sample Home Needs Traders"]) {
      unwrap(
        await api.post("/master-list", {
          name: `${SAMPLE_TAG} ${name}`,
          phone: "9000000000",
          contact_person_name: "Sample Contact",
          person_type: 3,
          status: true,
        })
      );
    }
  });

  await createTracked(ctx, "billingCounter", "Billing counters", async () => {
    for (let i = 0; i < 2; i++) {
      unwrap(
        await api.post("/billing-counter", {
          counter_name: `${SAMPLE_TAG} Counter ${i + 1}`,
          branch_id: store(i),
          counter_code: `SMP-C${i + 1}`,
        })
      );
    }
  });

  await createTracked(ctx, "employeeAllocation", "Employee allocation", async () => {
    for (let i = 0; i < Math.min(2, designations.length); i++) {
      unwrap(
        await api.post("/employee-allocation", {
          branch_id: store(i),
          designation_id: designations[i].designation_id,
          required_count: 3 + i,
        })
      );
    }
  });

  /* ── Accounts ────────────────────────────────────────────────────── */
  await createTracked(ctx, "ledger", "Ledgers", async () => {
    for (const label of ["Electricity", "Staff Welfare", "Store Supplies"]) {
      unwrap(await api.post("/ledgers", { label: `${SAMPLE_TAG} ${label}` }));
    }
  });
  await createTracked(ctx, "accountAsset", "Account assets", async () => {
    for (const label of ["Cash in Hand", "Bank Account"]) {
      unwrap(await api.post("/account-assets", { label: `${SAMPLE_TAG} ${label}` }));
    }
  });

  const ledgers = (await getList(api, "/ledgers")).filter((l) =>
    String(l.label || "").startsWith(SAMPLE_TAG)
  );
  const assets = (await getList(api, "/account-assets")).filter((a) =>
    String(a.label || "").startsWith(SAMPLE_TAG)
  );

  if (ledgers.length && assets.length) {
    await createTracked(ctx, "receipt", "Receipts", async () => {
      for (let i = 0; i < 2; i++) {
        unwrap(
          await api.post("/receipts", {
            voucher_date: ymd(daysAgo(i + 2)),
            branch_id: store(i),
            account_asset_id: assets[assets.length - 1].account_asset_id,
            items: [
              {
                ledger_id: ledgers[(i + 1) % ledgers.length].ledger_id,
                amount: 5000 + i * 1200,
                narration: `${SAMPLE_TAG} Counter cash deposit ${i + 1}`,
              },
            ],
          })
        );
      }
    });
    await createTracked(ctx, "payment", "Payments", async () => {
      for (let i = 0; i < 2; i++) {
        unwrap(
          await api.post("/payments", {
            voucher_date: ymd(daysAgo(i + 1)), // after the receipt that funds it
            branch_id: store(i),
            account_asset_id: assets[assets.length - 1].account_asset_id,
            items: [
              {
                ledger_id: ledgers[i % ledgers.length].ledger_id,
                amount: 800 + i * 400,
                narration: `${SAMPLE_TAG} Monthly expense ${i + 1}`,
              },
            ],
          })
        );
      }
    });
    if (storeIds.length > 1) {
      await createTracked(ctx, "moneyTransfer", "Money transfer", async () => {
        unwrap(
          await api.post("/money-transfers", {
            from_branch_id: storeIds[0],
            to_branch_id: storeIds[1],
            amount: 2500,
            account_asset_id: assets[0].account_asset_id,
          })
        );
      });
    }
  }

  /* ── Accounts sheet (drives the Accounts Dashboard) ──────────────── */
  const counters = (await getList(api, "/billing-counter")).filter((c) =>
    String(c.counter_name || "").startsWith(SAMPLE_TAG)
  );
  if (employees.length) {
    await createTracked(
      ctx,
      "accountsSheet",
      "Accounts sheet (last 7 days)",
      async () => {
        for (let day = 1; day <= 7; day++) {
          for (let i = 0; i < Math.min(6, employees.length); i++) {
            const sales = 18000 + ((i * 7919 + day * 3301) % 42000);
            const bills = 40 + ((i * 13 + day * 7) % 90);
            unwrap(
              await api.post("/accounts-sheet", {
                date: ymd(daysAgo(day)),
                employee_id: emp(i),
                billing_counter_id: counters.length ? pick(counters, i).counter_id : undefined,
                no_of_bills: bills,
                no_of_items: bills * 3,
                total_sales: sales,
                cash_sales: Math.round(sales * 0.5),
                cash_type: i % 4 === 0 ? "excess" : "exact",
                card_sales: Math.round(sales * 0.3),
                card_type: "exact",
                paytm_sales: sales - Math.round(sales * 0.5) - Math.round(sales * 0.3),
                paytm_type: i % 5 === 1 ? "short" : "exact",
              })
            );
          }
        }
      },
      `?from_date=${ymd(daysAgo(7))}&to_date=${ymd(daysAgo(1))}`
    );
  }

  /* ── Sales targets ───────────────────────────────────────────────── */
  await createTracked(ctx, "targetBranch", "Branch targets", async () => {
    for (let i = 0; i < Math.min(3, storeIds.length); i++) {
      unwrap(
        await api.post("/target-branch", {
          branch_id: store(i),
          target_amount: 500000 + i * 150000,
          target_month: ymd(firstOfMonth(0)),
        })
      );
    }
  });
  if (want("targets") && departments.length) {
    try {
      unwrap(
        await api.post(
          "/target-department",
          departments.slice(0, 2).map((d, i) => ({
            branch_id: store(i),
            department_id: d.department_id,
            target_amount: 150000 + i * 50000,
            target_date: ymd(firstOfMonth(0)),
          }))
        )
      );
      log("✓ Department targets");
    } catch (e) {
      ctx.failures.push(`Department targets: ${e.message}`);
      log(`✗ Department targets — ${e.message}`);
    }
  }
  if (want("targets") && departments.length && sections.length) {
    try {
      unwrap(
        await api.post(
          "/target-section",
          sections.slice(0, 2).map((s, i) => ({
            branch_id: store(i),
            department_id: departments[0].department_id,
            section_id: s.section_id,
            target_amount: 60000 + i * 20000,
            target_date: ymd(firstOfMonth(0)),
          }))
        )
      );
      log("✓ Section targets");
      if (employees.length) {
        unwrap(
          await api.post(
            "/target-employee",
            [0, 1, 2].map((i) => ({
              branch_id: store(0),
              department_id: departments[0].department_id,
              section_id: sections[0].section_id,
              employee_id: emp(i),
              target_amount: 25000 + i * 5000,
              target_date: ymd(firstOfMonth(0)),
            }))
          )
        );
        log("✓ Employee targets");
      }
    } catch (e) {
      ctx.failures.push(`Section/employee targets: ${e.message}`);
      log(`✗ Section/employee targets — ${e.message}`);
    }
  }

  /* ── EB consumption ──────────────────────────────────────────────── */
  await createTracked(ctx, "ebConsumption", "EB consumption", async () => {
    let units = 12000;
    for (let day = 6; day >= 1; day--) {
      units += 180 + day * 11;
      unwrap(
        await api.post("/eb-consumption", {
          date: ymd(daysAgo(day)),
          branch_id: store(0),
          closing_units: units,
        })
      );
    }
  });

  /* ── Materials ───────────────────────────────────────────────────── */
  await createTracked(ctx, "materialCategory", "Material categories", async () => {
    for (const name of ["Packing Materials", "Cleaning Supplies"]) {
      unwrap(
        await api.post("/materials/categories", {
          category_name: `${SAMPLE_TAG} ${name}`,
          is_active: true,
        })
      );
    }
  });
  const matCategories = (await getList(api, "/materials/categories?offset=0&limit=1000")).filter((c) =>
    String(c.category_name || "").startsWith(SAMPLE_TAG)
  );
  await createTracked(ctx, "material", "Materials", async () => {
    const items = [
      ["Carry Bag Large", 0, 500, 18],
      ["Price Sticker Roll", 0, 120, 12],
      ["Floor Cleaner 5L", 1, 24, 18],
    ];
    for (const [name, cat, stock, tax] of items) {
      unwrap(
        await api.post("/materials", {
          name: `${SAMPLE_TAG} ${name}`,
          description: "Sample material for testing",
          live_stock: stock,
          material_category_id: matCategories[cat]?.material_category_id,
          is_active: true,
          tax_percentage: tax,
          hsn_number: "39232990",
        })
      );
    }
  });
  const materials = (await getList(api, "/materials?offset=0&limit=1000")).filter((m) =>
    String(m.name || "").startsWith(SAMPLE_TAG)
  );
  if (materials.length) {
    await createTracked(ctx, "stockAddition", "Stock addition", async () => {
      unwrap(
        await api.post("/stock-addition", {
          invoice_number: "SMP-INV-001",
          invoice_date: ymd(daysAgo(3)),
          items: materials.map((m, i) => ({
            material_id: m.material_id,
            quantity: 50 + i * 25,
            remark: `${SAMPLE_TAG} Opening stock`,
          })),
        })
      );
    });
    await createTracked(ctx, "materialRequest", "Material request", async () => {
      unwrap(
        await api.post("/material-request", {
          outlet_id: store(0),
          items: materials.slice(0, 2).map((m, i) => ({
            material_id: m.material_id,
            quantity: 20 + i * 10,
            remark: `${SAMPLE_TAG} Weekly store requirement`,
          })),
        })
      );
    });
  }

  /* ── Tasks ───────────────────────────────────────────────────────── */
  await createTracked(ctx, "task", "Tasks", async () => {
    const tasks = [
      ["Verify stock count", "high", "in_progress"],
      ["Prepare weekly shift plan", "high", "in_progress"],
      ["Complete aisle safety check", "high", "open"],
      ["Review daily sales summary", "medium", "open"],
      ["Check billing counter supplies", "medium", "open"],
      ["Repack polythene covers", "medium", "done"],
      ["Clean cold storage section", "low", "open"],
      ["Update price tags for offers", "urgent", "open"],
    ];
    for (let i = 0; i < tasks.length; i++) {
      const [title, priority, status] = tasks[i];
      unwrap(
        await api.post("/tasks", {
          title: `${SAMPLE_TAG} ${title}`,
          description: `Sample task created for testing the Task Management screens. (${title})`,
          priority,
          status,
          assigned_to: emp(i),
          created_by: emp(0) || "sample",
        })
      );
    }
  });

  /* ── Transports ──────────────────────────────────────────────────── */
  await createTracked(ctx, "transport", "Transports", async () => {
    const vehicles = [
      ["SMP-VAN-01", "Delivery Van", "TN 23 AB 1234"],
      ["SMP-TRK-01", "Mini Truck", "TN 23 CD 5678"],
    ];
    for (let i = 0; i < vehicles.length; i++) {
      const [code, name, number] = vehicles[i];
      unwrap(
        await api.post("/transports", {
          asset_code: code,
          asset_name: `${SAMPLE_TAG} ${name}`,
          vehicle_number: number,
          acquisition_type: "Purchased",
          working_status: "Working",
          purchased_price: 650000 + i * 300000,
          purchased_date: ymd(daysAgo(400 + i * 90)),
          branch_id: store(i),
        })
      );
    }
  });

  /* ── Stock circles + checks on real GoFrugal stock ───────────────── */
  if (productDepartments.length) {
    await createTracked(ctx, "stockCircle", "Stock circles", async () => {
      for (let i = 0; i < Math.min(3, storeIds.length); i++) {
        const dept = pick(productDepartments, i);
        unwrap(
          await api.post("/stock-circles", {
            branch_id: store(i),
            department_ids: [dept.department_id],
            period_type: "monthly",
            period_start_date: ymd(firstOfMonth(0)),
            period_end_date: ymd(lastOfMonth(0)),
            is_active: true,
          })
        );
      }
    });

    const newCircleIds = new Set(ctx.manifest.stockCircle || []);
    if (!want("stockCircle")) newCircleIds.clear();
    const circles = (await getList(api, "/stock-circles")).filter((c) => newCircleIds.has(c.id));
    if (circles.length) {
      const products = await getList(
        api,
        "/product/all?include_stock_price=true&ignore_branch_check=true"
      );
      let checks = 0;
      for (const circle of circles) {
        const deptIds = new Set(
          (circle.departments || []).map((d) => d.department_id).concat(circle.department_id || [])
        );
        const candidates = products
          .filter((p) => deptIds.has(p.department_id))
          .map((p) => ({
            p,
            s: (p.stock_price || []).find((r) => r.branch_id === circle.branch_id),
          }))
          .filter((x) => x.s && Number(x.s.stock) > 0)
          .slice(0, 12);
        for (const { p, s } of candidates) {
          try {
            unwrap(
              await api.post("/stock-circle-checked", {
                stock_circle_id: circle.id,
                product_id: p.product_id,
                checked_stock: Number(s.stock),
              })
            );
            checks += 1;
          } catch (e) {
            ctx.failures.push(`Stock check ${p.product_id}: ${e.message}`);
          }
        }
      }
      log(`✓ Stock circle checks on GoFrugal stock (${checks})`);
    }
  }

  log(
    ctx.failures.length
      ? `Done with ${ctx.failures.length} issue(s).`
      : "Done — all sample data created."
  );
  return { skipped: false, manifest: ctx.manifest, failures: ctx.failures };
}

/** Deletes records listed in a manifest from seedSampleData (reverse order). */
export async function cleanSampleData(api, manifest, { log = () => {} } = {}) {
  const order = Object.keys(RESOURCES).reverse();
  const failures = [];
  for (const key of order) {
    const ids = manifest?.[key] || [];
    const r = RESOURCES[key];
    if (!ids.length) continue;
    if (!r.del) {
      log(`- ${key}: ${ids.length} kept (no delete endpoint)`);
      continue;
    }
    let ok = 0;
    for (const id of ids) {
      try {
        unwrap(await api.delete(`${r.del}/${id}`));
        ok += 1;
      } catch (e) {
        failures.push(`${key} ${id}: ${e.message}`);
      }
    }
    log(`✓ Removed ${ok}/${ids.length} ${key}`);
  }
  return { failures };
}
