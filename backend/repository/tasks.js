const logger = require("../utils/logger");

class TasksRepository {
  constructor(db) {
    this.db = db;
  }

  create(taskData) {
    return new Promise((resolve, reject) => {
      const {
        title,
        description,
        priority,
        status,
        assigned_to,
        created_by,
        voice_recording,
      } = taskData;

      this.db.query(
        `INSERT INTO tasks 
         (title, description, priority, status, assigned_to, created_by, voice_recording) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          description,
          priority,
          status,
          assigned_to,
          created_by,
          voice_recording || null,
        ],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TASKS",
              code: "REPOSITORY.TASKS.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { taskData },
            });
            reject(err);
            return;
          }
          resolve({ task_id: result.insertId, ...taskData });
        }
      );
    });
  }

  createFile(taskId, s3Url) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `INSERT INTO tasks_files (task_id, s3_url) VALUES (?, ?)`,
        [taskId, s3Url],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TASKS",
              code: "REPOSITORY.TASKS.CREATE_FILE.ERROR",
              description: err.toString(),
              category: "",
              ref: { taskId, s3Url },
            });
            reject(err);
            return;
          }
          resolve({ file_id: result.insertId, task_id: taskId, s3_url: s3Url });
        }
      );
    });
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           t.*,
           e1.employee_name as created_by_name,
           e2.employee_name as assigned_to_name
         FROM tasks t
         LEFT JOIN employees e1
           ON t.created_by = e1.employee_code
         LEFT JOIN employees e2
           ON t.assigned_to = e2.employee_code
         ORDER BY t.created_at DESC`,
        [],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TASKS",
              code: "REPOSITORY.TASKS.GET_ALL.ERROR",
              description: err.toString(),
              category: "",
              ref: {},
            });
            reject(err);
            return;
          }
          resolve(docs);
        }
      );
    });
  }

  getById(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           t.*,
           e1.employee_name as created_by_name,
           e2.employee_name as assigned_to_name
         FROM tasks t
         LEFT JOIN employees e1
           ON t.created_by = e1.employee_code
         LEFT JOIN employees e2
           ON t.assigned_to = e2.employee_code
         WHERE t.task_id = ?`,
        [id],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TASKS",
              code: "REPOSITORY.TASKS.GET_BY_ID.ERROR",
              description: err.toString(),
              category: "",
              ref: { id },
            });
            reject(err);
            return;
          }
          resolve(docs.length > 0 ? docs[0] : null);
        }
      );
    });
  }

  getByAssignedTo(employeeCode) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           t.*,
           e1.employee_name as created_by_name,
           e2.employee_name as assigned_to_name
         FROM tasks t
         LEFT JOIN employees e1
           ON t.created_by = e1.employee_code
         LEFT JOIN employees e2
           ON t.assigned_to = e2.employee_code
         WHERE t.assigned_to = ?
         ORDER BY t.created_at DESC`,
        [employeeCode],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TASKS",
              code: "REPOSITORY.TASKS.GET_BY_ASSIGNED_TO.ERROR",
              description: err.toString(),
              category: "",
              ref: { employeeCode },
            });
            reject(err);
            return;
          }
          resolve(docs);
        }
      );
    });
  }

  getFilesByTaskId(taskId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT * FROM tasks_files WHERE task_id = ? ORDER BY created_at DESC`,
        [taskId],
        (err, docs) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TASKS",
              code: "REPOSITORY.TASKS.GET_FILES.ERROR",
              description: err.toString(),
              category: "",
              ref: { taskId },
            });
            reject(err);
            return;
          }
          resolve(docs);
        }
      );
    });
  }

  deleteFile(fileId) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `DELETE FROM tasks_files WHERE file_id = ?`,
        [fileId],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TASKS",
              code: "REPOSITORY.TASKS.DELETE_FILE.ERROR",
              description: err.toString(),
              category: "",
              ref: { fileId },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows, file_id: fileId });
        }
      );
    });
  }

  update(id, taskData) {
    return new Promise((resolve, reject) => {
      const {
        title,
        description,
        priority,
        status,
        assigned_to,
        voice_recording,
      } = taskData;

      const updateFields = [];
      const updateValues = [];

      if (title !== undefined) {
        updateFields.push("title = ?");
        updateValues.push(title);
      }
      if (description !== undefined) {
        updateFields.push("description = ?");
        updateValues.push(description);
      }
      if (priority !== undefined) {
        updateFields.push("priority = ?");
        updateValues.push(priority);
      }
      if (status !== undefined) {
        updateFields.push("status = ?");
        updateValues.push(status);
      }
      if (assigned_to !== undefined) {
        updateFields.push("assigned_to = ?");
        updateValues.push(assigned_to);
      }
      if (voice_recording !== undefined) {
        updateFields.push("voice_recording = ?");
        updateValues.push(voice_recording || null);
      }

      if (updateFields.length === 0) {
        resolve({ affectedRows: 0 });
        return;
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(id);

      this.db.query(
        `UPDATE tasks SET ${updateFields.join(", ")} WHERE task_id = ?`,
        updateValues,
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TASKS",
              code: "REPOSITORY.TASKS.UPDATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { id, taskData },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows, task_id: id });
        }
      );
    });
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `DELETE FROM tasks WHERE task_id = ?`,
        [id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TASKS",
              code: "REPOSITORY.TASKS.DELETE.ERROR",
              description: err.toString(),
              category: "",
              ref: { id },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows, task_id: id });
        }
      );
    });
  }
}

module.exports = (db) => {
  return new TasksRepository(db);
};
