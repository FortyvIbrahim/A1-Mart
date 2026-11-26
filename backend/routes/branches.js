const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class BranchesRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    // Bulk insert branches
    router.post("/bulk", async (req, res) => {
      try {
        const schema = Joi.array().items(
          Joi.object({
            branch_id: Joi.number().integer().positive().optional(),
            de_branch_id: Joi.number().integer().positive().allow(null).optional(),
            branch_name: Joi.string().max(255).required(),
            branch_address: Joi.string().max(200).allow(null, ""),
            branch_phone: Joi.string().max(100).allow(null, ""),
            phone: Joi.string().allow(null, ""),
            branch_nickname: Joi.string().max(100).allow(null, ""),
            telegram_chat_id: Joi.number().integer().allow(null),
            is_active: Joi.number().integer().valid(0, 1).default(1),
            cluster_size: Joi.string()
              .valid("small", "medium", "large")
              .allow(null)
              .optional(),
          })
        );

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.usecase.bulkCreate(value);
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Create branch
    router.post("/", async (req, res) => {
      try {
        const schema = Joi.object({
          branch_id: Joi.number().integer().positive().optional(),
          de_branch_id: Joi.number().integer().positive().allow(null).optional(),
          branch_name: Joi.string().max(255).required(),
          branch_address: Joi.string().max(200).allow(null, ""),
          branch_phone: Joi.string().max(100).allow(null, ""),
          phone: Joi.string().allow(null, ""),
          branch_nickname: Joi.string().max(100).allow(null, ""),
          telegram_chat_id: Joi.number().integer().allow(null),
          is_active: Joi.number().integer().valid(0, 1).default(1),
          cluster_size: Joi.string()
            .valid("small", "medium", "large")
            .allow(null)
            .optional(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
          throw error;
        }

        const result = await this.usecase.create(value);
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get all branches
    router.get("/", async (req, res) => {
      try {
        const result = await this.usecase.getAll();
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get branch by ID
    router.get("/:branchId", async (req, res) => {
      try {
        const schema = Joi.object({
          branchId: Joi.number().integer().positive().required(),
        });

        const { error, value } = schema.validate({
          branchId: parseInt(req.params.branchId),
        });
        if (error) {
          throw error;
        }

        const result = await this.usecase.getById(value.branchId);
        res.json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Update branch
    router.put("/:branchId", async (req, res) => {
      try {
        const paramsSchema = Joi.object({
          branchId: Joi.number().integer().positive().required(),
        });

        const bodySchema = Joi.object({
          de_branch_id: Joi.number().integer().positive().allow(null),
          branch_name: Joi.string().max(255),
          branch_address: Joi.string().max(200).allow(null, ""),
          branch_phone: Joi.string().max(100).allow(null, ""),
          phone: Joi.string().allow(null, ""),
          branch_nickname: Joi.string().max(100).allow(null, ""),
          telegram_chat_id: Joi.number().integer().allow(null),
          is_active: Joi.number().integer().valid(0, 1),
          cluster_size: Joi.string()
            .valid("small", "medium", "large")
            .allow(null),
        }).min(1); // At least one field must be provided

        const paramsValidation = paramsSchema.validate({
          branchId: parseInt(req.params.branchId),
        });
        if (paramsValidation.error) {
          throw paramsValidation.error;
        }

        const bodyValidation = bodySchema.validate(req.body);
        if (bodyValidation.error) {
          throw bodyValidation.error;
        }

        const result = await this.usecase.update(
          paramsValidation.value.branchId,
          bodyValidation.value
        );
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Delete branch
    router.delete("/:branchId", async (req, res) => {
      try {
        const schema = Joi.object({
          branchId: Joi.number().integer().positive().required(),
        });

        const { error, value } = schema.validate({
          branchId: parseInt(req.params.branchId),
        });
        if (error) {
          throw error;
        }

        const result = await this.usecase.delete(value.branchId);
        res
          .status(result.code === 200 ? 200 : result.code === 404 ? 404 : 400)
          .json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });
  }

  getRouter() {
    return router;
  }
}

module.exports = (usecase) => {
  return new BranchesRoutes(usecase);
};
