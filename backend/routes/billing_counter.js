const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class BillingCounterRoutes {
  constructor(usecase) {
    this.usecase = usecase;
    this.init();
  }

  init() {
    // Create billing counter
    router.post("/", async (req, res) => {
      try {
        const schema = Joi.object({
          counter_name: Joi.string().max(200).required(),
          branch_id: Joi.number().integer().positive().required(),
          counter_code: Joi.string().max(100).allow(null, "").optional(),
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

    // Get all billing counters
    router.get("/", async (req, res) => {
      try {
        const result = await this.usecase.getAll();
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get billing counters by branch ID
    router.get("/branch/:branchId", async (req, res) => {
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

        const result = await this.usecase.getByBranchId(value.branchId);
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get billing counter by ID
    router.get("/:counterId", async (req, res) => {
      try {
        const schema = Joi.object({
          counterId: Joi.number().integer().positive().required(),
        });

        const { error, value } = schema.validate({
          counterId: parseInt(req.params.counterId),
        });
        if (error) {
          throw error;
        }

        const result = await this.usecase.getById(value.counterId);
        res.json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Update billing counter
    router.put("/:counterId", async (req, res) => {
      try {
        const paramsSchema = Joi.object({
          counterId: Joi.number().integer().positive().required(),
        });

        const bodySchema = Joi.object({
          counter_name: Joi.string().max(200),
          branch_id: Joi.number().integer().positive(),
          counter_code: Joi.string().max(100).allow(null, "").optional(),
        }).min(1); // At least one field must be provided

        const paramsValidation = paramsSchema.validate({
          counterId: parseInt(req.params.counterId),
        });
        if (paramsValidation.error) {
          throw paramsValidation.error;
        }

        const bodyValidation = bodySchema.validate(req.body);
        if (bodyValidation.error) {
          throw bodyValidation.error;
        }

        const result = await this.usecase.update(
          paramsValidation.value.counterId,
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

    // Delete billing counter
    router.delete("/:counterId", async (req, res) => {
      try {
        const schema = Joi.object({
          counterId: Joi.number().integer().positive().required(),
        });

        const { error, value } = schema.validate({
          counterId: parseInt(req.params.counterId),
        });
        if (error) {
          throw error;
        }

        const result = await this.usecase.delete(value.counterId);
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
  return new BillingCounterRoutes(usecase);
};
