#!/usr/bin/env node
/**
 * npm run seed:sample            add sample data (skips if already present)
 * npm run seed:sample -- --force add another set
 * npm run seed:sample -- --only=task,stockCircle
 * npm run seed:sample:clean      remove what was added (sample-data/.manifest.json)
 *
 * The API server must be running (PORT, default 8080). Uses config.json DB
 * settings for NODE_ENV (default development) to pick an admin user.
 */
require("dotenv").config();
global.env = process.env.NODE_ENV === undefined ? "development" : process.env.NODE_ENV;

const runner = require("../sample-data");

(async () => {
  const argv = process.argv.slice(2);
  const onlyArg = argv.find((a) => a.startsWith("--only="));
  const only = onlyArg ? onlyArg.slice(7).split(",").map((s) => s.trim()).filter(Boolean) : null;

  const db = await require("../drivers/mysql")().connect();
  try {
    if (argv.includes("--clean")) {
      const { failures } = await runner.clean(db.connection);
      process.exitCode = failures.length ? 1 : 0;
    } else {
      const res = await runner.seed(db.connection, { force: argv.includes("--force"), only });
      process.exitCode = res.failures.length ? 1 : 0;
    }
  } catch (err) {
    console.error(`[sample-data] ${err.message}`);
    process.exitCode = 1;
  } finally {
    db.close();
  }
})();
