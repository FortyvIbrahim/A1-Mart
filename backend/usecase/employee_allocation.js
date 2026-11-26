class EmployeeAllocationUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  create(payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.repo.create(payload);
        resolve({
          code: 200,
          message: "Employee allocation created successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll(branch_id) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.repo.getAll(branch_id);
        resolve({
          code: 200,
          message: "Employee allocations fetched successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const row = await this.repo.getById(id);
        if (row) {
          resolve({
            code: 200,
            message: "Employee allocation fetched successfully",
            data: row,
          });
        } else {
          resolve({
            code: 404,
            message: "Employee allocation not found",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  update(id, payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await this.repo.update(id, payload);
        if (res.affectedRows > 0) {
          resolve({
            code: 200,
            message: "Employee allocation updated successfully",
            data: { employee_allocation_id: id, ...payload },
          });
        } else {
          resolve({
            code: 400,
            message: "No changes made",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await this.repo.delete(id);
        if (res.affectedRows > 0) {
          resolve({
            code: 200,
            message: "Employee allocation deleted successfully",
            data: { employee_allocation_id: id },
          });
        } else {
          resolve({
            code: 404,
            message: "Employee allocation not found",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (repo) => {
  return new EmployeeAllocationUsecase(repo);
};

