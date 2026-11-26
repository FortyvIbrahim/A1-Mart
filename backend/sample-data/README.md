# Sample data

Demo records (tagged `[Sample]`) so every frontend list / view / edit page has data.

- Automatic: set `SEED_SAMPLE_DATA=true` (env, `.env`, or `ecosystem.config.js`)
  and start the server. Runs once after boot; skipped when sample data exists.
- Manual (server running): `npm run seed:sample`, `npm run seed:sample -- --force`,
  `npm run seed:sample -- --only=task,stockCircle`, `npm run seed:sample:clean`.
- Admin used: first user with `access_all_branches`, or `SEED_ADMIN_USERNAME`.
- Writes only to this backend's database via its own REST API. GoFrugal is
  never written to.

`seedSampleData.mjs` is mirrored in the frontend at
`src/sampleData/seedSampleData.mjs`; keep both copies in sync.
