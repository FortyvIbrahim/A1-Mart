class TargetBranchUsecase {
  constructor(targetBranchRepo) {
    this.targetBranchRepo = targetBranchRepo;
  }

  create(targetBranchData) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.targetBranchRepo.create(targetBranchData);
        resolve({
          code: 200,
          message: "Target branch created successfully",
          data: result,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll(branch_id) {
    return new Promise(async (resolve, reject) => {
      try {
        const targetBranches = await this.targetBranchRepo.getAll(branch_id);
        resolve({
          code: 200,
          message: "Target branches retrieved successfully",
          data: targetBranches,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(targetBranchId) {
    return new Promise(async (resolve, reject) => {
      try {
        const targetBranch = await this.targetBranchRepo.getById(
          targetBranchId
        );
        if (targetBranch) {
          resolve({
            code: 200,
            message: "Target branch retrieved successfully",
            data: targetBranch,
          });
        } else {
          resolve({
            code: 404,
            message: "Target branch not found",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  update(targetBranchId, targetBranchData) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if target branch exists first
        const existingTargetBranch = await this.targetBranchRepo.getById(
          targetBranchId
        );
        if (!existingTargetBranch) {
          resolve({
            code: 404,
            message: "Target branch not found",
          });
          return;
        }

        const result = await this.targetBranchRepo.update(
          targetBranchId,
          targetBranchData
        );
        if (result.affectedRows > 0) {
          resolve({
            code: 200,
            message: "Target branch updated successfully",
            data: { target_branch_id: targetBranchId, ...targetBranchData },
          });
        } else {
          resolve({
            code: 400,
            message: "No changes made to the target branch",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(targetBranchId) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if target branch exists first
        const existingTargetBranch = await this.targetBranchRepo.getById(
          targetBranchId
        );
        if (!existingTargetBranch) {
          resolve({
            code: 404,
            message: "Target branch not found",
          });
          return;
        }

        const result = await this.targetBranchRepo.delete(targetBranchId);
        if (result.affectedRows > 0) {
          resolve({
            code: 200,
            message: "Target branch deleted successfully",
            data: { target_branch_id: targetBranchId },
          });
        } else {
          resolve({
            code: 400,
            message: "Failed to delete target branch",
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (targetBranchRepo) => {
  return new TargetBranchUsecase(targetBranchRepo);
};
