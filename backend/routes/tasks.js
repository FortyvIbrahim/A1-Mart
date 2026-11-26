const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class TasksRoutes {
  constructor(usecase, taskCommentsUsecase = null) {
    this.usecase = usecase;
    this.taskCommentsUsecase = taskCommentsUsecase;
    this.init();
  }

  init() {
    // Create task
    router.post("/", async (req, res) => {
      try {
        const schema = Joi.object({
          title: Joi.string().max(200).required(),
          description: Joi.string().required(),
          priority: Joi.string()
            .valid("low", "medium", "high", "urgent")
            .required(),
          status: Joi.string()
            .valid("open", "in_progress", "done", "closed")
            .required(),
          assigned_to: Joi.string().max(50).allow(null).optional(),
          created_by: Joi.string().max(50).required(),
          voice_recording: Joi.string().uri().allow(null, "").optional(),
          files: Joi.array().items(Joi.string().uri()).optional(),
        });

        req.body.created_by = req.decoded.employee_id;

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.usecase.create(value);
        res.status(result.code === 200 ? 201 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get all tasks
    router.get("/", async (req, res) => {
      try {
        const result = await this.usecase.getAll();
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get current user's assigned tasks
    router.get("/my", async (req, res) => {
      try {
        const employeeCode = req.decoded.employee_id;
        const result = await this.usecase.getMyTasks(employeeCode);
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get task by ID
    router.get("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid task id");

        const result = await this.usecase.getById(id);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Update task
    router.put("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid task id");

        const schema = Joi.object({
          title: Joi.string().max(200).optional(),
          description: Joi.string().optional(),
          priority: Joi.string()
            .valid("low", "medium", "high", "urgent")
            .optional(),
          status: Joi.string()
            .valid("open", "in_progress", "done", "closed")
            .optional(),
          assigned_to: Joi.string().max(50).allow(null).optional(),
          voice_recording: Joi.string().uri().allow(null, "").optional(),
          files_to_create: Joi.array().items(Joi.string().uri()).optional(),
          files_to_delete: Joi.array().items(Joi.number().integer()).optional(),
        }).min(1); // At least one field must be provided

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.usecase.update(id, value);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Delete task
    router.delete("/:id(\\d+)", async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) throw new Error("Invalid task id");

        const result = await this.usecase.delete(id);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Task Comments Routes
    if (this.taskCommentsUsecase) {
      // Create task comment
      router.post("/:task_id(\\d+)/comments", async (req, res) => {
        try {
          const task_id = parseInt(req.params.task_id);
          if (isNaN(task_id)) throw new Error("Invalid task id");

          const schema = Joi.object({
            message: Joi.string().required(),
            files: Joi.array().items(Joi.string().uri()).optional(),
          });

          const { error, value } = schema.validate(req.body);
          if (error) {
            throw error;
          }

          const commentData = {
            task_id,
            message: value.message,
            files: value.files || [],
            created_by: req.decoded.employee_id,
          };

          const result = await this.taskCommentsUsecase.create(commentData);
          res.status(result.code === 200 ? 201 : 400).json(result);
        } catch (err) {
          respondError(res, err);
        }
        res.end();
      });

      // Get all comments for a task
      router.get("/:task_id(\\d+)/comments", async (req, res) => {
        try {
          const task_id = parseInt(req.params.task_id);
          if (isNaN(task_id)) throw new Error("Invalid task id");

          const result = await this.taskCommentsUsecase.getByTaskId(task_id);
          res.status(result.code === 200 ? 200 : 400).json(result);
        } catch (err) {
          respondError(res, err);
        }
        res.end();
      });

      // Get comment by ID
      router.get("/comments/:comment_id(\\d+)", async (req, res) => {
        try {
          const comment_id = parseInt(req.params.comment_id);
          if (isNaN(comment_id)) throw new Error("Invalid comment id");

          const result = await this.taskCommentsUsecase.getById(comment_id);
          res
            .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
            .json(result);
        } catch (err) {
          respondError(res, err);
        }
        res.end();
      });

      // Update task comment
      router.put("/comments/:comment_id(\\d+)", async (req, res) => {
        try {
          const comment_id = parseInt(req.params.comment_id);
          if (isNaN(comment_id)) throw new Error("Invalid comment id");

          const schema = Joi.object({
            message: Joi.string().required(),
          });

          const { error, value } = schema.validate(req.body);
          if (error) {
            throw error;
          }

          const result = await this.taskCommentsUsecase.update(
            comment_id,
            value
          );
          res
            .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
            .json(result);
        } catch (err) {
          respondError(res, err);
        }
        res.end();
      });

      // Delete task comment
      router.delete("/comments/:comment_id(\\d+)", async (req, res) => {
        try {
          const comment_id = parseInt(req.params.comment_id);
          if (isNaN(comment_id)) throw new Error("Invalid comment id");

          const result = await this.taskCommentsUsecase.delete(comment_id);
          res
            .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
            .json(result);
        } catch (err) {
          respondError(res, err);
        }
        res.end();
      });
    }
  }

  getRouter() {
    return router;
  }
}

module.exports = (usecase, taskCommentsUsecase) => {
  return new TasksRoutes(usecase, taskCommentsUsecase);
};
