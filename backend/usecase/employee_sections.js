class EmployeeSectionsUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  create(payload) {
    return this.repo.create(payload);
  }

  async bulkCreate(rows) {
    try {
      const response = await this.repo.bulkCreate(rows);
      const employeeSections = await this.getAll();
      response.employeeSections = employeeSections;
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

  getByBranchAndDepartmentUsingEmployees(branch_id, department_id) {
    return this.repo.getByBranchAndDepartmentUsingEmployees(
      branch_id,
      department_id
    );
  }
}

module.exports = (repo) => {
  return new EmployeeSectionsUsecase(repo);
};
