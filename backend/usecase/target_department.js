class TargetDepartmentUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  create(payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.repo.create(payload);
        resolve({ code: 200, message: "Target departments saved", data });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll(branch_id) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await this.repo.getAll(branch_id);
        resolve({ code: 200, message: "Target departments fetched", data });
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
            message: "Target department fetched",
            data: row,
          });
        } else {
          resolve({ code: 404, message: "Target department not found" });
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
            message: "Target department updated",
            data: { target_department_id: id, ...payload },
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
  return new TargetDepartmentUsecase(repo);
};
