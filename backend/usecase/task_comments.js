class TaskCommentsUsecase {
  constructor(taskCommentsRepo) {
    this.taskCommentsRepo = taskCommentsRepo;
  }

  async create(commentData) {
    try {
      const comment = await this.taskCommentsRepo.create(commentData);
      const completeComment = await this.taskCommentsRepo.getById(comment.task_comment_id);
      return {
        code: 200,
        message: "Task comment created successfully",
        data: completeComment,
      };
    } catch (err) {
      throw err;
    }
  }

  async getByTaskId(task_id) {
    try {
      const comments = await this.taskCommentsRepo.getByTaskId(task_id);
      return {
        code: 200,
        message: "Task comments retrieved successfully",
        data: comments,
      };
    } catch (err) {
      throw err;
    }
  }

  async getById(comment_id) {
    try {
      const comment = await this.taskCommentsRepo.getById(comment_id);
      if (!comment) {
        return {
          code: 404,
          message: "Task comment not found",
        };
      }
      return {
        code: 200,
        message: "Task comment retrieved successfully",
        data: comment,
      };
    } catch (err) {
      throw err;
    }
  }

  async update(comment_id, commentData) {
    try {
      const existingComment = await this.taskCommentsRepo.getById(comment_id);
      if (!existingComment) {
        return {
          code: 404,
          message: "Task comment not found",
        };
      }

      await this.taskCommentsRepo.update(comment_id, commentData);
      const updatedComment = await this.taskCommentsRepo.getById(comment_id);
      return {
        code: 200,
        message: "Task comment updated successfully",
        data: updatedComment,
      };
    } catch (err) {
      throw err;
    }
  }

  async delete(comment_id) {
    try {
      const existingComment = await this.taskCommentsRepo.getById(comment_id);
      if (!existingComment) {
        return {
          code: 404,
          message: "Task comment not found",
        };
      }

      const result = await this.taskCommentsRepo.delete(comment_id);
      if (result.affectedRows > 0) {
        return {
          code: 200,
          message: "Task comment deleted successfully",
          data: { task_comment_id: comment_id },
        };
      } else {
        return {
          code: 400,
          message: "Failed to delete task comment",
        };
      }
    } catch (err) {
      throw err;
    }
  }
}

module.exports = (taskCommentsRepo) => {
  return new TaskCommentsUsecase(taskCommentsRepo);
};

