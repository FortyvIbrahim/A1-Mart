class PaymentsUsecase {
  constructor(repo) {
    this.repo = repo;
    this.ledgersUsecase = null;
    this.accountAssetsUsecase = null;
  }

  setLedgersUsecase(ledgersUsecase) {
    this.ledgersUsecase = ledgersUsecase;
    if (this.repo && this.repo.setLedgersUsecase) {
      this.repo.setLedgersUsecase(ledgersUsecase);
    }
  }

  setAccountAssetsUsecase(accountAssetsUsecase) {
    this.accountAssetsUsecase = accountAssetsUsecase;
    if (this.repo && this.repo.setAccountAssetsUsecase) {
      this.repo.setAccountAssetsUsecase(accountAssetsUsecase);
    }
  }

  async create(header, items) {
    // Ensure account asset balance does not go below zero when creating a payment
    const account_asset_id = header.account_asset_id;
    const branch_id = header.branch_id || null;
    if (this.accountAssetsUsecase && account_asset_id && branch_id && items && items.length > 0) {
      const total = items
        .filter((item) => item && item.amount != null)
        .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      if (total > 0) {
        const currentBalance = await this.accountAssetsUsecase.getBalance(
          account_asset_id,
          branch_id
        );
        if (currentBalance < total) {
          const err = new Error(
            "Insufficient account asset balance. Payment total cannot exceed current balance."
          );
          err.name = "ValidationError";
          err.appCode = "INSUFFICIENT_ACCOUNT_ASSET_BALANCE";
          throw err;
        }
      }
    }
    return this.repo.create(header, items);
  }

  async update(payment_id, payload, items) {
    // When replacing items, ensure account asset balance does not go below zero
    if (
      this.accountAssetsUsecase &&
      items !== undefined &&
      Array.isArray(items) &&
      items.length > 0
    ) {
      const payment = await this.repo.getById(payment_id);
      if (payment) {
        const currentAccountAssetId = payment.account_asset_id || null;
        const currentBranchId = payment.branch_id || null;
        const newAccountAssetId =
          payload && payload.account_asset_id !== undefined
            ? payload.account_asset_id
            : currentAccountAssetId;
        const newBranchId =
          payload && payload.branch_id !== undefined
            ? payload.branch_id
            : currentBranchId;

        if (newAccountAssetId && newBranchId) {
          const existingItems = await this.repo.getItems(payment_id);
          const oldTotal = (existingItems || [])
            .filter((item) => item && item.amount != null)
            .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
          const newTotal = items
            .filter((item) => item && item.amount != null)
            .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

          if (newTotal > 0) {
            const currentBalance =
              await this.accountAssetsUsecase.getBalance(
                newAccountAssetId,
                newBranchId
              );
            const isSameAssetAndBranch =
              newAccountAssetId === currentAccountAssetId &&
              newBranchId === currentBranchId;
            const effectiveBalance = isSameAssetAndBranch
              ? currentBalance + oldTotal
              : currentBalance;

            if (effectiveBalance < newTotal) {
              const err = new Error(
                "Insufficient account asset balance. Payment total cannot exceed current balance."
              );
              err.name = "ValidationError";
              err.appCode = "INSUFFICIENT_ACCOUNT_ASSET_BALANCE";
              throw err;
            }
          }
        }
      }
    }
    return this.repo.update(payment_id, payload, items);
  }

  delete(payment_id, deleted_by) {
    return this.repo.delete(payment_id, deleted_by);
  }

  getAll(branch_id) {
    return this.repo.getAll(branch_id);
  }

  getById(payment_id) {
    return this.repo.getById(payment_id);
  }

  getItems(payment_id) {
    return this.repo.getItems(payment_id);
  }

  getAllItems(branch_id) {
    return this.repo.getAllItems(branch_id);
  }

  addItems(payment_id, items) {
    return this.repo.addItems(payment_id, items);
  }

  updateItem(payment_item_id, payload) {
    return this.repo.updateItem(payment_item_id, payload);
  }

  deleteItem(payment_item_id) {
    return this.repo.deleteItem(payment_item_id);
  }
}

module.exports = (repo) => {
  return new PaymentsUsecase(repo);
};

