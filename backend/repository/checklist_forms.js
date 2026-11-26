const logger = require("../utils/logger");

function normalizeQuestionRow(q) {
  if (!q) return q;
  const out = { ...q };
  out.is_required = !!out.is_required;
  out.record_audio = !!out.record_audio;
  out.take_image = !!out.take_image;
  out.is_image_optional = !!out.is_image_optional;
  out.take_video = !!out.take_video;
  out.is_video_optional = !!out.is_video_optional;
  out.allow_comment = !!out.allow_comment;
  out.is_comment_optional = !!out.is_comment_optional;

  // MySQL TIME may come back as 'HH:MM:SS' - frontend expects 'HH:mm'
  const timeToHHmm = (t) => {
    if (!t) return null;
    if (typeof t !== "string") return t;
    return t.length >= 5 ? t.slice(0, 5) : t;
  };
  out.fill_at_from = timeToHHmm(out.fill_at_from);
  out.fill_at_to = timeToHHmm(out.fill_at_to);
  return out;
}

class ChecklistFormsRepository {
  constructor(db) {
    this.db = db;
  }

  create(payload) {
    return new Promise((resolve, reject) => {
      const { title, report_to_designation_ids = [], questions = [] } = payload;

      this.db.query(
        "INSERT INTO checklist_forms (title) VALUES (?)",
        [title],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.CHECKLIST_FORMS",
              code: "REPOSITORY.CHECKLIST_FORMS.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { payload },
            });
            reject(err);
            return;
          }

          const form_id = result.insertId;
          this._replaceDesignations(form_id, report_to_designation_ids)
            .then(() => this._replaceQuestions(form_id, questions))
            .then(() => resolve({ id: form_id, form_id }))
            .catch(reject);
        }
      );
    });
  }

  update(id, payload) {
    return new Promise((resolve, reject) => {
      const { title, report_to_designation_ids, questions } = payload;

      const updateFields = [];
      const updateValues = [];
      if (title !== undefined) {
        updateFields.push("title = ?");
        updateValues.push(title);
      }

      const doUpdateHeader = updateFields.length > 0;
      const doReplaceDesignations = report_to_designation_ids !== undefined;
      const doReplaceQuestions = questions !== undefined;

      const runReplacements = () => {
        const p1 = doReplaceDesignations
          ? this._replaceDesignations(id, report_to_designation_ids || [])
          : Promise.resolve();
        const p2 = doReplaceQuestions
          ? this._replaceQuestions(id, questions || [])
          : Promise.resolve();
        Promise.all([p1, p2])
          .then(() => resolve({ affectedRows: 1 }))
          .catch(reject);
      };

      if (!doUpdateHeader) {
        runReplacements();
        return;
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(id);
      this.db.query(
        `UPDATE checklist_forms SET ${updateFields.join(", ")} WHERE id = ?`,
        updateValues,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.CHECKLIST_FORMS",
              code: "REPOSITORY.CHECKLIST_FORMS.UPDATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { id, payload },
            });
            reject(err);
            return;
          }
          if (result.affectedRows === 0) {
            resolve({ affectedRows: 0 });
            return;
          }
          runReplacements();
        }
      );
    });
  }

  getById(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT * FROM checklist_forms WHERE id = ?",
        [id],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.CHECKLIST_FORMS",
              code: "REPOSITORY.CHECKLIST_FORMS.GETBYID.ERROR",
              description: err.toString(),
              category: "",
              ref: { id },
            });
            reject(err);
            return;
          }
          const form = rows && rows[0];
          if (!form) return resolve(null);

          Promise.all([
            this._getDesignations(id),
            this._getDesignationsData(id),
            this._getQuestions(id),
          ])
            .then(([designationIds, designationData, questions]) => {
              resolve({
                id: form.id,
                title: form.title,
                created_at: form.created_at,
                updated_at: form.updated_at,
                report_to_designation_ids: designationIds,
                report_to_designations: designationData,
                questions,
              });
            })
            .catch(reject);
        }
      );
    });
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT * FROM checklist_forms ORDER BY updated_at DESC",
        [],
        (err, rows) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.CHECKLIST_FORMS",
              code: "REPOSITORY.CHECKLIST_FORMS.GETALL.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          if (!rows || rows.length === 0) return resolve([]);

          const out = [];
          let done = 0;
          rows.forEach((r) => {
            Promise.all([
              this._getDesignations(r.id),
              this._getDesignationsData(r.id),
              this._getQuestionsCount(r.id),
            ])
              .then(([designationIds, designationData, questionsCount]) => {
                out.push({
                  id: r.id,
                  title: r.title,
                  created_at: r.created_at,
                  updated_at: r.updated_at,
                  report_to_designation_ids: designationIds,
                  report_to_designations: designationData,
                  questions_count: questionsCount,
                });
                done++;
                if (done === rows.length) resolve(out);
              })
              .catch(reject);
          });
        }
      );
    });
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM checklist_form_report_to_designations WHERE form_id = ?",
        [id],
        (err) => {
          if (err) return reject(err);
          this.db.query(
            "DELETE FROM checklist_questions WHERE form_id = ?",
            [id],
            (err2) => {
              if (err2) return reject(err2);
              this.db.query(
                "DELETE FROM checklist_forms WHERE id = ?",
                [id],
                (err3, result) => {
                  if (err3) return reject(err3);
                  resolve({ affectedRows: result?.affectedRows ?? 0 });
                }
              );
            }
          );
        }
      );
    });
  }

  _replaceDesignations(form_id, designationIds) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM checklist_form_report_to_designations WHERE form_id = ?",
        [form_id],
        (err) => {
          if (err) return reject(err);
          const ids = [...new Set(designationIds || [])].filter(
            (x) => x !== null && x !== undefined
          );
          if (ids.length === 0) return resolve();
          const rows = ids.map((designation_id) => [form_id, designation_id]);
          this.db.query(
            "INSERT INTO checklist_form_report_to_designations (form_id, designation_id) VALUES ?",
            [rows],
            (err2) => {
              if (err2) return reject(err2);
              resolve();
            }
          );
        }
      );
    });
  }

  _replaceQuestions(form_id, questions) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "DELETE FROM checklist_questions WHERE form_id = ?",
        [form_id],
        (err) => {
          if (err) return reject(err);
          if (!questions || questions.length === 0) return resolve();

          const rows = questions.map((q) => [
            form_id,
            q.sort_order,
            q.title,
            q.description ?? null,
            q.question_type,
            q.fill_at_from ?? null,
            q.fill_at_to ?? null,
            q.is_required ? 1 : 0,
            q.record_audio ? 1 : 0,
            q.take_image ? 1 : 0,
            q.is_image_optional ? 1 : 0,
            q.take_video ? 1 : 0,
            q.is_video_optional ? 1 : 0,
            q.allow_comment ? 1 : 0,
            q.is_comment_optional ? 1 : 0,
          ]);

          this.db.query(
            `INSERT INTO checklist_questions
              (form_id, sort_order, title, description, question_type, fill_at_from, fill_at_to,
               is_required, record_audio, take_image, is_image_optional, take_video, is_video_optional,
               allow_comment, is_comment_optional)
             VALUES ?`,
            [rows],
            (err2) => {
              if (err2) return reject(err2);
              resolve();
            }
          );
        }
      );
    });
  }

  _getDesignations(form_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT designation_id FROM checklist_form_report_to_designations WHERE form_id = ? ORDER BY designation_id",
        [form_id],
        (err, rows) => {
          if (err) return reject(err);
          resolve((rows || []).map((r) => r.designation_id));
        }
      );
    });
  }

  _getDesignationsData(form_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT d.designation_id, d.designation_name
         FROM checklist_form_report_to_designations cfr
         INNER JOIN designations d ON cfr.designation_id = d.designation_id
         WHERE cfr.form_id = ?
         ORDER BY d.designation_id`,
        [form_id],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    });
  }

  _getQuestionsCount(form_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT COUNT(*) AS cnt FROM checklist_questions WHERE form_id = ?",
        [form_id],
        (err, rows) => {
          if (err) return reject(err);
          const n = rows && rows[0] ? rows[0].cnt : 0;
          resolve(typeof n === "number" ? n : parseInt(n, 10) || 0);
        }
      );
    });
  }

  _getQuestions(form_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        "SELECT * FROM checklist_questions WHERE form_id = ? ORDER BY sort_order ASC, id ASC",
        [form_id],
        (err, rows) => {
          if (err) return reject(err);
          resolve(
            (rows || []).map((r) => ({
              id: r.id,
              form_id: r.form_id,
              sort_order: r.sort_order,
              title: r.title,
              description: r.description,
              question_type: r.question_type,
              fill_at_from: r.fill_at_from,
              fill_at_to: r.fill_at_to,
              is_required: r.is_required,
              record_audio: r.record_audio,
              take_image: r.take_image,
              is_image_optional: r.is_image_optional,
              take_video: r.take_video,
              is_video_optional: r.is_video_optional,
              allow_comment: r.allow_comment,
              is_comment_optional: r.is_comment_optional,
              created_at: r.created_at,
              updated_at: r.updated_at,
            }))
              .map(normalizeQuestionRow)
          );
        }
      );
    });
  }
}

module.exports = (db) => {
  return new ChecklistFormsRepository(db);
};

