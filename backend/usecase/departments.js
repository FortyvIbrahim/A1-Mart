class DepartmentsUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  create(payload) {
    return this.repo.create(payload);
  }

  async bulkCreate(rows) {
    try {
      const response = await this.repo.bulkCreate(rows);
      const departments = await this.getAll();
      response.departments = departments;
      return response;
    } catch (err) {
      throw err;
    }
  }

  update(id, payload) {
    return this.repo.update(id, payload);
  }

  getAll() {
    return this.repo.getAll();
  }

  getById(id) {
    return this.repo.getById(id);
  }

  delete(id) {
    return this.repo.delete(id);
  }

  getByBranchUsingEmployees(branch_id) {
    return this.repo.getByBranchUsingEmployees(branch_id);
  }
}

module.exports = (repo) => {
  return new DepartmentsUsecase(repo);
};
