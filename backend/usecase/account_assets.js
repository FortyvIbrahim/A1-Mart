class AccountAssetsUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  create(payload) {
    return this.repo.create(payload);
  }

  update(account_asset_id, payload) {
    return this.repo.update(account_asset_id, payload);
  }

  getAll() {
    return this.repo.getAll().then((rows) => {
      const byAsset = new Map();

      rows.forEach((row) => {
        if (!byAsset.has(row.account_asset_id)) {
          byAsset.set(row.account_asset_id, {
            account_asset_id: row.account_asset_id,
            label: row.label,
            created_at: row.created_at,
            updated_at: row.updated_at,
            balances: [],
          });
        }

        const entry = byAsset.get(row.account_asset_id);

        if (row.branch_id !== null && row.branch_id !== undefined) {
          entry.balances.push({
            branch_id: row.branch_id,
            branch_name: row.branch_name || null,
            balance: row.balance,
          });
        }
      });

      return Array.from(byAsset.values());
    });
  }

  getById(account_asset_id) {
    return this.repo.getById(account_asset_id).then((rows) => {
      if (!rows || rows.length === 0) {
        return null;
      }

      const first = rows[0];
      const result = {
        account_asset_id: first.account_asset_id,
        label: first.label,
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

  async delete(account_asset_id) {
    const refCount = await this.repo.countPaymentReceiptReferences(account_asset_id);
    if (refCount > 0) {
      const err = new Error(
        "Cannot delete account asset because it is used in one or more payments or receipts."
      );
      err.name = "ValidationError";
      err.appCode = "ACCOUNT_ASSET_IN_USE";
      throw err;
    }
    return this.repo.delete(account_asset_id);
  }

  async increaseBalance(account_asset_id, branch_id, amount) {
    if (!account_asset_id || amount === 0) return;
    await this.repo.adjustBalance(account_asset_id, branch_id, Math.abs(amount));
  }

  async reduceBalance(account_asset_id, branch_id, amount) {
    if (!account_asset_id || amount === 0) return;
    await this.repo.adjustBalance(account_asset_id, branch_id, -Math.abs(amount));
  }

  async getBalance(account_asset_id, branch_id) {
    return this.repo.getBalance(account_asset_id, branch_id);
  }
}

module.exports = (repo) => {
  return new AccountAssetsUsecase(repo);
};
