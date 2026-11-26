class EmployeesUsecase {
  constructor(repo) {
    this.repo = repo;
    this.synker = null;
  }

  setSynker(synker) {
    this.synker = synker;
  }

  create(payload) {
    const { driver_details, ...employeePayload } = payload;
    return this.repo.create(employeePayload).then((result) => {
      if (driver_details && payload.employee_code) {
        return this.repo.upsertDriver(payload.employee_code, driver_details).then(() => result);
      }
      return result;
    });
  }

  bulkCreate(rows) {
    return this.repo.bulkCreate(rows);
  }

  update(employee_code, payload) {
    const { driver_details, ...employeePayload } = payload;
    return this.repo.update(employee_code, employeePayload).then((result) => {
      if (driver_details) {
        return this.repo.upsertDriver(employee_code, driver_details).then(() => result);
      }
      return result;
    });
  }

  getAll(branch_id) {
    return this.repo.getAll(branch_id);
  }

  getById(employee_code) {
    return this.repo.getById(employee_code);
  }

  getByPhone(phone_number) {
    return this.repo.getByPhone(phone_number);
  }

  getByBranchDepartmentSection(branch_id, department_id, section_id) {
    return this.repo.getByBranchDepartmentSection(
      branch_id,
      department_id,
      section_id
    );
  }

  delete(employee_code) {
    return this.repo.delete(employee_code);
  }

  terminateAll() {
    return this.repo.terminateAll();
  }

  sync() {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.synker || !this.synker.syncDigismeEmployees) {
          throw new Error("Synker service not initialised");
        }

        await this.terminateAll();
        await this.synker.syncDigismeEmployees();
        resolve({ code: 200 });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (repo) => {
  return new EmployeesUsecase(repo);
};
