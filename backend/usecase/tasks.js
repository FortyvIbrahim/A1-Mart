class TasksUsecase {
  constructor(tasksRepo) {
    this.tasksRepo = tasksRepo;
  }

  async create(taskData) {
    try {
      const { files, ...taskFields } = taskData;
      const task = await this.tasksRepo.create(taskFields);

      // Create files if provided
      if (Array.isArray(files) && files.length > 0) {
        for (const s3Url of files) {
          await this.tasksRepo.createFile(task.task_id, s3Url);
        }
      }

      // Fetch complete task with files
      const completeTask = await this.getById(task.task_id);
      return {
        code: 200,
        message: "Task created successfully",
        data: completeTask.data,
      };
    } catch (err) {
      throw err;
    }
  }

  async getAll() {
    try {
      const tasks = await this.tasksRepo.getAll();

      // Fetch files for each task
      const tasksWithFiles = await Promise.all(
        tasks.map(async (task) => {
          const files = await this.tasksRepo.getFilesByTaskId(task.task_id);
          return { ...task, files };
        })
      );

      return {
        code: 200,
        message: "Tasks retrieved successfully",
        data: tasksWithFiles,
      };
    } catch (err) {
      throw err;
    }
  }

  async getById(id) {
    try {
      const task = await this.tasksRepo.getById(id);
      if (!task) {
        return {
          code: 404,
          message: "Task not found",
        };
      }

      const files = await this.tasksRepo.getFilesByTaskId(id);
      return {
        code: 200,
        message: "Task retrieved successfully",
        data: { ...task, files },
      };
    } catch (err) {
      throw err;
    }
  }

  async getMyTasks(employeeCode) {
    try {
      const tasks = await this.tasksRepo.getByAssignedTo(employeeCode);

      // Fetch files for each task
      const tasksWithFiles = await Promise.all(
        tasks.map(async (task) => {
          const files = await this.tasksRepo.getFilesByTaskId(task.task_id);
          return { ...task, files };
        })
      );

      return {
        code: 200,
        message: "My tasks retrieved successfully",
        data: tasksWithFiles,
      };
    } catch (err) {
      throw err;
    }
  }

  async update(id, taskData) {
    try {
      const existingTask = await this.tasksRepo.getById(id);
      if (!existingTask) {
        return {
          code: 404,
          message: "Task not found",
        };
      }

      const { files_to_create, files_to_delete, ...taskFields } = taskData;

      // Update task fields
      if (Object.keys(taskFields).length > 0) {
        await this.tasksRepo.update(id, taskFields);
      }

      // Delete files
      if (Array.isArray(files_to_delete) && files_to_delete.length > 0) {
        for (const fileId of files_to_delete) {
          await this.tasksRepo.deleteFile(fileId);
        }
      }

      // Create new files
      if (Array.isArray(files_to_create) && files_to_create.length > 0) {
        for (const s3Url of files_to_create) {
          await this.tasksRepo.createFile(id, s3Url);
        }
      }

      // Fetch updated task with files
      const updatedTask = await this.getById(id);
      return {
        code: 200,
        message: "Task updated successfully",
        data: updatedTask.data,
      };
    } catch (err) {
      throw err;
    }
  }

  async delete(id) {
    try {
      const existingTask = await this.tasksRepo.getById(id);
      if (!existingTask) {
        return {
          code: 404,
          message: "Task not found",
        };
      }

      // Delete all files first (cascade delete would handle this, but being explicit)
      const files = await this.tasksRepo.getFilesByTaskId(id);
      for (const file of files) {
        await this.tasksRepo.deleteFile(file.file_id);
      }

      const result = await this.tasksRepo.delete(id);
      if (result.affectedRows > 0) {
        return {
          code: 200,
          message: "Task deleted successfully",
          data: { task_id: id },
        };
      } else {
        return {
          code: 400,
          message: "Failed to delete task",
        };
      }
    } catch (err) {
      throw err;
    }
  }
}

module.exports = (tasksRepo) => {
  return new TasksUsecase(tasksRepo);
};
