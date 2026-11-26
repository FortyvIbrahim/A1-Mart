# Sample data

Adds demo records so every list, view and edit page has something to show.
Records are created through the backend's normal REST APIs (same as the app),
so they pass all backend validation and no backend code is involved.

Real master data is only **referenced**, never changed:
branches, employees, designations, departments, and the GoFrugal-synced
products and per-branch stock.

## What gets added

| Area | Records |
|---|---|
| Master Data | 2 suppliers (master list), 2 billing counters, 2 employee allocations |
| Accounts | 3 ledgers, 2 account assets, 2 receipts, 2 payments, 1 money transfer |
| Accounts Dashboard | 42 account-sheet rows (6 employees × last 7 days) |
| Sales Target | branch, department, section and employee targets for this month |
| Checklist / EB | 6 days of EB consumption readings |
| Materials | 2 categories, 3 materials, 1 stock addition, 1 material request |
| Tasks | 8 tasks across urgent / high / medium / low and all statuses |
| Transport | 2 vehicles |
| Stock Circle | 3 monthly circles (one per store) + up to 12 stock checks each, using real GoFrugal products that have stock in that branch |

Text fields carry the `[Sample]` tag (e.g. `[Sample] Verify stock count`).

## Automatic on backend deploy (recommended)

The backend can add the sample data by itself when it starts — like the
employee sync. Set one variable on the server and (re)start:

```bash
SEED_SAMPLE_DATA=true pm2 reload ecosystem.config.js --env production --update-env
```

or put `SEED_SAMPLE_DATA=true` in the backend `.env`. On start it signs a
15-minute admin token internally (first user whose designation has
`access_all_branches`, or `SEED_ADMIN_USERNAME`), seeds through its own API,
and logs `[sample-data] ...` lines. It skips automatically when sample data
already exists, so restarts and redeploys never duplicate it. Leave the
variable unset/`false` on a live database.

Backend commands (in the backend folder, API running):

```bash
npm run seed:sample
```

```bash
npm run seed:sample:clean
```

GoFrugal is never written to — product and stock rows are only read from the
local database to pick real products for stock checks.

## Commands from the frontend folder

The backend must be running. Use an admin account that can see all modules
(an account with 2FA needs `SEED_TOKEN` instead of a password).

```bash
SEED_USERNAME=<admin phone> SEED_PASSWORD=<password> npm run seed:sample
```

```bash
SEED_USERNAME=<admin phone> SEED_PASSWORD=<password> npm run seed:sample:clean
```

Add only some parts (keys: `masterList billingCounter employeeAllocation ledger
accountAsset receipt payment moneyTransfer accountsSheet targetBranch targets
ebConsumption materialCategory material stockAddition materialRequest task
transport stockCircle`):

```bash
SEED_USERNAME=<admin phone> SEED_PASSWORD=<password> npm run seed:sample -- --only=task,stockCircle
```

Point at a different backend with `SEED_API_URL=https://api.example.com`
(default: `NEXT_PUBLIC_API_URL` from `.env.local`).

- Running the seed twice does nothing the second time (it detects the
  `[Sample]` tasks). Use `-- --force` to add another set.
- Created ids are saved in `scripts/.sample-data-manifest.json`;
  `seed:sample:clean` deletes exactly those. (Suppliers have no delete
  endpoint, and targets/stock checks are removed with their parents or kept.)

## During deploy

`deploy.sh` seeds automatically **only when you opt in**:

```bash
SEED_SAMPLE_DATA=true SEED_API_URL=<backend url> SEED_USERNAME=<admin phone> SEED_PASSWORD=<password> ./deploy.sh
```

Without `SEED_SAMPLE_DATA=true` the step is skipped, so a normal deploy never
puts demo rows into a live database. In any other pipeline use:

```bash
SEED_SAMPLE_DATA=true npm run seed:sample:deploy
```

## From the browser (development)

Open `/dev/sample-data` while signed in as an admin: **Add sample data**,
**Add another set**, **Remove sample data**. The page is disabled in
production builds unless `NEXT_PUBLIC_ENABLE_SAMPLE_DATA=true`.
