const {
  computeSubmissionStats,
  parseAnswersForApi,
  toSubmissionStatsDateKey,
} = require("../utils/checklist_submission_stats");

class ChecklistFormsUsecase {
  constructor(repo, submissionsRepo, branchesRepo) {
    this.repo = repo;
    this.submissionsRepo = submissionsRepo;
    this.branchesRepo = branchesRepo;
  }

  async _branchFieldsForTokenBranch(branchId) {
    if (branchId == null || Number.isNaN(Number(branchId))) {
      return { branch_id: null, branch_name: null };
    }
    const row = await this.branchesRepo.getById(branchId);
    return {
      branch_id: branchId,
      branch_name: row && row.branch_name != null ? row.branch_name : null,
    };
  }

  create(payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.repo.create(payload);
        resolve({
          code: 200,
          message: "Checklist form created successfully",
          data: result,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  update(id, payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.repo.getById(id);
        if (!existing) {
          resolve({ code: 404, message: "Checklist form not found" });
          return;
        }
        const result = await this.repo.update(id, payload);
        if (result.affectedRows > 0) {
          const updated = await this.repo.getById(id);
          resolve({
            code: 200,
            message: "Checklist form updated successfully",
            data: updated,
          });
        } else {
          resolve({ code: 400, message: "No changes made" });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  getAll(branchId, accessAllBranches) {
    return new Promise(async (resolve, reject) => {
      try {
        const forms = await this.repo.getAll();
        const effectiveBranchId = accessAllBranches ? null : branchId;
        const { branch_id, branch_name } = await this._branchFieldsForTokenBranch(
          effectiveBranchId
        );
        const data = forms.map((f) => ({
          ...f,
          branch_id,
          branch_name,
        }));
        resolve({
          code: 200,
          message: "Checklist forms retrieved successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAllWithSubmissionStats(branchId, accessAllBranches) {
    return new Promise(async (resolve, reject) => {
      try {
        if (
          !accessAllBranches &&
          (branchId == null || Number.isNaN(Number(branchId)))
        ) {
          return resolve({
            code: 403,
            message: "Missing branch context",
          });
        }
        const multiBranch = !!accessAllBranches;
        const branchScope = multiBranch ? "all" : branchId;
        const forms = await this.repo.getAll();
        const rows = await this.submissionsRepo.getAllForStats(branchScope);
        const { branch_id, branch_name } = multiBranch
          ? { branch_id: null, branch_name: null }
          : await this._branchFieldsForTokenBranch(branchId);
        const submissionsByFormId = {};
        (rows || []).forEach((r) => {
          const fid = r.checklist_form_id;
          const dateKey = toSubmissionStatsDateKey(r.local_date);
          if (!dateKey) return;
          if (!submissionsByFormId[fid]) submissionsByFormId[fid] = {};
          const statsBlock = {
            branch_id: r.branch_id,
            branch_name: r.branch_name != null ? r.branch_name : null,
            ...computeSubmissionStats(r.answers),
          };
          if (multiBranch) {
            if (!submissionsByFormId[fid][dateKey]) {
              submissionsByFormId[fid][dateKey] = [];
            }
            submissionsByFormId[fid][dateKey].push(statsBlock);
          } else {
            submissionsByFormId[fid][dateKey] = {
              ...statsBlock,
              branch_name:
                statsBlock.branch_name != null
                  ? statsBlock.branch_name
                  : branch_name,
            };
          }
        });
        const data = forms.map((f) => ({
          ...f,
          branch_id,
          branch_name,
          submissions: submissionsByFormId[f.id] || {},
        }));
        resolve({
          code: 200,
          message:
            "Checklist forms with submission stats retrieved successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getAllWithSubmissionAnswers(branchId, accessAllBranches) {
    return new Promise(async (resolve, reject) => {
      try {
        if (
          !accessAllBranches &&
          (branchId == null || Number.isNaN(Number(branchId)))
        ) {
          return resolve({
            code: 403,
            message: "Missing branch context",
          });
        }
        const multiBranch = !!accessAllBranches;
        const branchScope = multiBranch ? "all" : branchId;
        const forms = await this.repo.getAll();
        const rows =
          await this.submissionsRepo.getAllForAnswersExport(branchScope);
        const { branch_id, branch_name } = multiBranch
          ? { branch_id: null, branch_name: null }
          : await this._branchFieldsForTokenBranch(branchId);
        const submissionsByFormId = {};
        (rows || []).forEach((r) => {
          const fid = r.checklist_form_id;
          const dateKey = toSubmissionStatsDateKey(r.local_date);
          if (!dateKey) return;
          if (!submissionsByFormId[fid]) submissionsByFormId[fid] = {};
          const answerBlock = {
            id: r.id,
            branch_id: r.branch_id,
            branch_name: r.branch_name != null ? r.branch_name : null,
            local_date: r.local_date,
            answers: parseAnswersForApi(r.answers),
            created_at: r.created_at,
            updated_at: r.updated_at,
          };
          if (multiBranch) {
            if (!submissionsByFormId[fid][dateKey]) {
              submissionsByFormId[fid][dateKey] = [];
            }
            submissionsByFormId[fid][dateKey].push(answerBlock);
          } else {
            submissionsByFormId[fid][dateKey] = {
              ...answerBlock,
              branch_name:
                answerBlock.branch_name != null
                  ? answerBlock.branch_name
                  : branch_name,
            };
          }
        });
        const data = forms.map((f) => ({
          ...f,
          branch_id,
          branch_name,
          submissions: submissionsByFormId[f.id] || {},
        }));
        resolve({
          code: 200,
          message:
            "Checklist forms with submission answers retrieved successfully",
          data,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getById(id, branchId, accessAllBranches) {
    return new Promise(async (resolve, reject) => {
      try {
        const form = await this.repo.getById(id);
        if (form) {
          const effectiveBranchId = accessAllBranches ? null : branchId;
          const { branch_id, branch_name } = await this._branchFieldsForTokenBranch(
            effectiveBranchId
          );
          resolve({
            code: 200,
            message: "Checklist form retrieved successfully",
            data: {
              ...form,
              branch_id,
              branch_name,
            },
          });
        } else {
          resolve({ code: 404, message: "Checklist form not found" });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  delete(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const existing = await this.repo.getById(id);
        if (!existing) {
          resolve({ code: 404, message: "Checklist form not found" });
          return;
        }
        const result = await this.repo.delete(id);
        if (result.affectedRows > 0) {
          resolve({
            code: 200,
            message: "Checklist form deleted successfully",
            data: { id },
          });
        } else {
          resolve({ code: 404, message: "Checklist form not found" });
        }
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (repo, submissionsRepo, branchesRepo) => {
  return new ChecklistFormsUsecase(repo, submissionsRepo, branchesRepo);
};

