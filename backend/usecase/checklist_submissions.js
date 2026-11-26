const { toCalendarDateString } = require("../utils/checklist_local_date");

class ChecklistSubmissionsUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  async ensureAccess(employeeCode, checklistFormId) {
    const ok = await this.repo.employeeCanAccessForm(
      employeeCode,
      checklistFormId
    );
    if (!ok) {
      return {
        code: 403,
        message:
          "Access denied: your designation is not in this form's report-to list",
      };
    }
    return null;
  }

  getByQuery(
    employeeCode,
    branchId,
    checklistFormId,
    localDate,
    accessAllBranches
  ) {
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

        const denied = await this.ensureAccess(employeeCode, checklistFormId);
        if (denied) return resolve(denied);

        if (accessAllBranches) {
          const rows = await this.repo.getByFormAndDateAllBranches(
            checklistFormId,
            localDate
          );
          return resolve({
            code: 200,
            message: "Checklist submissions retrieved successfully",
            data: rows,
          });
        }

        const row = await this.repo.getByFormAndDate(
          checklistFormId,
          localDate,
          branchId
        );
        if (!row) {
          return resolve({
            code: 200,
            message: "No submission for this form and date",
            data: null,
          });
        }
        resolve({
          code: 200,
          message: "Checklist submission retrieved successfully",
          data: row,
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  create(employeeCode, userId, branchId, payload) {
    return new Promise(async (resolve, reject) => {
      try {
        if (branchId == null || Number.isNaN(Number(branchId))) {
          return resolve({
            code: 403,
            message: "Missing branch context",
          });
        }

        const { checklist_form_id, local_date, answers } = payload;
        const denied = await this.ensureAccess(employeeCode, checklist_form_id);
        if (denied) return resolve(denied);

        const existing = await this.repo.getByFormAndDate(
          checklist_form_id,
          local_date,
          branchId
        );
        if (existing) {
          return resolve({
            code: 409,
            message:
              "Submission already exists for this form, date, and branch. Use PUT to update.",
            data: { id: existing.id },
          });
        }

        const result = await this.repo.create({
          checklist_form_id,
          branch_id: branchId,
          local_date,
          answers,
          updated_by_user_id: userId,
        });
        const full = await this.repo.getById(result.insertId);
        resolve({
          code: 200,
          message: "Checklist submission created successfully",
          data: full,
        });
      } catch (err) {
        if (err && err.code === "ER_DUP_ENTRY") {
          resolve({
            code: 409,
            message:
              "Submission already exists for this form, date, and branch. Use PUT to update.",
          });
          return;
        }
        reject(err);
      }
    });
  }

  update(employeeCode, userId, branchId, id, payload) {
    return new Promise(async (resolve, reject) => {
      try {
        if (branchId == null || Number.isNaN(Number(branchId))) {
          return resolve({
            code: 403,
            message: "Missing branch context",
          });
        }

        const existing = await this.repo.getById(id);
        if (!existing) {
          return resolve({ code: 404, message: "Checklist submission not found" });
        }

        if (Number(existing.branch_id) !== Number(branchId)) {
          return resolve({
            code: 403,
            message: "Submission does not belong to your branch",
          });
        }

        const checklist_form_id =
          payload.checklist_form_id !== undefined
            ? payload.checklist_form_id
            : existing.checklist_form_id;
        const local_date =
          payload.local_date !== undefined
            ? payload.local_date
            : existing.local_date;

        const denied = await this.ensureAccess(employeeCode, checklist_form_id);
        if (denied) return resolve(denied);

        if (
          payload.checklist_form_id !== undefined &&
          Number(payload.checklist_form_id) !== Number(existing.checklist_form_id)
        ) {
          return resolve({
            code: 400,
            message: "checklist_form_id does not match this submission",
          });
        }
        if (payload.local_date !== undefined) {
          const payloadDay = toCalendarDateString(payload.local_date);
          const existingDay = toCalendarDateString(existing.local_date);
          if (
            payloadDay == null ||
            existingDay == null ||
            payloadDay !== existingDay
          ) {
            return resolve({
              code: 400,
              message: "local_date does not match this submission",
            });
          }
        }

        const answers = payload.answers !== undefined ? payload.answers : [];
        const result = await this.repo.update(id, branchId, {
          answers,
          updated_by_user_id: userId,
        });
        if (result.affectedRows === 0) {
          return resolve({ code: 400, message: "No changes made" });
        }
        const full = await this.repo.getById(id);
        resolve({
          code: 200,
          message: "Checklist submission updated successfully",
          data: full,
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = (repo) => {
  return new ChecklistSubmissionsUsecase(repo);
};
