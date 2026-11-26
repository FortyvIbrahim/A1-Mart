class EmployeeSalesUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  create(payloads) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.repo.create(payloads);
        resolve({ code: 200, message: "Employee sales saved", data });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll(filters) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.repo.getAll(filters || {});
        resolve({ code: 200, message: "Employee sales fetched", data });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(date, employee_code) {
    return new Promise(async (resolve, reject) => {
      try {
        const row = await this.repo.getById(date, employee_code);
        if (row) {
          resolve({ code: 200, message: "Employee sale fetched", data: row });
        } else {
          resolve({ code: 404, message: "Employee sale not found" });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(date, employee_code) {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await this.repo.delete(date, employee_code);
        resolve({ code: 200, message: "Employee sale deleted", data: res });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (repo) => {
  return new EmployeeSalesUsecase(repo);
};
