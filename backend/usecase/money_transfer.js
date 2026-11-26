class MoneyTransferUsecase {
  constructor(repo) {
    this.repo = repo;
    this.accountAssetsUsecase = null;
  }

  setAccountAssetsUsecase(accountAssetsUsecase) {
    this.accountAssetsUsecase = accountAssetsUsecase;
    if (this.repo && this.repo.setAccountAssetsUsecase) {
      this.repo.setAccountAssetsUsecase(accountAssetsUsecase);
    }
  }

  create(payload) {
    return this.repo.create(payload);
  }

  update(money_transfer_id, payload) {
    return this.repo.update(money_transfer_id, payload);
  }

  getAll() {
    return this.repo.getAll();
  }

  getById(money_transfer_id) {
    return this.repo.getById(money_transfer_id);
  }

  delete(money_transfer_id) {
    return this.repo.delete(money_transfer_id);
  }
}

module.exports = (repo) => {
  return new MoneyTransferUsecase(repo);
};
