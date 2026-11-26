const { toCalendarDateString } = require("../utils/checklist_local_date");
const { parseAnswersForApi } = require("../utils/checklist_submission_stats");

/** Avoid JS Date timezone skew for SQL DATE — always read civil calendar as string. */
const SUBMISSION_ROW_SQL = `
  cs.id,
  cs.checklist_form_id,
  cs.branch_id,
  DATE_FORMAT(cs.local_date, '%Y-%m-%d') AS local_date,
  cs.answers,
  cs.updated_by_user_id,
  cs.created_at,
  cs.updated_at,
  b.branch_name
`.trim();

function mapSubmissionRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    checklist_form_id: r.checklist_form_id,
    branch_id: r.branch_id,
    branch_name: r.branch_name != null ? r.branch_name : null,
    local_date: toCalendarDateString(r.local_date),
    answers: parseAnswersForApi(r.answers),
    created_at: r.created_at,
    updated_at: r.updated_at,
    updated_by_user_id: r.updated_by_user_id,
  };
}

class ChecklistSubmissionsRepository {
  constructor(db) {
    this.db = db;
  }

  employeeCanAccessForm(employeeCode, checklistFormId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 1 AS ok
         FROM employees e
         INNER JOIN checklist_form_report_to_designations cfr
           ON cfr.designation_id = e.designation_id
         WHERE e.employee_code = ? AND cfr.form_id = ?
         LIMIT 1`,
        [employeeCode, checklistFormId],
        (err, results) => {
          if (err) return reject(err);
          resolve(!!(results && results[0]));
        }
      );
    });
  }

  getByFormAndDateAllBranches(checklistFormId, localDate) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT ${SUBMISSION_ROW_SQL}
         FROM checklist_submissions cs
         LEFT JOIN branches b ON b.branch_id = cs.branch_id
         WHERE cs.checklist_form_id = ? AND cs.local_date = ?
         ORDER BY cs.branch_id ASC`,
        [checklistFormId, localDate],
        (err, results) => {
          if (err) return reject(err);
          resolve((results || []).map((row) => mapSubmissionRow(row)));
        }
      );
    });
  }

  getByFormAndDate(checklistFormId, localDate, branchId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT ${SUBMISSION_ROW_SQL}
         FROM checklist_submissions cs
         LEFT JOIN branches b ON b.branch_id = cs.branch_id
         WHERE cs.checklist_form_id = ? AND cs.local_date = ? AND cs.branch_id = ?
         LIMIT 1`,
        [checklistFormId, localDate, branchId],
        (err, results) => {
          if (err) return reject(err);
          resolve(mapSubmissionRow(results[0]));
        }
      );
    });
  }

  getById(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT ${SUBMISSION_ROW_SQL}
         FROM checklist_submissions cs
         LEFT JOIN branches b ON b.branch_id = cs.branch_id
         WHERE cs.id = ?
         LIMIT 1`,
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(mapSubmissionRow(results[0]));
        }
      );
    });
  }

  create(payload) {
    return new Promise((resolve, reject) => {
      const {
        checklist_form_id,
        branch_id,
        local_date,
        answers,
        updated_by_user_id,
      } = payload;
      this.db.query(
        "INSERT INTO checklist_submissions (checklist_form_id, branch_id, local_date, answers, updated_by_user_id) VALUES (?, ?, ?, ?, ?)",
        [
          checklist_form_id,
          branch_id,
          local_date,
          JSON.stringify(answers || {}),
          updated_by_user_id,
        ],
        (err, result) => {
          if (err) return reject(err);
          resolve({ insertId: result.insertId });
        }
      );
    });
  }

  update(id, branchId, payload) {
    return new Promise((resolve, reject) => {
      const { answers, updated_by_user_id } = payload;
      this.db.query(
        "UPDATE checklist_submissions SET answers = ?, updated_by_user_id = ? WHERE id = ? AND branch_id = ?",
        [
          JSON.stringify(answers || {}),
          updated_by_user_id,
          id,
          branchId,
        ],
        (err, result) => {
          if (err) return reject(err);
          resolve({ affectedRows: result.affectedRows });
        }
      );
    });
  }

  getAllForStats(branchScope) {
    return new Promise((resolve, reject) => {
      const allBranches = branchScope === "all";
      const sql = allBranches
        ? `SELECT cs.id, cs.checklist_form_id, cs.branch_id,
                  DATE_FORMAT(cs.local_date, '%Y-%m-%d') AS local_date,
                  cs.answers, cs.created_at, cs.updated_at, b.branch_name
           FROM checklist_submissions cs
           LEFT JOIN branches b ON b.branch_id = cs.branch_id
           ORDER BY cs.checklist_form_id ASC, cs.local_date ASC, cs.branch_id ASC`
        : `SELECT cs.id, cs.checklist_form_id, cs.branch_id,
                  DATE_FORMAT(cs.local_date, '%Y-%m-%d') AS local_date,
                  cs.answers, cs.created_at, cs.updated_at, b.branch_name
           FROM checklist_submissions cs
           LEFT JOIN branches b ON b.branch_id = cs.branch_id
           WHERE cs.branch_id = ?
           ORDER BY cs.checklist_form_id ASC, cs.local_date ASC`;
      const params = allBranches ? [] : [branchScope];
      this.db.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve(results || []);
      });
    });
  }

  getAllForAnswersExport(branchScope) {
    return new Promise((resolve, reject) => {
      const allBranches = branchScope === "all";
      const sql = allBranches
        ? `SELECT cs.id, cs.checklist_form_id, cs.branch_id,
                  DATE_FORMAT(cs.local_date, '%Y-%m-%d') AS local_date,
                  cs.answers, cs.created_at, cs.updated_at, b.branch_name
           FROM checklist_submissions cs
           LEFT JOIN branches b ON b.branch_id = cs.branch_id
           ORDER BY cs.checklist_form_id ASC, cs.local_date ASC, cs.branch_id ASC`
        : `SELECT cs.id, cs.checklist_form_id, cs.branch_id,
                  DATE_FORMAT(cs.local_date, '%Y-%m-%d') AS local_date,
                  cs.answers, cs.created_at, cs.updated_at, b.branch_name
           FROM checklist_submissions cs
           LEFT JOIN branches b ON b.branch_id = cs.branch_id
           WHERE cs.branch_id = ?
           ORDER BY cs.checklist_form_id ASC, cs.local_date ASC`;
      const params = allBranches ? [] : [branchScope];
      this.db.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve(results || []);
      });
    });
  }
}

module.exports = (db) => {
  return new ChecklistSubmissionsRepository(db);
};
