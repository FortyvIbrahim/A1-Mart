class BranchesUsecase {
  constructor(branchesRepo) {
    this.branchesRepo = branchesRepo;
  }

  create(branchData) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.branchesRepo.create(branchData);
        resolve({
          code: 200,
          message: "Branch created successfully",
          data: result,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  bulkCreate(rows) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await this.branchesRepo.bulkCreate(rows);
        const branches = await this.getAll();
        resolve({
          code: 200,
          message: "Branches bulk insert completed successfully",
          branches: branches.data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll() {
    return new Promise(async (resolve, reject) => {
      try {
        const branches = await this.branchesRepo.getAll();
        resolve({
          code: 200,
          message: "Branches retrieved successfully",
          data: branches,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(branchId) {
    return new Promise(async (resolve, reject) => {
      try {
        const branch = await this.branchesRepo.getById(branchId);
        if (branch) {
          resolve({
            code: 200,
            message: "Branch retrieved successfully",
            data: branch,
          });
        } else {
          resolve({
            code: 404,
            message: "Branch not found",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  update(branchId, branchData) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if branch exists first
        const existingBranch = await this.branchesRepo.getById(branchId);
        if (!existingBranch) {
          resolve({
            code: 404,
            message: "Branch not found",
          });
          return;
        }

        const result = await this.branchesRepo.update(branchId, branchData);
        if (result.affectedRows > 0) {
          resolve({
            code: 200,
            message: "Branch updated successfully",
            data: { branchId, ...branchData },
          });
        } else {
          resolve({
            code: 400,
            message: "No changes made to the branch",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(branchId) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if branch exists first
        const existingBranch = await this.branchesRepo.getById(branchId);
        if (!existingBranch) {
          resolve({
            code: 404,
            message: "Branch not found",
          });
          return;
        }

        const result = await this.branchesRepo.delete(branchId);
        if (result.affectedRows > 0) {
          resolve({
            code: 200,
            message: "Branch deleted successfully",
            data: { branchId },
          });
        } else {
          resolve({
            code: 400,
            message: "Failed to delete branch",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (branchesRepo) => {
  return new BranchesUsecase(branchesRepo);
};
