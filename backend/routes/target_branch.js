const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class TargetBranchRoutes {
  constructor(usecase, designationsUsecase) {
    this.usecase = usecase;
    this.designationsUsecase = designationsUsecase;
    this.init();
  }

  init() {
    // Create target branch
    router.post("/", async (req, res) => {
      try {
        const schema = Joi.object({
          branch_id: Joi.number().integer().positive().required(),
          target_amount: Joi.number().integer().positive().required(),
          target_month: Joi.date().required(),
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

    // Get all target branches
    router.get("/", async (req, res) => {
      try {
        let branch_id = req.decoded.branch_id;

        const isAllBranchAllowedRes =
          await this.designationsUsecase.checkPermissions(
            req.decoded.employee_id,
            ["access_all_branches"]
          );

        if (isAllBranchAllowedRes.hasAllPermissions) {
          branch_id = null;
        }

        const result = await this.usecase.getAll(branch_id);
        res.status(result.code === 200 ? 200 : 400).json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Get target branch by ID
    router.get("/:targetBranchId", async (req, res) => {
      try {
        const schema = Joi.object({
          targetBranchId: Joi.number().integer().positive().required(),
        });

        const { error, value } = schema.validate({
          targetBranchId: parseInt(req.params.targetBranchId),
        });
        if (error) {
          throw error;
        }

        const result = await this.usecase.getById(value.targetBranchId);
        res.json(result);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });

    // Update target branch
    router.put("/:targetBranchId", async (req, res) => {
      try {
        const paramsSchema = Joi.object({
          targetBranchId: Joi.number().integer().positive().required(),
        });

        const bodySchema = Joi.object({
          branch_id: Joi.number().integer().positive(),
          target_amount: Joi.number().integer().positive(),
          target_month: Joi.date(),
        }).min(1); // At least one field must be provided

        const paramsValidation = paramsSchema.validate({
          targetBranchId: parseInt(req.params.targetBranchId),
        });
        if (paramsValidation.error) {
          throw paramsValidation.error;
        }

        const bodyValidation = bodySchema.validate(req.body);
        if (bodyValidation.error) {
          throw bodyValidation.error;
        }

        const result = await this.usecase.update(
          paramsValidation.value.targetBranchId,
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

    // Delete target branch
    router.delete("/:targetBranchId", async (req, res) => {
      try {
        const schema = Joi.object({
          targetBranchId: Joi.number().integer().positive().required(),
        });

        const { error, value } = schema.validate({
          targetBranchId: parseInt(req.params.targetBranchId),
        });
        if (error) {
          throw error;
        }

        const result = await this.usecase.delete(value.targetBranchId);
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

module.exports = (usecase, designationsUsecase) => {
  return new TargetBranchRoutes(usecase, designationsUsecase);
};
