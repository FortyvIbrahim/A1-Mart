class ReceiptsUsecase {
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

  create(header, items) {
    return this.repo.create(header, items);
  }

  update(receipt_id, payload, items) {
    return this.repo.update(receipt_id, payload, items);
  }

  delete(receipt_id, deleted_by) {
    return this.repo.delete(receipt_id, deleted_by);
  }

  getAll(branch_id) {
    return this.repo.getAll(branch_id);
  }

  getById(receipt_id) {
    return this.repo.getById(receipt_id);
  }

  getItems(receipt_id) {
    return this.repo.getItems(receipt_id);
  }

  getAllItems(branch_id) {
    return this.repo.getAllItems(branch_id);
  }

  addItems(receipt_id, items) {
    return this.repo.addItems(receipt_id, items);
  }

  updateItem(receipt_item_id, payload) {
    return this.repo.updateItem(receipt_item_id, payload);
  }

  deleteItem(receipt_item_id) {
    return this.repo.deleteItem(receipt_item_id);
  }
}

module.exports = (repo) => {
  return new ReceiptsUsecase(repo);
};

