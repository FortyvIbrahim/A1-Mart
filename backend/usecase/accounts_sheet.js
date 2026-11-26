class AccountsSheetUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  create(payload) {
    return this.repo.create(payload);
  }

  update(id, payload) {
    return this.repo.update(id, payload);
  }

  getAll(branch_id, filters = {}) {
    return this.repo.getAll(branch_id, filters);
  }

  getById(id) {
    return this.repo.getById(id);
  }

  delete(id) {
    return this.repo.delete(id);
  }
}

module.exports = (repo) => {
  return new AccountsSheetUsecase(repo);
};
