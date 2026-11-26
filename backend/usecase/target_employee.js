class TargetEmployeeUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  create(payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.repo.create(payload);
        resolve({ code: 200, message: "Target employees saved", data });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll(branch_id) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.repo.getAll(branch_id);
        resolve({ code: 200, message: "Target employees fetched", data });
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
            message: "Target employee fetched",
            data: row,
          });
        } else {
          resolve({ code: 404, message: "Target employee not found" });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  getUserTarget(employee_code, date = new Date()) {
    return new Promise(async (resolve, reject) => {
      try {
        const row = await this.repo.getUserTarget(employee_code, date);
        if (row) {
          resolve({
            code: 200,
            message: "Employee target fetched",
            data: row,
          });
        } else {
          resolve({ code: 404, message: "Employee target not found" });
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
            message: "Target employee updated",
            data: { target_employee_id: id, ...payload },
          });
        } else {
          resolve({ code: 400, message: "No changes" });
        }
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (repo) => {
  return new TargetEmployeeUsecase(repo);
};
