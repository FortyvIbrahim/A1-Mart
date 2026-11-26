class LedgersUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  create(payload) {
    return this.repo.create(payload);
  }

  update(ledger_id, payload) {
    return this.repo.update(ledger_id, payload);
  }

  getAll() {
    return this.repo.getAll().then((rows) => {
      const byLedger = new Map();

      rows.forEach((row) => {
        if (!byBucketHas(byLedger, row.ledger_id)) {
          byLedger.set(row.ledger_id, {
            ledger_id: row.ledger_id,
            label: row.label,
            category: row.category,
            created_at: row.created_at,
            updated_at: row.updated_at,
            balances: [],
          });
        }

        const entry = byLedger.get(row.ledger_id);

        // Only push balance entries when branch_id is present
        if (row.branch_id !== null && row.branch_id !== undefined) {
          entry.balances.push({
            branch_id: row.branch_id,
            branch_name: row.branch_name || null,
            balance: row.balance,
          });
        }
      });

      return Array.from(byLedger.values());
    });
  }

  getById(ledger_id) {
    return this.repo.getById(ledger_id).then((rows) => {
      if (!rows || rows.length === 0) {
        return null;
      }

      const first = rows[0];
      const result = {
        ledger_id: first.ledger_id,
        label: first.label,
        category: first.category,
        created_at: first.created_at,
        updated_at: first.updated_at,
        balances: [],
      };

      rows.forEach((row) => {
        if (row.branch_id !== null && row.branch_id !== undefined) {
          result.balances.push({
            branch_id: row.branch_id,
            branch_name: row.branch_name || null,
            balance: row.balance,
          });
        }
      });

      return result;
    });
  }

  async delete(ledger_id) {
    const refCount = await this.repo.countPaymentReceiptItemReferences(ledger_id);
    if (refCount > 0) {
      const err = new Error(
        "Cannot delete ledger because it is used in one or more payment or receipt items."
      );
      err.name = "ValidationError";
      err.appCode = "LEDGER_IN_USE";
      throw err;
    }
    return this.repo.delete(ledger_id);
  }

  async increaseBalance(ledger_id, branch_id, amount) {
    if (amount === 0) return;
    await this.repo.adjustBalance(ledger_id, branch_id, Math.abs(amount));
  }

  async reduceBalance(ledger_id, branch_id, amount) {
    if (amount === 0) return;
    await this.repo.adjustBalance(ledger_id, branch_id, -Math.abs(amount));
  }
}

function byBucketHas(map, key) {
  return map.has(key);
}

module.exports = (repo) => {
  return new LedgersUsecase(repo);
};

