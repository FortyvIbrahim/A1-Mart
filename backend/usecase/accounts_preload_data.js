class AccountsPreloadDataUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  create(payload) {
    return new Promise(async (resolve, reject) => {
      try {
        // Extract date from payload (handle both Date objects and ISO strings)
        let date = payload.date;
        if (date instanceof Date) {
          date = date.toISOString().split("T")[0]; // Convert to YYYY-MM-DD format
        } else if (typeof date === "string") {
          date = date.split("T")[0]; // Extract date part from ISO string
        }

        // Delete previous occurrences with the same date, branch_id, and billing_counter_id
        await this.repo.deleteByDate(
          date,
          payload.branch_id,
          payload.billing_counter_id
        );

        // Create the new entry
        const result = await this.repo.create(payload);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  update(id, payload) {
    return this.repo.update(id, payload);
  }

  getAll(branch_id) {
    return this.repo.getAll(branch_id);
  }

  getById(id) {
    return this.repo.getById(id);
  }

  delete(id) {
    return this.repo.delete(id);
  }

  bulkCreate(rows) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!Array.isArray(rows) || rows.length === 0) {
          resolve({ affectedRows: 0, insertedIds: [] });
          return;
        }

        // Extract date from the first entry
        let firstEntry = rows[0];
        let date = firstEntry.date;
        if (date instanceof Date) {
          date = date.toISOString().split("T")[0]; // Convert to YYYY-MM-DD format
        } else if (typeof date === "string") {
          date = date.split("T")[0]; // Extract date part from ISO string
        }

        // Delete all entries belonging to the date of the first entry
        await this.repo.deleteAllByDate(date);

        // Create all new entries
        const result = await this.repo.bulkCreate(rows);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  deleteAllByDate(date) {
    return new Promise(async (resolve, reject) => {
      try {
        // Normalize date format
        let normalizedDate = date;
        if (date instanceof Date) {
          normalizedDate = date.toISOString().split("T")[0]; // Convert to YYYY-MM-DD format
        } else if (typeof date === "string") {
          normalizedDate = date.split("T")[0]; // Extract date part from ISO string
        }

        const result = await this.repo.deleteAllByDate(normalizedDate);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  countMatchingInAccountsSheet(branch_id) {
    return this.repo.countMatchingInAccountsSheet(branch_id);
  }
}

module.exports = (repo) => {
  return new AccountsPreloadDataUsecase(repo);
};
