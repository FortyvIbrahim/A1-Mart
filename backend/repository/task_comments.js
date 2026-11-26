const logger = require("../utils/logger");

class TaskCommentsRepository {
  constructor(db) {
    this.db = db;
  }

  create(commentData) {
    return new Promise((resolve, reject) => {
      const { task_id, message, created_by, files } = commentData;

      this.db.query(
        `INSERT INTO task_comments (task_id, message, created_by) VALUES (?, ?, ?)`,
        [task_id, message, created_by],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TASK_COMMENTS",
              code: "REPOSITORY.TASK_COMMENTS.CREATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { commentData },
            });
            reject(err);
            return;
          }

          const task_comment_id = result.insertId;

          // Create files if provided
          if (files && files.length > 0) {
            const fileValues = files.map((fileUrl) => [task_comment_id, fileUrl]);
            this.db.query(
              `INSERT INTO task_comment_files (task_comment_id, file_url) VALUES ?`,
              [fileValues],
              (err2) => {
                if (err2) {
                  logger.Log({
                    level: logger.LEVEL.ERROR,
                    component: "REPOSITORY.TASK_COMMENTS",
                    code: "REPOSITORY.TASK_COMMENTS.CREATE_FILES.ERROR",
                    description: err2.toString(),
                    category: "",
                    ref: {},
                  });
                  reject(err2);
                  return;
                }
                resolve({ task_comment_id, ...commentData });
              }
            );
          } else {
            resolve({ task_comment_id, ...commentData });
          }
        }
      );
    });
  }

  getByTaskId(task_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           tc.*,
           e.employee_name as created_by_name
         FROM task_comments tc
         LEFT JOIN employees e ON tc.created_by = e.employee_code
         WHERE tc.task_id = ?
         ORDER BY tc.created_at DESC`,
        [task_id],
        (err, comments) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TASK_COMMENTS",
              code: "REPOSITORY.TASK_COMMENTS.GET_BY_TASK_ID.ERROR",
              description: err.toString(),
              category: "",
              ref: { task_id },
            });
            reject(err);
            return;
          }

          // Fetch files for each comment
          if (comments.length === 0) {
            resolve([]);
            return;
          }

          const commentIds = comments.map((c) => c.task_comment_id);
          this.db.query(
            `SELECT * FROM task_comment_files 
             WHERE task_comment_id IN (?) 
             ORDER BY created_at ASC`,
            [commentIds],
            (err2, files) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.TASK_COMMENTS",
                  code: "REPOSITORY.TASK_COMMENTS.GET_FILES.ERROR",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }

              // Group files by comment_id
              const filesByComment = {};
              files.forEach((file) => {
                if (!filesByComment[file.task_comment_id]) {
                  filesByComment[file.task_comment_id] = [];
                }
                filesByComment[file.task_comment_id].push({
                  task_comment_file_id: file.task_comment_file_id,
                  file_url: file.file_url,
                  created_at: file.created_at,
                });
              });

              // Combine comments with their files
              const commentsWithFiles = comments.map((comment) => ({
                task_comment_id: comment.task_comment_id,
                task_id: comment.task_id,
                message: comment.message,
                created_by: comment.created_by,
                created_by_name: comment.created_by_name,
                created_at: comment.created_at,
                updated_at: comment.updated_at,
                files: filesByComment[comment.task_comment_id] || [],
              }));

              resolve(commentsWithFiles);
            }
          );
        }
      );
    });
  }

  getById(comment_id) {
    return new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
           tc.*,
           e.employee_name as created_by_name
         FROM task_comments tc
         LEFT JOIN employees e ON tc.created_by = e.employee_code
         WHERE tc.task_comment_id = ?`,
        [comment_id],
        (err, comments) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TASK_COMMENTS",
              code: "REPOSITORY.TASK_COMMENTS.GET_BY_ID.ERROR",
              description: err.toString(),
              category: "",
              ref: { comment_id },
            });
            reject(err);
            return;
          }

          if (comments.length === 0) {
            resolve(null);
            return;
          }

          const comment = comments[0];
          this.db.query(
            `SELECT * FROM task_comment_files 
             WHERE task_comment_id = ? 
             ORDER BY created_at ASC`,
            [comment_id],
            (err2, files) => {
              if (err2) {
                logger.Log({
                  level: logger.LEVEL.ERROR,
                  component: "REPOSITORY.TASK_COMMENTS",
                  code: "REPOSITORY.TASK_COMMENTS.GET_FILES.ERROR",
                  description: err2.toString(),
                  category: "",
                  ref: {},
                });
                reject(err2);
                return;
              }

              resolve({
                task_comment_id: comment.task_comment_id,
                task_id: comment.task_id,
                message: comment.message,
                created_by: comment.created_by,
                created_by_name: comment.created_by_name,
                created_at: comment.created_at,
                updated_at: comment.updated_at,
                files: files.map((file) => ({
                  task_comment_file_id: file.task_comment_file_id,
                  file_url: file.file_url,
                  created_at: file.created_at,
                })),
              });
            }
          );
        }
      );
    });
  }

  update(comment_id, commentData) {
    return new Promise((resolve, reject) => {
      const { message } = commentData;

      this.db.query(
        `UPDATE task_comments SET message = ?, updated_at = CURRENT_TIMESTAMP WHERE task_comment_id = ?`,
        [message, comment_id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TASK_COMMENTS",
              code: "REPOSITORY.TASK_COMMENTS.UPDATE.ERROR",
              description: err.toString(),
              category: "",
              ref: { comment_id, commentData },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows, task_comment_id: comment_id });
        }
      );
    });
  }

  delete(comment_id) {
    return new Promise((resolve, reject) => {
      // Files will be deleted automatically due to CASCADE
      this.db.query(
        `DELETE FROM task_comments WHERE task_comment_id = ?`,
        [comment_id],
        (err, result) => {
          if (err) {
            logger.Log({
              level: logger.LEVEL.ERROR,
              component: "REPOSITORY.TASK_COMMENTS",
              code: "REPOSITORY.TASK_COMMENTS.DELETE.ERROR",
              description: err.toString(),
              category: "",
              ref: { comment_id },
            });
            reject(err);
            return;
          }
          resolve({ affectedRows: result.affectedRows, task_comment_id: comment_id });
        }
      );
    });
  }
}

module.exports = (db) => {
  return new TaskCommentsRepository(db);
};

