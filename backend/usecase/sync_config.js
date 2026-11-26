const cron = require("node-cron");

function normalizeIsActive(raw) {
  return raw === true || raw === 1 || raw === "1";
}

class SyncConfigUsecase {
  constructor(repo) {
    this.repo = repo;
    this.synker = null;
  }

  setSynker(synker) {
    this.synker = synker;
  }

  getAll() {
    return this.repo.getAll();
  }

  getBySyncKey(sync_key) {
    return this.repo.getBySyncKey(sync_key);
  }

  _cronOrActiveChanged(existing, payload) {
    let changed = false;
    if (payload.cron !== undefined) {
      const next = String(payload.cron).trim();
      const prev = String(existing.cron ?? "").trim();
      if (prev !== next) changed = true;
    }
    if (payload.is_active !== undefined) {
      const next = normalizeIsActive(payload.is_active);
      const prev = normalizeIsActive(existing.is_active);
      if (prev !== next) changed = true;
    }
    return changed;
  }

  /**
   * @param {string} sync_key
   * @param {{ cron?: string, is_active?: number|boolean }} payload
   */
  update(sync_key, payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.repo.getBySyncKey(sync_key);
        if (!existing) {
          resolve({ code: 404, msg: "Unknown sync_key" });
          return;
        }
        if (payload.cron !== undefined) {
          const expr = String(payload.cron).trim();
          if (!expr || !cron.validate(expr)) {
            resolve({ code: 400, msg: "Invalid cron expression" });
            return;
          }
        }
        const hasCron = payload.cron !== undefined;
        const hasActive = payload.is_active !== undefined;
        if (!hasCron && !hasActive) {
          resolve({ code: 400, msg: "Provide cron and/or is_active" });
          return;
        }

        if (!this._cronOrActiveChanged(existing, payload)) {
          resolve({
            code: 200,
            data: existing,
            msg: "No changes; cron and is_active already match",
          });
          return;
        }

        const fields = {};
        if (hasCron) fields.cron = String(payload.cron).trim();
        if (hasActive) fields.is_active = payload.is_active;
        await this.repo.updateBySyncKey(sync_key, fields);
        const row = await this.repo.getBySyncKey(sync_key);

        if (this.synker && typeof this.synker.initCronJobs === "function") {
          await this.synker.initCronJobs();
        }

        resolve({ code: 200, data: row });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (repo) => new SyncConfigUsecase(repo);
