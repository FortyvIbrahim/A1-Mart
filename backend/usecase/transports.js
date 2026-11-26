class TransportsUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  create(payload) {
    return this.repo.create(payload);
  }

  bulkCreate(rows) {
    return this.repo.bulkCreate(rows);
  }

  update(transport_id, payload) {
    return this.repo.update(transport_id, payload);
  }

  getAll() {
    return this.repo.getAll();
  }

  getById(transport_id) {
    return this.repo.getById(transport_id);
  }

  delete(transport_id) {
    return this.repo.delete(transport_id);
  }
}

module.exports = (repo) => {
  return new TransportsUsecase(repo);
};
